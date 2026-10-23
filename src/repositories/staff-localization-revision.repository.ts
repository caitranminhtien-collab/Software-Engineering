import type { QueryResultRow } from "pg";
import { db } from "../config/database";

export type LocalizationRevisionStatus =
  | "draft"
  | "in_review"
  | "published"
  | "archived";

export interface StaffLocalizationRevisionRow extends QueryResultRow {
  revision_id: string;
  attraction_id: string;
  language_code: string;
  name: string;
  description: string;
  source_references: string;
  base_content_version: number | null;
  status: LocalizationRevisionStatus;
  created_by: string;
  approved_by: string | null;
  published_at: Date | null;
  created_at: Date;
  updated_at: Date;
}

const REVISION_COLUMNS = `
  revision_id, attraction_id, language_code, name, description,
  source_references, base_content_version, status, created_by,
  approved_by, published_at, created_at, updated_at
`;

/** Find the draft/in-review edit without changing the public localization. */
export async function findActiveLocalizationRevision(
  attractionId: number,
  language: string
): Promise<StaffLocalizationRevisionRow | null> {
  const result = await db.query<StaffLocalizationRevisionRow>(
    `SELECT ${REVISION_COLUMNS}
     FROM public.attraction_localization_revisions
     WHERE attraction_id = $1 AND language_code = $2
       AND status IN ('draft', 'in_review')
     LIMIT 1`,
    [attractionId, language]
  );
  return result.rows[0] ?? null;
}

/**
 * Stage an edit of an EXISTING published localization.
 * No write is made to attraction_localizations; public User content stays live.
 * If a draft already exists, save its new content without changing its base
 * version or original author. An in-review revision cannot be edited.
 * Returns null when the published source does not exist or review is underway.
 */
export async function savePublishedLocalizationRevisionDraft(
  attractionId: number,
  language: string,
  name: string,
  description: string,
  sourceReferences: unknown[],
  createdBy: number
): Promise<StaffLocalizationRevisionRow | null> {
  const result = await db.query<StaffLocalizationRevisionRow>(
    `INSERT INTO public.attraction_localization_revisions (
       attraction_id, language_code, name, description,
       source_references, base_content_version, status, created_by
     )
     SELECT
       l.attraction_id, l.language_code, $3, $4, $5,
       l.content_version, 'draft', $6
     FROM public.attraction_localizations AS l
     WHERE l.attraction_id = $1
       AND l.language_code = $2
       AND l.status = 'published'
     ON CONFLICT (attraction_id, language_code)
       WHERE status IN ('draft', 'in_review')
     DO UPDATE SET
       name = EXCLUDED.name,
       description = EXCLUDED.description,
       source_references = EXCLUDED.source_references,
       updated_at = CURRENT_TIMESTAMP
     WHERE attraction_localization_revisions.status = 'draft'
     RETURNING ${REVISION_COLUMNS}`,
    [
      attractionId,
      language,
      name,
      description,
      JSON.stringify(sourceReferences),
      createdBy,
    ]
  );
  return result.rows[0] ?? null;
}


/** Find the currently working revision using the SAME localization_id
 * as the existing Admin workflow URLs. Never mistake a revision_id for it. */
export async function findActiveRevisionByLocalizationId(
  localizationId: number
): Promise<StaffLocalizationRevisionRow | null> {
  const result = await db.query<StaffLocalizationRevisionRow>(
    `SELECT ${REVISION_COLUMNS.split(',').map((c) => 'r.'+c.trim()).join(', ')}
     FROM public.attraction_localization_revisions AS r
     JOIN public.attraction_localizations AS l
       ON l.attraction_id = r.attraction_id
      AND l.language_code = r.language_code
     WHERE l.localization_id = $1
       AND l.status = 'published'
       AND r.status IN ('draft', 'in_review')
     LIMIT 1`,
    [localizationId]
  );
  return result.rows[0] ?? null;
}

/** Submit a staged edit, provided the base has not changed. */
export async function submitLocalizationRevision(
  localizationId: number
): Promise<StaffLocalizationRevisionRow | null> {
  const result = await db.query<StaffLocalizationRevisionRow>(
    `UPDATE public.attraction_localization_revisions AS r
     SET status = 'in_review', updated_at = CURRENT_TIMESTAMP
     FROM public.attraction_localizations AS l
     WHERE l.localization_id = $1
       AND l.attraction_id = r.attraction_id
       AND l.language_code = r.language_code
       AND l.status = 'published'
       AND r.status = 'draft'
       AND r.base_content_version = l.content_version
     RETURNING ${REVISION_COLUMNS.split(',').map((c) => 'r.'+c.trim()).join(', ')}`,
    [localizationId]
  );
  return result.rows[0] ?? null;
}

/** Approve retains in_review, matching the existing review contract.
 * Reject returns the working revision to draft without touching the public row. */
export async function reviewLocalizationRevision(
  localizationId: number,
  decision: "approve" | "reject"
): Promise<StaffLocalizationRevisionRow | null> {
  if (decision === "approve") {
    const current = await findActiveRevisionByLocalizationId(localizationId);
    return current?.status === "in_review" ? current : null;
  }
  const result = await db.query<StaffLocalizationRevisionRow>(
    `UPDATE public.attraction_localization_revisions AS r
     SET status = 'draft', approved_by = NULL, published_at = NULL,
         updated_at = CURRENT_TIMESTAMP
     FROM public.attraction_localizations AS l
     WHERE l.localization_id = $1
       AND l.attraction_id = r.attraction_id
       AND l.language_code = r.language_code
       AND l.status = 'published'
       AND r.status = 'in_review'
     RETURNING ${REVISION_COLUMNS.split(',').map((c) => 'r.'+c.trim()).join(', ')}`,
    [localizationId]
  );
  return result.rows[0] ?? null;
}

export class LocalizationRevisionInvalidContentError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "LocalizationRevisionInvalidContentError";
  }
}

export interface PublishedLocalizationRevisionRow extends QueryResultRow {
  resource_id: string;
  status: "published";
  version: number;
  approved_by: string;
  published_at: Date;
}

/** Publish both rows in one transaction. The public row is never set to draft.
 * Row locks + base-content-version checks reject stale / concurrent changes. */
export async function publishLocalizationRevision(
  localizationId: number,
  approvedBy: number
): Promise<PublishedLocalizationRevisionRow | null> {
  const client = await db.connect();
  try {
    await client.query("BEGIN");
    const baseResult = await client.query<{
      attraction_id: string;
      language_code: string;
      content_version: number;
      status: string;
    } & QueryResultRow>(
      `SELECT attraction_id, language_code, content_version, status
       FROM public.attraction_localizations
       WHERE localization_id = $1
       FOR UPDATE`,
      [localizationId]
    );
    const base = baseResult.rows[0];
    if (!base || base.status !== "published") {
      await client.query("ROLLBACK");
      return null;
    }

    const draftResult = await client.query<StaffLocalizationRevisionRow>(
      `SELECT ${REVISION_COLUMNS}
       FROM public.attraction_localization_revisions
       WHERE attraction_id = $1 AND language_code = $2
         AND status = 'in_review'
       FOR UPDATE`,
      [base.attraction_id, base.language_code]
    );
    const draft = draftResult.rows[0];
    if (!draft || draft.base_content_version !== base.content_version) {
      await client.query("ROLLBACK");
      return null;
    }

    let refs: unknown;
    try { refs = JSON.parse(draft.source_references); }
    catch { refs = null; }
    if (!draft.name.trim() || !draft.description.trim() ||
        !Array.isArray(refs) || refs.length === 0) {
      throw new LocalizationRevisionInvalidContentError(
        "Localization requires name, description and at least one source reference before publication"
      );
    }

    const publicResult = await client.query<PublishedLocalizationRevisionRow>(
      `UPDATE public.attraction_localizations
       SET name = $2,
           description = $3,
           source_references = $4,
           content_version = content_version + 1,
           status = 'published',
           approved_by = $5,
           published_at = CURRENT_TIMESTAMP
       WHERE localization_id = $1
         AND status = 'published'
         AND content_version = $6
       RETURNING localization_id AS resource_id, status,
                 content_version AS version, approved_by, published_at`,
      [localizationId, draft.name, draft.description,
       draft.source_references, approvedBy, base.content_version]
    );
    const published = publicResult.rows[0];
    if (!published) {
      await client.query("ROLLBACK");
      return null;
    }
    const revisionResult = await client.query(
      `UPDATE public.attraction_localization_revisions
       SET status = 'published', approved_by = $2,
           published_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP
       WHERE revision_id = $1 AND status = 'in_review'
       RETURNING revision_id`,
      [draft.revision_id, approvedBy]
    );
    if (revisionResult.rowCount !== 1) {
      await client.query("ROLLBACK");
      return null;
    }
    await client.query("COMMIT");
    return published;
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}
