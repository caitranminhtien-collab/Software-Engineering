import {Router} from "express";
import {requireStaffSession} from "../middleware/staff-auth.middleware";
import {requireStaffRole} from "../middleware/staff-role.middleware";
import {getStaffAnalyticsController} from "../controllers/staff-analytics.controller";

const router = Router();
// No visitor token can access aggregate analytics; GET needs no CSRF token.
router.get("/", requireStaffSession, requireStaffRole("admin"), getStaffAnalyticsController);
export default router;
