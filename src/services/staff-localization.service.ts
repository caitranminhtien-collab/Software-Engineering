import {
  translateHeritageLocalization,
  TRANSLATION_LANGUAGES,
  type TranslationLanguage,
} from "../adapters/llm/gemini-translation.provider";
import {
  findStaffLocalization,
  upsertEditableLocalization,
  insertTranslationDraftIfAbsent,
} from "../repositories/staff-localization.repository";

import {
  findActiveLocalizationRevision,
  savePublishedLocalizationRevisionDraft,
  type StaffLocalizationRevisionRow,
} from "../repositories/staff-localization-revision.repository";

import {
  findStaffAttractionById,
} from "../repositories/staff-attraction.repository";

export interface UpsertStaffLocalizationInput {
  name: string;
  description: string;
  sourceReferences: unknown[];
}

export interface StaffLocalizationResult {
  /** Existing localization ID (NOT revision ID). */
  id: number;
  /** Present only when editing a previously published localization. */
  revision_id?: number;
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

export class StaffLocalizationNotFoundError extends Error {
  constructor() {
    super("Localization not found");
    this.name = "StaffLocalizationNotFoundError";
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

function parseSourceReferences(
  value: string | unknown[] | null
): unknown[] {
  if (Array.isArray(value)) return value;
  if (typeof value !== "string") return [];
  try {
    const parsed = JSON.parse(value);

    return Array.isArray(parsed)
      ? parsed
      : [];
  } catch {
    return [];
  }
}

/** Revision is separate from the live content served to visitors. */
function revisionToDraftResult(
  publicLocalizationId: string,
  revision: StaffLocalizationRevisionRow
): StaffLocalizationResult {
  return {
    id: Number(publicLocalizationId),
    revision_id: Number(revision.revision_id),
    attraction_id: Number(revision.attraction_id),
    language_code: revision.language_code,
    name: revision.name,
    description: revision.description,
    source_references: parseSourceReferences(revision.source_references),
    status: "draft",
    content_version: Number(revision.base_content_version ?? 0) + 1,
    approved_by: null,
    published_at: null,
  };
}

/** Read one localization, including unpublished content, for authenticated Staff. */
export async function getStaffLocalization(
  attractionId: number,
  language: string
): Promise<Omit<StaffLocalizationResult, "status"> & {
  status: "draft" | "in_review" | "published" | "archived";
}> {
  const attraction = await findStaffAttractionById(attractionId);
  if (!attraction) throw new StaffLocalizationAttractionNotFoundError();

  const localization = await findStaffLocalization(attractionId, language);
  if (!localization) throw new StaffLocalizationNotFoundError();

  // Staff sees the working copy; public APIs still read the published record.
  if (localization.status === "published") {
    const revision = await findActiveLocalizationRevision(attractionId, language);
    if (revision) {
      return {
        ...revisionToDraftResult(localization.localization_id, revision),
        status: revision.status as "draft" | "in_review",
      };
    }
  }

  return {
    id: Number(localization.localization_id),
    attraction_id: Number(localization.attraction_id),
    language_code: localization.language_code,
    name: localization.name,
    description: localization.description,
    source_references: parseSourceReferences(localization.source_references),
    status: localization.status,
    content_version: localization.content_version,
    approved_by: localization.approved_by === null ? null : Number(localization.approved_by),
    published_at: localization.published_at,
  };
}

export async function upsertStaffLocalization(
  attractionId: number,
  language: string,
  input: UpsertStaffLocalizationInput,
  createdBy: number
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

  if (current?.status === "published") {
    const revision = await savePublishedLocalizationRevisionDraft(
      attractionId,
      language,
      input.name,
      input.description,
      input.sourceReferences,
      createdBy
    );
    if (!revision) throw new StaffLocalizationWorkflowConflictError();
    return revisionToDraftResult(current.localization_id, revision);
  }

  // New localization and never-published drafts retain their existing workflow.
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
export class StaffLocalizationTranslationConflictError extends Error {
  constructor(message: string) { super(message); this.name = 'StaffLocalizationTranslationConflictError'; }
}

/** Generate an unpublished draft. Staff must verify history/terminology and use the existing workflow. */
export async function generateStaffLocalizationDraft(
  attractionId: number, language: TranslationLanguage
): Promise<StaffLocalizationResult> {
  const attraction = await findStaffAttractionById(attractionId);
  if (!attraction) throw new StaffLocalizationAttractionNotFoundError();
  if (!(language in TRANSLATION_LANGUAGES)) {
    throw new StaffLocalizationTranslationConflictError('Ngôn ngữ dịch không được hỗ trợ');
  }
  const vietnamese = await findStaffLocalization(attractionId, 'vi');
  if (!vietnamese || vietnamese.status !== 'published') {
    throw new StaffLocalizationTranslationConflictError('Phải xuất bản nội dung tiếng Việt trước khi tạo bản dịch');
  }
  if (await findStaffLocalization(attractionId, language)) {
    throw new StaffLocalizationTranslationConflictError(
      'Đã có bản nội dung ngôn ngữ này; hãy mở và chỉnh sửa bản hiện có, không dịch đè'
    );
  }
  // AI receives source name/description only, not write instructions from visitor input.
  const translated = await translateHeritageLocalization({
    name: vietnamese.name, description: vietnamese.description,
  }, language);
  const refs = parseSourceReferences(vietnamese.source_references);
  const created = await insertTranslationDraftIfAbsent(
    attractionId, language, translated.name, translated.description, refs
  );
  if (!created) throw new StaffLocalizationTranslationConflictError('Bản dịch đã được tạo bởi yêu cầu khác');
  return {
    id: Number(created.localization_id),
    attraction_id: Number(created.attraction_id),
    language_code: created.language_code,
    name: created.name, description: created.description,
    source_references: parseSourceReferences(created.source_references),
    status: 'draft', content_version: created.content_version,
    approved_by: null, published_at: null,
  };
}


/** Explicitly retranslate an existing localization. When already published,
 * stage the new translation separately; public content stays visible.
 * No translation is auto-published by this endpoint.
 */
export async function regenerateStaffLocalizationDraft(
  attractionId: number,
  language: TranslationLanguage,
  createdBy: number
): Promise<StaffLocalizationResult> {
  const attraction = await findStaffAttractionById(attractionId);
  if (!attraction) throw new StaffLocalizationAttractionNotFoundError();
  if (!(language in TRANSLATION_LANGUAGES)) {
    throw new StaffLocalizationTranslationConflictError('Ngôn ngữ dịch không được hỗ trợ');
  }
  const vietnamese = await findStaffLocalization(attractionId, 'vi');
  if (!vietnamese || vietnamese.status !== 'published') {
    throw new StaffLocalizationTranslationConflictError('Phải xuất bản lại nội dung tiếng Việt trước khi dịch');
  }
  const current = await findStaffLocalization(attractionId, language);
  if (!current) {
    throw new StaffLocalizationTranslationConflictError('Chưa có bản dịch; hãy dùng Dịch bằng AI');
  }
  if (!['draft', 'published'].includes(current.status)) {
    throw new StaffLocalizationTranslationConflictError('Chỉ dịch lại bản draft/published; nếu chờ duyệt phải từ chối trước');
  }
  const translated = await translateHeritageLocalization({
    name: vietnamese.name,
    description: vietnamese.description,
  }, language);
  if (current.status === "published") {
    const revision = await savePublishedLocalizationRevisionDraft(
      attractionId,
      language,
      translated.name,
      translated.description,
      parseSourceReferences(vietnamese.source_references),
      createdBy
    );
    if (!revision) throw new StaffLocalizationWorkflowConflictError();
    return revisionToDraftResult(current.localization_id, revision);
  }

  const saved = await upsertEditableLocalization(
    attractionId, language, translated.name, translated.description,
    parseSourceReferences(vietnamese.source_references)
  );
  if (!saved) {
    throw new StaffLocalizationWorkflowConflictError();
  }
  return {
    id: Number(saved.localization_id), attraction_id: Number(saved.attraction_id),
    language_code: saved.language_code, name: saved.name,
    description: saved.description,
    source_references: parseSourceReferences(saved.source_references),
    status: 'draft', content_version: saved.content_version,
    approved_by: null, published_at: null,
  };
}
