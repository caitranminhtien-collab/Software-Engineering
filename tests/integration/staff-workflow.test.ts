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

vi.mock(
  "../../src/services/staff-workflow.service",
  async (importOriginal) => {
    const actual =
      await importOriginal<
        typeof import(
          "../../src/services/staff-workflow.service"
        )
      >();

    return {
      ...actual,

      submitStaffWorkflow:
        vi.fn(),

      reviewStaffWorkflow:
        vi.fn(),

      publishStaffWorkflow:
        vi.fn(),
    };
  }
);

import staffWorkflowRoutes
  from "../../src/routes/staff-workflow.routes";

import {
  getActiveStaffById,
} from "../../src/services/staff-auth.service";

import {
  publishStaffWorkflow,
  reviewStaffWorkflow,
  submitStaffWorkflow,
  StaffKnowledgeReviewPrerequisiteError,
  StaffPublishReadinessError,
  StaffPublishResourceError,
  StaffWorkflowConflictError,
  StaffWorkflowNotFoundError,
} from "../../src/services/staff-workflow.service";

function createTestApp() {
  const app = express();

  app.use(
    express.json()
  );

  app.use(
    session({
      secret:
        "staff-workflow-test-secret",

      resave:
        false,

      saveUninitialized:
        true,

      cookie: {
        secure:
          false,
      },
    })
  );

  /*
   * Chỉ dùng để tạo session test.
   */
  app.post(
    "/test/session",
    (
      req,
      res
    ) => {
      req.session.staffId =
        Number(
          req.body.staff_id ??
            1
        );

      req.session.csrfToken =
        typeof req.body
          .csrf_token ===
        "string"
          ? req.body
              .csrf_token
          : "test-csrf-token";

      res.status(204).end();
    }
  );

  app.use(
    "/api/v1/staff",
    staffWorkflowRoutes
  );

  return app;
}

async function createAgent(
  role:
    | "editor"
    | "reviewer"
    | "admin"
) {
  vi.mocked(
    getActiveStaffById
  ).mockResolvedValue({
    id: 1,

    email:
      `${role}@test.local`,

    full_name:
      `Test ${role}`,

    role,
  });

  const app =
    createTestApp();

  const agent =
    request.agent(app);

  await agent
    .post(
      "/test/session"
    )
    .send({
      staff_id:
        1,

      csrf_token:
        "test-csrf-token",
    });

  return agent;
}

describe(
  "Staff workflow API",
  () => {
    beforeEach(() => {
      vi.mocked(
        getActiveStaffById
      ).mockReset();

      vi.mocked(
        submitStaffWorkflow
      ).mockReset();

      vi.mocked(
        reviewStaffWorkflow
      ).mockReset();

      vi.mocked(
        publishStaffWorkflow
      ).mockReset();
    });

    it(
      "submits a draft resource for review",
      async () => {
        vi.mocked(
          submitStaffWorkflow
        ).mockResolvedValue({
          id: 3,
          resource:
            "attractions",
          status:
            "in_review",
          version:
            1,
        });

        const agent =
          await createAgent(
            "editor"
          );

        const response =
          await agent
            .post(
              "/api/v1/staff/attractions/3/submit"
            )
            .set(
              "x-csrf-token",
              "test-csrf-token"
            );

        expect(
          response.status
        ).toBe(200);

        expect(
          response.body.data
            .status
        ).toBe(
          "in_review"
        );

        expect(
          submitStaffWorkflow
        ).toHaveBeenCalledWith(
          "attractions",
          3
        );
      }
    );

    it(
      "returns 403 when reviewer tries to submit",
      async () => {
        const agent =
          await createAgent(
            "reviewer"
          );

        const response =
          await agent
            .post(
              "/api/v1/staff/attractions/3/submit"
            )
            .set(
              "x-csrf-token",
              "test-csrf-token"
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

        expect(
          submitStaffWorkflow
        ).not.toHaveBeenCalled();
      }
    );

    it(
      "returns 403 when CSRF token is missing",
      async () => {
        const agent =
          await createAgent(
            "editor"
          );

        const response =
          await agent
            .post(
              "/api/v1/staff/attractions/3/submit"
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
      "returns 400 for an unsupported workflow resource",
      async () => {
        const agent =
          await createAgent(
            "admin"
          );

        const response =
          await agent
            .post(
              "/api/v1/staff/invalid-resource/3/submit"
            )
            .set(
              "x-csrf-token",
              "test-csrf-token"
            );

        expect(
          response.status
        ).toBe(400);

        expect(
          response.body
            .error.code
        ).toBe(
          "VALIDATION_ERROR"
        );
      }
    );

    it(
      "reviews a resource with approve decision",
      async () => {
        vi.mocked(
          reviewStaffWorkflow
        ).mockResolvedValue({
          id: 3,

          resource:
            "attractions",

          status:
            "in_review",

          version:
            1,
        });

        const agent =
          await createAgent(
            "reviewer"
          );

        const response =
          await agent
            .post(
              "/api/v1/staff/attractions/3/review"
            )
            .set(
              "x-csrf-token",
              "test-csrf-token"
            )
            .send({
              decision:
                "approve",
            });

        expect(
          response.status
        ).toBe(200);

        expect(
          reviewStaffWorkflow
        ).toHaveBeenCalledWith(
          "attractions",
          3,
          "approve",
          1
        );
      }
    );

    it(
      "rejects an invalid review decision",
      async () => {
        const agent =
          await createAgent(
            "reviewer"
          );

        const response =
          await agent
            .post(
              "/api/v1/staff/attractions/3/review"
            )
            .set(
              "x-csrf-token",
              "test-csrf-token"
            )
            .send({
              decision:
                "invalid",
            });

        expect(
          response.status
        ).toBe(400);

        expect(
          reviewStaffWorkflow
        ).not.toHaveBeenCalled();
      }
    );

    it(
      "publishes an approved visitor resource",
      async () => {
        vi.mocked(
          publishStaffWorkflow
        ).mockResolvedValue({
          id: 3,

          resource:
            "attractions",

          status:
            "published",

          version:
            1,

          approved_by:
            1,

          published_at:
            new Date(),
        });

        const agent =
          await createAgent(
            "reviewer"
          );

        const response =
          await agent
            .post(
              "/api/v1/staff/attractions/3/publish"
            )
            .set(
              "x-csrf-token",
              "test-csrf-token"
            );

        expect(
          response.status
        ).toBe(200);

        expect(
          response.body.data
            .status
        ).toBe(
          "published"
        );

        expect(
          publishStaffWorkflow
        ).toHaveBeenCalledWith(
          "attractions",
          3,
          1
        );
      }
    );

    it(
      "maps workflow not found to 404",
      async () => {
        vi.mocked(
          submitStaffWorkflow
        ).mockRejectedValue(
          new StaffWorkflowNotFoundError()
        );

        const agent =
          await createAgent(
            "editor"
          );

        const response =
          await agent
            .post(
              "/api/v1/staff/attractions/999/submit"
            )
            .set(
              "x-csrf-token",
              "test-csrf-token"
            );

        expect(
          response.status
        ).toBe(404);

        expect(
          response.body
            .error.code
        ).toBe(
          "NOT_FOUND"
        );
      }
    );

    it(
      "maps invalid submit transition to 409",
      async () => {
        vi.mocked(
          submitStaffWorkflow
        ).mockRejectedValue(
          new StaffWorkflowConflictError()
        );

        const agent =
          await createAgent(
            "editor"
          );

        const response =
          await agent
            .post(
              "/api/v1/staff/attractions/3/submit"
            )
            .set(
              "x-csrf-token",
              "test-csrf-token"
            );

        expect(
          response.status
        ).toBe(409);

        expect(
          response.body
            .error.code
        ).toBe(
          "WORKFLOW_CONFLICT"
        );
      }
    );

    it(
      "returns knowledge prerequisite error when current version is not indexed",
      async () => {
        vi.mocked(
          reviewStaffWorkflow
        ).mockRejectedValue(
          new StaffKnowledgeReviewPrerequisiteError()
        );

        const agent =
          await createAgent(
            "reviewer"
          );

        const response =
          await agent
            .post(
              "/api/v1/staff/knowledge-documents/5/review"
            )
            .set(
              "x-csrf-token",
              "test-csrf-token"
            )
            .send({
              decision:
                "approve",
            });

        expect(
          response.status
        ).toBe(409);

        expect(
          response.body
            .error.code
        ).toBe(
          "KNOWLEDGE_REVIEW_PREREQUISITE"
        );
      }
    );

    it(
      "returns publish readiness error",
      async () => {
        vi.mocked(
          publishStaffWorkflow
        ).mockRejectedValue(
          new StaffPublishReadinessError(
            "Attraction requires a published Vietnamese localization before publication"
          )
        );

        const agent =
          await createAgent(
            "admin"
          );

        const response =
          await agent
            .post(
              "/api/v1/staff/attractions/3/publish"
            )
            .set(
              "x-csrf-token",
              "test-csrf-token"
            );

        expect(
          response.status
        ).toBe(409);

        expect(
          response.body
            .error.code
        ).toBe(
          "PUBLISH_READINESS_ERROR"
        );

        expect(
          response.body
            .error.message
        ).toContain(
          "Vietnamese localization"
        );
      }
    );

    it(
      "rejects visitor publish workflow for knowledge documents",
      async () => {
        vi.mocked(
          publishStaffWorkflow
        ).mockRejectedValue(
          new StaffPublishResourceError()
        );

        const agent =
          await createAgent(
            "admin"
          );

        const response =
          await agent
            .post(
              "/api/v1/staff/knowledge-documents/5/publish"
            )
            .set(
              "x-csrf-token",
              "test-csrf-token"
            );

        expect(
          response.status
        ).toBe(409);

        expect(
          response.body
            .error.code
        ).toBe(
          "PUBLISH_NOT_SUPPORTED"
        );
      }
    );
  }
);