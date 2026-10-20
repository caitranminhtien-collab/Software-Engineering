import {
  Router,
} from "express";

import {
  getStaffKnowledgeController,
  listStaffKnowledgeController,
  createStaffKnowledgeController,
  reindexStaffKnowledgeController,
} from "../controllers/staff-knowledge.controller";

import {
  requireStaffSession,
} from "../middleware/staff-auth.middleware";

import {
  requireStaffRole,
} from "../middleware/staff-role.middleware";

import {
  requireCsrfToken,
} from "../middleware/staff-csrf.middleware";

import {
  validateCreateStaffKnowledge,
  validateStaffKnowledgeParams,
} from "../validators/staff-knowledge.validator";

const router = Router();


router.get(
  "/",
  requireStaffSession,
  requireStaffRole(
    "editor",
    "reviewer",
    "admin"
  ),
  listStaffKnowledgeController
);

router.get(
  "/:id",
  requireStaffSession,
  requireStaffRole(
    "editor",
    "reviewer",
    "admin"
  ),
  validateStaffKnowledgeParams,
  getStaffKnowledgeController
);


router.post(
  "/",
  requireStaffSession,
  requireStaffRole(
    "editor",
    "admin"
  ),
  requireCsrfToken,
  validateCreateStaffKnowledge,
  createStaffKnowledgeController
);

router.post(
  "/:id/reindex",
  requireStaffSession,
  requireStaffRole(
    "reviewer",
    "admin"
  ),
  requireCsrfToken,
  validateStaffKnowledgeParams,
  reindexStaffKnowledgeController
);

export default router;