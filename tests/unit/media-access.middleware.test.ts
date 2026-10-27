import {
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from "vitest";

vi.mock("../../src/config/database", () => ({
  db: {
    query: vi.fn(),
  },
}));

vi.mock("../../src/services/staff-auth.service", () => ({
  getActiveStaffById: vi.fn(),
}));

import { db } from "../../src/config/database";

import {
  getActiveStaffById,
} from "../../src/services/staff-auth.service";

import {
  requirePublishedOrStaffMedia,
} from "../../src/middleware/media-access.middleware";

describe("media access middleware", () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  async function checkAccess(
    visibility: Record<string, unknown> | null,
    staffId?: number
  ) {
    vi.mocked(db.query).mockResolvedValue({
      rows: visibility ? [visibility] : [],
    } as any);

    const req = {
      method: "GET",
      path: "/3/test.jpg",
      session: { staffId },
    };

    const res = {
      setHeader: vi.fn(),
      sendStatus: vi.fn(),
      status: vi.fn().mockReturnThis(),
      json: vi.fn(),
    };

    const next = vi.fn();

    await requirePublishedOrStaffMedia(
      req as any,
      res as any,
      next
    );

    return { res, next };
  }

  it("allows published media for anonymous visitors", async () => {
    const { res, next } = await checkAccess({
      status: "published",
      attraction_status: "published",
      vi_published: true,
    });

    expect(next).toHaveBeenCalledOnce();
    expect(res.sendStatus).not.toHaveBeenCalled();
    expect(res.setHeader).toHaveBeenCalledWith(
      "Cache-Control",
      "no-store"
    );

    expect(db.query).toHaveBeenCalledWith(
      expect.any(String),
      [3, "/uploads/media/3/test.jpg"]
    );
  });

  it.each([
    {
      status: "draft",
      attraction_status: "published",
      vi_published: true,
    },
    {
      status: "in_review",
      attraction_status: "published",
      vi_published: true,
    },
    {
      status: "archived",
      attraction_status: "published",
      vi_published: true,
    },
    {
      status: "published",
      attraction_status: "draft",
      vi_published: true,
    },
    {
      status: "published",
      attraction_status: "published",
      vi_published: false,
    },
  ])("blocks anonymous access: %o", async (visibility) => {
    const { res, next } = await checkAccess(visibility);

    expect(res.sendStatus).toHaveBeenCalledWith(404);
    expect(next).not.toHaveBeenCalled();
    expect(getActiveStaffById).not.toHaveBeenCalled();
  });

  it.each([
    "admin",
    "reviewer",
    "editor",
  ] as const)("allows active %s to preview drafts", async (role) => {
    vi.mocked(getActiveStaffById).mockResolvedValue({
      id: 1,
      email: "staff@test.local",
      full_name: "Test Staff",
      role,
    });

    const { res, next } = await checkAccess({
      status: "draft",
      attraction_status: "published",
      vi_published: true,
    }, 1);

    expect(getActiveStaffById).toHaveBeenCalledWith(1);
    expect(next).toHaveBeenCalledOnce();
    expect(res.sendStatus).not.toHaveBeenCalled();
  });

  it("blocks a session whose staff account is inactive", async () => {
    const error = new Error("Inactive staff");
    error.name = "StaffAccountNotFoundError";

    vi.mocked(getActiveStaffById).mockRejectedValue(error);

    const { res, next } = await checkAccess({
      status: "draft",
      attraction_status: "published",
      vi_published: true,
    }, 1);

    expect(res.sendStatus).toHaveBeenCalledWith(404);
    expect(next).not.toHaveBeenCalled();
  });

  it("blocks files without a matching media record", async () => {
    const { res, next } = await checkAccess(null, 1);

    expect(res.sendStatus).toHaveBeenCalledWith(404);
    expect(next).not.toHaveBeenCalled();
  });
});