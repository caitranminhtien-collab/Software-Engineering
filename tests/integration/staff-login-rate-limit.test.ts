import express from "express";
import request from "supertest";

import {
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from "vitest";

async function createTestApp() {
  // Mỗi test có một limiter và bộ đếm mới.
  vi.resetModules();

  const {
    staffLoginRateLimiter,
  } = await import(
    "../../src/middleware/staff-login-rate-limit.middleware"
  );

  const app = express();

  app.post(
    "/test/login",
    staffLoginRateLimiter,
    (req, res) => {
      // Chỉ mô phỏng kết quả đăng nhập để kiểm tra limiter.
      const successful =
        req.get("X-Test-Login-Result") === "success";

      res.sendStatus(successful ? 200 : 401);
    }
  );

  return app;
}

describe("Staff login rate limiter", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("blocks the sixth failed request from the same IP", async () => {
    const app = await createTestApp();

    for (let attempt = 0; attempt < 5; attempt++) {
      await request(app)
        .post("/test/login")
        .expect(401);
    }

    const blocked = await request(app)
      .post("/test/login")
      .expect(429);

    expect(blocked.body.error.code).toBe(
      "TOO_MANY_LOGIN_ATTEMPTS"
    );

    const retryAfter =
      Number(blocked.headers["retry-after"]);

    expect(retryAfter).toBeGreaterThan(0);
    expect(retryAfter).toBeLessThanOrEqual(900);
  });

  it("does not consume the failure allowance for successful requests", async () => {
    const app = await createTestApp();

    for (let attempt = 0; attempt < 8; attempt++) {
      await request(app)
        .post("/test/login")
        .set("X-Test-Login-Result", "success")
        .expect(200);
    }

    for (let attempt = 0; attempt < 5; attempt++) {
      await request(app)
        .post("/test/login")
        .expect(401);
    }

    await request(app)
      .post("/test/login")
      .expect(429);
  });
});