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
      updateStaffRoute: vi.fn(),
    };
  }
);

import {
  getActiveStaffById,
} from "../../src/services/staff-auth.service";

import {
  StaffRouteEditConflictError,
  StaffRouteNotFoundError,
  updateStaffRoute,
} from "../../src/services/staff-route.service";

import staffRouteRoutes from "../../src/routes/staff-route.routes";

const PATCH_PATH = "/api/v1/staff/routes/6";
const CSRF_TOKEN = "route-update-test-csrf-token";

const validBody = {
  name_vi: "Dấu ấn cung đình",
  description_vi: "Tuyến tham quan cần được kiểm chứng trước khi xuất bản.",
  estimated_minutes: 90,
};

const updatedRoute = {
  id: 6,
  slug: "royal",
  name_vi: validBody.name_vi,
  description_vi: validBody.description_vi,
  area_code: "HUE_ROUTE",
  estimated_minutes: validBody.estimated_minutes,
  verified_at: null,
  status: "draft",
  content_version: 2,
  created_by: 1,
  approved_by: null,
  published_at: null,
};

function createTestApp() {
  const app = express();

  app.use(express.json());

  // Test sử dụng MemoryStore, không cần Redis hoặc PostgreSQL thật.
  app.use(
    session({
      secret: "staff-route-update-test-secret",
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

    if (typeof req.body.csrf_token === "string") {
      req.session.csrfToken = req.body.csrf_token;
    }

    res.status(204).end();
  });

  app.use("/api/v1/staff/routes", staffRouteRoutes);

  return app;
}

async function createLoggedInAgent(withCsrf = true) {
  const agent = request.agent(createTestApp());

  await agent
    .post("/test/setup-session")
    .send(withCsrf ? { csrf_token: CSRF_TOKEN } : {});

  return agent;
}

describe("Staff route update PATCH API", () => {
  beforeEach(() => {
    vi.resetAllMocks();

    vi.mocked(getActiveStaffById).mockResolvedValue({
      id: 1,
      email: "admin@test.local",
      full_name: "Test Admin",
      role: "admin",
    });

    vi.mocked(updateStaffRoute).mockResolvedValue(updatedRoute);
  });

  it("returns 401 without staff session", async () => {
    const app = createTestApp();

    const response = await request(app)
      .patch(PATCH_PATH)
      .set("x-csrf-token", CSRF_TOKEN)
      .send(validBody);

    expect(response.status).toBe(401);
    expect(response.body.error.code).toBe("UNAUTHORIZED");
    expect(updateStaffRoute).not.toHaveBeenCalled();
  });

  it("returns 403 for reviewer role", async () => {
    vi.mocked(getActiveStaffById).mockResolvedValue({
      id: 1,
      email: "reviewer@test.local",
      full_name: "Test Reviewer",
      role: "reviewer",
    });

    const agent = await createLoggedInAgent();
    const response = await agent
      .patch(PATCH_PATH)
      .set("x-csrf-token", CSRF_TOKEN)
      .send(validBody);

    expect(response.status).toBe(403);
    expect(response.body.error.code).toBe("FORBIDDEN");
    expect(updateStaffRoute).not.toHaveBeenCalled();
  });

  it("returns 403 when CSRF token is missing", async () => {
    const agent = await createLoggedInAgent();
    const response = await agent.patch(PATCH_PATH).send(validBody);

    expect(response.status).toBe(403);
    expect(response.body.error.code).toBe("CSRF_VALIDATION_ERROR");
    expect(updateStaffRoute).not.toHaveBeenCalled();
  });

  it("returns 403 when CSRF token is incorrect", async () => {
    const agent = await createLoggedInAgent();
    const response = await agent
      .patch(PATCH_PATH)
      .set("x-csrf-token", "incorrect-token")
      .send(validBody);

    expect(response.status).toBe(403);
    expect(response.body.error.code).toBe("CSRF_VALIDATION_ERROR");
    expect(updateStaffRoute).not.toHaveBeenCalled();
  });

  it("allows admin to update route details", async () => {
    const agent = await createLoggedInAgent();
    const response = await agent
      .patch(PATCH_PATH)
      .set("x-csrf-token", CSRF_TOKEN)
      .send(validBody);

    expect(response.status).toBe(200);
    expect(response.body.data.id).toBe(6);
    expect(response.body.data.status).toBe("draft");
    expect(response.body.data.verified_at).toBeNull();
    expect(response.body.data.content_version).toBe(2);
    expect(updateStaffRoute).toHaveBeenCalledWith(6, {
      nameVi: validBody.name_vi,
      descriptionVi: validBody.description_vi,
      estimatedMinutes: 90,
    });
  });

  it("allows editor to update route details", async () => {
    vi.mocked(getActiveStaffById).mockResolvedValue({
      id: 1,
      email: "editor@test.local",
      full_name: "Test Editor",
      role: "editor",
    });

    const agent = await createLoggedInAgent();
    const response = await agent
      .patch(PATCH_PATH)
      .set("x-csrf-token", CSRF_TOKEN)
      .send({ name_vi: "Tên tuyến được sửa" });

    expect(response.status).toBe(200);
    expect(updateStaffRoute).toHaveBeenCalledWith(6, {
      nameVi: "Tên tuyến được sửa",
    });
  });

  it("returns 400 for invalid route ID", async () => {
    const agent = await createLoggedInAgent();
    const response = await agent
      .patch("/api/v1/staff/routes/abc")
      .set("x-csrf-token", CSRF_TOKEN)
      .send(validBody);

    expect(response.status).toBe(400);
    expect(response.body.error.code).toBe("VALIDATION_ERROR");
    expect(updateStaffRoute).not.toHaveBeenCalled();
  });

  it("returns 400 for invalid estimated_minutes", async () => {
    const agent = await createLoggedInAgent();
    const response = await agent
      .patch(PATCH_PATH)
      .set("x-csrf-token", CSRF_TOKEN)
      .send({ estimated_minutes: -5 });

    expect(response.status).toBe(400);
    expect(response.body.error.code).toBe("VALIDATION_ERROR");
    expect(updateStaffRoute).not.toHaveBeenCalled();
  });

  it("returns 400 for an empty update body", async () => {
    const agent = await createLoggedInAgent();
    const response = await agent
      .patch(PATCH_PATH)
      .set("x-csrf-token", CSRF_TOKEN)
      .send({});

    expect(response.status).toBe(400);
    expect(response.body.error.code).toBe("VALIDATION_ERROR");
    expect(updateStaffRoute).not.toHaveBeenCalled();
  });

  it("does not allow status or verified_at in PATCH body", async () => {
    const agent = await createLoggedInAgent();
    const response = await agent
      .patch(PATCH_PATH)
      .set("x-csrf-token", CSRF_TOKEN)
      .send({ status: "published", verified_at: "2026-10-21" });

    expect(response.status).toBe(400);
    expect(response.body.error.code).toBe("VALIDATION_ERROR");
    expect(updateStaffRoute).not.toHaveBeenCalled();
  });

  it("returns 404 when route does not exist", async () => {
    vi.mocked(updateStaffRoute).mockRejectedValue(
      new StaffRouteNotFoundError()
    );

    const agent = await createLoggedInAgent();
    const response = await agent
      .patch("/api/v1/staff/routes/999")
      .set("x-csrf-token", CSRF_TOKEN)
      .send(validBody);

    expect(response.status).toBe(404);
    expect(response.body.error.code).toBe("NOT_FOUND");
  });

  it("returns 409 when route is in_review", async () => {
    vi.mocked(updateStaffRoute).mockRejectedValue(
      new StaffRouteEditConflictError()
    );

    const agent = await createLoggedInAgent();
    const response = await agent
      .patch(PATCH_PATH)
      .set("x-csrf-token", CSRF_TOKEN)
      .send(validBody);

    expect(response.status).toBe(409);
    expect(response.body.error.code).toBe("ROUTE_EDIT_CONFLICT");
  });
});
