import type {
  QueryResultRow,
} from "pg";

import {
  db,
} from "../config/database";

export interface LocationSuggestionAttractionRow
  extends QueryResultRow {
  attraction_id: string;
  slug: string;
  area_code: string;

  latitude: number;
  longitude: number;
  trigger_radius_m: number;

  name: string;
  description: string;

  content_language: string;
  fallback_used: boolean;
}

export async function findPublishedAttractionsForLocation(
  requestedLanguage: string
): Promise<
  LocationSuggestionAttractionRow[]
> {
  const result =
    await db.query<LocationSuggestionAttractionRow>(
      `
        SELECT
          a.attraction_id,
          a.slug,
          a.area_code,
          a.latitude,
          a.longitude,
          a.trigger_radius_m,

          COALESCE(
            requested_localization.name,
            vi_localization.name
          ) AS name,

          COALESCE(
            requested_localization.description,
            vi_localization.description
          ) AS description,

          CASE
            WHEN
              requested_localization.localization_id
              IS NOT NULL
            THEN $1
            ELSE 'vi'
          END AS content_language,

          CASE
            WHEN
              requested_localization.localization_id
              IS NOT NULL
            THEN FALSE
            ELSE $1 <> 'vi'
          END AS fallback_used

        FROM attractions AS a

        /*
         * Vietnamese published localization is
         * mandatory for visitor-facing attraction
         * availability.
         */
        INNER JOIN attraction_localizations
          AS vi_localization
          ON
            vi_localization.attraction_id =
              a.attraction_id
          AND
            vi_localization.language_code =
              'vi'
          AND
            vi_localization.status =
              'published'

        LEFT JOIN attraction_localizations
          AS requested_localization
          ON
            requested_localization.attraction_id =
              a.attraction_id
          AND
            requested_localization.language_code =
              $1
          AND
            requested_localization.status =
              'published'

        WHERE
          a.status = 'published'

        ORDER BY
          a.attraction_id ASC
      `,
      [
        requestedLanguage,
      ]
    );

  return result.rows;
}