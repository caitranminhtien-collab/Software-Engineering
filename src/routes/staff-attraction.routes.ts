import { Router } from "express";

import {
  createStaffAttractionController,
  getStaffAttractionController,
  listStaffAttractionsController,
  updateStaffAttractionController,
} from "../controllers/staff-attraction.controller";

import {
  createStaffMediaController,
  listStaffMediaController,
} from "../controllers/staff-media.controller";

import {
  requireStaffSession,
} from "../middleware/staff-auth.middleware";

import {
  requireCsrfToken,
} from "../middleware/staff-csrf.middleware";

import {
  parseStaffMediaUpload,
} from "../middleware/staff-media-upload.middleware";

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
  getStaffLocalizationController,
  upsertStaffLocalizationController,
  generateStaffLocalizationController,
  regenerateStaffLocalizationController,
} from "../controllers/staff-localization.controller";

import {
  validateStaffLocalizationParams,
  validateUpsertStaffLocalization,
} from "../validators/staff-localization.validator";

const router = Router();

router.get(
  "/",
  requireStaffSession,
  requireStaffRole(
    "editor",
    "reviewer",
    "admin"
  ),
  listStaffAttractionsController
);

router.get(
  "/:id",
  requireStaffSession,
  requireStaffRole(
    "editor",
    "reviewer",
    "admin"
  ),
  validateStaffAttractionId,
  getStaffAttractionController
);
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

router.get(
  "/:id/localizations/:language",
  requireStaffSession,
  requireStaffRole("editor", "reviewer", "admin"),
  validateStaffLocalizationParams,
  getStaffLocalizationController
);

router.post(
  "/:id/localizations/:language/generate",
  requireStaffSession,
  requireStaffRole("editor", "admin"),
  requireCsrfToken,
  validateStaffLocalizationParams,
  generateStaffLocalizationController
);

router.post(
  "/:id/localizations/:language/regenerate",
  requireStaffSession,
  requireStaffRole("editor", "admin"),
  requireCsrfToken,
  validateStaffLocalizationParams,
  regenerateStaffLocalizationController
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

router.get(
  "/:id/media",
  requireStaffSession,
  requireStaffRole("editor", "reviewer", "admin"),
  validateStaffMediaParams,
  listStaffMediaController
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
  parseStaffMediaUpload,
  validateCreateStaffMedia,
  createStaffMediaController
);

export default router;