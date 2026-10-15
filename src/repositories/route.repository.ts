import type {
  QueryResultRow,
} from "pg";

import {
  db,
} from "../config/database";

export interface RouteListRow
  extends QueryResultRow {
  route_id: string;
  slug: string;
  name_vi: string;
  description_vi: string;
  area_code: string;
  estimated_minutes: number;
  verified_at: Date | null;
}

export interface RouteStopRow
  extends QueryResultRow {
  route_stop_id: string;
  route_id: string;
  attraction_id: string;

  stop_order: number;
  visit_minutes: number | null;
  travel_minutes_from_previous:
    | number
    | null;

  attraction_slug: string;
  attraction_name: string;

  latitude: number;
  longitude: number;
}

interface CountRow
  extends QueryResultRow {
  total: string;
}

/*
 * Public route chỉ hợp lệ khi:
 *
 * - route đang published
 * - có ít nhất 1 stop
 * - tất cả attraction trong stop
 *   đang published
 * - tất cả stop có localization vi
 *   đang published
 */
export async function findPublishedRoutes(
  limit: number,
  offset: number
): Promise<RouteListRow[]> {
  const result =
    await db.query<RouteListRow>(
      `
        SELECT
          r.route_id,
          r.slug,
          r.name_vi,
          r.description_vi,
          r.area_code,
          r.estimated_minutes,
          r.verified_at

        FROM routes AS r

        WHERE
          r.status = 'published'

          AND EXISTS (
            SELECT 1

            FROM route_stops AS rs

            WHERE
              rs.route_id =
                r.route_id
          )

          AND NOT EXISTS (
            SELECT 1

            FROM route_stops AS rs

            LEFT JOIN attractions AS a
              ON
                a.attraction_id =
                rs.attraction_id

            WHERE
              rs.route_id =
                r.route_id

              AND (
                a.status IS DISTINCT FROM
                  'published'

                OR NOT EXISTS (
                  SELECT 1

                  FROM attraction_localizations
                    AS loc

                  WHERE
                    loc.attraction_id =
                      rs.attraction_id

                    AND
                      loc.language_code =
                      'vi'

                    AND
                      loc.status =
                      'published'
                )
              )
          )

        ORDER BY
          r.route_id ASC

        LIMIT $1
        OFFSET $2
      `,
      [
        limit,
        offset,
      ]
    );

  return result.rows;
}

export async function countPublishedRoutes(): Promise<number> {
  const result =
    await db.query<CountRow>(
      `
        SELECT
          COUNT(*)::text AS total

        FROM routes AS r

        WHERE
          r.status = 'published'

          AND EXISTS (
            SELECT 1

            FROM route_stops AS rs

            WHERE
              rs.route_id =
                r.route_id
          )

          AND NOT EXISTS (
            SELECT 1

            FROM route_stops AS rs

            LEFT JOIN attractions AS a
              ON
                a.attraction_id =
                rs.attraction_id

            WHERE
              rs.route_id =
                r.route_id

              AND (
                a.status IS DISTINCT FROM
                  'published'

                OR NOT EXISTS (
                  SELECT 1

                  FROM attraction_localizations
                    AS loc

                  WHERE
                    loc.attraction_id =
                      rs.attraction_id

                    AND
                      loc.language_code =
                      'vi'

                    AND
                      loc.status =
                      'published'
                )
              )
          )
      `
    );

  return Number(
    result.rows[0]?.total ?? 0
  );
}

export async function findPublishedRouteById(
  routeId: number
): Promise<RouteListRow | null> {
  const result =
    await db.query<RouteListRow>(
      `
        SELECT
          r.route_id,
          r.slug,
          r.name_vi,
          r.description_vi,
          r.area_code,
          r.estimated_minutes,
          r.verified_at

        FROM routes AS r

        WHERE
          r.route_id = $1

          AND
            r.status =
            'published'

          AND EXISTS (
            SELECT 1

            FROM route_stops AS rs

            WHERE
              rs.route_id =
                r.route_id
          )

          AND NOT EXISTS (
            SELECT 1

            FROM route_stops AS rs

            LEFT JOIN attractions AS a
              ON
                a.attraction_id =
                rs.attraction_id

            WHERE
              rs.route_id =
                r.route_id

              AND (
                a.status IS DISTINCT FROM
                  'published'

                OR NOT EXISTS (
                  SELECT 1

                  FROM attraction_localizations
                    AS loc

                  WHERE
                    loc.attraction_id =
                      rs.attraction_id

                    AND
                      loc.language_code =
                      'vi'

                    AND
                      loc.status =
                      'published'
                )
              )
          )

        LIMIT 1
      `,
      [
        routeId,
      ]
    );

  return (
    result.rows[0] ??
    null
  );
}

export async function findRouteStopsByRouteId(
  routeId: number
): Promise<RouteStopRow[]> {
  const result =
    await db.query<RouteStopRow>(
      `
        SELECT
          rs.route_stop_id,
          rs.route_id,
          rs.attraction_id,
          rs.stop_order,
          rs.visit_minutes,
          rs.travel_minutes_from_previous,

          a.slug AS
            attraction_slug,

          a.latitude,
          a.longitude,

          loc.name AS
            attraction_name

        FROM route_stops AS rs

        JOIN attractions AS a
          ON
            a.attraction_id =
            rs.attraction_id

        JOIN attraction_localizations
          AS loc
          ON
            loc.attraction_id =
            a.attraction_id

          AND
            loc.language_code =
            'vi'

          AND
            loc.status =
            'published'

        WHERE
          rs.route_id = $1

          AND
            a.status =
            'published'

        ORDER BY
          rs.stop_order ASC
      `,
      [
        routeId,
      ]
    );

  return result.rows;
}