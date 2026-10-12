import type {
  QueryResultRow,
} from "pg";

import {
  db,
} from "../config/database";

export interface StaffRouteRow
  extends QueryResultRow {
  route_id: string;

  slug: string;
  name_vi: string;
  description_vi: string;
  area_code: string;

  estimated_minutes: number;

  verified_at: Date | null;

  status:
    | "draft"
    | "in_review"
    | "published"
    | "archived";

  content_version: number;

  created_by: string;

  approved_by: string | null;
  published_at: Date | null;
}

export interface ExistingAttractionRow
  extends QueryResultRow {
  attraction_id: string;
}

export interface ReplaceRouteStopInput {
  attractionId: number;
  stopOrder: number;

  visitMinutes: number | null;

  travelMinutesFromPrevious:
    number | null;
}

export async function findStaffRouteById(
  routeId: number
): Promise<StaffRouteRow | null> {
  const result =
    await db.query<StaffRouteRow>(
      `
        SELECT
          route_id,
          slug,
          name_vi,
          description_vi,
          area_code,
          estimated_minutes,
          verified_at,
          status,
          content_version,
          created_by,
          approved_by,
          published_at

        FROM routes

        WHERE route_id = $1

        LIMIT 1
      `,
      [routeId]
    );

  return result.rows[0] ?? null;
}

export async function findStaffRouteBySlug(
  slug: string
): Promise<StaffRouteRow | null> {
  const result =
    await db.query<StaffRouteRow>(
      `
        SELECT
          route_id,
          slug,
          name_vi,
          description_vi,
          area_code,
          estimated_minutes,
          verified_at,
          status,
          content_version,
          created_by,
          approved_by,
          published_at

        FROM routes

        WHERE slug = $1

        LIMIT 1
      `,
      [slug]
    );

  return result.rows[0] ?? null;
}

export async function createDraftRoute(
  slug: string,
  nameVi: string,
  descriptionVi: string,
  areaCode: string,
  estimatedMinutes: number,
  createdBy: number
): Promise<StaffRouteRow> {
  const result =
    await db.query<StaffRouteRow>(
      `
        INSERT INTO routes (
          slug,
          name_vi,
          description_vi,
          area_code,
          estimated_minutes,
          verified_at,
          status,
          content_version,
          created_by,
          approved_by,
          published_at
        )
        VALUES (
          $1,
          $2,
          $3,
          $4,
          $5,
          NULL,
          'draft',
          1,
          $6,
          NULL,
          NULL
        )
        RETURNING
          route_id,
          slug,
          name_vi,
          description_vi,
          area_code,
          estimated_minutes,
          verified_at,
          status,
          content_version,
          created_by,
          approved_by,
          published_at
      `,
      [
        slug,
        nameVi,
        descriptionVi,
        areaCode,
        estimatedMinutes,
        createdBy,
      ]
    );

  return result.rows[0];
}

export async function findExistingAttractionIds(
  attractionIds: number[]
): Promise<number[]> {
  const uniqueIds =
    [...new Set(attractionIds)];

  if (uniqueIds.length === 0) {
    return [];
  }

  const result =
    await db.query<ExistingAttractionRow>(
      `
        SELECT attraction_id

        FROM attractions

        WHERE attraction_id =
          ANY($1::bigint[])
      `,
      [uniqueIds]
    );

  return result.rows.map(
    (row) =>
      Number(row.attraction_id)
  );
}

export async function replaceRouteStopsAtomically(
  routeId: number,
  stops: ReplaceRouteStopInput[]
): Promise<StaffRouteRow | null> {
  const client =
    await db.connect();

  try {
    await client.query(
      "BEGIN"
    );

    const routeResult =
      await client.query<StaffRouteRow>(
        `
          SELECT
            route_id,
            slug,
            name_vi,
            description_vi,
            area_code,
            estimated_minutes,
            verified_at,
            status,
            content_version,
            created_by,
            approved_by,
            published_at

          FROM routes

          WHERE route_id = $1

          FOR UPDATE
        `,
        [routeId]
      );

    const route =
      routeResult.rows[0];

    if (!route) {
      await client.query(
        "ROLLBACK"
      );

      return null;
    }

    if (
      route.status !== "draft" &&
      route.status !== "published"
    ) {
      await client.query(
        "ROLLBACK"
      );

      return null;
    }

    await client.query(
      `
        DELETE FROM route_stops

        WHERE route_id = $1
      `,
      [routeId]
    );

    for (const stop of stops) {
      await client.query(
        `
          INSERT INTO route_stops (
            route_id,
            attraction_id,
            stop_order,
            visit_minutes,
            travel_minutes_from_previous
          )
          VALUES (
            $1,
            $2,
            $3,
            $4,
            $5
          )
        `,
        [
          routeId,
          stop.attractionId,
          stop.stopOrder,
          stop.visitMinutes,
          stop
            .travelMinutesFromPrevious,
        ]
      );
    }

    const updated =
      await client.query<StaffRouteRow>(
        `
          UPDATE routes

          SET
            status = 'draft',
            content_version =
              content_version + 1,
            verified_at = NULL,
            approved_by = NULL,
            published_at = NULL

          WHERE route_id = $1

          RETURNING
            route_id,
            slug,
            name_vi,
            description_vi,
            area_code,
            estimated_minutes,
            verified_at,
            status,
            content_version,
            created_by,
            approved_by,
            published_at
        `,
        [routeId]
      );

    await client.query(
      "COMMIT"
    );

    return updated.rows[0] ?? null;
  } catch (error) {
    await client.query(
      "ROLLBACK"
    );

    throw error;
  } finally {
    client.release();
  }
}