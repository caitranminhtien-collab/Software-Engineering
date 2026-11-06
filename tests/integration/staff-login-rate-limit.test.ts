import express from "express";
import request from "supertest";

import {
  afterEach,
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from "vitest";
import {
  cleanupBe09,
  createBe09App,
} from "../helpers/be09-app";

afterEach(cleanupBe09);

async function createTestApp() {
  // Mỗi test có một limiter và bộ đếm mới.
  vi.resetModules();

  const {
    staffLoginRateLimiter,
  } = await import(
    "../../src/middleware/staff-login-rate-limit.middleware"
  );

  const app = express();

  // Chỉ dùng trong ứng dụng kiểm thử độc lập.
  // Cho phép Supertest mô phỏng IP từ reverse proxy.
  app.set("trust proxy", 1);  

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

  it("isolates failed login limits between different IPs", async () => {
  const app = await createTestApp();

  const ipA = "192.0.2.10";
  const ipB = "192.0.2.20";

  // IP A đăng nhập thất bại 5 lần.
  for (let attempt = 0; attempt < 5; attempt++) {
    await request(app)
      .post("/test/login")
      .set("X-Forwarded-For", ipA)
      .expect(401);
  }

  // IP A bị chặn ở lần thứ 6.
  await request(app)
    .post("/test/login")
    .set("X-Forwarded-For", ipA)
    .expect(429);

  // IP B vẫn hoạt động độc lập.
  await request(app)
    .post("/test/login")
    .set("X-Forwarded-For", ipB)
    .expect(401);
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

  it("restores the allowance after the fifteen-minute window", async () => {
    vi.useFakeTimers({
      toFake: ["Date", "setInterval", "clearInterval"],
    });
    const app = await createTestApp();

    for (let attempt = 0; attempt < 5; attempt++) {
      await request(app).post("/test/login").expect(401);
    }
    await request(app).post("/test/login").expect(429);
    await vi.advanceTimersByTimeAsync(15 * 60 * 1000 + 1);
    await request(app).post("/test/login").expect(401);
  });

  it("limits the real login router before the authentication service", async () => {
    const { app, auth, authenticate } = await createBe09App();
    authenticate.mockRejectedValue(new auth.InvalidStaffCredentialsError());

    for (let attempt = 0; attempt < 5; attempt++) {
      await request(app)
        .post("/api/v1/staff/auth/login")
        .send({
          email: "be09@example.invalid",
          password: "synthetic-rejected-password",
        })
        .expect(401);
    }
    expect(authenticate).toHaveBeenCalledTimes(5);
    const blocked = await request(app)
      .post("/api/v1/staff/auth/login")
      .send({
        email: "be09@example.invalid",
        password: "synthetic-rejected-password",
      })
      .expect(429);
    expect(blocked.body.error.code).toBe("TOO_MANY_LOGIN_ATTEMPTS");
    expect(authenticate).toHaveBeenCalledTimes(5);
  });
});
