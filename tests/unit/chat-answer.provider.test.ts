
import {
  afterEach,
  describe,
  expect,
  it,
  vi,
} from "vitest";

import {
  ChatGenerationUnavailableError,
  generateChatAnswer,
} from "../../src/adapters/llm/chat-answer.provider";

import type {
  KnowledgeMatch,
} from "../../src/services/knowledge.service";

const matches: KnowledgeMatch[] = [
  {
    content:
      "Chùa Thiên Mụ là di tích lịch sử nổi tiếng tại Huế.",
    score: 0.95,
    citation: {
      chunk_id: 1,
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
  question: "Chùa Thiên Mụ có gì đặc biệt?",
  languageCode: "vi",
  matches,
};

afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
});

describe("Chat Answer Provider", () => {
  it("uses extractive provider by default", async () => {
    vi.stubEnv("CHAT_PROVIDER", "");

    const answer = await generateChatAnswer(input);

    expect(answer).toBe(matches[0].content);
  });

  it("rejects empty knowledge", async () => {
    await expect(
      generateChatAnswer({
        ...input,
        matches: [],
      })
    ).rejects.toBeInstanceOf(
      ChatGenerationUnavailableError
    );
  });

  it("rejects unsupported provider", async () => {
    vi.stubEnv("CHAT_PROVIDER", "unknown");

    await expect(
      generateChatAnswer(input)
    ).rejects.toBeInstanceOf(
      ChatGenerationUnavailableError
    );
  });

  it("rejects missing OpenAI configuration", async () => {
    vi.stubEnv("CHAT_PROVIDER", "openai");
    vi.stubEnv("OPENAI_API_KEY", "");
    vi.stubEnv("OPENAI_CHAT_MODEL", "");

    await expect(
      generateChatAnswer(input)
    ).rejects.toBeInstanceOf(
      ChatGenerationUnavailableError
    );
  });

  it("generates answer from mocked OpenAI response", async () => {
    vi.stubEnv("CHAT_PROVIDER", "openai");
    vi.stubEnv("OPENAI_API_KEY", "test-key");
    vi.stubEnv("OPENAI_CHAT_MODEL", "test-model");

    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({
        status: "completed",
        output: [
          {
            type: "message",
            content: [
              {
                type: "output_text",
                text:
                  "Chùa Thiên Mụ là một di tích lịch sử tại Huế.",
              },
            ],
          },
        ],
      }),
    });

    vi.stubGlobal("fetch", fetchMock);

    const answer = await generateChatAnswer(input);

    expect(answer).toContain("Chùa Thiên Mụ");
    expect(fetchMock).toHaveBeenCalledOnce();

    const [, options] = fetchMock.mock.calls[0];

    const body = JSON.parse(
      options.body as string
    );

    expect(body.store).toBe(false);
    expect(body.input[0].content)
      .toContain(matches[0].content);
  });

  it("handles OpenAI HTTP errors", async () => {
    vi.stubEnv("CHAT_PROVIDER", "openai");
    vi.stubEnv("OPENAI_API_KEY", "test-key");
    vi.stubEnv("OPENAI_CHAT_MODEL", "test-model");

    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: false,
        status: 503,
      })
    );

    await expect(
      generateChatAnswer(input)
    ).rejects.toBeInstanceOf(
      ChatGenerationUnavailableError
    );
  });

  it("handles OpenAI network failures", async () => {
    vi.stubEnv("CHAT_PROVIDER", "openai");
    vi.stubEnv("OPENAI_API_KEY", "test-key");
    vi.stubEnv("OPENAI_CHAT_MODEL", "test-model");

    vi.stubGlobal(
      "fetch",
      vi.fn().mockRejectedValue(
        new Error("Network unavailable")
      )
    );

    await expect(
      generateChatAnswer(input)
    ).rejects.toBeInstanceOf(
      ChatGenerationUnavailableError
    );
  });
});
