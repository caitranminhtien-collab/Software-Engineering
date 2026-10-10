import { Router } from "express";

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
  validateStaffReviewBody,
  validateStaffWorkflowParams,
} from "../validators/staff-workflow.validator";

import {
  publishStaffWorkflowController,
  reviewStaffWorkflowController,
  submitStaffWorkflowController,
} from "../controllers/staff-workflow.controller";

const router = Router();

router.post(
  "/:resource/:id/submit",
  requireStaffSession,
  requireStaffRole(
    "editor",
    "admin"
  ),
  requireCsrfToken,
  validateStaffWorkflowParams,
  submitStaffWorkflowController
);

router.post(
  "/:resource/:id/review",
  requireStaffSession,
  requireStaffRole(
    "reviewer",
    "admin"
  ),
  requireCsrfToken,
  validateStaffWorkflowParams,
  validateStaffReviewBody,
  reviewStaffWorkflowController
);

router.post(
  "/:resource/:id/publish",
  requireStaffSession,
  requireStaffRole(
    "reviewer",
    "admin"
  ),
  requireCsrfToken,
  validateStaffWorkflowParams,
  publishStaffWorkflowController
);
export default router;