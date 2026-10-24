import { Router } from "express";
import { requireStaffSession } from "../middleware/staff-auth.middleware";
import { requireStaffRole } from "../middleware/staff-role.middleware";
import { getActiveVisitorCount, VISITOR_ACTIVE_SECONDS } from "../services/visitor-presence.service";

const router = Router();
router.get("/", requireStaffSession, requireStaffRole("admin"), async (_req, res): Promise<void> => {
  try {
    const count = await getActiveVisitorCount();
    res.setHeader("Cache-Control", "no-store");
    res.status(200).json({data:{active_visitors:count,window_seconds:VISITOR_ACTIVE_SECONDS}});
  } catch (error) {
    console.error("Staff active visitor count failed:", error);
    res.status(503).json({error:{code:"PRESENCE_UNAVAILABLE",message:"Presence service unavailable"}});
  }
});
export default router;
