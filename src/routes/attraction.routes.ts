import { Router } from "express";

import {
  getAttractionById,
  getAttractions,
} from "../controllers/attraction.controller";

import {
  validateAttractionDetailQuery,
  validateAttractionListQuery,
} from "../validators/attraction.validator";

const router = Router();

router.get(
  "/",
  validateAttractionListQuery,
  getAttractions
);

router.get(
  "/:id",
  validateAttractionDetailQuery,
  getAttractionById
);

export default router;