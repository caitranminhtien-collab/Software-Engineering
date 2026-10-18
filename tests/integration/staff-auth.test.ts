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

/*
 * Không test rate limit trong file này.
 * Rate limiter sẽ có test riêng.
 */
vi.mock(
  "../../src/middleware/staff-login-rate-limit.middleware",
  () => ({
    staffLoginRateLimiter: (
      _req: unknown,
      _res: unknown,
      next: () => void
    ) => {
      next();
    },
  })
);

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

      authenticateStaff:
        vi.fn(),

      getActiveStaffById:
        vi.fn(),
    };
  }
);

import staffAuthRoutes
  from "../../src/routes/staff-auth.routes";

import {
  authenticateStaff,
  getActiveStaffById,
  InvalidStaffCredentialsError,
} from "../../src/services/staff-auth.service";

function createTestApp() {
  const app = express();

  app.use(
    express.json()
  );

  /*
   * MemoryStore chỉ dùng cho automated test.
   * Production vẫn dùng RedisStore.
   */
  app.use(
    session({
      name:
        "hue_staff_session",

      secret:
        "staff-auth-test-secret",

      resave:
        false,

      saveUninitialized:
        false,

      cookie: {
        httpOnly:
          true,

        sameSite:
          "lax",

        secure:
          false,

        maxAge:
          8 *
          60 *
          60 *
          1000,
      },
    })
  );

  app.use(
    "/api/v1/staff/auth",
    staffAuthRoutes
  );

  return app;
}

describe(
  "Staff authentication API",
  () => {
    beforeEach(() => {
      vi.mocked(
        authenticateStaff
      ).mockReset();

      vi.mocked(
        getActiveStaffById
      ).mockReset();
    });

    it(
      "returns 400 when login body is invalid",
      async () => {
        const app =
          createTestApp();

        const response =
          await request(app)
            .post(
              "/api/v1/staff/auth/login"
            )
            .send({
              email:
                "invalid-email",

              password:
                "",
            });

        expect(
          response.status
        ).toBe(400);

        expect(
          response.body
            .error.code
        ).toBe(
          "VALIDATION_ERROR"
        );

        expect(
          authenticateStaff
        ).not.toHaveBeenCalled();
      }
    );

    it(
      "returns 401 when credentials are invalid",
      async () => {
        vi.mocked(
          authenticateStaff
        ).mockRejectedValue(
          new InvalidStaffCredentialsError()
        );

        const app =
          createTestApp();

        const response =
          await request(app)
            .post(
              "/api/v1/staff/auth/login"
            )
            .send({
              email:
                "staff@example.com",

              password:
                "wrong-password",
            });

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
              "Invalid email or password",
          },
        });
      }
    );

    it(
      "logs in successfully and persists the staff session",
      async () => {
        vi.mocked(
          authenticateStaff
        ).mockResolvedValue({
          id: 1,

          email:
            "admin@example.com",

          full_name:
            "Test Admin",

          role:
            "admin",
        });

        vi.mocked(
          getActiveStaffById
        ).mockResolvedValue({
          id: 1,

          email:
            "admin@example.com",

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

        const loginResponse =
          await agent
            .post(
              "/api/v1/staff/auth/login"
            )
            .send({
              email:
                "ADMIN@EXAMPLE.COM",

              password:
                "correct-password",
            });

        expect(
          loginResponse.status
        ).toBe(200);

        expect(
          loginResponse.body.data
        ).toEqual({
          id: 1,

          email:
            "admin@example.com",

          full_name:
            "Test Admin",

          role:
            "admin",
        });

        /*
         * Validator phải normalize
         * email về lowercase.
         */
        expect(
          authenticateStaff
        ).toHaveBeenCalledWith(
          "admin@example.com",
          "correct-password"
        );

        /*
         * Cookie session phải được tạo.
         */
        expect(
          loginResponse.headers[
            "set-cookie"
          ]
        ).toBeDefined();

        /*
         * Dùng cùng agent để chứng minh
         * staffId tồn tại trong session.
         */
        const meResponse =
          await agent
            .get(
              "/api/v1/staff/auth/me"
            );

        expect(
          meResponse.status
        ).toBe(200);

        expect(
          meResponse.body.data
            .id
        ).toBe(1);

        expect(
          getActiveStaffById
        ).toHaveBeenCalledWith(
          1
        );
      }
    );

    it(
      "returns a CSRF token for an authenticated staff session",
      async () => {
        vi.mocked(
          authenticateStaff
        ).mockResolvedValue({
          id: 1,
          email:
            "admin@example.com",
          full_name:
            "Test Admin",
          role:
            "admin",
        });

        vi.mocked(
          getActiveStaffById
        ).mockResolvedValue({
          id: 1,
          email:
            "admin@example.com",
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
            "/api/v1/staff/auth/login"
          )
          .send({
            email:
              "admin@example.com",

            password:
              "correct-password",
          });

        const response =
          await agent
            .get(
              "/api/v1/staff/auth/csrf"
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
      }
    );

    it(
      "rejects logout when CSRF token is missing",
      async () => {
        vi.mocked(
          authenticateStaff
        ).mockResolvedValue({
          id: 1,
          email:
            "admin@example.com",
          full_name:
            "Test Admin",
          role:
            "admin",
        });

        vi.mocked(
          getActiveStaffById
        ).mockResolvedValue({
          id: 1,
          email:
            "admin@example.com",
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
            "/api/v1/staff/auth/login"
          )
          .send({
            email:
              "admin@example.com",

            password:
              "correct-password",
          });

        const response =
          await agent
            .post(
              "/api/v1/staff/auth/logout"
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
      "logs out with a valid CSRF token and destroys the staff session",
      async () => {
        vi.mocked(
          authenticateStaff
        ).mockResolvedValue({
          id: 1,
          email:
            "admin@example.com",
          full_name:
            "Test Admin",
          role:
            "admin",
        });

        vi.mocked(
          getActiveStaffById
        ).mockResolvedValue({
          id: 1,
          email:
            "admin@example.com",
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
            "/api/v1/staff/auth/login"
          )
          .send({
            email:
              "admin@example.com",

            password:
              "correct-password",
          });

        const csrfResponse =
          await agent
            .get(
              "/api/v1/staff/auth/csrf"
            );

        const csrfToken =
          csrfResponse.body.data
            .csrf_token;

        const logoutResponse =
          await agent
            .post(
              "/api/v1/staff/auth/logout"
            )
            .set(
              "x-csrf-token",
              csrfToken
            );

        expect(
          logoutResponse.status
        ).toBe(200);

        expect(
          logoutResponse.body
        ).toEqual({
          data: {
            message:
              "Staff logged out successfully",
          },
        });

        /*
         * Sau logout cookie/session cũ
         * không còn staffId.
         */
        const meResponse =
          await agent
            .get(
              "/api/v1/staff/auth/me"
            );

        expect(
          meResponse.status
        ).toBe(401);
      }
    );
  }
);