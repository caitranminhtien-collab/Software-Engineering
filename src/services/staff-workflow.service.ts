import {
  findLocalizationPublishReadiness,
  findPublishedVietnameseLocalization,
  findWorkflowResourceById,
  publishVisitorWorkflowResource,
  reviewVisitorWorkflowResource,
  submitWorkflowResource,
  findMediaPublishReadiness,
  findRoutePublishReadiness,
} from "../repositories/staff-workflow.repository";

import type {
  StaffReviewDecision,
} from "../repositories/staff-workflow.repository";

import type {
  StaffWorkflowResource,
} from "../validators/staff-workflow.validator";

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
  decision: StaffReviewDecision
): Promise<StaffWorkflowResult> {
  const current =
    await findWorkflowResourceById(
      resource,
      resourceId
    );

  if (!current) {
    throw new StaffWorkflowNotFoundError();
  }

  if (current.status !== "in_review") {
    throw new StaffWorkflowReviewConflictError();
  }

  if (
    resource ===
    "knowledge-documents"
  ) {
    throw new StaffKnowledgeReviewPrerequisiteError();
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
      "All route stops must reference published attractions before publication"
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
      !media.file_url.startsWith(
        "https://"
      )
    ) {
      throw new StaffPublishReadinessError(
        "Media requires a valid HTTPS file_url"
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