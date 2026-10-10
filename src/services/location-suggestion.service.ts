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

const EARTH_RADIUS_M = 6371000;

function toRadians(degrees: number): number {
  return degrees * (Math.PI / 180);
}

function calculateDistanceMeters(
  latitude1: number,
  longitude1: number,
  latitude2: number,
  longitude2: number
): number {
  const lat1 = toRadians(latitude1);
  const lat2 = toRadians(latitude2);

  const deltaLat = toRadians(
    latitude2 - latitude1
  );

  const deltaLon = toRadians(
    longitude2 - longitude1
  );

  const a =
    Math.sin(deltaLat / 2) ** 2 +
    Math.cos(lat1) *
      Math.cos(lat2) *
      Math.sin(deltaLon / 2) ** 2;

  const c =
    2 *
    Math.atan2(
      Math.sqrt(a),
      Math.sqrt(1 - a)
    );

  return EARTH_RADIUS_M * c;
}

export async function getLocationSuggestions(
  visitorLatitude: number,
  visitorLongitude: number,
  languageCode: string
): Promise<LocationSuggestionResult[]> {
  const attractions =
    await findPublishedAttractionsForLocation(
      languageCode
    );

  return attractions
  .map((attraction) => {
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
  })

  .filter(
    ({ attraction, distance }) =>
      distance <=
      attraction.trigger_radius_m
  )

  .sort(
    (a, b) =>
      a.distance - b.distance
  )

  .map(({ attraction, distance }) => ({
    attraction_id: Number(
      attraction.attraction_id
    ),

    slug: attraction.slug,
    area_code: attraction.area_code,

    name: attraction.name,
    description:
      attraction.description,

    latitude:
      attraction.latitude,

    longitude:
      attraction.longitude,

    distance_m:
      Math.round(distance),

    trigger_radius_m:
      attraction.trigger_radius_m,

    content_language:
      attraction.content_language,

    fallback_used:
      attraction.fallback_used,
  }));
}