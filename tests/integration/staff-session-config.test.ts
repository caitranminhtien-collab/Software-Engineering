import request from "supertest";
import {
  afterEach,
  describe,
  expect,
  it,
  vi,
} from "vitest";
import {
  cleanupBe09,
  createBe09App,
} from "../helpers/be09-app";

const AUTH_PATH = "/api/v1/staff/auth";
const credentials = {
  email: "be09@example.invalid",
  password: "synthetic-test-password",
};

function cookiePair(response: request.Response) {
  const cookies = response.headers["set-cookie"] as unknown as string[];
  expect(cookies).toHaveLength(1);
  return cookies[0].split(";")[0];
}

afterEach(cleanupBe09);

describe("BE09 real session configuration and lifecycle", () => {
  it("sets cookie attributes and eight-hour expiry from the real configuration", async () => {
    vi.useFakeTimers({ toFake: ["Date"] });
    vi.setSystemTime(new Date("2030-01-01T00:00:00Z"));
    const { app } = await createBe09App();
    const response = await request(app)
      .post("/test/session")
      .expect(200);
    const pair = cookiePair(response);
    const cookie = response.headers["set-cookie"][0];

    expect(pair).toMatch(/^hue_staff_session=.+$/);
    expect(cookie).toContain("Path=/;");
    expect(cookie).toContain("HttpOnly");
    expect(cookie).toContain("SameSite=Lax");
    expect(cookie).not.toMatch(/; Secure(?:;|$)/);
    const expiry = /Expires=([^;]+)/.exec(cookie);
    expect(expiry).not.toBeNull();
    expect(new Date(expiry![1]).getTime() - Date.now())
      .toBe(8 * 60 * 60 * 1000);
  });

  it("sets Secure for simulated production HTTPS and omits the cookie over HTTP", async () => {
    const { app } = await createBe09App(true);
    const https = await request(app)
      .post("/test/session")
      .set("X-Forwarded-Proto", "https")
      .expect(200);
    expect(https.headers["set-cookie"][0]).toMatch(/; Secure(?:;|$)/);

    const http = await request(app)
      .post("/test/session")
      .expect(200);
    expect(http.headers["set-cookie"]).toBeUndefined();
  });

  it("does not persist or issue a cookie for an unmodified anonymous session", async () => {
    const { app, store } = await createBe09App();
    const write = vi.spyOn(store, "set");
    const response = await request(app)
      .get("/test/unmodified")
      .expect(204);
    expect(response.headers["set-cookie"]).toBeUndefined();
    expect(write).not.toHaveBeenCalled();
  });

  it("rotates the session on login and rejects the previous session cookie", async () => {
    const { app } = await createBe09App();
    const initial = await request(app).post("/test/session").expect(200);
    const oldCookie = cookiePair(initial);
    const login = await request(app)
      .post(`${AUTH_PATH}/login`)
      .set("Cookie", oldCookie)
      .send(credentials)
      .expect(200);
    const newCookie = cookiePair(login);

    expect(newCookie).not.toBe(oldCookie);
    await request(app)
      .get(`${AUTH_PATH}/me`)
      .set("Cookie", oldCookie)
      .expect(401);
    await request(app)
      .get(`${AUTH_PATH}/me`)
      .set("Cookie", newCookie)
      .expect(200);
  });

  it("expires the production cookie on logout and invalidates its stored session", async () => {
    const { app } = await createBe09App(true);
    const login = await request(app)
      .post(`${AUTH_PATH}/login`)
      .set("X-Forwarded-Proto", "https")
      .send(credentials)
      .expect(200);
    const cookie = cookiePair(login);
    const token = await request(app)
      .get(`${AUTH_PATH}/csrf`)
      .set("Cookie", cookie)
      .set("X-Forwarded-Proto", "https")
      .expect(200);
    const logout = await request(app)
      .post(`${AUTH_PATH}/logout`)
      .set("Cookie", cookie)
      .set("X-Forwarded-Proto", "https")
      .set("x-csrf-token", token.body.data.csrf_token)
      .expect(200);
    const cleared = logout.headers["set-cookie"][0];

    expect(cleared).toMatch(/^hue_staff_session=;/);
    expect(cleared).toContain("Path=/;");
    expect(cleared).toContain("HttpOnly");
    expect(cleared).toContain("SameSite=Lax");
    expect(cleared).toMatch(/; Secure(?:;|$)/);
    const expiry = /Expires=([^;]+)/.exec(cleared);
    expect(expiry).not.toBeNull();
    expect(new Date(expiry![1]).getTime()).toBeLessThan(Date.now());
    await request(app)
      .get(`${AUTH_PATH}/me`)
      .set("Cookie", cookie)
      .expect(401);
  });

  it("destroys an inactive account session even if the account becomes active again", async () => {
    const { app, auth, activeStaff, staff, store } = await createBe09App();
    const setup = await request(app).post("/test/session").expect(200);
    const cookie = cookiePair(setup);
    const destroy = vi.spyOn(store, "destroy");
    activeStaff.mockRejectedValueOnce(new auth.StaffAccountNotFoundError());

    await request(app)
      .get(`${AUTH_PATH}/me`)
      .set("Cookie", cookie)
      .expect(401);
    expect(destroy).toHaveBeenCalledWith(
      setup.body.sessionId,
      expect.any(Function)
    );
    activeStaff.mockResolvedValue(staff);
    activeStaff.mockClear();
    await request(app)
      .get(`${AUTH_PATH}/me`)
      .set("Cookie", cookie)
      .expect(401);
    expect(activeStaff).not.toHaveBeenCalled();
  });
});

describe("BE09 CSRF session boundaries on the real logout router", () => {
  it.each(["same-length mismatch", "missing session token"])(
    "rejects %s without destroying the authenticated session",
    async (scenario) => {
      const { app, store } = await createBe09App();
      const agent = request.agent(app);
      await agent.post("/test/session").expect(200);
      let header = "a".repeat(64);
      if (scenario === "same-length mismatch") {
        const response = await agent.get(`${AUTH_PATH}/csrf`).expect(200);
        const token = response.body.data.csrf_token as string;
        const first = token[0] === "a" ? "b" : "a";
        header = first + token.slice(1);
        expect(header).toHaveLength(token.length);
      }
      const destroy = vi.spyOn(store, "destroy");
      const rejected = await agent
        .post(`${AUTH_PATH}/logout`)
        .set("x-csrf-token", header)
        .expect(403);
      expect(rejected.body.error.code).toBe("CSRF_VALIDATION_ERROR");
      expect(destroy).not.toHaveBeenCalled();
      await agent.get(`${AUTH_PATH}/me`).expect(200);
    }
  );

  it("rejects another session's token and a token replaced by reissue", async () => {
    const { app } = await createBe09App();
    const first = request.agent(app);
    const second = request.agent(app);
    await first.post("/test/session").expect(200);
    await second.post("/test/session").expect(200);
    const oldToken = await first.get(`${AUTH_PATH}/csrf`).expect(200);
    await second.get(`${AUTH_PATH}/csrf`).expect(200);
    const crossSession = await second
      .post(`${AUTH_PATH}/logout`)
      .set("x-csrf-token", oldToken.body.data.csrf_token)
      .expect(403);
    expect(crossSession.body.error.code).toBe("CSRF_VALIDATION_ERROR");

    const replacement = await first.get(`${AUTH_PATH}/csrf`).expect(200);
    expect(replacement.body.data.csrf_token).not.toBe(oldToken.body.data.csrf_token);
    const stale = await first
      .post(`${AUTH_PATH}/logout`)
      .set("x-csrf-token", oldToken.body.data.csrf_token)
      .expect(403);
    expect(stale.body.error.code).toBe("CSRF_VALIDATION_ERROR");
    await first
      .post(`${AUTH_PATH}/logout`)
      .set("x-csrf-token", replacement.body.data.csrf_token)
      .expect(200);
    await second.get(`${AUTH_PATH}/me`).expect(200);
  });
});

describe("BE09 login input boundaries", () => {
  const cases = [
    {
      label: "missing email",
      body: { password: "test" },
    },
    {
      label: "missing password",
      body: { email: credentials.email },
    },
    {
      label: "object email",
      body: { email: {}, password: "test" },
    },
    {
      label: "numeric password",
      body: { email: credentials.email, password: 123 },
    },
    {
      label: "201-character password",
      body: {
        email: credentials.email,
        password: "x".repeat(201),
      },
    },
  ];

  it.each(cases)("rejects $label before authentication", async ({ body }) => {
    const { app, authenticate } = await createBe09App();
    const response = await request(app)
      .post(`${AUTH_PATH}/login`)
      .send(body)
      .expect(400);
    expect(response.body.error.code).toBe("VALIDATION_ERROR");
    expect(authenticate).not.toHaveBeenCalled();
  });

  it("passes a 200-character password to authentication unchanged", async () => {
    const { app, authenticate } = await createBe09App();
    const password = "x".repeat(200);
    await request(app)
      .post(`${AUTH_PATH}/login`)
      .send({ email: credentials.email, password })
      .expect(200);
    expect(authenticate).toHaveBeenCalledExactlyOnceWith(
      credentials.email,
      password
    );
  });
});
