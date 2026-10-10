import type {
  Request,
  Response,
} from "express";

import {
  getLocationSuggestions,
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

  accessRouteId: number | null;
  accessAttractionId: number | null;
}

export async function getLocationSuggestionsController(
  _req: Request,
  res: Response
): Promise<void> {
  try {
    const {
      languageCode,
    } = res.locals
      .visitorSession as VisitorSessionLocal;

    const {
      latitude,
      longitude,
    } = res.locals
      .locationSuggestionBody as LocationSuggestionBody;

    const suggestions =
      await getLocationSuggestions(
        latitude,
        longitude,
        languageCode
      );

    res.status(200).json({
      data: suggestions,
    });
  } catch (error) {
    console.error(
      "Location suggestion failed:",
      error
    );

    res.status(500).json({
      error: {
        code: "INTERNAL_SERVER_ERROR",
        message:
          "Unable to load location suggestions",
      },
    });
  }
}