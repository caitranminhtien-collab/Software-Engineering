import { Router } from "express";

import { createSession } from "../controllers/session.controller";
import { validateCreateSession } from "../validators/session.validator";

const router = Router();

router.post(
  "/",
  validateCreateSession,
  createSession
);

export default router;