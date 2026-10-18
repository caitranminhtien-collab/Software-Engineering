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

      createPublicVisitorSession:
        vi.fn(),
    };
  }
);

import app from "../../src/app";

import {
  createPublicVisitorSession,
} from "../../src/repositories/session.repository";

describe(
  "POST /api/v1/visitor-sessions",
  () => {
    beforeEach(() => {
      vi.mocked(
        createPublicVisitorSession
      ).mockReset();
    });

    it(
      "creates a visitor session with vi language",
      async () => {
        const startedAt =
          new Date();

        vi.mocked(
          createPublicVisitorSession
        ).mockImplementation(
          async (
            tokenHash,
            languageCode,
            expiresAt
          ) => ({
            session_id: "100",
            token_hash:
              tokenHash,
            language_code:
              languageCode,
            started_at:
              startedAt,
            expires_at:
              expiresAt,
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
          })
        );

        const response =
          await request(app)
            .post(
              "/api/v1/visitor-sessions"
            )
            .send({
              language_code:
                "vi",
            });

        expect(
          response.status
        ).toBe(201);

        expect(
          response.body.data
            .session_id
        ).toBe(100);

        expect(
          response.body.data
            .language_code
        ).toBe("vi");

        expect(
          response.body.data
            .access_scope
        ).toBe("public");

        expect(
          response.body.data.token
        ).toMatch(
          /^[a-f0-9]{64}$/
        );
      }
    );

    it(
      "defaults language to vi when language_code is omitted",
      async () => {
        vi.mocked(
          createPublicVisitorSession
        ).mockImplementation(
          async (
            tokenHash,
            languageCode,
            expiresAt
          ) => ({
            session_id: "101",
            token_hash:
              tokenHash,
            language_code:
              languageCode,
            started_at:
              new Date(),
            expires_at:
              expiresAt,
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
          })
        );

        const response =
          await request(app)
            .post(
              "/api/v1/visitor-sessions"
            )
            .send({});

        expect(
          response.status
        ).toBe(201);

        expect(
          response.body.data
            .language_code
        ).toBe("vi");

        expect(
          createPublicVisitorSession
        ).toHaveBeenCalledWith(
          expect.any(String),
          "vi",
          expect.any(Date)
        );
      }
    );

    it(
      "rejects an unsupported language",
      async () => {
        const response =
          await request(app)
            .post(
              "/api/v1/visitor-sessions"
            )
            .send({
              language_code:
                "fr",
            });

        expect(
          response.status
        ).toBe(400);

        expect(
          createPublicVisitorSession
        ).not.toHaveBeenCalled();
      }
    );

    it(
      "stores only the token hash in the repository",
      async () => {
        vi.mocked(
          createPublicVisitorSession
        ).mockImplementation(
          async (
            tokenHash,
            languageCode,
            expiresAt
          ) => ({
            session_id: "102",
            token_hash:
              tokenHash,
            language_code:
              languageCode,
            started_at:
              new Date(),
            expires_at:
              expiresAt,
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
          })
        );

        const response =
          await request(app)
            .post(
              "/api/v1/visitor-sessions"
            )
            .send({
              language_code:
                "vi",
            });

        const rawToken =
          response.body.data.token;

        const call =
          vi.mocked(
            createPublicVisitorSession
          ).mock.calls[0];

        const storedHash =
          call[0];

        expect(
          rawToken
        ).toMatch(
          /^[a-f0-9]{64}$/
        );

        expect(
          storedHash
        ).toMatch(
          /^[a-f0-9]{64}$/
        );

        expect(
          storedHash
        ).not.toBe(
          rawToken
        );
      }
    );

    it(
      "creates an expiration time about 24 hours in the future",
      async () => {
        const before =
          Date.now();

        vi.mocked(
          createPublicVisitorSession
        ).mockImplementation(
          async (
            tokenHash,
            languageCode,
            expiresAt
          ) => ({
            session_id: "103",
            token_hash:
              tokenHash,
            language_code:
              languageCode,
            started_at:
              new Date(),
            expires_at:
              expiresAt,
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
          })
        );

        await request(app)
          .post(
            "/api/v1/visitor-sessions"
          )
          .send({
            language_code:
              "vi",
          });

        const after =
          Date.now();

        const call =
          vi.mocked(
            createPublicVisitorSession
          ).mock.calls[0];

        const expiresAt =
          call[2].getTime();

        const expectedDuration =
          24 *
          60 *
          60 *
          1000;

        expect(
          expiresAt
        ).toBeGreaterThanOrEqual(
          before +
            expectedDuration
        );

        expect(
          expiresAt
        ).toBeLessThanOrEqual(
          after +
            expectedDuration
        );
      }
    );
  }
);