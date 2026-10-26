import { db } from "../config/database";

/** Store last heartbeat for an authenticated session without storing raw browser UUID. */
export async function updateVisitorPresenceInDatabase(
  sessionId: number, hashedBrowserId: string
): Promise<void> {
  const result = await db.query(
    `UPDATE public.visitor_sessions
       SET presence_browser_hash = $2, last_seen_at = NOW()
     WHERE session_id = $1 AND expires_at > NOW() AND revoked_at IS NULL`,
    [sessionId, hashedBrowserId]
  );
  if (result.rowCount !== 1) throw new Error("Visitor session is no longer active");
}
