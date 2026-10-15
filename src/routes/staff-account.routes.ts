import {
  Router,
} from "express";

import {
  createStaffAccountController,
  listStaffAccountsController,
  updateStaffAccountController,
} from "../controllers/staff-account.controller";

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
  validateCreateStaffAccount,
  validateStaffAccountParams,
  validateUpdateStaffAccount,
} from "../validators/staff-account.validator";

const router = Router();

router.get(
  "/",
  requireStaffSession,
  requireStaffRole(
    "admin"
  ),
  listStaffAccountsController
);

router.post(
  "/",
  requireStaffSession,
  requireStaffRole(
    "admin"
  ),
  requireCsrfToken,
  validateCreateStaffAccount,
  createStaffAccountController
);

router.patch(
  "/:id",
  requireStaffSession,
  requireStaffRole(
    "admin"
  ),
  requireCsrfToken,
  validateStaffAccountParams,
  validateUpdateStaffAccount,
  updateStaffAccountController
);

export default router;