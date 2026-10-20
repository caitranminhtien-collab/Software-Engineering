
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
  "../../src/services/staff-knowledge.service",
  async (importOriginal) => {
    const actual = await importOriginal<
      typeof import("../../src/services/staff-knowledge.service")
    >();

    return {
      ...actual,
      listStaffKnowledgeDocuments: vi.fn(),
      getStaffKnowledgeDocument: vi.fn(),
    };
  }
);

import {
  getActiveStaffById,
} from "../../src/services/staff-auth.service";

import {
  getStaffKnowledgeDocument,
  listStaffKnowledgeDocuments,
  StaffKnowledgeDocumentNotFoundError,
} from "../../src/services/staff-knowledge.service";

import staffKnowledgeRoutes from "../../src/routes/staff-knowledge.routes";

function createTestApp() {
  const app = express();

  app.use(express.json());

  app.use(
    session({
      secret: "staff-knowledge-read-test-secret",
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
    "/api/v1/staff/knowledge-documents",
    staffKnowledgeRoutes
  );

  return app;
}

const sampleSummary = {
  id: 4,
  attraction_id: 3,
  title: "Lịch sử Chùa Thiên Mụ",
  language_code: "vi",
  source_url: "https://example.com/thien-mu-history",
  source_credit: "DEV_SOURCE",
  version: 1,
  status: "approved",
  created_by: 1,
  approved_by: 1,
  approved_at: new Date("2026-10-15T11:11:01.041Z"),
};

const sampleDetail = {
  ...sampleSummary,
  body_text: "Chùa Thiên Mụ là một di tích lịch sử tại Huế.",
};

describe("Staff knowledge read API", () => {
  beforeEach(() => {
    vi.mocked(getActiveStaffById).mockReset();
    vi.mocked(listStaffKnowledgeDocuments).mockReset();
    vi.mocked(getStaffKnowledgeDocument).mockReset();

    vi.mocked(getActiveStaffById).mockResolvedValue({
      id: 1,
      email: "admin@test.local",
      full_name: "Test Admin",
      role: "admin",
    });
  });

  it("returns 401 without staff session", async () => {
    const response = await request(createTestApp())
      .get("/api/v1/staff/knowledge-documents");

    expect(response.status).toBe(401);
    expect(listStaffKnowledgeDocuments)
      .not.toHaveBeenCalled();
  });

  it("lists knowledge without body_text", async () => {
    vi.mocked(listStaffKnowledgeDocuments)
      .mockResolvedValue([sampleSummary]);

    const agent = request.agent(createTestApp());

    await agent
      .post("/test/setup-session")
      .send({});

    const response = await agent.get(
      "/api/v1/staff/knowledge-documents"
    );

    expect(response.status).toBe(200);
    expect(response.body.data).toHaveLength(1);
    expect(response.body.data[0].id).toBe(4);
    expect(response.body.data[0].status).toBe("approved");
    expect(response.body.data[0])
      .not.toHaveProperty("body_text");
    expect(listStaffKnowledgeDocuments)
      .toHaveBeenCalledOnce();
  });

  it("allows reviewer to read knowledge", async () => {
    vi.mocked(getActiveStaffById).mockResolvedValue({
      id: 1,
      email: "reviewer@test.local",
      full_name: "Test Reviewer",
      role: "reviewer",
    });

    vi.mocked(listStaffKnowledgeDocuments)
      .mockResolvedValue([]);

    const agent = request.agent(createTestApp());

    await agent
      .post("/test/setup-session")
      .send({});

    const response = await agent.get(
      "/api/v1/staff/knowledge-documents"
    );

    expect(response.status).toBe(200);
    expect(response.body.data).toEqual([]);
  });

  it("returns knowledge detail with body_text", async () => {
    vi.mocked(getStaffKnowledgeDocument)
      .mockResolvedValue(sampleDetail);

    const agent = request.agent(createTestApp());

    await agent
      .post("/test/setup-session")
      .send({});

    const response = await agent.get(
      "/api/v1/staff/knowledge-documents/4"
    );

    expect(response.status).toBe(200);
    expect(response.body.data.id).toBe(4);
    expect(response.body.data.body_text)
      .toBe(sampleDetail.body_text);
    expect(getStaffKnowledgeDocument)
      .toHaveBeenCalledWith(4);
  });

  it("returns 400 for invalid document id", async () => {
    const agent = request.agent(createTestApp());

    await agent
      .post("/test/setup-session")
      .send({});

    const response = await agent.get(
      "/api/v1/staff/knowledge-documents/abc"
    );

    expect(response.status).toBe(400);
    expect(response.body.error.code)
      .toBe("VALIDATION_ERROR");
    expect(getStaffKnowledgeDocument)
      .not.toHaveBeenCalled();
  });

  it("returns 404 for missing document", async () => {
    vi.mocked(getStaffKnowledgeDocument)
      .mockRejectedValue(
        new StaffKnowledgeDocumentNotFoundError()
      );

    const agent = request.agent(createTestApp());

    await agent
      .post("/test/setup-session")
      .send({});

    const response = await agent.get(
      "/api/v1/staff/knowledge-documents/999999"
    );

    expect(response.status).toBe(404);
    expect(response.body.error.code)
      .toBe("KNOWLEDGE_DOCUMENT_NOT_FOUND");
  });
});
