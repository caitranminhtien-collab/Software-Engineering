/// <reference path="../../src/types/express-session.d.ts" />
import express from "express";
import session from "express-session";
import request from "supertest";

import {
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from "vitest";

vi.mock(
  "../../src/services/staff-auth.service",
  async (importOriginal) => {
    const actual =
      await importOriginal<
        typeof import(
          "../../src/services/staff-auth.service"
        )
      >();

    return {
      ...actual,

      getActiveStaffById:
        vi.fn(),
    };
  }
);

import {
  getActiveStaffById,
  StaffAccountNotFoundError,
} from "../../src/services/staff-auth.service";

import {
  requireStaffSession,
} from "../../src/middleware/staff-auth.middleware";

import {
  requireStaffRole,
} from "../../src/middleware/staff-role.middleware";

import {
  createCsrfToken,
  requireCsrfToken,
} from "../../src/middleware/staff-csrf.middleware";

function createTestApp() {
  const app = express();

  app.use(
    express.json()
  );

  /*
   * Test dùng MemoryStore mặc định,
   * không cần Redis thật.
   */
  app.use(
    session({
      secret:
        "staff-security-test-secret",

      resave:
        false,

      saveUninitialized:
        true,

      cookie: {
        httpOnly:
          true,

        sameSite:
          "lax",

        secure:
          false,
      },
    })
  );

  /*
   * Route chỉ dùng để chuẩn bị
   * authenticated test session.
   */
  app.post(
    "/test/setup-session",
    (
      req,
      res
    ) => {
      req.session.staffId =
        1;

      const csrfToken =
        typeof req.body
          .csrf_token ===
        "string"
          ? req.body
              .csrf_token
          : undefined;

      if (csrfToken) {
        req.session.csrfToken =
          csrfToken;
      }

      res.status(204).end();
    }
  );

  app.get(
    "/test/staff-protected",
    requireStaffSession,
    (
      _req,
      res
    ) => {
      res.status(200).json({
        data:
          res.locals.staff,
      });
    }
  );

  app.get(
    "/test/admin-only",
    requireStaffSession,
    requireStaffRole(
      "admin"
    ),
    (
      _req,
      res
    ) => {
      res.status(200).json({
        data: {
          allowed:
            true,
        },
      });
    }
  );

  app.post(
    "/test/csrf-protected",
    requireCsrfToken,
    (
      _req,
      res
    ) => {
      res.status(200).json({
        data: {
          allowed:
            true,
        },
      });
    }
  );

  app.get(
    "/test/create-csrf",
    (
      req,
      res
    ) => {
      const token =
        createCsrfToken(
          req
        );

      res.status(200).json({
        data: {
          csrf_token:
            token,
        },
      });
    }
  );

  return app;
}

describe(
  "Staff security middleware",
  () => {
    beforeEach(() => {
      vi.mocked(
        getActiveStaffById
      ).mockReset();
    });

    it(
      "returns 401 when staff session is missing",
      async () => {
        const app =
          createTestApp();

        const response =
          await request(app)
            .get(
              "/test/staff-protected"
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
              "Staff authentication required",
          },
        });

        expect(
          getActiveStaffById
        ).not.toHaveBeenCalled();
      }
    );

    it(
      "returns 401 when the staff account is no longer active",
      async () => {
        vi.mocked(
          getActiveStaffById
        ).mockRejectedValue(
          new StaffAccountNotFoundError()
        );

        const app =
          createTestApp();

        const agent =
          request.agent(
            app
          );

        await agent
          .post(
            "/test/setup-session"
          )
          .send({});

        const response =
          await agent
            .get(
              "/test/staff-protected"
            );

        expect(
          response.status
        ).toBe(401);

        expect(
          response.body.error
            .code
        ).toBe(
          "UNAUTHORIZED"
        );

        expect(
          response.body.error
            .message
        ).toBe(
          "Staff session is no longer valid"
        );
      }
    );

    it(
      "allows an active staff session",
      async () => {
        vi.mocked(
          getActiveStaffById
        ).mockResolvedValue({
          id: 1,

          email:
            "admin@test.local",

          full_name:
            "Test Admin",

          role:
            "admin",
        });

        const app =
          createTestApp();

        const agent =
          request.agent(
            app
          );

        await agent
          .post(
            "/test/setup-session"
          )
          .send({});

        const response =
          await agent
            .get(
              "/test/staff-protected"
            );

        expect(
          response.status
        ).toBe(200);

        expect(
          response.body.data
        ).toEqual({
          id: 1,

          email:
            "admin@test.local",

          full_name:
            "Test Admin",

          role:
            "admin",
        });

        expect(
          getActiveStaffById
        ).toHaveBeenCalledWith(
          1
        );
      }
    );

    it(
      "returns 403 when staff role is not allowed",
      async () => {
        vi.mocked(
          getActiveStaffById
        ).mockResolvedValue({
          id: 2,

          email:
            "editor@test.local",

          full_name:
            "Test Editor",

          role:
            "editor",
        });

        const app =
          createTestApp();

        const agent =
          request.agent(
            app
          );

        await agent
          .post(
            "/test/setup-session"
          )
          .send({});

        const response =
          await agent
            .get(
              "/test/admin-only"
            );

        expect(
          response.status
        ).toBe(403);

        expect(
          response.body
            .error.code
        ).toBe(
          "FORBIDDEN"
        );
      }
    );

    it(
      "allows staff when role is permitted",
      async () => {
        vi.mocked(
          getActiveStaffById
        ).mockResolvedValue({
          id: 1,

          email:
            "admin@test.local",

          full_name:
            "Test Admin",

          role:
            "admin",
        });

        const app =
          createTestApp();

        const agent =
          request.agent(
            app
          );

        await agent
          .post(
            "/test/setup-session"
          )
          .send({});

        const response =
          await agent
            .get(
              "/test/admin-only"
            );

        expect(
          response.status
        ).toBe(200);

        expect(
          response.body.data
            .allowed
        ).toBe(true);
      }
    );

    it(
      "returns 403 when CSRF token is missing",
      async () => {
        const app =
          createTestApp();

        const agent =
          request.agent(
            app
          );

        await agent
          .post(
            "/test/setup-session"
          )
          .send({});

        const response =
          await agent
            .post(
              "/test/csrf-protected"
            );

        expect(
          response.status
        ).toBe(403);

        expect(
          response.body
            .error.code
        ).toBe(
          "CSRF_VALIDATION_ERROR"
        );
      }
    );

    it(
      "returns 403 when CSRF token is incorrect",
      async () => {
        const app =
          createTestApp();

        const agent =
          request.agent(
            app
          );

        await agent
          .post(
            "/test/setup-session"
          )
          .send({
            csrf_token:
              "correct-token",
          });

        const response =
          await agent
            .post(
              "/test/csrf-protected"
            )
            .set(
              "x-csrf-token",
              "wrong-token"
            );

        expect(
          response.status
        ).toBe(403);

        expect(
          response.body
            .error.code
        ).toBe(
          "CSRF_VALIDATION_ERROR"
        );
      }
    );

    it(
      "allows request when CSRF token matches the session",
      async () => {
        const app =
          createTestApp();

        const agent =
          request.agent(
            app
          );

        const csrfToken =
          "matching-test-token";

        await agent
          .post(
            "/test/setup-session"
          )
          .send({
            csrf_token:
              csrfToken,
          });

        const response =
          await agent
            .post(
              "/test/csrf-protected"
            )
            .set(
              "x-csrf-token",
              csrfToken
            );

        expect(
          response.status
        ).toBe(200);

        expect(
          response.body.data
            .allowed
        ).toBe(true);
      }
    );

    it(
      "creates a random CSRF token and stores it in the session",
      async () => {
        const app =
          createTestApp();

        const agent =
          request.agent(
            app
          );

        const response =
          await agent
            .get(
              "/test/create-csrf"
            );

        expect(
          response.status
        ).toBe(200);

        expect(
          response.body.data
            .csrf_token
        ).toMatch(
          /^[a-f0-9]{64}$/
        );

        const token =
          response.body.data
            .csrf_token;

        const protectedResponse =
          await agent
            .post(
              "/test/csrf-protected"
            )
            .set(
              "x-csrf-token",
              token
            );

        expect(
          protectedResponse
            .status
        ).toBe(200);
      }
    );
  }
);