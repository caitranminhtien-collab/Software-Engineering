
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

const input = {
  question: "Chùa Thiên Mụ có gì đặc biệt?",
  languageCode: "vi",
  matches: [
    {
      content:
        "Chùa Thiên Mụ là một di tích lịch sử nổi tiếng tại Huế.",
      score: 0.95,
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
  ],
};

afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
});

function setupGemini(): void {
  vi.stubEnv("CHAT_PROVIDER", "gemini");
  vi.stubEnv("GEMINI_CHAT_MODEL", "gemini-3.1-flash-lite");
  vi.stubEnv("GEMINI_API_KEY", "test-key");
}

describe("Gemini Chat Provider", () => {
  it("generates an answer from Gemini", async () => {
    setupGemini();

    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({
        candidates: [
          {
            content: {
              parts: [
                {
                  text:
                    "Chùa Thiên Mụ nổi tiếng với giá trị lịch sử.",
                },
              ],
            },
          },
        ],
      }),
    });

    vi.stubGlobal("fetch", fetchMock);

    const answer = await generateChatAnswer(input);

    expect(answer).toContain("Chùa Thiên Mụ");
    expect(fetchMock).toHaveBeenCalledOnce();

    const [url, options] = fetchMock.mock.calls[0];

    expect(url).toContain(
      "gemini-3.1-flash-lite:generateContent"
    );

    expect(options.headers["x-goog-api-key"])
      .toBe("test-key");

    const body = JSON.parse(options.body);

    expect(body.contents[0].parts[0].text)
      .toContain(input.matches[0].content);
  });

  it("rejects missing Gemini API key", async () => {
    setupGemini();
    vi.stubEnv("GEMINI_API_KEY", "");

    await expect(
      generateChatAnswer(input)
    ).rejects.toBeInstanceOf(
      ChatGenerationUnavailableError
    );
  });

  it("handles Gemini rate limit errors", async () => {
    setupGemini();

    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: false,
        status: 429,
      })
    );

    await expect(
      generateChatAnswer(input)
    ).rejects.toBeInstanceOf(
      ChatGenerationUnavailableError
    );
  });

  it("handles empty Gemini responses", async () => {
    setupGemini();

    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => ({
          candidates: [],
        }),
      })
    );

    await expect(
      generateChatAnswer(input)
    ).rejects.toBeInstanceOf(
      ChatGenerationUnavailableError
    );
  });
});
