import {
  redisClient,
} from "../config/redis";

import {
  findPublishedAttractionsForLocation,
} from "../repositories/location-suggestion.repository";

export interface LocationSuggestionResult {
  attraction_id: number;
  slug: string;
  area_code: string;

  name: string;
  description: string;

  latitude: number;
  longitude: number;

  distance_m: number;
  trigger_radius_m: number;

  content_language: string;
  fallback_used: boolean;
}

export interface LocationSuggestionDecision {
  suggestions:
    LocationSuggestionResult[];

  accuracy_m: number;

  manual_selection_recommended:
    boolean;

  reason:
    | "low_accuracy"
    | null;
}

export class InvalidLocationSampleError
  extends Error {
  constructor(
    message: string
  ) {
    super(message);

    this.name =
      "InvalidLocationSampleError";
  }
}

const EARTH_RADIUS_M =
  6371000;

function getPositiveConfigNumber(
  rawValue: string | undefined,
  fallback: number
): number {
  const parsed =
    Number(rawValue);

  if (
    Number.isFinite(parsed) &&
    parsed > 0
  ) {
    return parsed;
  }

  return fallback;
}

/*
 * These defaults are development defaults.
 * Tune them from field measurements.
 */
const MAX_ACCURACY_M =
  getPositiveConfigNumber(
    process.env
      .LOCATION_MAX_ACCURACY_M,
    50
  );

const MAX_SAMPLE_AGE_SECONDS =
  getPositiveConfigNumber(
    process.env
      .LOCATION_MAX_SAMPLE_AGE_SECONDS,
    30
  );

const SUGGESTION_COOLDOWN_SECONDS =
  getPositiveConfigNumber(
    process.env
      .LOCATION_SUGGESTION_COOLDOWN_SECONDS,
    300
  );

function toRadians(
  degrees: number
): number {
  return (
    degrees *
    (Math.PI / 180)
  );
}

function calculateDistanceMeters(
  latitude1: number,
  longitude1: number,
  latitude2: number,
  longitude2: number
): number {
  const lat1 =
    toRadians(
      latitude1
    );

  const lat2 =
    toRadians(
      latitude2
    );

  const deltaLat =
    toRadians(
      latitude2 -
        latitude1
    );

  const deltaLon =
    toRadians(
      longitude2 -
        longitude1
    );

  const a =
    Math.sin(
      deltaLat / 2
    ) ** 2 +
    Math.cos(lat1) *
      Math.cos(lat2) *
      Math.sin(
        deltaLon / 2
      ) ** 2;

  const c =
    2 *
    Math.atan2(
      Math.sqrt(a),
      Math.sqrt(1 - a)
    );

  return (
    EARTH_RADIUS_M *
    c
  );
}

function getSuggestionCacheKey(
  sessionId: number,
  attractionId: number
): string {
  return [
    "location-suggestion",
    sessionId,
    attractionId,
  ].join(":");
}

function validateSampleAge(
  sampledAt: Date
): void {
  const ageMs =
    Date.now() -
    sampledAt.getTime();

  if (
    ageMs < 0 ||
    ageMs >
      MAX_SAMPLE_AGE_SECONDS *
        1000
  ) {
    throw new InvalidLocationSampleError(
      "Location sample is too old or from the future"
    );
  }
}

export async function getLocationSuggestions(
  sessionId: number,
  visitorLatitude: number,
  visitorLongitude: number,
  accuracyM: number,
  sampledAt: Date,
  languageCode: string
): Promise<LocationSuggestionDecision> {
  validateSampleAge(
    sampledAt
  );

  /*
   * A valid but low-accuracy reading is not
   * treated as malformed input. It returns
   * a manual-selection recommendation.
   */
  if (
    accuracyM >
    MAX_ACCURACY_M
  ) {
    return {
      suggestions: [],
      accuracy_m:
        accuracyM,

      manual_selection_recommended:
        true,

      reason:
        "low_accuracy",
    };
  }

  const attractions =
    await findPublishedAttractionsForLocation(
      languageCode
    );

  const nearby =
    attractions
      .map(
        (attraction) => {
          const distance =
            calculateDistanceMeters(
              visitorLatitude,
              visitorLongitude,
              attraction.latitude,
              attraction.longitude
            );

          return {
            attraction,
            distance,
          };
        }
      )
      .filter(
        ({
          attraction,
          distance,
        }) =>
          distance <=
          attraction
            .trigger_radius_m
      )
      .sort(
        (a, b) =>
          a.distance -
          b.distance
      );

  const suggestions:
    LocationSuggestionResult[] =
    [];

  for (
    const {
      attraction,
      distance,
    } of nearby
  ) {
    const attractionId =
      Number(
        attraction
          .attraction_id
      );

    const cacheKey =
      getSuggestionCacheKey(
        sessionId,
        attractionId
      );

    const alreadySuggested =
      await redisClient.get(
        cacheKey
      );

    if (
      alreadySuggested
    ) {
      continue;
    }

    suggestions.push({
      attraction_id:
        attractionId,

      slug:
        attraction.slug,

      area_code:
        attraction.area_code,

      name:
        attraction.name,

      description:
        attraction.description,

      latitude:
        attraction.latitude,

      longitude:
        attraction.longitude,

      distance_m:
        Math.round(
          distance
        ),

      trigger_radius_m:
        attraction
          .trigger_radius_m,

      content_language:
        attraction
          .content_language,

      fallback_used:
        attraction
          .fallback_used,
    });
  }

  /*
   * Mark only attractions actually returned to
   * this visitor session. Repeated requests in
   * the cooldown period will suppress them.
   */
  await Promise.all(
    suggestions.map(
      (suggestion) =>
        redisClient.set(
          getSuggestionCacheKey(
            sessionId,
            suggestion
              .attraction_id
          ),
          "1",
          {
            EX:
              SUGGESTION_COOLDOWN_SECONDS,
          }
        )
    )
  );

  return {
    suggestions,

    accuracy_m:
      accuracyM,

    manual_selection_recommended:
      false,

    reason:
      null,
  };
}