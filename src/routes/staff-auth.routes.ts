import { Router } from "express";

import {
  staffCsrfController,
  staffLoginController,
  staffLogoutController,
  staffMeController,
} from "../controllers/staff-auth.controller";

import {
  requireStaffSession,
} from "../middleware/staff-auth.middleware";

import {
  validateStaffLogin,
} from "../validators/staff-auth.validator";

import { 
    requireCsrfToken,
} from "../middleware/staff-csrf.middleware";
const router = Router();

router.post(
  "/login",
  validateStaffLogin,
  staffLoginController
);

router.get(
  "/me",
  requireStaffSession,
  staffMeController
);

router.get(
  "/csrf",
  requireStaffSession,
  staffCsrfController
);

router.post(
  "/logout",
  requireStaffSession,
  requireCsrfToken,
  staffLogoutController
);
export default router;