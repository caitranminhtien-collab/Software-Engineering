import { Router } from "express";

import {
  createStaffAttractionController,
  updateStaffAttractionController,
} from "../controllers/staff-attraction.controller";

import {
  createStaffMediaController,
} from "../controllers/staff-media.controller";

import {
  requireStaffSession,
} from "../middleware/staff-auth.middleware";

import {
  requireCsrfToken,
} from "../middleware/staff-csrf.middleware";

import {
  requireStaffRole,
} from "../middleware/staff-role.middleware";

import {
  validateCreateStaffAttraction,
  validateStaffAttractionId,
  validateUpdateStaffAttraction,
} from "../validators/staff-attraction.validator";

import {
  validateCreateStaffMedia,
  validateStaffMediaParams,
} from "../validators/staff-media.validator";

import {
  upsertStaffLocalizationController,
} from "../controllers/staff-localization.controller";

import {
  validateStaffLocalizationParams,
  validateUpsertStaffLocalization,
} from "../validators/staff-localization.validator";

const router = Router();

router.post(
  "/",
  requireStaffSession,
  requireStaffRole(
    "editor",
    "admin"
  ),
  requireCsrfToken,
  validateCreateStaffAttraction,
  createStaffAttractionController
);

router.patch(
  "/:id",
  requireStaffSession,
  requireStaffRole(
    "editor",
    "admin"
  ),
  requireCsrfToken,
  validateStaffAttractionId,
  validateUpdateStaffAttraction,
  updateStaffAttractionController
);

router.put(
  "/:id/localizations/:language",
  requireStaffSession,
  requireStaffRole(
    "editor",
    "admin"
  ),
  requireCsrfToken,
  validateStaffLocalizationParams,
  validateUpsertStaffLocalization,
  upsertStaffLocalizationController
);

router.post(
  "/:id/media",
  requireStaffSession,
  requireStaffRole(
    "editor",
    "admin"
  ),
  requireCsrfToken,
  validateStaffMediaParams,
  validateCreateStaffMedia,
  createStaffMediaController
);

export default router;