import type { QueryResultRow } from "pg";
import { db } from "../config/database";

export interface AttractionListRow extends QueryResultRow {
  attraction_id: string;
  slug: string;
  area_code: string;
  latitude: number;
  longitude: number;
  trigger_radius_m: number;

  requested_name: string | null;
  vi_name: string | null;
}
export interface AttractionDetailRow extends QueryResultRow {
  attraction_id: string;
  slug: string;
  area_code: string;

  latitude: number;
  longitude: number;
  trigger_radius_m: number;

  requested_name: string | null;
  requested_description: string | null;

  vi_name: string | null;
  vi_description: string | null;
}
interface CountRow extends QueryResultRow {
  total: string;
}

export async function findPublishedAttractions(
  requestedLanguage: string,
  limit: number,
  offset: number
): Promise<AttractionListRow[]> {
  const result = await db.query<AttractionListRow>(
    `
      SELECT
        a.attraction_id,
        a.slug,
        a.area_code,
        a.latitude,
        a.longitude,
        a.trigger_radius_m,

        requested_loc.name AS requested_name,
        vi_loc.name AS vi_name

      FROM attractions AS a

      LEFT JOIN attraction_localizations AS requested_loc
        ON requested_loc.attraction_id = a.attraction_id
        AND requested_loc.language_code = $1
        AND requested_loc.status = 'published'

      LEFT JOIN attraction_localizations AS vi_loc
        ON vi_loc.attraction_id = a.attraction_id
        AND vi_loc.language_code = 'vi'
        AND vi_loc.status = 'published'

      WHERE a.status = 'published'

      ORDER BY a.attraction_id ASC

      LIMIT $2
      OFFSET $3
    `,
    [requestedLanguage, limit, offset]
  );

  return result.rows;
}

export async function countPublishedAttractions(): Promise<number> {
  const result = await db.query<CountRow>(
    `
      SELECT COUNT(*)::text AS total
      FROM attractions
      WHERE status = 'published'
    `
  );

  return Number(result.rows[0]?.total ?? 0);
}
export async function findPublishedAttractionById(
  attractionId: number,
  requestedLanguage: string
): Promise<AttractionDetailRow | null> {
  const result = await db.query<AttractionDetailRow>(
    `
      SELECT
        a.attraction_id,
        a.slug,
        a.area_code,
        a.latitude,
        a.longitude,
        a.trigger_radius_m,

        requested_loc.name AS requested_name,
        requested_loc.description AS requested_description,

        vi_loc.name AS vi_name,
        vi_loc.description AS vi_description

      FROM attractions AS a

      LEFT JOIN attraction_localizations AS requested_loc
        ON requested_loc.attraction_id = a.attraction_id
        AND requested_loc.language_code = $2
        AND requested_loc.status = 'published'

      LEFT JOIN attraction_localizations AS vi_loc
        ON vi_loc.attraction_id = a.attraction_id
        AND vi_loc.language_code = 'vi'
        AND vi_loc.status = 'published'

      WHERE a.attraction_id = $1
        AND a.status = 'published'

      LIMIT 1
    `,
    [attractionId, requestedLanguage]
  );

  return result.rows[0] ?? null;
}