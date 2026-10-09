import { Router } from "express";

import {
  getRouteById,
  getRoutes,
} from "../controllers/route.controller";

import {
  validateRouteDetailQuery,
  validateRouteListQuery,
} from "../validators/route.validator";

const router = Router();

router.get(
  "/",
  validateRouteListQuery,
  getRoutes
);

router.get(
  "/:id",
  validateRouteDetailQuery,
  getRouteById
);

export default router;