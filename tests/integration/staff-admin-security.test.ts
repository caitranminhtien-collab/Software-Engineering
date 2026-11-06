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

async function createAdminApp() {
  const context = await createBe09App();
  const accounts = await import("../../src/controllers/staff-account.controller");
  const analytics = await import("../../src/controllers/staff-analytics.controller");
  const presence = await import("../../src/services/visitor-presence.service");
  const listAccounts = vi.spyOn(accounts, "listStaffAccountsController")
    .mockImplementation(async (_req, res) => {
      res.status(200).json({ data: [] });
    });
  const createAccount = vi.spyOn(accounts, "createStaffAccountController")
    .mockImplementation(async (_req, res) => {
      res.sendStatus(201);
    });
  const analyticsHandler = vi.spyOn(analytics, "getStaffAnalyticsController")
    .mockImplementation(async (_req, res) => {
      res.status(200).json({ data: {} });
    });
  const presenceHandler = vi.spyOn(presence, "getActiveVisitorCount")
    .mockResolvedValue(3);
  const { default: accountRoutes } = await import("../../src/routes/staff-account.routes");
  const { default: analyticsRoutes } = await import("../../src/routes/staff-analytics.routes");
  const { default: presenceRoutes } = await import("../../src/routes/staff-visitor-presence.routes");
  context.app.use("/api/v1/staff/accounts", accountRoutes);
  context.app.use("/api/v1/staff/analytics", analyticsRoutes);
  context.app.use("/api/v1/staff/visitor-presence", presenceRoutes);

  return {
    ...context,
    createAccount,
    handlers: {
      accounts: listAccounts,
      analytics: analyticsHandler,
      "visitor-presence": presenceHandler,
    },
  };
}

afterEach(cleanupBe09);

describe("BE09 admin router middleware wiring", () => {
  const resources = ["accounts", "analytics", "visitor-presence"] as const;

  it.each(resources)("rejects anonymous GET %s before its handler", async (resource) => {
    const { app, handlers, activeStaff } = await createAdminApp();
    const response = await request(app)
      .get(`/api/v1/staff/${resource}`)
      .expect(401);
    expect(response.body.error.code).toBe("UNAUTHORIZED");
    expect(activeStaff).not.toHaveBeenCalled();
    expect(handlers[resource]).not.toHaveBeenCalled();
  });

  const denied = resources.flatMap((resource) => {
    return (["editor", "reviewer"] as const).map((role) => {
      return { resource, role };
    });
  });

  it.each(denied)("rejects $role GET $resource before its handler", async ({ resource, role }) => {
    const { app, handlers, activeStaff, staff } = await createAdminApp();
    activeStaff.mockResolvedValue({ ...staff, role });
    const agent = request.agent(app);
    await agent.post("/test/session").expect(200);
    const response = await agent.get(`/api/v1/staff/${resource}`).expect(403);
    expect(response.body.error.code).toBe("FORBIDDEN");
    expect(handlers[resource]).not.toHaveBeenCalled();
  });

  it.each(resources)("allows admin GET %s without a CSRF token", async (resource) => {
    const { app, handlers } = await createAdminApp();
    const agent = request.agent(app);
    await agent.post("/test/session").expect(200);
    await agent.get(`/api/v1/staff/${resource}`).expect(200);
    expect(handlers[resource]).toHaveBeenCalledTimes(1);
  });

  it.each([
    { role: null, status: 401, code: "UNAUTHORIZED" },
    { role: "editor", status: 403, code: "FORBIDDEN" },
    { role: "admin", status: 403, code: "CSRF_VALIDATION_ERROR" },
  ] as const)(
    "checks auth, role and CSRF before validating an invalid account body ($role)",
    async ({ role, status, code }) => {
      const { app, activeStaff, staff, createAccount } = await createAdminApp();
      const agent = request.agent(app);
      if (role) {
        activeStaff.mockResolvedValue({ ...staff, role });
        await agent.post("/test/session").expect(200);
      }
      const response = await agent
        .post("/api/v1/staff/accounts")
        .send({})
        .expect(status);
      expect(response.body.error.code).toBe(code);
      expect(createAccount).not.toHaveBeenCalled();
    }
  );
});
