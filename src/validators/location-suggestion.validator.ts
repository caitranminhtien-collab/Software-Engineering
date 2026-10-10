import type {
  NextFunction,
  Request,
  Response,
} from "express";

export interface LocationSuggestionBody {
  latitude: number;
  longitude: number;
}

export function validateLocationSuggestion(
  req: Request,
  res: Response,
  next: NextFunction
): void {
  const errors: string[] = [];

  const rawLatitude = req.body.latitude;
  const rawLongitude = req.body.longitude;

  const latitude = Number(rawLatitude);
  const longitude = Number(rawLongitude);

  if (
    rawLatitude === undefined ||
    !Number.isFinite(latitude) ||
    latitude < -90 ||
    latitude > 90
  ) {
    errors.push(
      "latitude must be a number between -90 and 90"
    );
  }

  if (
    rawLongitude === undefined ||
    !Number.isFinite(longitude) ||
    longitude < -180 ||
    longitude > 180
  ) {
    errors.push(
      "longitude must be a number between -180 and 180"
    );
  }

  if (errors.length > 0) {
    res.status(400).json({
      error: {
        code: "VALIDATION_ERROR",
        message: "Invalid request body",
        details: errors,
      },
    });

    return;
  }

  res.locals.locationSuggestionBody = {
    latitude,
    longitude,
  } satisfies LocationSuggestionBody;

  next();
}