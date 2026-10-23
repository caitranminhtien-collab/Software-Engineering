import {
  findLocalizationPublishReadiness,
  findPublishedVietnameseLocalization,
  findWorkflowResourceById,
  publishVisitorWorkflowResource,
  reviewVisitorWorkflowResource,
  submitWorkflowResource,
  findMediaPublishReadiness,
  findRoutePublishReadiness,
  findKnowledgeReviewReadiness,
  approveKnowledgeDocument,
  rejectKnowledgeDocument,
} from "../repositories/staff-workflow.repository";

import type {
  StaffReviewDecision,
} from "../repositories/staff-workflow.repository";

import type {
  StaffWorkflowResource,
} from "../validators/staff-workflow.validator";

import {
  findActiveRevisionByLocalizationId,
  submitLocalizationRevision,
  reviewLocalizationRevision,
  publishLocalizationRevision,
  LocalizationRevisionInvalidContentError,
} from "../repositories/staff-localization-revision.repository";


function isAllowedMediaFileUrl(
  fileUrl: string
): boolean {
  try {
    const url =
      new URL(fileUrl);

    if (
      url.protocol === "https:"
    ) {
      return true;
    }

    if (
      process.env.NODE_ENV ===
        "development" &&
      url.protocol === "http:" &&
      (
        url.hostname ===
          "localhost" ||
        url.hostname ===
          "127.0.0.1"
      )
    ) {
      return true;
    }

    return false;
  } catch {
    return false;
  }
}

function hasSourceReferences(
  value: string
): boolean {
  try {
    const parsed = JSON.parse(value);

    return (
      Array.isArray(parsed) &&
      parsed.length > 0
    );
  } catch {
    return false;
  }
}

export interface StaffWorkflowResult {
  id: number;
  resource: StaffWorkflowResource;
  status: string;
  version: number | null;
}

export interface StaffPublishResult {
  id: number;
  resource: StaffWorkflowResource;
  status: "published";
  version: number | null;
  approved_by: number;
  published_at: Date;
}

export class StaffWorkflowNotFoundError
  extends Error {
  constructor() {
    super("Workflow resource not found");

    this.name =
      "StaffWorkflowNotFoundError";
  }
}

export class StaffWorkflowConflictError
  extends Error {
  constructor() {
    super(
      "Resource cannot be submitted in its current status"
    );

    this.name =
      "StaffWorkflowConflictError";
  }
}

export class StaffWorkflowReviewConflictError
  extends Error {
  constructor() {
    super(
      "Resource cannot be reviewed in its current status"
    );

    this.name =
      "StaffWorkflowReviewConflictError";
  }
}

export class StaffKnowledgeReviewPrerequisiteError
  extends Error {
  constructor() {
    super(
      "Knowledge document review requires the indexing workflow"
    );

    this.name =
      "StaffKnowledgeReviewPrerequisiteError";
  }
}

export class StaffPublishReadinessError
  extends Error {
  constructor(message: string) {
    super(message);

    this.name =
      "StaffPublishReadinessError";
  }
}

export class StaffPublishResourceError
  extends Error {
  constructor() {
    super(
      "This resource cannot use the visitor publish workflow"
    );

    this.name =
      "StaffPublishResourceError";
  }
}

export async function submitStaffWorkflow(
  resource: StaffWorkflowResource,
  resourceId: number
): Promise<StaffWorkflowResult> {
  const current =
    await findWorkflowResourceById(
      resource,
      resourceId
    );

  if (!current) {
    throw new StaffWorkflowNotFoundError();
  }

  // Existing published content stays live. The old localization ID is
  // retained by the Admin UI; workflow is routed to its working revision.
  if (resource === "localizations" && current.status === "published") {
    const active = await findActiveRevisionByLocalizationId(resourceId);
    if (!active || active.status !== "draft") {
      throw new StaffWorkflowConflictError();
    }
    const changed = await submitLocalizationRevision(resourceId);
    if (!changed) throw new StaffWorkflowConflictError();
    return {
      id: resourceId,
      resource,
      status: changed.status,
      version: Number(changed.base_content_version ?? 0) + 1,
    };
  }

  if (current.status !== "draft") {
    throw new StaffWorkflowConflictError();
  }

  const submitted =
    await submitWorkflowResource(
      resource,
      resourceId
    );

  if (!submitted) {
    throw new StaffWorkflowConflictError();
  }

  return {
    id: Number(
      submitted.resource_id
    ),

    resource,

    status:
      submitted.status,

    version:
      submitted.version === null
        ? null
        : Number(
            submitted.version
          ),
  };
}

export async function reviewStaffWorkflow(
  resource: StaffWorkflowResource,
  resourceId: number,
  decision: StaffReviewDecision,
  reviewedBy: number
): Promise<StaffWorkflowResult> {
  const current =
    await findWorkflowResourceById(
      resource,
      resourceId
    );

  if (!current) {
    throw new StaffWorkflowNotFoundError();
  }

  if (resource === "localizations" && current.status === "published") {
    const active = await findActiveRevisionByLocalizationId(resourceId);
    if (!active || active.status !== "in_review") {
      throw new StaffWorkflowReviewConflictError();
    }
    const reviewed = await reviewLocalizationRevision(resourceId, decision);
    if (!reviewed) throw new StaffWorkflowReviewConflictError();
    return {
      id: resourceId,
      resource,
      status: reviewed.status,
      version: Number(reviewed.base_content_version ?? 0) + 1,
    };
  }

  if (current.status !== "in_review") {
    throw new StaffWorkflowReviewConflictError();
  }

  if (
  resource ===
  "knowledge-documents"
) {
  if (decision === "reject") {
    const rejected =
      await rejectKnowledgeDocument(
        resourceId
      );

    if (!rejected) {
      throw new StaffWorkflowReviewConflictError();
    }

    return {
      id: Number(
        rejected.resource_id
      ),

      resource,

      status:
        rejected.status,

      version:
        rejected.version === null
          ? null
          : Number(
              rejected.version
            ),
    };
  }

  const readiness =
    await findKnowledgeReviewReadiness(
      resourceId
    );

  if (!readiness) {
    throw new StaffWorkflowNotFoundError();
  }

  if (
    readiness.chunk_count <= 0 ||
    readiness.invalid_chunk_count > 0 ||
    readiness.min_chunk_order !== 1 ||
    readiness.max_chunk_order !==
      readiness.chunk_count
  ) {
    throw new StaffKnowledgeReviewPrerequisiteError();
  }

  const approved =
    await approveKnowledgeDocument(
      resourceId,
      Number(
        readiness.version
      ),
      reviewedBy
    );

  if (!approved) {
    throw new StaffWorkflowReviewConflictError();
  }

  return {
    id: Number(
      approved.resource_id
    ),

    resource,

    status:
      approved.status,

    version:
      approved.version === null
        ? null
        : Number(
            approved.version
          ),
  };
}

  if (
  resource === "routes" &&
  decision === "approve"
) {
  const route =
    await findRoutePublishReadiness(
      resourceId
    );

  if (!route) {
    throw new StaffWorkflowNotFoundError();
  }

  if (route.stop_count <= 0) {
    throw new StaffWorkflowReviewConflictError();
  }

  if (
    route.unavailable_stop_count > 0
  ) {
    throw new StaffWorkflowReviewConflictError();
  }
  if (route.incomplete_timing_count > 0) {
  throw new StaffWorkflowReviewConflictError();
}
}

  const reviewed =
    await reviewVisitorWorkflowResource(
      resource,
      resourceId,
      decision
    );

  if (!reviewed) {
    throw new StaffWorkflowReviewConflictError();
  }

  return {
    id: Number(
      reviewed.resource_id
    ),

    resource,

    status:
      reviewed.status,

    version:
      reviewed.version === null
        ? null
        : Number(
            reviewed.version
          ),
  };
}

export async function publishStaffWorkflow(
  resource: StaffWorkflowResource,
  resourceId: number,
  approvedBy: number
): Promise<StaffPublishResult> {
  if (
    resource ===
    "knowledge-documents"
  ) {
    throw new StaffPublishResourceError();
  }

  const current =
    await findWorkflowResourceById(
      resource,
      resourceId
    );

  if (!current) {
    throw new StaffWorkflowNotFoundError();
  }

  if (resource === "localizations" && current.status === "published") {
    const active = await findActiveRevisionByLocalizationId(resourceId);
    if (!active || active.status !== "in_review") {
      throw new StaffWorkflowReviewConflictError();
    }

    // This is a staged revision, not the current published localization.
    // The repository validates content and base version again under locks,
    // then switches the public content and marks revision published atomically.
    try {
      const published = await publishLocalizationRevision(resourceId, approvedBy);
      if (!published || published.approved_by === null || !published.published_at) {
        throw new StaffWorkflowReviewConflictError();
      }
      return {
        id: resourceId,
        resource,
        status: "published",
        version: Number(published.version),
        approved_by: Number(published.approved_by),
        published_at: published.published_at,
      };
    } catch (error) {
      if (error instanceof LocalizationRevisionInvalidContentError) {
        throw new StaffPublishReadinessError(error.message);
      }
      throw error;
    }
  }

  if (current.status !== "in_review") {
    throw new StaffWorkflowReviewConflictError();
  }

  if (
    resource ===
    "localizations"
  ) {
    const localization =
      await findLocalizationPublishReadiness(
        resourceId
      );

    if (!localization) {
      throw new StaffWorkflowNotFoundError();
    }

    if (
      !localization.name.trim() ||
      !localization.description.trim()
    ) {
      throw new StaffPublishReadinessError(
        "Localization requires name and description before publication"
      );
    }

    if (
      !hasSourceReferences(
        localization.source_references
      )
    ) {
      throw new StaffPublishReadinessError(
        "Localization requires at least one source reference before publication"
      );
    }
  }

  if (
    resource ===
    "attractions"
  ) {
    const vietnameseLocalization =
      await findPublishedVietnameseLocalization(
        resourceId
      );

    if (!vietnameseLocalization) {
      throw new StaffPublishReadinessError(
        "Attraction requires a published Vietnamese localization before publication"
      );
    }
  }

  if (
  resource === "routes"
) {
  const route =
    await findRoutePublishReadiness(
      resourceId
    );

  if (!route) {
    throw new StaffWorkflowNotFoundError();
  }

  if (!route.verified_at) {
    throw new StaffPublishReadinessError(
      "Route must be reviewed and verified before publication"
    );
  }

  if (route.stop_count <= 0) {
    throw new StaffPublishReadinessError(
      "Route requires at least one stop before publication"
    );
  }

  if (
    route.unavailable_stop_count > 0
  ) {
    throw new StaffPublishReadinessError(
      "All route stops must reference published attractions with published Vietnamese localizations before publication"
    );
  }
  if (route.incomplete_timing_count > 0) {
  throw new StaffPublishReadinessError(
    "All route stops must have valid visit and travel times before publication"
  );
}
}

  if (
    resource ===
    "media"
  ) {
    const media =
      await findMediaPublishReadiness(
        resourceId
      );

    if (!media) {
      throw new StaffWorkflowNotFoundError();
    }

    if (
  !media.file_url ||
  !isAllowedMediaFileUrl(
    media.file_url
  )
) {
  throw new StaffPublishReadinessError(
    process.env.NODE_ENV ===
      "development"
      ? "Media requires HTTPS or a localhost development file_url"
      : "Media requires a valid HTTPS file_url"
  );
}

    if (
      !media.credit ||
      !media.credit.trim()
    ) {
      throw new StaffPublishReadinessError(
        "Media requires credit before publishing"
      );
    }

    if (
      !media.rights_reference ||
      !media.rights_reference.trim()
    ) {
      throw new StaffPublishReadinessError(
        "Media requires rights_reference before publishing"
      );
    }

    if (
      media.media_type ===
      "audio"
    ) {
      if (
        !media.language_code ||
        !media.language_code.trim()
      ) {
        throw new StaffPublishReadinessError(
          "Audio media requires language_code before publishing"
        );
      }

      if (
        media.duration_seconds ===
          null ||
        Number(
          media.duration_seconds
        ) <= 0
      ) {
        throw new StaffPublishReadinessError(
          "Audio media requires positive duration_seconds before publishing"
        );
      }
    }

    if (
      media.media_type ===
        "image" &&
      media.duration_seconds !==
        null
    ) {
      throw new StaffPublishReadinessError(
        "Image media must not have duration_seconds"
      );
    }
  }

  const published =
    await publishVisitorWorkflowResource(
      resource,
      resourceId,
      approvedBy
    );

  if (
    !published ||
    published.approved_by === null ||
    published.published_at === null
  ) {
    throw new StaffWorkflowReviewConflictError();
  }

  return {
    id: Number(
      published.resource_id
    ),

    resource,

    status: "published",

    version:
      published.version === null
        ? null
        : Number(
            published.version
          ),

    approved_by: Number(
      published.approved_by
    ),

    published_at:
      published.published_at,
  };
}