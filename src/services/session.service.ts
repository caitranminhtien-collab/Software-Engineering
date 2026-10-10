import {
  createHash,
  randomBytes,
} from "node:crypto";

import {
  createPublicVisitorSession,
} from "../repositories/session.repository";

export interface CreateSessionResult {
  session_id: number;

  token: string;

  language_code: string;

  started_at: Date;
  expires_at: Date;

  access_scope: "public";
}

const SESSION_DURATION_HOURS = 24;

function generateSessionToken(): string {
  return randomBytes(32).toString("hex");
}

function hashSessionToken(
  token: string
): string {
  return createHash("sha256")
    .update(token)
    .digest("hex");
}

export async function createVisitorSession(
  languageCode: string
): Promise<CreateSessionResult> {
  const token = generateSessionToken();

  const tokenHash = hashSessionToken(token);

  const expiresAt = new Date(
    Date.now() +
      SESSION_DURATION_HOURS *
        60 *
        60 *
        1000
  );

  const row =
    await createPublicVisitorSession(
      tokenHash,
      languageCode,
      expiresAt
    );

  return {
    session_id: Number(row.session_id),

    // Chỉ trả raw token cho client.
    // Database chỉ lưu token_hash.
    token,

    language_code: row.language_code,

    started_at: row.started_at,
    expires_at: row.expires_at,

    access_scope: "public",
  };
}