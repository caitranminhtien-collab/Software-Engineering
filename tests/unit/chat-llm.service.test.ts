
import {
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from "vitest";

vi.mock(
  "../../src/repositories/chat.repository",
  async (importOriginal) => {
    const actual = await importOriginal<
      typeof import("../../src/repositories/chat.repository")
    >();

    return {
      ...actual,
      createVisitorMessage: vi.fn(),
      createAssistantMessage: vi.fn(),
      findChatMessagesBySession: vi.fn(),
    };
  }
);

vi.mock(
  "../../src/services/knowledge.service",
  async (importOriginal) => {
    const actual = await importOriginal<
      typeof import("../../src/services/knowledge.service")
    >();

    return {
      ...actual,
      searchKnowledge: vi.fn(),
    };
  }
);

vi.mock(
  "../../src/adapters/llm/chat-answer.provider",
  async (importOriginal) => {
    const actual = await importOriginal<
      typeof import("../../src/adapters/llm/chat-answer.provider")
    >();

    return {
      ...actual,
      generateChatAnswer: vi.fn(),
    };
  }
);

import {
  createVisitorMessage,
  createAssistantMessage,
  findChatMessagesBySession,
} from "../../src/repositories/chat.repository";

import {
  searchKnowledge,
  KnowledgeEmbeddingUnavailableError,
} from "../../src/services/knowledge.service";

import {
  generateChatAnswer,
  ChatGenerationUnavailableError,
} from "../../src/adapters/llm/chat-answer.provider";

import {
  createChatExchange,
  getChatHistory,
  ChatDependencyUnavailableError,
} from "../../src/services/chat.service";

const sessionId = 16;
const question = "Chùa Thiên Mụ có gì đặc biệt?";

const citation = {
  chunk_id: 6,
  document_id: 4,
  document_version: 1,
  attraction_id: 3,
  title: "Lịch sử Chùa Thiên Mụ",
  language_code: "vi",
  source_url: "https://example.com/source",
  source_credit: "TEST_SOURCE",
};

const knowledgeResult = {
  matches: [
    {
      content:
        "Chùa Thiên Mụ là một di tích lịch sử tại Huế.",
      score: 0.95,
      citation,
    },
  ],
  content_language: "vi",
  fallback_used: false,
};

function createMessage(
  speaker: "visitor" | "assistant",
  content: string,
  citations: unknown | null,
  responseStatus:
    | "answered"
    | "insufficient"
    | "error"
    | null
) {
  return {
    message_id: speaker === "visitor" ? "20" : "21",
    session_id: String(sessionId),
    speaker,
    content,
    citations,
    response_status: responseStatus,
    created_at: new Date(
      "2026-10-18T05:00:00.000Z"
    ),
  };
}

describe("Chat Service with LLM", () => {
  beforeEach(() => {
    vi.clearAllMocks();

    vi.mocked(createVisitorMessage)
      .mockImplementation(async (_sessionId, content) =>
        createMessage(
          "visitor",
          content,
          null,
          null
        )
      );

    vi.mocked(createAssistantMessage)
      .mockImplementation(
        async (
          _sessionId,
          content,
          citations,
          status
        ) =>
          createMessage(
            "assistant",
            content,
            citations,
            status
          )
      );
  });

  it("generates an answer and saves citations", async () => {
    vi.mocked(searchKnowledge)
      .mockResolvedValue(knowledgeResult);

    vi.mocked(generateChatAnswer)
      .mockResolvedValue(
        "Chùa Thiên Mụ nổi tiếng vì giá trị lịch sử."
      );

    const result = await createChatExchange(
      sessionId,
      question,
      "vi",
      3
    );

    expect(result.response_status)
      .toBe("answered");

    expect(result.answer)
      .toBe(
        "Chùa Thiên Mụ nổi tiếng vì giá trị lịch sử."
      );

    expect(result.citations)
      .toEqual([citation]);

    expect(generateChatAnswer)
      .toHaveBeenCalledWith({
        question,
        languageCode: "vi",
        matches: knowledgeResult.matches,
      });

    expect(createAssistantMessage)
      .toHaveBeenCalledWith(
        sessionId,
        result.answer,
        [citation],
        "answered"
      );

    expect(result.assistant_message.content)
      .toBe(result.answer);
  });

  it("returns insufficient without calling LLM", async () => {
    vi.mocked(searchKnowledge)
      .mockResolvedValue({
        matches: [],
        content_language: "vi",
        fallback_used: false,
      });

    const result = await createChatExchange(
      sessionId,
      question,
      "vi",
      3
    );

    expect(result.response_status)
      .toBe("insufficient");

    expect(result.citations).toBeNull();

    expect(generateChatAnswer)
      .not.toHaveBeenCalled();

    expect(createAssistantMessage)
      .toHaveBeenCalledWith(
        sessionId,
        expect.any(String),
        null,
        "insufficient"
      );
  });

  it("saves an error when LLM is unavailable", async () => {
    vi.mocked(searchKnowledge)
      .mockResolvedValue(knowledgeResult);

    vi.mocked(generateChatAnswer)
      .mockRejectedValue(
        new ChatGenerationUnavailableError()
      );

    await expect(
      createChatExchange(
        sessionId,
        question,
        "vi",
        3
      )
    ).rejects.toBeInstanceOf(
      ChatDependencyUnavailableError
    );

    expect(createAssistantMessage)
      .toHaveBeenCalledWith(
        sessionId,
        expect.any(String),
        null,
        "error"
      );
  });

  it("saves an error when embedding fails", async () => {
    vi.mocked(searchKnowledge)
      .mockRejectedValue(
        new KnowledgeEmbeddingUnavailableError()
      );

    await expect(
      createChatExchange(
        sessionId,
        question,
        "vi",
        3
      )
    ).rejects.toBeInstanceOf(
      ChatDependencyUnavailableError
    );

    expect(generateChatAnswer)
      .not.toHaveBeenCalled();

    expect(createAssistantMessage)
      .toHaveBeenCalledWith(
        sessionId,
        expect.any(String),
        null,
        "error"
      );
  });

  it("loads only the requested session history", async () => {
    vi.mocked(findChatMessagesBySession)
      .mockResolvedValue([
        createMessage(
          "visitor",
          question,
          null,
          null
        ),
        createMessage(
          "assistant",
          "Câu trả lời thử nghiệm.",
          [citation],
          "answered"
        ),
      ]);

    const history = await getChatHistory(
      sessionId
    );

    expect(findChatMessagesBySession)
      .toHaveBeenCalledWith(sessionId);

    expect(history).toHaveLength(2);
    expect(history[0].session_id).toBe(sessionId);
    expect(history[1].response_status)
      .toBe("answered");
  });
});
