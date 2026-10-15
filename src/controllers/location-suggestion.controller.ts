import type {
  Request,
  Response,
} from "express";

import {
  getLocationSuggestions,
  InvalidLocationSampleError,
} from "../services/location-suggestion.service";

import type {
  LocationSuggestionBody,
} from "../validators/location-suggestion.validator";

interface VisitorSessionLocal {
  sessionId: number;
  languageCode: string;

  accessScope:
    | "public"
    | "route"
    | "attraction";

  accessRouteId:
    | number
    | null;

  accessAttractionId:
    | number
    | null;
}

export async function getLocationSuggestionsController(
  _req: Request,
  res: Response
): Promise<void> {
  try {
    const {
      sessionId,
      languageCode,
    } =
      res.locals
        .visitorSession as
        VisitorSessionLocal;

    const {
      latitude,
      longitude,
      accuracyM,
      sampledAt,
    } =
      res.locals
        .locationSuggestionBody as
        LocationSuggestionBody;

    const result =
      await getLocationSuggestions(
        sessionId,
        latitude,
        longitude,
        accuracyM,
        sampledAt,
        languageCode
      );

    /*
     * Keep data as the suggestions array for
     * compatibility and expose location-quality
     * information in meta.
     */
    res.status(200).json({
      data:
        result.suggestions,

      meta: {
        accuracy_m:
          result.accuracy_m,

        manual_selection_recommended:
          result
            .manual_selection_recommended,

        reason:
          result.reason,
      },
    });
  } catch (error) {
    if (
      error instanceof
      InvalidLocationSampleError
    ) {
      res.status(400).json({
        error: {
          code:
            "VALIDATION_ERROR",

          message:
            error.message,
        },
      });

      return;
    }

    console.error(
      "Location suggestion failed:",
      error
    );

    res.status(500).json({
      error: {
        code:
          "INTERNAL_SERVER_ERROR",

        message:
          "Unable to load location suggestions",
      },
    });
  }
}