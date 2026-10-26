import { Router } from "express";
import { requireVisitorSession } from "../middleware/visitor-auth.middleware";
import { recordVisitorPresence } from "../services/visitor-presence.service";

const router = Router();
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

router.post("/heartbeat", requireVisitorSession, async (req, res): Promise<void> => {
  const body: unknown = req.body;
  const browserId = body && typeof body === "object" && !Array.isArray(body)
    ? (body as Record<string, unknown>).browser_id : undefined;
  if (typeof browserId !== "string" || !UUID.test(browserId) ||
      Object.keys(body as Record<string, unknown>).length !== 1) {
    res.status(400).json({error:{code:"VALIDATION_ERROR",message:"browser_id must be a UUID"}});
    return;
  }
  try {
    const sessionId = Number(res.locals.visitorSession?.sessionId);
    if (!Number.isSafeInteger(sessionId) || sessionId <= 0) {
      res.status(401).json({error:{code:"UNAUTHORIZED",message:"Visitor session is required"}});
      return;
    }
    await recordVisitorPresence(browserId.toLowerCase(), sessionId);
    res.setHeader("Cache-Control", "no-store");
    res.status(204).end();
  } catch (error) {
    console.error("Visitor presence heartbeat failed:", error);
    res.status(503).json({error:{code:"PRESENCE_UNAVAILABLE",message:"Presence service unavailable"}});
  }
});

export default router;
