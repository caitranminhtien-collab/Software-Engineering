import type { QueryResultRow } from "pg";
import { db } from "../config/database";
import type {
  StaffWorkflowResource,
} from "../validators/staff-workflow.validator";

export interface StaffWorkflowRow
  extends QueryResultRow {
  resource_id: string;
  status: string;
  version: number | null;
}

export interface MediaPublishReadinessRow {
  media_id: string;

  media_type:
    | "image"
    | "audio";

  language_code: string | null;

  file_url: string;

  credit: string;
  rights_reference: string;

  duration_seconds: number | null;
}

export interface RoutePublishReadinessRow
  extends QueryResultRow {
  route_id: string;

  verified_at: Date | null;

  stop_count: number;

  unavailable_stop_count: number;
}

export async function findWorkflowResourceById(
  resource: StaffWorkflowResource,
  resourceId: number
): Promise<StaffWorkflowRow | null> {
  switch (resource) {
    case "attractions": {
      const result =
        await db.query<StaffWorkflowRow>(
          `
            SELECT
              attraction_id AS resource_id,
              status,
              content_version AS version
            FROM attractions
            WHERE attraction_id = $1
            LIMIT 1
          `,
          [resourceId]
        );

      return result.rows[0] ?? null;
    }

    case "routes": {
      const result =
        await db.query<StaffWorkflowRow>(
          `
            SELECT
              route_id AS resource_id,
              status,
              content_version AS version
            FROM routes
            WHERE route_id = $1
            LIMIT 1
          `,
          [resourceId]
        );

      return result.rows[0] ?? null;
    }

    case "localizations": {
      const result =
        await db.query<StaffWorkflowRow>(
          `
            SELECT
              localization_id AS resource_id,
              status,
              content_version AS version
            FROM attraction_localizations
            WHERE localization_id = $1
            LIMIT 1
          `,
          [resourceId]
        );

      return result.rows[0] ?? null;
    }

    case "media": {
      const result =
        await db.query<StaffWorkflowRow>(
          `
            SELECT
              media_id AS resource_id,
              status,
              NULL::integer AS version
            FROM attraction_media
            WHERE media_id = $1
            LIMIT 1
          `,
          [resourceId]
        );

      return result.rows[0] ?? null;
    }

    case "knowledge-documents": {
      const result =
        await db.query<StaffWorkflowRow>(
          `
            SELECT
              document_id AS resource_id,
              status,
              version
            FROM knowledge_documents
            WHERE document_id = $1
            LIMIT 1
          `,
          [resourceId]
        );

      return result.rows[0] ?? null;
    }
  }
}

export async function submitWorkflowResource(
  resource: StaffWorkflowResource,
  resourceId: number
): Promise<StaffWorkflowRow | null> {
  switch (resource) {
    case "attractions": {
      const result =
        await db.query<StaffWorkflowRow>(
          `
            UPDATE attractions
            SET status = 'in_review'
            WHERE attraction_id = $1
              AND status = 'draft'
            RETURNING
              attraction_id AS resource_id,
              status,
              content_version AS version
          `,
          [resourceId]
        );

      return result.rows[0] ?? null;
    }

    case "routes": {
      const result =
        await db.query<StaffWorkflowRow>(
          `
            UPDATE routes
            SET status = 'in_review'
            WHERE route_id = $1
              AND status = 'draft'
            RETURNING
              route_id AS resource_id,
              status,
              content_version AS version
          `,
          [resourceId]
        );

      return result.rows[0] ?? null;
    }

    case "localizations": {
      const result =
        await db.query<StaffWorkflowRow>(
          `
            UPDATE attraction_localizations
            SET status = 'in_review'
            WHERE localization_id = $1
              AND status = 'draft'
            RETURNING
              localization_id AS resource_id,
              status,
              content_version AS version
          `,
          [resourceId]
        );

      return result.rows[0] ?? null;
    }

    case "media": {
      const result =
        await db.query<StaffWorkflowRow>(
          `
            UPDATE attraction_media
            SET status = 'in_review'
            WHERE media_id = $1
              AND status = 'draft'
            RETURNING
              media_id AS resource_id,
              status,
              NULL::integer AS version
          `,
          [resourceId]
        );

      return result.rows[0] ?? null;
    }

    case "knowledge-documents": {
      const result =
        await db.query<StaffWorkflowRow>(
          `
            UPDATE knowledge_documents
            SET status = 'in_review'
            WHERE document_id = $1
              AND status = 'draft'
            RETURNING
              document_id AS resource_id,
              status,
              version
          `,
          [resourceId]
        );

      return result.rows[0] ?? null;
    }
  }
}

export type StaffReviewDecision =
  | "approve"
  | "reject";

export async function reviewVisitorWorkflowResource(
  resource: StaffWorkflowResource,
  resourceId: number,
  decision: StaffReviewDecision
): Promise<StaffWorkflowRow | null> {
  switch (resource) {
    case "attractions": {
      if (decision === "approve") {
        const result =
          await db.query<StaffWorkflowRow>(
            `
              SELECT
                attraction_id AS resource_id,
                status,
                content_version AS version
              FROM attractions
              WHERE attraction_id = $1
                AND status = 'in_review'
              LIMIT 1
            `,
            [resourceId]
          );

        return result.rows[0] ?? null;
      }

      const result =
        await db.query<StaffWorkflowRow>(
          `
            UPDATE attractions
            SET
              status = 'draft',
              approved_by = NULL,
              published_at = NULL
            WHERE attraction_id = $1
              AND status = 'in_review'
            RETURNING
              attraction_id AS resource_id,
              status,
              content_version AS version
          `,
          [resourceId]
        );

      return result.rows[0] ?? null;
    }

    case "routes": {
  if (decision === "approve") {
    const result =
      await db.query<StaffWorkflowRow>(
        `
          UPDATE routes

          SET
            verified_at =
              CURRENT_TIMESTAMP

          WHERE route_id = $1
            AND status = 'in_review'

          RETURNING
            route_id AS resource_id,
            status,
            content_version AS version
        `,
        [resourceId]
      );

    return result.rows[0] ?? null;
  }

  const result =
    await db.query<StaffWorkflowRow>(
      `
        UPDATE routes

        SET
          status = 'draft',
          verified_at = NULL,
          approved_by = NULL,
          published_at = NULL

        WHERE route_id = $1
          AND status = 'in_review'

        RETURNING
          route_id AS resource_id,
          status,
          content_version AS version
      `,
      [resourceId]
    );

  return result.rows[0] ?? null;
}

    case "localizations": {
      if (decision === "approve") {
        const result =
          await db.query<StaffWorkflowRow>(
            `
              SELECT
                localization_id AS resource_id,
                status,
                content_version AS version
              FROM attraction_localizations
              WHERE localization_id = $1
                AND status = 'in_review'
              LIMIT 1
            `,
            [resourceId]
          );

        return result.rows[0] ?? null;
      }

      const result =
        await db.query<StaffWorkflowRow>(
          `
            UPDATE attraction_localizations
            SET
              status = 'draft',
              approved_by = NULL,
              published_at = NULL
            WHERE localization_id = $1
              AND status = 'in_review'
            RETURNING
              localization_id AS resource_id,
              status,
              content_version AS version
          `,
          [resourceId]
        );

      return result.rows[0] ?? null;
    }

    case "media": {
      if (decision === "approve") {
        const result =
          await db.query<StaffWorkflowRow>(
            `
              SELECT
                media_id AS resource_id,
                status,
                NULL::integer AS version
              FROM attraction_media
              WHERE media_id = $1
                AND status = 'in_review'
              LIMIT 1
            `,
            [resourceId]
          );

        return result.rows[0] ?? null;
      }

      const result =
        await db.query<StaffWorkflowRow>(
          `
            UPDATE attraction_media
            SET
              status = 'draft',
              approved_by = NULL,
              published_at = NULL
            WHERE media_id = $1
              AND status = 'in_review'
            RETURNING
              media_id AS resource_id,
              status,
              NULL::integer AS version
          `,
          [resourceId]
        );

      return result.rows[0] ?? null;
    }

    case "knowledge-documents":
      return null;
  }
}
export interface StaffPublishRow
  extends QueryResultRow {
  resource_id: string;
  status: string;
  version: number | null;
  approved_by: string | null;
  published_at: Date | null;
}

export async function publishVisitorWorkflowResource(
  resource: StaffWorkflowResource,
  resourceId: number,
  approvedBy: number
): Promise<StaffPublishRow | null> {
  switch (resource) {
    case "attractions": {
      const result =
        await db.query<StaffPublishRow>(
          `
            UPDATE attractions
            SET
              status = 'published',
              approved_by = $2,
              published_at = CURRENT_TIMESTAMP
            WHERE attraction_id = $1
              AND status = 'in_review'
            RETURNING
              attraction_id AS resource_id,
              status,
              content_version AS version,
              approved_by,
              published_at
          `,
          [resourceId, approvedBy]
        );

      return result.rows[0] ?? null;
    }

    case "routes": {
  const result =
    await db.query<StaffPublishRow>(
      `
        UPDATE routes

        SET
          status = 'published',
          approved_by = $2,
          published_at =
            CURRENT_TIMESTAMP

        WHERE route_id = $1
          AND status = 'in_review'
          AND verified_at IS NOT NULL

          AND EXISTS (
            SELECT 1

            FROM route_stops AS rs

            WHERE rs.route_id = $1
          )

          AND NOT EXISTS (
            SELECT 1

            FROM route_stops AS rs

            LEFT JOIN attractions AS a
              ON a.attraction_id =
                rs.attraction_id

            WHERE rs.route_id = $1
              AND (
                a.attraction_id IS NULL
                OR
                a.status <> 'published'
              )
          )

        RETURNING
          route_id AS resource_id,
          status,
          content_version AS version,
          approved_by,
          published_at
      `,
      [
        resourceId,
        approvedBy,
      ]
    );

  return result.rows[0] ?? null;
}

    case "localizations": {
      const result =
        await db.query<StaffPublishRow>(
          `
            UPDATE attraction_localizations
            SET
              status = 'published',
              approved_by = $2,
              published_at = CURRENT_TIMESTAMP
            WHERE localization_id = $1
              AND status = 'in_review'
            RETURNING
              localization_id AS resource_id,
              status,
              content_version AS version,
              approved_by,
              published_at
          `,
          [resourceId, approvedBy]
        );

      return result.rows[0] ?? null;
    }

    case "media": {
      const result =
        await db.query<StaffPublishRow>(
          `
            UPDATE attraction_media
            SET
              status = 'published',
              approved_by = $2,
              published_at = CURRENT_TIMESTAMP
            WHERE media_id = $1
              AND status = 'in_review'
            RETURNING
              media_id AS resource_id,
              status,
              NULL::integer AS version,
              approved_by,
              published_at
          `,
          [resourceId, approvedBy]
        );

      return result.rows[0] ?? null;
    }

    case "knowledge-documents":
      return null;
  }
}

export interface LocalizationPublishReadinessRow
  extends QueryResultRow {
  localization_id: string;
  attraction_id: string;
  language_code: string;
  name: string;
  description: string;
  source_references: string;
  status: string;
  content_version: number;
}

export async function findLocalizationPublishReadiness(
  localizationId: number
): Promise<LocalizationPublishReadinessRow | null> {
  const result =
    await db.query<LocalizationPublishReadinessRow>(
      `
        SELECT
          localization_id,
          attraction_id,
          language_code,
          name,
          description,
          source_references,
          status,
          content_version
        FROM attraction_localizations
        WHERE localization_id = $1
        LIMIT 1
      `,
      [localizationId]
    );

  return result.rows[0] ?? null;
}

export async function findPublishedVietnameseLocalization(
  attractionId: number
): Promise<LocalizationPublishReadinessRow | null> {
  const result =
    await db.query<LocalizationPublishReadinessRow>(
      `
        SELECT
          localization_id,
          attraction_id,
          language_code,
          name,
          description,
          source_references,
          status,
          content_version
        FROM attraction_localizations
        WHERE attraction_id = $1
          AND language_code = 'vi'
          AND status = 'published'
        LIMIT 1
      `,
      [attractionId]
    );

  return result.rows[0] ?? null;
}

export async function findMediaPublishReadiness(
  mediaId: number
): Promise<MediaPublishReadinessRow | null> {
  const result =
    await db.query<MediaPublishReadinessRow>(
      `
        SELECT
          media_id,
          media_type,
          language_code,
          file_url,
          credit,
          rights_reference,
          duration_seconds

        FROM attraction_media

        WHERE media_id = $1

        LIMIT 1
      `,
      [mediaId]
    );

  return result.rows[0] ?? null;
}

export async function findRoutePublishReadiness(
  routeId: number
): Promise<RoutePublishReadinessRow | null> {
  const result =
    await db.query<RoutePublishReadinessRow>(
      `
        SELECT
          r.route_id,
          r.verified_at,

          COUNT(
            rs.route_stop_id
          )::integer
            AS stop_count,

          COUNT(
            rs.route_stop_id
          ) FILTER (
            WHERE
              rs.route_stop_id IS NOT NULL
              AND (
                a.attraction_id IS NULL
                OR
                a.status <> 'published'
              )
          )::integer
            AS unavailable_stop_count

        FROM routes AS r

        LEFT JOIN route_stops AS rs
          ON rs.route_id =
            r.route_id

        LEFT JOIN attractions AS a
          ON a.attraction_id =
            rs.attraction_id

        WHERE r.route_id = $1

        GROUP BY
          r.route_id,
          r.verified_at
      `,
      [routeId]
    );

  return result.rows[0] ?? null;
}