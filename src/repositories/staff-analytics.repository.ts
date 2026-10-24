import type {QueryResultRow} from "pg";
import {db} from "../config/database";

export interface DailyEventRow extends QueryResultRow {
  day: string;
  attraction_views: string;
  tts_starts: string;
  route_starts: string;
}
export interface LanguageCountRow extends QueryResultRow {
  language_code: string;
  total: string;
}
export interface AttractionRankRow extends QueryResultRow {
  attraction_id: string;
  name: string;
  total: string;
}

// Calendar days are evaluated in Hue's time zone, not in server UTC.
// SQL parameters never include untrusted identifiers or clauses.
export async function findDailyVisitorEvents(days: 7 | 30): Promise<DailyEventRow[]> {
  const result = await db.query<DailyEventRow>(`
    WITH calendar AS (
      SELECT ((CURRENT_TIMESTAMP AT TIME ZONE 'Asia/Ho_Chi_Minh')::date
        - ($1::integer - 1) + n) AS day
      FROM generate_series(0, $1::integer - 1) AS dates(n)
    )
    SELECT
      to_char(c.day, 'YYYY-MM-DD') AS day,
      COUNT(e.event_id) FILTER (WHERE e.event_type = 'attraction_view')::text AS attraction_views,
      COUNT(e.event_id) FILTER (WHERE e.event_type = 'tts_started')::text AS tts_starts,
      COUNT(e.event_id) FILTER (WHERE e.event_type = 'route_started')::text AS route_starts
    FROM calendar AS c
    LEFT JOIN visitor_events AS e ON
      e.created_at >= (c.day::timestamp AT TIME ZONE 'Asia/Ho_Chi_Minh')
      AND e.created_at < ((c.day + 1)::timestamp AT TIME ZONE 'Asia/Ho_Chi_Minh')
    GROUP BY c.day
    ORDER BY c.day ASC
  `, [days]);
  return result.rows;
}

export async function findTtsLanguages(days: 7 | 30): Promise<LanguageCountRow[]> {
  const result = await db.query<LanguageCountRow>(`
    SELECT language_code, COUNT(*)::text AS total
    FROM visitor_events
    WHERE event_type = 'tts_started'
      AND created_at >= (
        ((CURRENT_TIMESTAMP AT TIME ZONE 'Asia/Ho_Chi_Minh')::date
          - ($1::integer - 1))::timestamp AT TIME ZONE 'Asia/Ho_Chi_Minh'
      )
    GROUP BY language_code
    ORDER BY language_code ASC
  `, [days]);
  return result.rows;
}

export async function findAttractionViewRanking(days: 7 | 30): Promise<AttractionRankRow[]> {
  const result = await db.query<AttractionRankRow>(`
    SELECT a.attraction_id,
      COALESCE(loc.name, a.slug) AS name,
      COUNT(e.event_id)::text AS total
    FROM attractions AS a
    JOIN attraction_localizations AS loc
      ON loc.attraction_id = a.attraction_id
      AND loc.language_code = 'vi' AND loc.status = 'published'
    LEFT JOIN visitor_events AS e
      ON e.attraction_id = a.attraction_id
      AND e.event_type = 'attraction_view'
      AND e.created_at >= (
        ((CURRENT_TIMESTAMP AT TIME ZONE 'Asia/Ho_Chi_Minh')::date
          - ($1::integer - 1))::timestamp AT TIME ZONE 'Asia/Ho_Chi_Minh'
      )
    WHERE a.status = 'published'
    GROUP BY a.attraction_id, a.slug, loc.name
    ORDER BY COUNT(e.event_id) DESC, name ASC
    LIMIT 20
  `, [days]);
  return result.rows;
}
