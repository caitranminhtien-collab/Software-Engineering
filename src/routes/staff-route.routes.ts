import {
  Router,
} from "express";

import {
  createStaffRouteController,
  replaceStaffRouteStopsController,
} from "../controllers/staff-route.controller";

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
  validateCreateStaffRoute,
  validateStaffRouteParams,
  validateUpdateStaffRouteStops,
} from "../validators/staff-route.validator";

const router = Router();

router.post(
  "/",
  requireStaffSession,
  requireStaffRole(
    "editor",
    "admin"
  ),
  requireCsrfToken,
  validateCreateStaffRoute,
  createStaffRouteController
);

router.put(
  "/:id/stops",
  requireStaffSession,
  requireStaffRole(
    "editor",
    "admin"
  ),
  requireCsrfToken,
  validateStaffRouteParams,
  validateUpdateStaffRouteStops,
  replaceStaffRouteStopsController
);

export default router;