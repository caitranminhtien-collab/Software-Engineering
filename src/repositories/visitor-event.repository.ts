import type { QueryResultRow } from "pg";
import { db } from "../config/database";

export type VisitorEventType =
  | "attraction_view"
  | "tts_started"
  | "route_started";

export interface VisitorEventRow extends QueryResultRow {
  event_id: string;
  session_id: string;
  event_type: VisitorEventType;
  attraction_id: string | null;
  route_id: string | null;
  language_code: string | null;
  created_at: Date;
}

export interface CreateVisitorEventInput {
  sessionId: number;
  eventType: VisitorEventType;
  attractionId: number | null;
  routeId: number | null;
  languageCode: string | null;
}

/** Insert one validated visitor event. Caller must enforce access scope and publication rules. */
export async function createVisitorEvent(
  input: CreateVisitorEventInput
): Promise<VisitorEventRow> {
  const result = await db.query<VisitorEventRow>(
    `
      INSERT INTO public.visitor_events (
        session_id,
        event_type,
        attraction_id,
        route_id,
        language_code
      )
      VALUES ($1, $2, $3, $4, $5)
      RETURNING
        event_id,
        session_id,
        event_type,
        attraction_id,
        route_id,
        language_code,
        created_at
    `,
    [
      input.sessionId,
      input.eventType,
      input.attractionId,
      input.routeId,
      input.languageCode,
    ]
  );

  return result.rows[0];
}
