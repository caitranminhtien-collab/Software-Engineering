import type {
  NextFunction,
  Request,
  Response,
} from "express";

export interface LocationSuggestionBody {
  latitude: number;
  longitude: number;
  accuracyM: number;
  sampledAt: Date;
}

export function validateLocationSuggestion(
  req: Request,
  res: Response,
  next: NextFunction
): void {
  const errors: string[] = [];

  const rawLatitude =
    req.body.latitude;

  const rawLongitude =
    req.body.longitude;

  const rawAccuracyM =
    req.body.accuracy_m;

  const rawSampledAt =
    req.body.sampled_at;

  const latitude =
    Number(rawLatitude);

  const longitude =
    Number(rawLongitude);

  const accuracyM =
    Number(rawAccuracyM);

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

  if (
    rawAccuracyM === undefined ||
    !Number.isFinite(accuracyM) ||
    accuracyM < 0
  ) {
    errors.push(
      "accuracy_m must be a finite non-negative number"
    );
  }

  let sampledAt:
    | Date
    | null = null;

  if (
    typeof rawSampledAt !== "string" &&
    typeof rawSampledAt !== "number"
  ) {
    errors.push(
      "sampled_at must be an ISO date string or epoch milliseconds"
    );
  } else {
    sampledAt =
      new Date(rawSampledAt);

    if (
      Number.isNaN(
        sampledAt.getTime()
      )
    ) {
      errors.push(
        "sampled_at must be a valid date"
      );

      sampledAt = null;
    }
  }

  if (errors.length > 0) {
    res.status(400).json({
      error: {
        code: "VALIDATION_ERROR",
        message:
          "Invalid request body",
        details: errors,
      },
    });

    return;
  }

  res.locals.locationSuggestionBody = {
    latitude,
    longitude,
    accuracyM,
    sampledAt:
      sampledAt as Date,
  } satisfies LocationSuggestionBody;

  next();
}