import request from "supertest";

import {
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from "vitest";

vi.mock(
  "../../src/repositories/session.repository",
  async (importOriginal) => {
    const actual =
      await importOriginal<
        typeof import(
          "../../src/repositories/session.repository"
        )
      >();

    return {
      ...actual,

      findActiveVisitorSessionByTokenHash:
        vi.fn(),
    };
  }
);

vi.mock(
  "../../src/repositories/chat.repository",
  async (importOriginal) => {
    const actual =
      await importOriginal<
        typeof import(
          "../../src/repositories/chat.repository"
        )
      >();

    return {
      ...actual,

      createVisitorMessage:
        vi.fn(),

      createAssistantMessage:
        vi.fn(),

      findChatMessagesBySession:
        vi.fn(),
    };
  }
);

vi.mock(
  "../../src/services/knowledge.service",
  async (importOriginal) => {
    const actual =
      await importOriginal<
        typeof import(
          "../../src/services/knowledge.service"
        )
      >();

    return {
      ...actual,

      searchKnowledge:
        vi.fn(),
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

function mockValidVisitorSession(): void {
  vi.mocked(
    findActiveVisitorSessionByTokenHash
  ).mockResolvedValue({
    session_id: "16",

    token_hash:
      "stored-token-hash",

    language_code:
      "vi",

    started_at:
      new Date(),

    expires_at:
      new Date(
        Date.now() +
          60 *
            60 *
            1000
      ),

    revoked_at:
      null,

    access_scope:
      "public",

    access_route_id:
      null,

    access_attraction_id:
      null,

    access_expires_at:
      null,
  });
}

function mockVisitorMessage(
  content: string
): void {
  vi.mocked(
    createVisitorMessage
  ).mockResolvedValue({
    message_id: "20",
    session_id: "16",
    speaker: "visitor",
    content,
    citations: null,
    response_status: null,
    created_at:
      new Date(
        "2026-10-18T05:00:00.000Z"
      ),
  });
}

describe(
  "Chat API",
  () => {
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

      mockValidVisitorSession();
    });

    it(
      "returns answered with citations when approved knowledge matches",
      async () => {
        const question =
          "Chùa Thiên Mụ có gì đặc biệt?";

        mockVisitorMessage(
          question
        );

        vi.mocked(
          searchKnowledge
        ).mockResolvedValue({
          matches: [
            {
              content:
                "Chùa Thiên Mụ là một di tích lịch sử nổi tiếng tại Huế.",

              score: 8,

              citation: {
                chunk_id: 6,
                document_id: 4,
                document_version: 1,
                attraction_id: 3,
                title:
                  "Lịch sử Chùa Thiên Mụ",
                language_code:
                  "vi",
                source_url:
                  "https://example.com/source",
                source_credit:
                  "TEST_SOURCE",
              },
            },
          ],

          content_language:
            "vi",

          fallback_used:
            false,
        });

        vi.mocked(
          createAssistantMessage
        ).mockResolvedValue({
          message_id: "21",
          session_id: "16",
          speaker:
            "assistant",

          content:
            "Chùa Thiên Mụ là một di tích lịch sử nổi tiếng tại Huế.",

          citations: [
            {
              chunk_id: 6,
            },
          ],

          response_status:
            "answered",

          created_at:
            new Date(
              "2026-10-18T05:00:01.000Z"
            ),
        });

        const response =
          await request(app)
            .post(
              "/api/v1/chat/messages"
            )
            .set(
              "Authorization",
              "Bearer valid-token"
            )
            .send({
              question,
              language:
                "vi",
              attraction_id:
                3,
            });

        expect(
          response.status
        ).toBe(201);

        expect(
          response.body.data
            .response_status
        ).toBe(
          "answered"
        );

        expect(
          response.body.data
            .citations
        ).toHaveLength(
          1
        );

        expect(
          response.body.data
            .content_language
        ).toBe("vi");

        expect(
          response.body.data
            .fallback_used
        ).toBe(false);

        expect(
          response.body.data
            .attraction_id
        ).toBe(3);

        expect(
          searchKnowledge
        ).toHaveBeenCalledWith(
          question,
          "vi",
          3
        );
      }
    );

    it(
      "returns insufficient when no approved knowledge matches",
      async () => {
        const question =
          "Thông tin không tồn tại";

        mockVisitorMessage(
          question
        );

        vi.mocked(
          searchKnowledge
        ).mockResolvedValue({
          matches: [],

          content_language:
            "vi",

          fallback_used:
            false,
        });

        vi.mocked(
          createAssistantMessage
        ).mockResolvedValue({
          message_id: "22",
          session_id: "16",
          speaker:
            "assistant",

          content:
            "Tôi chưa có đủ thông tin đã được phê duyệt để trả lời câu hỏi này.",

          citations:
            null,

          response_status:
            "insufficient",

          created_at:
            new Date(),
        });

        const response =
          await request(app)
            .post(
              "/api/v1/chat/messages"
            )
            .set(
              "Authorization",
              "Bearer valid-token"
            )
            .send({
              question,
              language:
                "vi",
              attraction_id:
                3,
            });

        expect(
          response.status
        ).toBe(201);

        expect(
          response.body.data
            .response_status
        ).toBe(
          "insufficient"
        );

        expect(
          response.body.data
            .citations
        ).toBeNull();

        expect(
          createAssistantMessage
        ).toHaveBeenCalledWith(
          16,
          expect.any(String),
          null,
          "insufficient"
        );
      }
    );

    it(
      "returns 400 when chat request body is invalid",
      async () => {
        const response =
          await request(app)
            .post(
              "/api/v1/chat/messages"
            )
            .set(
              "Authorization",
              "Bearer valid-token"
            )
            .send({
              content:
                "Legacy field",
              language:
                "fr",
              attraction_id:
                -1,
            });

        expect(
          response.status
        ).toBe(400);

        expect(
          response.body.error
            .code
        ).toBe(
          "VALIDATION_ERROR"
        );

        expect(
          createVisitorMessage
        ).not.toHaveBeenCalled();

        expect(
          searchKnowledge
        ).not.toHaveBeenCalled();
      }
    );

    it(
      "returns 503 when embedding service is unavailable",
      async () => {
        const question =
          "Chùa Thiên Mụ có gì đặc biệt?";

        mockVisitorMessage(
          question
        );

        vi.mocked(
          searchKnowledge
        ).mockRejectedValue(
          new KnowledgeEmbeddingUnavailableError()
        );

        vi.mocked(
          createAssistantMessage
        ).mockResolvedValue({
          message_id: "23",
          session_id: "16",
          speaker:
            "assistant",

          content:
            "Dịch vụ tra cứu kiến thức đang tạm thời không khả dụng. Vui lòng thử lại sau.",

          citations:
            null,

          response_status:
            "error",

          created_at:
            new Date(),
        });

        const response =
          await request(app)
            .post(
              "/api/v1/chat/messages"
            )
            .set(
              "Authorization",
              "Bearer valid-token"
            )
            .send({
              question,
              language:
                "vi",
              attraction_id:
                3,
            });

        expect(
          response.status
        ).toBe(503);

        expect(
          response.body
        ).toEqual({
          error: {
            code:
              "AI_SERVICE_UNAVAILABLE",

            message:
              "Knowledge service is temporarily unavailable",
          },
        });

        expect(
          createAssistantMessage
        ).toHaveBeenCalledWith(
          16,
          expect.any(String),
          null,
          "error"
        );
      }
    );

    it(
      "returns chat history only for the authenticated visitor session",
      async () => {
        vi.mocked(
          findChatMessagesBySession
        ).mockResolvedValue([
          {
            message_id:
              "30",

            session_id:
              "16",

            speaker:
              "visitor",

            content:
              "Chùa Thiên Mụ?",

            citations:
              null,

            response_status:
              null,

            created_at:
              new Date(
                "2026-10-18T05:10:00.000Z"
              ),
          },

          {
            message_id:
              "31",

            session_id:
              "16",

            speaker:
              "assistant",

            content:
              "Thông tin Chùa Thiên Mụ.",

            citations:
              null,

            response_status:
              "answered",

            created_at:
              new Date(
                "2026-10-18T05:10:01.000Z"
              ),
          },
        ]);

        const response =
          await request(app)
            .get(
              "/api/v1/chat/messages"
            )
            .set(
              "Authorization",
              "Bearer valid-token"
            );

        expect(
          response.status
        ).toBe(200);

        expect(
          response.body.data
        ).toHaveLength(
          2
        );

        expect(
          response.body.data[0]
            .session_id
        ).toBe(16);

        expect(
          response.body.data[1]
            .session_id
        ).toBe(16);

        /*
         * Quan trọng:
         * session id lấy từ Bearer token,
         * client không tự truyền session id.
         */
        expect(
          findChatMessagesBySession
        ).toHaveBeenCalledWith(
          16
        );
      }
    );
  }
);