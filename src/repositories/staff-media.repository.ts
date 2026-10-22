import type {
  QueryResultRow,
} from "pg";

import {
  db,
} from "../config/database";

export interface StaffMediaRow
  extends QueryResultRow {
  media_id: string;
  attraction_id: string;

  language_code: string | null;

  media_type:
    | "image"
    | "audio";

  file_url: string;
  caption: string | null;

  credit: string;
  rights_reference: string;

  duration_seconds: number | null;
  display_order: number;

  status:
    | "draft"
    | "in_review"
    | "published"
    | "archived";

  approved_by: string | null;
  published_at: Date | null;
}

export async function createDraftMedia(
  attractionId: number,
  languageCode: string | null,
  mediaType: "image" | "audio",
  fileUrl: string,
  caption: string | null,
  credit: string,
  rightsReference: string,
  durationSeconds: number | null,
  displayOrder: number
): Promise<StaffMediaRow> {
  const result =
    await db.query<StaffMediaRow>(
      `
        INSERT INTO attraction_media (
          attraction_id,
          language_code,
          media_type,
          file_url,
          caption,
          credit,
          rights_reference,
          duration_seconds,
          display_order,
          status
        )
        VALUES (
          $1,
          $2,
          $3,
          $4,
          $5,
          $6,
          $7,
          $8,
          $9,
          'draft'
        )
        RETURNING
          media_id,
          attraction_id,
          language_code,
          media_type,
          file_url,
          caption,
          credit,
          rights_reference,
          duration_seconds,
          display_order,
          status,
          approved_by,
          published_at
      `,
      [
        attractionId,
        languageCode,
        mediaType,
        fileUrl,
        caption,
        credit,
        rightsReference,
        durationSeconds,
        displayOrder,
      ]
    );

  return result.rows[0];
}

export async function findStaffMediaById(
  mediaId: number
): Promise<StaffMediaRow | null> {
  const result =
    await db.query<StaffMediaRow>(
      `
        SELECT
          media_id,
          attraction_id,
          language_code,
          media_type,
          file_url,
          caption,
          credit,
          rights_reference,
          duration_seconds,
          display_order,
          status,
          approved_by,
          published_at

        FROM attraction_media

        WHERE media_id = $1

        LIMIT 1
      `,
      [mediaId]
    );

  return result.rows[0] ?? null;
}

/** List all staff-visible media (including drafts) for a single attraction. */
export async function listStaffMediaByAttraction(
  attractionId: number
): Promise<StaffMediaRow[]> {
  const result = await db.query<StaffMediaRow>(
    `
      SELECT
        media_id, attraction_id, language_code, media_type,
        file_url, caption, credit, rights_reference,
        duration_seconds, display_order, status, approved_by, published_at
      FROM attraction_media
      WHERE attraction_id = $1
      ORDER BY display_order ASC, media_id ASC
    `,
    [attractionId]
  );
  return result.rows;
}
