import { Router } from "express";

import {
  createAudioPlayController,
  updateAudioPlayController,
} from "../controllers/audio-play.controller";

import {
  requireVisitorSession,
} from "../middleware/visitor-auth.middleware";

import {
  validateAudioPlayId,
  validateCreateAudioPlay,
  validateUpdateAudioPlay,
} from "../validators/audio-play.validator";
const router = Router();

router.post(
  "/",
  requireVisitorSession,
  validateCreateAudioPlay,
  createAudioPlayController
);

router.patch(
  "/:id",
  requireVisitorSession,
  validateAudioPlayId,
  validateUpdateAudioPlay,
  updateAudioPlayController
);

export default router;