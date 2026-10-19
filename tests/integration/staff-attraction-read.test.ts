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
      getActiveStaffById: vi.fn(),
    };
  }
);

vi.mock(
  "../../src/services/staff-attraction.service",
  async (importOriginal) => {
    const actual =
      await importOriginal<
        typeof import(
          "../../src/services/staff-attraction.service"
        )
      >();

    return {
      ...actual,
      listStaffAttractions: vi.fn(),
      getStaffAttraction: vi.fn(),
    };
  }
);

import {
  getActiveStaffById,
} from "../../src/services/staff-auth.service";

import {
  getStaffAttraction,
  listStaffAttractions,
  StaffAttractionNotFoundError,
} from "../../src/services/staff-attraction.service";

import staffAttractionRoutes from "../../src/routes/staff-attraction.routes";

function createTestApp() {
  const app = express();

  app.use(express.json());

  app.use(
    session({
      secret:
        "staff-attraction-read-test-secret",
      resave: false,
      saveUninitialized: true,
      cookie: {
        httpOnly: true,
        sameSite: "lax",
        secure: false,
      },
    })
  );

  app.post(
    "/test/setup-session",
    (req, res) => {
      req.session.staffId = 1;
      res.status(204).end();
    }
  );

  app.use(
    "/api/v1/staff/attractions",
    staffAttractionRoutes
  );

  return app;
}

const sampleAttraction = {
  id: 6,
  slug: "demo-attraction",
  area_code: "HUE_DEMO",
  latitude: 16.4637,
  longitude: 107.5909,
  trigger_radius_m: 50,
  status: "published" as const,
  content_version: 1,
  created_by: 1,
  approved_by: 1,
  published_at:
    new Date(
      "2026-10-19T06:27:07.256Z"
    ),
  updated_at:
    new Date(
      "2026-10-19T06:26:40.546Z"
    ),
};

describe(
  "Staff attraction read API",
  () => {
    beforeEach(() => {
      vi.mocked(
        getActiveStaffById
      ).mockReset();

      vi.mocked(
        listStaffAttractions
      ).mockReset();

      vi.mocked(
        getStaffAttraction
      ).mockReset();

      vi.mocked(
        getActiveStaffById
      ).mockResolvedValue({
        id: 1,
        email:
          "admin@test.local",
        full_name:
          "Test Admin",
        role: "admin",
      });
    });

    it(
      "returns 401 when staff session is missing",
      async () => {
        const app =
          createTestApp();

        const response =
          await request(app)
            .get(
              "/api/v1/staff/attractions"
            );

        expect(
          response.status
        ).toBe(401);

        expect(
          listStaffAttractions
        ).not.toHaveBeenCalled();
      }
    );

    it(
      "lists staff attractions",
      async () => {
        vi.mocked(
          listStaffAttractions
        ).mockResolvedValue([
          sampleAttraction,
        ]);

        const app =
          createTestApp();

        const agent =
          request.agent(app);

        await agent
          .post(
            "/test/setup-session"
          )
          .send({});

        const response =
          await agent.get(
            "/api/v1/staff/attractions"
          );

        expect(
          response.status
        ).toBe(200);

        expect(
          response.body.data
        ).toHaveLength(1);

        expect(
          response.body.data[0]
            .id
        ).toBe(6);

        expect(
          response.body.data[0]
            .status
        ).toBe("published");

        expect(
          listStaffAttractions
        ).toHaveBeenCalledOnce();
      }
    );

    it(
      "returns one staff attraction by id",
      async () => {
        vi.mocked(
          getStaffAttraction
        ).mockResolvedValue(
          sampleAttraction
        );

        const app =
          createTestApp();

        const agent =
          request.agent(app);

        await agent
          .post(
            "/test/setup-session"
          )
          .send({});

        const response =
          await agent.get(
            "/api/v1/staff/attractions/6"
          );

        expect(
          response.status
        ).toBe(200);

        expect(
          response.body.data.id
        ).toBe(6);

        expect(
          response.body.data.slug
        ).toBe(
          "demo-attraction"
        );

        expect(
          getStaffAttraction
        ).toHaveBeenCalledWith(
          6
        );
      }
    );

    it(
      "returns 400 for invalid attraction id",
      async () => {
        const app =
          createTestApp();

        const agent =
          request.agent(app);

        await agent
          .post(
            "/test/setup-session"
          )
          .send({});

        const response =
          await agent.get(
            "/api/v1/staff/attractions/abc"
          );

        expect(
          response.status
        ).toBe(400);

        expect(
          response.body.error
            .code
        ).toBe(
          "VALIDATION_ERROR"
        );

        expect(
          getStaffAttraction
        ).not.toHaveBeenCalled();
      }
    );

    it(
      "returns 404 when attraction does not exist",
      async () => {
        vi.mocked(
          getStaffAttraction
        ).mockRejectedValue(
          new StaffAttractionNotFoundError()
        );

        const app =
          createTestApp();

        const agent =
          request.agent(app);

        await agent
          .post(
            "/test/setup-session"
          )
          .send({});

        const response =
          await agent.get(
            "/api/v1/staff/attractions/999"
          );

        expect(
          response.status
        ).toBe(404);

        expect(
          response.body.error
            .code
        ).toBe("NOT_FOUND");
      }
    );
  }
);