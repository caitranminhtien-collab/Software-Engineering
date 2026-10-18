import {
  afterEach,
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from "vitest";

vi.mock(
  "../../src/repositories/staff-workflow.repository",
  () => ({
    findLocalizationPublishReadiness:
      vi.fn(),

    findPublishedVietnameseLocalization:
      vi.fn(),

    findWorkflowResourceById:
      vi.fn(),

    publishVisitorWorkflowResource:
      vi.fn(),

    reviewVisitorWorkflowResource:
      vi.fn(),

    submitWorkflowResource:
      vi.fn(),

    findMediaPublishReadiness:
      vi.fn(),

    findRoutePublishReadiness:
      vi.fn(),

    findKnowledgeReviewReadiness:
      vi.fn(),

    approveKnowledgeDocument:
      vi.fn(),

    rejectKnowledgeDocument:
      vi.fn(),
  })
);

import {
  approveKnowledgeDocument,
  findKnowledgeReviewReadiness,
  findLocalizationPublishReadiness,
  findMediaPublishReadiness,
  findPublishedVietnameseLocalization,
  findRoutePublishReadiness,
  findWorkflowResourceById,
  publishVisitorWorkflowResource,
  reviewVisitorWorkflowResource,
  submitWorkflowResource,
} from "../../src/repositories/staff-workflow.repository";

import {
  publishStaffWorkflow,
  reviewStaffWorkflow,
  submitStaffWorkflow,
  StaffKnowledgeReviewPrerequisiteError,
  StaffPublishReadinessError,
  StaffPublishResourceError,
  StaffWorkflowConflictError,
  StaffWorkflowReviewConflictError,
} from "../../src/services/staff-workflow.service";

function mockCurrent(
  status: string,
  resourceId = 3,
  version: number | null = 1
): void {
  vi.mocked(
    findWorkflowResourceById
  ).mockResolvedValue({
    resource_id:
      String(resourceId),

    status,

    version,
  });
}

describe(
  "staff-workflow.service",
  () => {
    const originalNodeEnv =
      process.env.NODE_ENV;

    beforeEach(() => {
      vi.resetAllMocks();

      process.env.NODE_ENV =
        "test";
    });

    afterEach(() => {
      if (
        originalNodeEnv === undefined
      ) {
        delete process.env.NODE_ENV;
      } else {
        process.env.NODE_ENV =
          originalNodeEnv;
      }
    });

    it(
      "submits a draft resource to in_review",
      async () => {
        mockCurrent(
          "draft"
        );

        vi.mocked(
          submitWorkflowResource
        ).mockResolvedValue({
          resource_id:
            "3",

          status:
            "in_review",

          version:
            1,
        });

        const result =
          await submitStaffWorkflow(
            "attractions",
            3
          );

        expect(
          result
        ).toEqual({
          id: 3,
          resource:
            "attractions",
          status:
            "in_review",
          version:
            1,
        });

        expect(
          submitWorkflowResource
        ).toHaveBeenCalledWith(
          "attractions",
          3
        );
      }
    );

    it(
      "rejects submit when the resource is not draft",
      async () => {
        mockCurrent(
          "in_review"
        );

        await expect(
          submitStaffWorkflow(
            "attractions",
            3
          )
        ).rejects.toBeInstanceOf(
          StaffWorkflowConflictError
        );

        expect(
          submitWorkflowResource
        ).not.toHaveBeenCalled();
      }
    );

    it(
      "approves a knowledge document when current-version indexing is valid",
      async () => {
        mockCurrent(
          "in_review",
          5,
          2
        );

        vi.mocked(
          findKnowledgeReviewReadiness
        ).mockResolvedValue({
          document_id:
            "5",

          version:
            2,

          status:
            "in_review",

          chunk_count:
            2,

          invalid_chunk_count:
            0,

          min_chunk_order:
            1,

          max_chunk_order:
            2,
        });

        vi.mocked(
          approveKnowledgeDocument
        ).mockResolvedValue({
          resource_id:
            "5",

          status:
            "approved",

          version:
            2,
        });

        const result =
          await reviewStaffWorkflow(
            "knowledge-documents",
            5,
            "approve",
            1
          );

        expect(
          result.status
        ).toBe(
          "approved"
        );

        expect(
          approveKnowledgeDocument
        ).toHaveBeenCalledWith(
          5,
          2,
          1
        );
      }
    );

    it(
      "rejects knowledge approval when current version has no usable chunks",
      async () => {
        mockCurrent(
          "in_review",
          5,
          1
        );

        vi.mocked(
          findKnowledgeReviewReadiness
        ).mockResolvedValue({
          document_id:
            "5",

          version:
            1,

          status:
            "in_review",

          chunk_count:
            0,

          invalid_chunk_count:
            0,

          min_chunk_order:
            null,

          max_chunk_order:
            null,
        });

        await expect(
          reviewStaffWorkflow(
            "knowledge-documents",
            5,
            "approve",
            1
          )
        ).rejects.toBeInstanceOf(
          StaffKnowledgeReviewPrerequisiteError
        );

        expect(
          approveKnowledgeDocument
        ).not.toHaveBeenCalled();
      }
    );

    it(
      "rejects route approval when a route stop is unavailable",
      async () => {
        mockCurrent(
          "in_review",
          2,
          1
        );

        vi.mocked(
          findRoutePublishReadiness
        ).mockResolvedValue({
          route_id:
            "2",

          verified_at:
            null,

          stop_count:
            2,

          unavailable_stop_count:
            1,
        });

        await expect(
          reviewStaffWorkflow(
            "routes",
            2,
            "approve",
            1
          )
        ).rejects.toBeInstanceOf(
          StaffWorkflowReviewConflictError
        );

        expect(
          reviewVisitorWorkflowResource
        ).not.toHaveBeenCalled();
      }
    );

    it(
      "requires a published Vietnamese localization before publishing an attraction",
      async () => {
        mockCurrent(
          "in_review",
          3,
          1
        );

        vi.mocked(
          findPublishedVietnameseLocalization
        ).mockResolvedValue(
          null
        );

        await expect(
          publishStaffWorkflow(
            "attractions",
            3,
            1
          )
        ).rejects.toBeInstanceOf(
          StaffPublishReadinessError
        );

        expect(
          publishVisitorWorkflowResource
        ).not.toHaveBeenCalled();
      }
    );

    it(
      "requires source references before publishing a localization",
      async () => {
        mockCurrent(
          "in_review",
          4,
          1
        );

        vi.mocked(
          findLocalizationPublishReadiness
        ).mockResolvedValue({
          localization_id:
            "4",

          attraction_id:
            "3",

          language_code:
            "vi",

          name:
            "Chùa Thiên Mụ",

          description:
            "Một di tích lịch sử tại Huế.",

          source_references:
            "[]",

          status:
            "in_review",

          content_version:
            1,
        });

        await expect(
          publishStaffWorkflow(
            "localizations",
            4,
            1
          )
        ).rejects.toBeInstanceOf(
          StaffPublishReadinessError
        );

        expect(
          publishVisitorWorkflowResource
        ).not.toHaveBeenCalled();
      }
    );

    it(
      "requires a reviewed and verified route before publication",
      async () => {
        mockCurrent(
          "in_review",
          2,
          1
        );

        vi.mocked(
          findRoutePublishReadiness
        ).mockResolvedValue({
          route_id:
            "2",

          verified_at:
            null,

          stop_count:
            2,

          unavailable_stop_count:
            0,
        });

        await expect(
          publishStaffWorkflow(
            "routes",
            2,
            1
          )
        ).rejects.toThrow(
          "Route must be reviewed and verified before publication"
        );

        expect(
          publishVisitorWorkflowResource
        ).not.toHaveBeenCalled();
      }
    );

    it(
      "requires positive duration for audio media before publication",
      async () => {
        mockCurrent(
          "in_review",
          8,
          null
        );

        vi.mocked(
          findMediaPublishReadiness
        ).mockResolvedValue({
          media_id:
            "8",

          media_type:
            "audio",

          language_code:
            "vi",

          file_url:
            "https://cdn.example.com/audio.mp3",

          credit:
            "TEST_SOURCE",

          rights_reference:
            "TEST_RIGHTS",

          duration_seconds:
            0,
        });

        await expect(
          publishStaffWorkflow(
            "media",
            8,
            1
          )
        ).rejects.toThrow(
          "Audio media requires positive duration_seconds before publishing"
        );

        expect(
          publishVisitorWorkflowResource
        ).not.toHaveBeenCalled();
      }
    );

    it(
      "allows localhost media URL in development",
      async () => {
        process.env.NODE_ENV =
          "development";

        mockCurrent(
          "in_review",
          8,
          null
        );

        vi.mocked(
          findMediaPublishReadiness
        ).mockResolvedValue({
          media_id:
            "8",

          media_type:
            "image",

          language_code:
            null,

          file_url:
            "http://localhost:3000/uploads/media/3/test.png",

          credit:
            "TEST_SOURCE",

          rights_reference:
            "TEST_RIGHTS",

          duration_seconds:
            null,
        });

        vi.mocked(
          publishVisitorWorkflowResource
        ).mockResolvedValue({
          resource_id:
            "8",

          status:
            "published",

          version:
            null,

          approved_by:
            "1",

          published_at:
            new Date(
              "2026-10-18T05:00:00.000Z"
            ),
        });

        const result =
          await publishStaffWorkflow(
            "media",
            8,
            1
          );

        expect(
          result.status
        ).toBe(
          "published"
        );

        expect(
          publishVisitorWorkflowResource
        ).toHaveBeenCalledWith(
          "media",
          8,
          1
        );
      }
    );

    it(
      "does not allow knowledge documents to use visitor publish workflow",
      async () => {
        await expect(
          publishStaffWorkflow(
            "knowledge-documents",
            5,
            1
          )
        ).rejects.toBeInstanceOf(
          StaffPublishResourceError
        );

        expect(
          findWorkflowResourceById
        ).not.toHaveBeenCalled();
      }
    );

    it(
      "publishes an attraction when readiness checks pass",
      async () => {
        mockCurrent(
          "in_review",
          3,
          1
        );

        vi.mocked(
          findPublishedVietnameseLocalization
        ).mockResolvedValue({
          localization_id:
            "4",

          attraction_id:
            "3",

          language_code:
            "vi",

          name:
            "Chùa Thiên Mụ",

          description:
            "Một di tích lịch sử tại Huế.",

          source_references:
            JSON.stringify([
              {
                source:
                  "TEST_SOURCE",
              },
            ]),

          status:
            "published",

          content_version:
            1,
        });

        const publishedAt =
          new Date(
            "2026-10-18T05:00:00.000Z"
          );

        vi.mocked(
          publishVisitorWorkflowResource
        ).mockResolvedValue({
          resource_id:
            "3",

          status:
            "published",

          version:
            1,

          approved_by:
            "1",

          published_at:
            publishedAt,
        });

        const result =
          await publishStaffWorkflow(
            "attractions",
            3,
            1
          );

        expect(
          result
        ).toEqual({
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
            publishedAt,
        });
      }
    );
  }
);