import {
  findLocalizationPublishReadiness,
  findPublishedVietnameseLocalization,
  findWorkflowResourceById,
  publishVisitorWorkflowResource,
  reviewVisitorWorkflowResource,
  submitWorkflowResource,
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

  if (resource === "knowledge-documents") {
    throw new StaffKnowledgeReviewPrerequisiteError();
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
  if (resource === "knowledge-documents") {
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

  if (resource === "localizations") {
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

  if (resource === "attractions") {
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