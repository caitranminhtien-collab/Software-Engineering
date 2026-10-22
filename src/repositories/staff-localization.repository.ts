import type { QueryResultRow } from "pg";
import { db } from "../config/database";

export interface StaffLocalizationRow
  extends QueryResultRow {
  localization_id: string;
  attraction_id: string;
  language_code: string;
  name: string;
  description: string;
  source_references: string;
  status:
    | "draft"
    | "in_review"
    | "published"
    | "archived";
  content_version: number;
  approved_by: string | null;
  published_at: Date | null;
}

export async function findStaffLocalization(
  attractionId: number,
  language: string
): Promise<StaffLocalizationRow | null> {
  const result =
    await db.query<StaffLocalizationRow>(
      `
        SELECT
          localization_id,
          attraction_id,
          language_code,
          name,
          description,
          source_references,
          status,
          content_version,
          approved_by,
          published_at
        FROM attraction_localizations
        WHERE attraction_id = $1
          AND language_code = $2
        LIMIT 1
      `,
      [attractionId, language]
    );

  return result.rows[0] ?? null;
}

export async function upsertEditableLocalization(
  attractionId: number,
  language: string,
  name: string,
  description: string,
  sourceReferences: unknown[]
): Promise<StaffLocalizationRow | null> {
  const result =
    await db.query<StaffLocalizationRow>(
      `
        INSERT INTO attraction_localizations (
          attraction_id,
          language_code,
          name,
          description,
          source_references,
          status,
          content_version
        )
        VALUES (
          $1,
          $2,
          $3,
          $4,
          $5,
          'draft',
          1
        )

        ON CONFLICT (
          attraction_id,
          language_code
        )
        DO UPDATE SET
          name = EXCLUDED.name,
          description = EXCLUDED.description,
          source_references =
            EXCLUDED.source_references,

          status = 'draft',

          content_version =
            attraction_localizations
              .content_version + 1,

          approved_by = NULL,
          published_at = NULL

        WHERE
          attraction_localizations.status
          IN (
            'draft',
            'published'
          )

        RETURNING
          localization_id,
          attraction_id,
          language_code,
          name,
          description,
          source_references,
          status,
          content_version,
          approved_by,
          published_at
      `,
      [
        attractionId,
        language,
        name,
        description,
        JSON.stringify(
          sourceReferences
        ),
      ]
    );

  return result.rows[0] ?? null;
}
/** Insert only; do not overwrite an existing approved or editor-modified translation. */
export async function insertTranslationDraftIfAbsent(
  attractionId: number,
  language: string,
  name: string,
  description: string,
  sourceReferences: unknown[]
): Promise<StaffLocalizationRow | null> {
  const result = await db.query<StaffLocalizationRow>(`
    INSERT INTO attraction_localizations
      (attraction_id, language_code, name, description, source_references, status, content_version)
    VALUES ($1, $2, $3, $4, $5, 'draft', 1)
    ON CONFLICT (attraction_id, language_code) DO NOTHING
    RETURNING localization_id, attraction_id, language_code, name, description,
      source_references, status, content_version, approved_by, published_at
  `, [attractionId, language, name, description, JSON.stringify(sourceReferences)]);
  return result.rows[0] ?? null;
}
