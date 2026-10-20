import { afterEach, describe, expect, it, vi } from "vitest";

import {
  generateChatAnswer,
} from "../../src/adapters/llm/chat-answer.provider";

import type {
  KnowledgeMatch,
} from "../../src/services/knowledge.service";

const matches: KnowledgeMatch[] = [
  {
    content: "Chùa Thiên Mụ là một di tích lịch sử tại Huế.",
    score: 7,
    citation: {
      chunk_id: 6,
      document_id: 4,
      document_version: 1,
      attraction_id: 3,
      title: "Lịch sử Chùa Thiên Mụ",
      language_code: "vi",
      source_url: null,
      source_credit: "TEST_SOURCE",
    },
  },
];

const input = {
  question: "Sao Hỏa có bao nhiêu mặt trăng?",
  languageCode: "vi",
  matches,
  grounded: true,
};

afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
});

function setupGemini(): void {
  vi.stubEnv("CHAT_PROVIDER", "gemini");
  vi.stubEnv("GEMINI_CHAT_MODEL", "gemini-3.1-flash-lite");
  vi.stubEnv("GEMINI_API_KEY", "fake-test-key");
}

function mockGeminiJSON(value: unknown) {
  const fetchMock = vi.fn().mockResolvedValue({
    ok: true,
    status: 200,
    json: async () => ({
      candidates: [{
        content: { parts: [{ text: JSON.stringify(value) }] },
      }],
    }),
  });
  vi.stubGlobal("fetch", fetchMock);
  return fetchMock;
}

describe("Gemini grounded response", () => {
  it("returns unsupported without citation IDs for off-topic questions", async () => {
    setupGemini();
    const fetchMock = mockGeminiJSON({
      answer: "",
      supported: false,
      used_chunk_ids: [],
    });

    const result = await generateChatAnswer(input);
    expect(result).toEqual({
      answer: "",
      supported: false,
      used_chunk_ids: [],
    });

    const [, options] = fetchMock.mock.calls[0];
    const body = JSON.parse(options.body as string);
    expect(body.generationConfig.responseMimeType).toBe("application/json");
    expect(body.generationConfig.responseSchema.required).toContain("supported");
  });

  it("returns supported answer with explicit evidence chunk ID", async () => {
    setupGemini();
    mockGeminiJSON({
      answer: "Chùa Thiên Mụ là một di tích lịch sử tại Huế.",
      supported: true,
      used_chunk_ids: [6],
    });

    const result = await generateChatAnswer({
      ...input,
      question: "Chùa Thiên Mụ có gì đặc biệt?",
    });
    expect(result).toEqual({
      answer: "Chùa Thiên Mụ là một di tích lịch sử tại Huế.",
      supported: true,
      used_chunk_ids: [6],
    });
  });
});
