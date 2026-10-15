import type {
  QueryResultRow,
} from "pg";

import {
  db,
} from "../config/database";

export interface AttractionMediaRow
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

  duration_seconds:
    | number
    | null;

  display_order: number;
}

export interface AttractionListRow
  extends QueryResultRow {
  attraction_id: string;
  slug: string;
  area_code: string;
  latitude: number;
  longitude: number;
  trigger_radius_m: number;

  requested_name:
    | string
    | null;

  vi_name: string;
}

export interface AttractionDetailRow
  extends QueryResultRow {
  attraction_id: string;
  slug: string;
  area_code: string;

  latitude: number;
  longitude: number;
  trigger_radius_m: number;

  requested_name:
    | string
    | null;

  requested_description:
    | string
    | null;

  requested_source_references:
    | string
    | null;

  vi_name: string;
  vi_description: string;
  vi_source_references: string;
}

interface CountRow
  extends QueryResultRow {
  total: string;
}

export async function findPublishedAttractions(
  requestedLanguage: string,
  limit: number,
  offset: number
): Promise<AttractionListRow[]> {
  const result =
    await db.query<AttractionListRow>(
      `
        SELECT
          a.attraction_id,
          a.slug,
          a.area_code,
          a.latitude,
          a.longitude,
          a.trigger_radius_m,

          requested_loc.name
            AS requested_name,

          vi_loc.name
            AS vi_name

        FROM attractions AS a

        /*
         * Requested language là optional.
         * Nếu không có thì service fallback sang vi.
         */
        LEFT JOIN
          attraction_localizations
          AS requested_loc
          ON
            requested_loc.attraction_id =
            a.attraction_id

          AND
            requested_loc.language_code =
            $1

          AND
            requested_loc.status =
            'published'

        /*
         * Published Vietnamese localization
         * là bắt buộc cho public attraction.
         */
        JOIN
          attraction_localizations
          AS vi_loc
          ON
            vi_loc.attraction_id =
            a.attraction_id

          AND
            vi_loc.language_code =
            'vi'

          AND
            vi_loc.status =
            'published'

        WHERE
          a.status =
          'published'

        ORDER BY
          a.attraction_id ASC

        LIMIT $2
        OFFSET $3
      `,
      [
        requestedLanguage,
        limit,
        offset,
      ]
    );

  return result.rows;
}

export async function countPublishedAttractions():
Promise<number> {
  const result =
    await db.query<CountRow>(
      `
        SELECT
          COUNT(*)::text
            AS total

        FROM attractions AS a

        WHERE
          a.status =
          'published'

          AND EXISTS (
            SELECT 1

            FROM
              attraction_localizations
              AS loc

            WHERE
              loc.attraction_id =
              a.attraction_id

              AND
                loc.language_code =
                'vi'

              AND
                loc.status =
                'published'
          )
      `
    );

  return Number(
    result.rows[0]?.total ??
    0
  );
}

export async function findPublishedAttractionById(
  attractionId: number,
  requestedLanguage: string
): Promise<AttractionDetailRow | null> {
  const result =
    await db.query<AttractionDetailRow>(
      `
        SELECT
          a.attraction_id,
          a.slug,
          a.area_code,
          a.latitude,
          a.longitude,
          a.trigger_radius_m,

          requested_loc.name
            AS requested_name,

          requested_loc.description
            AS requested_description,

          requested_loc.source_references
            AS requested_source_references,

          vi_loc.name
            AS vi_name,

          vi_loc.description
            AS vi_description,

          vi_loc.source_references
            AS vi_source_references

        FROM attractions AS a

        LEFT JOIN
          attraction_localizations
          AS requested_loc
          ON
            requested_loc.attraction_id =
            a.attraction_id

          AND
            requested_loc.language_code =
            $2

          AND
            requested_loc.status =
            'published'

        JOIN
          attraction_localizations
          AS vi_loc
          ON
            vi_loc.attraction_id =
            a.attraction_id

          AND
            vi_loc.language_code =
            'vi'

          AND
            vi_loc.status =
            'published'

        WHERE
          a.attraction_id =
          $1

          AND
            a.status =
            'published'

        LIMIT 1
      `,
      [
        attractionId,
        requestedLanguage,
      ]
    );

  return (
    result.rows[0] ??
    null
  );
}

export async function findPublishedAttractionMedia(
  attractionId: number,
  requestedLanguage: string
): Promise<AttractionMediaRow[]> {
  const result =
    await db.query<AttractionMediaRow>(
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
          display_order

        FROM attraction_media

        WHERE
          attraction_id =
          $1

          AND
            status =
            'published'

          AND (
            media_type =
              'image'

            OR (
              media_type =
                'audio'

              AND
                language_code
                IN (
                  $2,
                  'vi'
                )
            )
          )

        ORDER BY
          display_order ASC,
          media_id ASC
      `,
      [
        attractionId,
        requestedLanguage,
      ]
    );

  return result.rows;
}