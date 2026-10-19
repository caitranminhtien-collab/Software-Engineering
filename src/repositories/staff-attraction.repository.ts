import type {
  QueryResultRow,
} from "pg";

import {
  db,
} from "../config/database";

export interface StaffAttractionRow
  extends QueryResultRow {
  attraction_id: string;
  slug: string;
  area_code: string;
  latitude: number;
  longitude: number;
  trigger_radius_m: number;
  status:
    | "draft"
    | "in_review"
    | "published"
    | "archived";
  content_version: number;
  created_by: string;
  approved_by: string | null;
  published_at: Date | null;
  updated_at: Date;
}

export async function createDraftAttraction(
  slug: string,
  areaCode: string,
  latitude: number,
  longitude: number,
  triggerRadiusM: number,
  createdBy: number
): Promise<StaffAttractionRow> {
  const result =
    await db.query<StaffAttractionRow>(
      `
        INSERT INTO attractions (
          slug,
          area_code,
          latitude,
          longitude,
          trigger_radius_m,
          status,
          content_version,
          created_by
        )
        VALUES (
          $1,
          $2,
          $3,
          $4,
          $5,
          'draft',
          1,
          $6
        )
        RETURNING
          attraction_id,
          slug,
          area_code,
          latitude,
          longitude,
          trigger_radius_m,
          status,
          content_version,
          created_by,
          approved_by,
          published_at,
          updated_at
      `,
      [
        slug,
        areaCode,
        latitude,
        longitude,
        triggerRadiusM,
        createdBy,
      ]
    );

  return result.rows[0];
}

export async function findAttractionBySlug(
  slug: string
): Promise<StaffAttractionRow | null> {
  const result =
    await db.query<StaffAttractionRow>(
      `
        SELECT
          attraction_id,
          slug,
          area_code,
          latitude,
          longitude,
          trigger_radius_m,
          status,
          content_version,
          created_by,
          approved_by,
          published_at,
          updated_at
        FROM attractions
        WHERE slug = $1
        LIMIT 1
      `,
      [slug]
    );

  return result.rows[0] ?? null;
}

export async function findStaffAttractionById(
  attractionId: number
): Promise<StaffAttractionRow | null> {
  const result =
    await db.query<StaffAttractionRow>(
      `
        SELECT
          attraction_id,
          slug,
          area_code,
          latitude,
          longitude,
          trigger_radius_m,
          status,
          content_version,
          created_by,
          approved_by,
          published_at,
          updated_at
        FROM attractions
        WHERE attraction_id = $1
        LIMIT 1
      `,
      [attractionId]
    );

  return result.rows[0] ?? null;
}

export async function updateEditableAttraction(
  attractionId: number,
  slug: string,
  areaCode: string,
  latitude: number,
  longitude: number,
  triggerRadiusM: number
): Promise<StaffAttractionRow | null> {
  const result =
    await db.query<StaffAttractionRow>(
      `
        UPDATE attractions
        SET
          slug = $2,
          area_code = $3,
          latitude = $4,
          longitude = $5,
          trigger_radius_m = $6,

          status = 'draft',

          content_version =
            content_version + 1,

          approved_by = NULL,
          published_at = NULL,

          updated_at =
            CURRENT_TIMESTAMP

        WHERE attraction_id = $1
          AND status IN (
            'draft',
            'published'
          )

        RETURNING
          attraction_id,
          slug,
          area_code,
          latitude,
          longitude,
          trigger_radius_m,
          status,
          content_version,
          created_by,
          approved_by,
          published_at,
          updated_at
      `,
      [
        attractionId,
        slug,
        areaCode,
        latitude,
        longitude,
        triggerRadiusM,
      ]
    );

  return result.rows[0] ?? null;
}

export async function findAllStaffAttractions(): Promise<
  StaffAttractionRow[]
> {
  const result =
    await db.query<StaffAttractionRow>(
      `
        SELECT
          attraction_id,
          slug,
          area_code,
          latitude,
          longitude,
          trigger_radius_m,
          status,
          content_version,
          created_by,
          approved_by,
          published_at,
          updated_at
        FROM attractions
        ORDER BY
          updated_at DESC,
          attraction_id DESC
      `
    );

  return result.rows;
}