import {
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from "vitest";

vi.mock(
  "../../src/repositories/staff-workflow.repository",
  () => ({
    findWorkflowResourceById: vi.fn(),
    findMediaPublishReadiness: vi.fn(),
    publishVisitorWorkflowResource: vi.fn(),
  })
);

import {
  findWorkflowResourceById,
  findMediaPublishReadiness,
  publishVisitorWorkflowResource,
} from "../../src/repositories/staff-workflow.repository";

import {
  publishStaffWorkflow,
  StaffPublishReadinessError,
} from "../../src/services/staff-workflow.service";

describe("publishing local media", () => {
  beforeEach(() => {
    vi.resetAllMocks();

    vi.mocked(findWorkflowResourceById)
      .mockResolvedValue({
        resource_id: "10",
        status: "in_review",
        version: null,
      } as any);

    vi.mocked(publishVisitorWorkflowResource)
      .mockResolvedValue({
        resource_id: "10",
        status: "published",
        version: null,
        approved_by: "1",
        published_at: new Date(),
      } as any);
  });

  function setMedia(fileUrl: string) {
    vi.mocked(findMediaPublishReadiness)
      .mockResolvedValue({
        file_url: fileUrl,
        media_type: "image",
        language_code: null,
        credit: "Test source",
        rights_reference: "Test permission",
        duration_seconds: null,
      } as any);
  }

  it("publishes media with a valid relative path", async () => {
    setMedia("/uploads/media/3/test.jpg");

    const result = await publishStaffWorkflow(
      "media",
      10,
      1
    );

    expect(result.status).toBe("published");

    expect(
      publishVisitorWorkflowResource
    ).toHaveBeenCalledWith("media", 10, 1);
  });

  it.each([
    "/uploads/media/3/../test.jpg",
    "/uploads/media/3/test.svg",
    "//example.com/uploads/media/3/test.jpg",
  ])("rejects an unsafe local path: %s", async (fileUrl) => {
    setMedia(fileUrl);

    await expect(
      publishStaffWorkflow("media", 10, 1)
    ).rejects.toBeInstanceOf(
      StaffPublishReadinessError
    );

    expect(
      publishVisitorWorkflowResource
    ).not.toHaveBeenCalled();
  });

  it("still requires media credit", async () => {
    setMedia("/uploads/media/3/test.jpg");

    const media = await findMediaPublishReadiness(10);

    vi.mocked(findMediaPublishReadiness)
      .mockResolvedValue({
        ...media,
        credit: "",
      } as any);

    await expect(
      publishStaffWorkflow("media", 10, 1)
    ).rejects.toBeInstanceOf(
      StaffPublishReadinessError
    );

    expect(
      publishVisitorWorkflowResource
    ).not.toHaveBeenCalled();
  });
});