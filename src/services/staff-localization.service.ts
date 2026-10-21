import {
  findStaffLocalization,
  upsertEditableLocalization,
} from "../repositories/staff-localization.repository";

import {
  findStaffAttractionById,
} from "../repositories/staff-attraction.repository";

export interface UpsertStaffLocalizationInput {
  name: string;
  description: string;
  sourceReferences: unknown[];
}

export interface StaffLocalizationResult {
  id: number;
  attraction_id: number;
  language_code: string;
  name: string;
  description: string;
  source_references: unknown[];
  status: "draft";
  content_version: number;
  approved_by: number | null;
  published_at: Date | null;
}

export class StaffLocalizationAttractionNotFoundError
  extends Error {
  constructor() {
    super("Attraction not found");
    this.name =
      "StaffLocalizationAttractionNotFoundError";
  }
}

export class StaffLocalizationWorkflowConflictError
  extends Error {
  constructor() {
    super(
      "Localization cannot be edited in its current status"
    );

    this.name =
      "StaffLocalizationWorkflowConflictError";
  }
}

export class StaffLocalizationNotFoundError
  extends Error {
  constructor() {
    super("Localization not found");

    this.name =
      "StaffLocalizationNotFoundError";
  }
}

export interface StaffLocalizationReadResult {
  id: number;
  attraction_id: number;
  language_code: string;
  name: string;
  description: string;
  source_references: unknown[];
  status:
    | "draft"
    | "in_review"
    | "published"
    | "archived";
  content_version: number;
  approved_by: number | null;
  published_at: Date | null;
}

export async function getStaffLocalization(
  attractionId: number,
  language: string
): Promise<StaffLocalizationReadResult> {
  const localization =
    await findStaffLocalization(
      attractionId,
      language
    );

  if (!localization) {
    throw new StaffLocalizationNotFoundError();
  }

  return {
    id: Number(localization.localization_id),
    attraction_id: Number(
      localization.attraction_id
    ),
    language_code:
      localization.language_code,
    name: localization.name,
    description:
      localization.description,
    source_references:
      parseSourceReferences(
        localization.source_references
      ),
    status: localization.status,
    content_version:
      localization.content_version,
    approved_by:
      localization.approved_by === null
        ? null
        : Number(
            localization.approved_by
          ),
    published_at:
      localization.published_at,
  };
}

function parseSourceReferences(
  value: string
): unknown[] {
  try {
    const parsed = JSON.parse(value);

    return Array.isArray(parsed)
      ? parsed
      : [];
  } catch {
    return [];
  }
}

export async function upsertStaffLocalization(
  attractionId: number,
  language: string,
  input: UpsertStaffLocalizationInput
): Promise<StaffLocalizationResult> {
  const attraction =
    await findStaffAttractionById(
      attractionId
    );

  if (!attraction) {
    throw new StaffLocalizationAttractionNotFoundError();
  }

  const current =
    await findStaffLocalization(
      attractionId,
      language
    );

  if (
    current &&
    current.status !== "draft" &&
    current.status !== "published"
  ) {
    throw new StaffLocalizationWorkflowConflictError();
  }

  const localization =
    await upsertEditableLocalization(
      attractionId,
      language,
      input.name,
      input.description,
      input.sourceReferences
    );

  if (!localization) {
    throw new StaffLocalizationWorkflowConflictError();
  }

  return {
    id: Number(
      localization.localization_id
    ),
    attraction_id: Number(
      localization.attraction_id
    ),
    language_code:
      localization.language_code,
    name:
      localization.name,
    description:
      localization.description,
    source_references:
  parseSourceReferences(
    localization.source_references
  ),
    status: "draft",
    content_version:
      localization.content_version,
    approved_by:
      localization.approved_by === null
        ? null
        : Number(
            localization.approved_by
          ),
    published_at:
      localization.published_at,
  };
}