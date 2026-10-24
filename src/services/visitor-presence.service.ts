import { createHash } from "node:crypto";
import { redisClient } from "../config/redis";

// An approximation of distinct browsers with an active/visible visitor tab.
// One browser identity is shared between tabs; it is never used as an auth token.
const PRESENCE_KEY = "hue:visitors:visible:v1";
const ACTIVE_WINDOW_MS = 75_000;
const PRESENCE_KEY_TTL_SEC = 180;

export const VISITOR_ACTIVE_SECONDS = ACTIVE_WINDOW_MS / 1000;

export async function recordVisitorPresence(browserId: string): Promise<void> {
  const now = Date.now();
  // Redis stores a hash, not a raw browser identifier or a user's IP.
  const hashedId = createHash("sha256").update(browserId).digest("hex");
  await redisClient.multi()
    .zRemRangeByScore(PRESENCE_KEY, "-inf", now - ACTIVE_WINDOW_MS)
    .zAdd(PRESENCE_KEY, [{ score: now, value: hashedId }])
    .expire(PRESENCE_KEY, PRESENCE_KEY_TTL_SEC)
    .exec();
}

export async function getActiveVisitorCount(): Promise<number> {
  const cutoff = Date.now() - ACTIVE_WINDOW_MS;
  // Prune on reads as well: a closed tab need not send any exit event.
  await redisClient.zRemRangeByScore(PRESENCE_KEY, "-inf", cutoff);
  return redisClient.zCard(PRESENCE_KEY);
}
