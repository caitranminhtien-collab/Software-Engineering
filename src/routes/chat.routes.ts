import { Router } from "express";

import {
  createChatMessageController,
  getChatHistoryController,
} from "../controllers/chat.controller";

import {
  requireVisitorSession,
} from "../middleware/visitor-auth.middleware";

import {
  validateCreateChatMessage,
} from "../validators/chat.validator";

const router = Router();

router.post(
  "/messages",
  requireVisitorSession,
  validateCreateChatMessage,
  createChatMessageController
);

router.get(
  "/messages",
  requireVisitorSession,
  getChatHistoryController
);

export default router;