import { Router } from "express";

import {
  getLocationSuggestionsController,
} from "../controllers/location-suggestion.controller";

import {
  requireVisitorSession,
} from "../middleware/visitor-auth.middleware";

import {
  validateLocationSuggestion,
} from "../validators/location-suggestion.validator";

const router = Router();

router.post(
  "/",
  requireVisitorSession,
  validateLocationSuggestion,
  getLocationSuggestionsController
);

export default router;