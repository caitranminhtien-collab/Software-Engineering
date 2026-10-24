import { Router } from "express";
import { requireVisitorSession } from "../middleware/visitor-auth.middleware";
import { validateVisitorEventBody } from "../validators/visitor-event.validator";
import { createVisitorEventController } from "../controllers/visitor-event.controller";

const router = Router();

router.post(
  "/",
  requireVisitorSession,
  validateVisitorEventBody,
  createVisitorEventController
);

export default router;
