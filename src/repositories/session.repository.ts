import type { QueryResultRow } from "pg";
import { db } from "../config/database";

export interface VisitorSessionRow extends QueryResultRow {
  session_id: string;
  token_hash: string;
  language_code: string;

  started_at: Date;
  expires_at: Date;
  revoked_at: Date | null;

  access_scope: "public" | "route" | "attraction";
  access_route_id: string | null;
  access_attraction_id: string | null;
  access_expires_at: Date | null;
}

export async function createPublicVisitorSession(
  tokenHash: string,
  languageCode: string,
  expiresAt: Date
): Promise<VisitorSessionRow> {
  const result = await db.query<VisitorSessionRow>(
    `
      INSERT INTO visitor_sessions (
        token_hash,
        language_code,
        expires_at,
        access_scope
      )
      VALUES ($1, $2, $3, 'public')
      RETURNING
        session_id,
        token_hash,
        language_code,
        started_at,
        expires_at,
        revoked_at,
        access_scope,
        access_route_id,
        access_attraction_id,
        access_expires_at
    `,
    [
      tokenHash,
      languageCode,
      expiresAt,
    ]
  );

  return result.rows[0];
}
export async function findActiveVisitorSessionByTokenHash(
  tokenHash: string
): Promise<VisitorSessionRow | null> {
  const result = await db.query<VisitorSessionRow>(
    `
      SELECT
        session_id,
        token_hash,
        language_code,
        started_at,
        expires_at,
        revoked_at,
        access_scope,
        access_route_id,
        access_attraction_id,
        access_expires_at
      FROM visitor_sessions
      WHERE token_hash = $1
        AND revoked_at IS NULL
        AND expires_at > CURRENT_TIMESTAMP
      LIMIT 1
    `,
    [tokenHash]
  );

  return result.rows[0] ?? null;
}