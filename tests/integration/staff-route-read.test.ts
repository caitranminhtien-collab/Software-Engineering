
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
    const actual = await importOriginal<
      typeof import("../../src/services/staff-auth.service")
    >();

    return {
      ...actual,
      getActiveStaffById: vi.fn(),
    };
  }
);

vi.mock(
  "../../src/services/staff-route.service",
  async (importOriginal) => {
    const actual = await importOriginal<
      typeof import("../../src/services/staff-route.service")
    >();

    return {
      ...actual,
      listStaffRoutes: vi.fn(),
      getStaffRoute: vi.fn(),
    };
  }
);

import {
  getActiveStaffById,
} from "../../src/services/staff-auth.service";

import {
  getStaffRoute,
  listStaffRoutes,
  StaffRouteNotFoundError,
} from "../../src/services/staff-route.service";

import staffRouteRoutes from "../../src/routes/staff-route.routes";

function createTestApp() {
  const app = express();

  app.use(express.json());

  app.use(
    session({
      secret: "staff-route-read-test-secret",
      resave: false,
      saveUninitialized: true,
      cookie: {
        httpOnly: true,
        sameSite: "lax",
        secure: false,
      },
    })
  );

  app.post("/test/setup-session", (req, res) => {
    req.session.staffId = 1;
    res.status(204).end();
  });

  app.use(
    "/api/v1/staff/routes",
    staffRouteRoutes
  );

  return app;
}

const sampleRoute = {
  id: 2,
  slug: "dev-hue-heritage-route",
  name_vi: "Tuyến tham quan di sản Huế",
  description_vi: "Tuyến tham quan thử nghiệm",
  area_code: "HUE_DEV",
  estimated_minutes: 120,
  verified_at: new Date("2026-10-15T12:22:48.455Z"),
  status: "published",
  content_version: 3,
  created_by: 1,
  approved_by: 1,
  published_at: new Date("2026-10-15T12:26:14.501Z"),
};

const sampleDetail = {
  route: sampleRoute,
  stops: [
    {
      attraction_id: 3,
      stop_order: 1,
      visit_minutes: 30,
      travel_minutes_from_previous: null,
    },
  ],
};

describe("Staff route read API", () => {
  beforeEach(() => {
    vi.mocked(getActiveStaffById).mockReset();
    vi.mocked(listStaffRoutes).mockReset();
    vi.mocked(getStaffRoute).mockReset();

    vi.mocked(getActiveStaffById).mockResolvedValue({
      id: 1,
      email: "admin@test.local",
      full_name: "Test Admin",
      role: "admin",
    });
  });

  it("returns 401 without staff session", async () => {
    const app = createTestApp();

    const response = await request(app)
      .get("/api/v1/staff/routes");

    expect(response.status).toBe(401);
    expect(listStaffRoutes).not.toHaveBeenCalled();
  });

  it("lists staff routes", async () => {
    vi.mocked(listStaffRoutes).mockResolvedValue([
      sampleRoute,
    ]);

    const agent = request.agent(createTestApp());

    await agent
      .post("/test/setup-session")
      .send({});

    const response = await agent
      .get("/api/v1/staff/routes");

    expect(response.status).toBe(200);
    expect(response.body.data).toHaveLength(1);
    expect(response.body.data[0].id).toBe(2);
    expect(response.body.data[0].status).toBe("published");
    expect(listStaffRoutes).toHaveBeenCalledOnce();
  });

  it("allows reviewer to read routes", async () => {
    vi.mocked(getActiveStaffById).mockResolvedValue({
      id: 1,
      email: "reviewer@test.local",
      full_name: "Test Reviewer",
      role: "reviewer",
    });

    vi.mocked(listStaffRoutes).mockResolvedValue([]);

    const agent = request.agent(createTestApp());

    await agent
      .post("/test/setup-session")
      .send({});

    const response = await agent
      .get("/api/v1/staff/routes");

    expect(response.status).toBe(200);
    expect(response.body.data).toEqual([]);
  });

  it("returns route detail with stops", async () => {
    vi.mocked(getStaffRoute).mockResolvedValue(
      sampleDetail
    );

    const agent = request.agent(createTestApp());

    await agent
      .post("/test/setup-session")
      .send({});

    const response = await agent
      .get("/api/v1/staff/routes/2");

    expect(response.status).toBe(200);
    expect(response.body.data.route.id).toBe(2);
    expect(response.body.data.stops).toHaveLength(1);
    expect(
      response.body.data.stops[0].attraction_id
    ).toBe(3);

    expect(getStaffRoute).toHaveBeenCalledWith(2);
  });

  it("returns 400 for invalid route id", async () => {
    const agent = request.agent(createTestApp());

    await agent
      .post("/test/setup-session")
      .send({});

    const response = await agent
      .get("/api/v1/staff/routes/abc");

    expect(response.status).toBe(400);
    expect(response.body.error.code)
      .toBe("VALIDATION_ERROR");

    expect(getStaffRoute).not.toHaveBeenCalled();
  });

  it("returns 404 when route does not exist", async () => {
    vi.mocked(getStaffRoute).mockRejectedValue(
      new StaffRouteNotFoundError()
    );

    const agent = request.agent(createTestApp());

    await agent
      .post("/test/setup-session")
      .send({});

    const response = await agent
      .get("/api/v1/staff/routes/999");

    expect(response.status).toBe(404);
    expect(response.body.error.code).toBe("NOT_FOUND");
  });
});
