import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("../../src/repositories/chat.repository", async (importOriginal) => {
  const actual = await importOriginal<
    typeof import("../../src/repositories/chat.repository")
  >();
  return {
    ...actual,
    createVisitorMessage: vi.fn(),
    createAssistantMessage: vi.fn(),
  };
});

vi.mock("../../src/services/knowledge.service", async (importOriginal) => {
  const actual = await importOriginal<
    typeof import("../../src/services/knowledge.service")
  >();
  return { ...actual, searchKnowledge: vi.fn() };
});

vi.mock("../../src/adapters/llm/chat-answer.provider", async (importOriginal) => {
  const actual = await importOriginal<
    typeof import("../../src/adapters/llm/chat-answer.provider")
  >();
  return { ...actual, generateChatAnswer: vi.fn() };
});

import {
  createAssistantMessage,
  createVisitorMessage,
} from "../../src/repositories/chat.repository";
import { searchKnowledge } from "../../src/services/knowledge.service";
import { generateChatAnswer } from "../../src/adapters/llm/chat-answer.provider";
import { createChatExchange } from "../../src/services/chat.service";

const sessionId = 16;
const question = "Sao Hỏa có bao nhiêu mặt trăng?";
const baseCitation = {
  chunk_id: 6,
  document_id: 4,
  document_version: 1,
  attraction_id: 3,
  title: "Lịch sử Chùa Thiên Mụ",
  language_code: "vi",
  source_url: null,
  source_credit: "TEST_SOURCE",
};

const matches = [
  {
    content: "Chùa Thiên Mụ là một di tích lịch sử tại Huế.",
    score: 4,
    citation: baseCitation,
  },
  {
    content: "Chùa Thiên Mụ có kiến trúc đặc trưng.",
    score: 3,
    citation: { ...baseCitation, chunk_id: 7 },
  },
];

function mockMessage(
  speaker: "visitor" | "assistant",
  content: string,
  citations: unknown | null,
  status: "answered" | "insufficient" | "error" | null
) {
  return {
    message_id: speaker === "visitor" ? "42" : "43",
    session_id: String(sessionId),
    speaker,
    content,
    citations,
    response_status: status,
    created_at: new Date(),
  };
}

describe("Grounded Chat Service", () => {
  beforeEach(() => {
    vi.mocked(createVisitorMessage).mockReset();
    vi.mocked(createAssistantMessage).mockReset();
    vi.mocked(searchKnowledge).mockReset();
    vi.mocked(generateChatAnswer).mockReset();

    vi.mocked(createVisitorMessage).mockImplementation(
      async (_sessionId, content) => mockMessage("visitor", content, null, null)
    );
    vi.mocked(createAssistantMessage).mockImplementation(
      async (_sessionId, content, citations, status) =>
        mockMessage("assistant", content, citations, status)
    );
    vi.mocked(searchKnowledge).mockResolvedValue({
      matches,
      content_language: "vi",
      fallback_used: false,
    });
  });

  it("marks unsupported Gemini answers as insufficient without citations", async () => {
    vi.mocked(generateChatAnswer).mockResolvedValue({
      answer: "",
      supported: false,
      used_chunk_ids: [],
    });

    const result = await createChatExchange(sessionId, question, "vi", 3);
    expect(result.response_status).toBe("insufficient");
    expect(result.citations).toBeNull();
    expect(result.assistant_message.response_status).toBe("insufficient");
    expect(createAssistantMessage).toHaveBeenCalledWith(
      sessionId, expect.any(String), null, "insufficient"
    );
  });

  it("only persists citations selected by the model and present in Retrieval", async () => {
    vi.mocked(generateChatAnswer).mockResolvedValue({
      answer: "Chùa Thiên Mụ là một di tích lịch sử tại Huế.",
      supported: true,
      used_chunk_ids: [6, 999],
    });

    const result = await createChatExchange(
      sessionId,
      "Chùa Thiên Mụ có gì đặc biệt?",
      "vi",
      3
    );
    expect(result.response_status).toBe("answered");
    expect(result.citations).toEqual([baseCitation]);
    expect(result.citations?.some((item) => item.chunk_id === 999)).toBe(false);
  });

  it("rejects unsupported source IDs even when supported=true", async () => {
    vi.mocked(generateChatAnswer).mockResolvedValue({
      answer: "Unsupported claim.",
      supported: true,
      used_chunk_ids: [999],
    });

    const result = await createChatExchange(sessionId, question, "vi", 3);
    expect(result.response_status).toBe("insufficient");
    expect(result.citations).toBeNull();
  });
});
