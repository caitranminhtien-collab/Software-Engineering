import express from "express";
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
  () => ({
    findActiveVisitorSessionByTokenHash:
      vi.fn(),
  })
);

import {
  requireVisitorSession,
} from "../../src/middleware/visitor-auth.middleware";

import {
  findActiveVisitorSessionByTokenHash,
} from "../../src/repositories/session.repository";

function createTestApp() {
  const app = express();

  app.use(express.json());

  app.get(
    "/protected",
    requireVisitorSession,
    (_req, res) => {
      res.status(200).json({
        data:
          res.locals
            .visitorSession,
      });
    }
  );

  return app;
}

describe(
  "Visitor authentication middleware",
  () => {
    beforeEach(() => {
      vi.mocked(
        findActiveVisitorSessionByTokenHash
      ).mockReset();
    });

    it(
      "returns 401 when Authorization header is missing",
      async () => {
        const app =
          createTestApp();

        const response =
          await request(app)
            .get(
              "/protected"
            );

        expect(
          response.status
        ).toBe(401);

        expect(
          response.body
        ).toEqual({
          error: {
            code:
              "UNAUTHORIZED",
            message:
              "Visitor token is required",
          },
        });

        expect(
          findActiveVisitorSessionByTokenHash
        ).not.toHaveBeenCalled();
      }
    );

    it(
      "returns 401 when visitor session is invalid or expired",
      async () => {
        vi.mocked(
          findActiveVisitorSessionByTokenHash
        ).mockResolvedValue(
          null
        );

        const app =
          createTestApp();

        const response =
          await request(app)
            .get(
              "/protected"
            )
            .set(
              "Authorization",
              "Bearer fake-token"
            );

        expect(
          response.status
        ).toBe(401);

        expect(
          response.body
        ).toEqual({
          error: {
            code:
              "UNAUTHORIZED",
            message:
              "Visitor session is invalid or expired",
          },
        });

        expect(
          findActiveVisitorSessionByTokenHash
        ).toHaveBeenCalledTimes(
          1
        );

        const tokenHash =
          vi.mocked(
            findActiveVisitorSessionByTokenHash
          ).mock.calls[0][0];

        expect(
          tokenHash
        ).toMatch(
          /^[a-f0-9]{64}$/
        );

        expect(
          tokenHash
        ).not.toBe(
          "fake-token"
        );
      }
    );

    it(
      "allows a valid visitor session and exposes session context",
      async () => {
        vi.mocked(
          findActiveVisitorSessionByTokenHash
        ).mockResolvedValue({
          session_id: "16",

          token_hash:
            "stored-hash",

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
            "attraction",

          access_route_id:
            null,

          access_attraction_id:
            "3",

          access_expires_at:
            null,
        });

        const app =
          createTestApp();

        const response =
          await request(app)
            .get(
              "/protected"
            )
            .set(
              "Authorization",
              "Bearer valid-token"
            );

        expect(
          response.status
        ).toBe(200);

        expect(
          response.body
        ).toEqual({
          data: {
            sessionId: 16,
            languageCode:
              "vi",
            accessScope:
              "attraction",
            accessRouteId:
              null,
            accessAttractionId:
              3,
            accessExpiresAt: null,
          },
        });

        expect(
          findActiveVisitorSessionByTokenHash
        ).toHaveBeenCalledTimes(
          1
        );
      }
    );

    it(
      "returns 500 when visitor session lookup fails",
      async () => {
        vi.mocked(
          findActiveVisitorSessionByTokenHash
        ).mockRejectedValue(
          new Error(
            "Database failure"
          )
        );

        vi.spyOn(
          console,
          "error"
        ).mockImplementation(
          () => undefined
        );

        const app =
          createTestApp();

        const response =
          await request(app)
            .get(
              "/protected"
            )
            .set(
              "Authorization",
              "Bearer valid-token"
            );

        expect(
          response.status
        ).toBe(500);

        expect(
          response.body
        ).toEqual({
          error: {
            code:
              "INTERNAL_SERVER_ERROR",
            message:
              "Unable to authenticate visitor session",
          },
        });

        vi.restoreAllMocks();
      }
    );
  }
);