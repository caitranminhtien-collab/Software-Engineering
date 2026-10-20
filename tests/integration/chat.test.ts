
import request from "supertest";

import {
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from "vitest";

// Mock Visitor Session Repository
vi.mock(
  "../../src/repositories/session.repository",
  async (importOriginal) => {
    const actual = await importOriginal<
      typeof import("../../src/repositories/session.repository")
    >();

    return {
      ...actual,
      findActiveVisitorSessionByTokenHash: vi.fn(),
    };
  }
);

// Mock Chat Repository
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

// Mock Knowledge Service
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

// Mock LLM Provider
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

import app from "../../src/app";

import {
  findActiveVisitorSessionByTokenHash,
} from "../../src/repositories/session.repository";

import {
  createAssistantMessage,
  createVisitorMessage,
  findChatMessagesBySession,
} from "../../src/repositories/chat.repository";

import {
  KnowledgeEmbeddingUnavailableError,
  searchKnowledge,
} from "../../src/services/knowledge.service";

import {
  ChatGenerationUnavailableError,
  generateChatAnswer,
} from "../../src/adapters/llm/chat-answer.provider";

// ==============================
// Test Data
// ==============================

const sessionId = 16;

const question =
  "Chùa Thiên Mụ có gì đặc biệt?";

const knowledgeContent =
  "Chùa Thiên Mụ là một di tích lịch sử nổi tiếng tại Huế.";

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
      content: knowledgeContent,
      score: 8,
      citation,
    },
  ],
  content_language: "vi",
  fallback_used: false,
};

// ==============================
// Helpers
// ==============================

function mockValidVisitorSession(): void {
  vi.mocked(
    findActiveVisitorSessionByTokenHash
  ).mockResolvedValue({
    session_id: "16",
    token_hash: "stored-token-hash",
    language_code: "vi",
    started_at: new Date(),

    expires_at: new Date(
      Date.now() + 60 * 60 * 1000
    ),

    revoked_at: null,
    access_scope: "public",
    access_route_id: null,
    access_attraction_id: null,
    access_expires_at: null,
  });
}

function createMockMessage(
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
    message_id:
      speaker === "visitor" ? "20" : "21",

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

function mockVisitorMessage(
  content: string
): void {
  vi.mocked(
    createVisitorMessage
  ).mockResolvedValue(
    createMockMessage(
      "visitor",
      content,
      null,
      null
    )
  );
}

function mockAssistantMessage(): void {
  vi.mocked(
    createAssistantMessage
  ).mockImplementation(
    async (
      _sessionId,
      content,
      citations,
      status
    ) => {
      return createMockMessage(
        "assistant",
        content,
        citations,
        status
      );
    }
  );
}

function mockDefaultLLM(): void {
  vi.mocked(
    generateChatAnswer
  ).mockImplementation(
    async ({ matches }) => {
      return [
        ...new Set(
          matches.map(
            (match) => match.content
          )
        ),
      ].join(" ");
    }
  );
}

// ==============================
// Chat API Tests
// ==============================

describe("Chat API", () => {
  beforeEach(() => {
    vi.mocked(
      findActiveVisitorSessionByTokenHash
    ).mockReset();

    vi.mocked(
      createVisitorMessage
    ).mockReset();

    vi.mocked(
      createAssistantMessage
    ).mockReset();

    vi.mocked(
      findChatMessagesBySession
    ).mockReset();

    vi.mocked(
      searchKnowledge
    ).mockReset();

    vi.mocked(
      generateChatAnswer
    ).mockReset();

    mockValidVisitorSession();
    mockAssistantMessage();
    mockDefaultLLM();
  });

  // TEST 1: Knowledge + Citations

  it(
    "returns answered with citations when approved knowledge matches",
    async () => {
      mockVisitorMessage(question);

      vi.mocked(
        searchKnowledge
      ).mockResolvedValue(
        knowledgeResult
      );

      const response = await request(app)
        .post("/api/v1/chat/messages")
        .set(
          "Authorization",
          "Bearer valid-token"
        )
        .send({
          question,
          language: "vi",
          attraction_id: 3,
        });

      expect(response.status).toBe(201);

      expect(
        response.body.data.response_status
      ).toBe("answered");

      expect(
        response.body.data.answer
      ).toBe(knowledgeContent);

      expect(
        response.body.data.citations
      ).toHaveLength(1);

      expect(
        response.body.data.citations[0]
          .chunk_id
      ).toBe(6);

      expect(
        response.body.data.content_language
      ).toBe("vi");

      expect(
        response.body.data.fallback_used
      ).toBe(false);

      expect(
        response.body.data.attraction_id
      ).toBe(3);

      expect(
        searchKnowledge
      ).toHaveBeenCalledWith(
        question,
        "vi",
        3
      );

      expect(
        generateChatAnswer
      ).toHaveBeenCalledWith({
        question,
        languageCode: "vi",
        matches: knowledgeResult.matches,
      });

      expect(
        createAssistantMessage
      ).toHaveBeenCalledWith(
        sessionId,
        knowledgeContent,
        [citation],
        "answered"
      );
    }
  );

  // TEST 2: Insufficient Knowledge

  it(
    "returns insufficient when no approved knowledge matches",
    async () => {
      const unknownQuestion =
        "Thông tin không tồn tại";

      mockVisitorMessage(
        unknownQuestion
      );

      vi.mocked(
        searchKnowledge
      ).mockResolvedValue({
        matches: [],
        content_language: "vi",
        fallback_used: false,
      });

      const response = await request(app)
        .post("/api/v1/chat/messages")
        .set(
          "Authorization",
          "Bearer valid-token"
        )
        .send({
          question: unknownQuestion,
          language: "vi",
          attraction_id: 3,
        });

      expect(response.status).toBe(201);

      expect(
        response.body.data.response_status
      ).toBe("insufficient");

      expect(
        response.body.data.citations
      ).toBeNull();

      expect(
        generateChatAnswer
      ).not.toHaveBeenCalled();

      expect(
        createAssistantMessage
      ).toHaveBeenCalledWith(
        sessionId,
        expect.any(String),
        null,
        "insufficient"
      );
    }
  );

  // TEST 3: Invalid Request

  it(
    "returns 400 when chat request body is invalid",
    async () => {
      const response = await request(app)
        .post("/api/v1/chat/messages")
        .set(
          "Authorization",
          "Bearer valid-token"
        )
        .send({
          content: "Legacy field",
          language: "fr",
          attraction_id: -1,
        });

      expect(response.status).toBe(400);

      expect(
        response.body.error.code
      ).toBe("VALIDATION_ERROR");

      expect(
        createVisitorMessage
      ).not.toHaveBeenCalled();

      expect(
        searchKnowledge
      ).not.toHaveBeenCalled();

      expect(
        generateChatAnswer
      ).not.toHaveBeenCalled();
    }
  );

  // TEST 4: Embedding Error

  it(
    "returns 503 when embedding service is unavailable",
    async () => {
      mockVisitorMessage(question);

      vi.mocked(
        searchKnowledge
      ).mockRejectedValue(
        new KnowledgeEmbeddingUnavailableError()
      );

      const response = await request(app)
        .post("/api/v1/chat/messages")
        .set(
          "Authorization",
          "Bearer valid-token"
        )
        .send({
          question,
          language: "vi",
          attraction_id: 3,
        });

      expect(response.status).toBe(503);

      expect(
        response.body.error.code
      ).toBe("AI_SERVICE_UNAVAILABLE");

      expect(
        generateChatAnswer
      ).not.toHaveBeenCalled();

      expect(
        createAssistantMessage
      ).toHaveBeenCalledWith(
        sessionId,
        expect.any(String),
        null,
        "error"
      );
    }
  );

  // TEST 5: Chat History

  it(
    "returns chat history only for the authenticated visitor session",
    async () => {
      vi.mocked(
        findChatMessagesBySession
      ).mockResolvedValue([
        createMockMessage(
          "visitor",
          question,
          null,
          null
        ),

        createMockMessage(
          "assistant",
          knowledgeContent,
          [citation],
          "answered"
        ),
      ]);

      const response = await request(app)
        .get("/api/v1/chat/messages")
        .set(
          "Authorization",
          "Bearer valid-token"
        );

      expect(response.status).toBe(200);

      expect(
        response.body.data
      ).toHaveLength(2);

      expect(
        response.body.data[0].session_id
      ).toBe(sessionId);

      expect(
        response.body.data[1].session_id
      ).toBe(sessionId);

      expect(
        findChatMessagesBySession
      ).toHaveBeenCalledWith(
        sessionId
      );
    }
  );

  // TEST 6: LLM Error

  it(
    "returns 503 and saves error when LLM fails",
    async () => {
      mockVisitorMessage(question);

      vi.mocked(
        searchKnowledge
      ).mockResolvedValue(
        knowledgeResult
      );

      vi.mocked(
        generateChatAnswer
      ).mockRejectedValue(
        new ChatGenerationUnavailableError()
      );

      const response = await request(app)
        .post("/api/v1/chat/messages")
        .set(
          "Authorization",
          "Bearer valid-token"
        )
        .send({
          question,
          language: "vi",
          attraction_id: 3,
        });

      expect(response.status).toBe(503);

      expect(
        response.body.error.code
      ).toBe("AI_SERVICE_UNAVAILABLE");

      expect(
        createVisitorMessage
      ).toHaveBeenCalledWith(
        sessionId,
        question
      );

      expect(
        generateChatAnswer
      ).toHaveBeenCalledOnce();

      expect(
        createAssistantMessage
      ).toHaveBeenCalledWith(
        sessionId,
        expect.any(String),
        null,
        "error"
      );
    }
  );
});
