import {
  countPublishedAttractions,
  findPublishedAttractions,
  findPublishedAttractionById,
} from "../repositories/attraction.repository";

export interface AttractionListItem {
  id: number;
  slug: string;
  area_code: string;

  latitude: number;
  longitude: number;
  trigger_radius_m: number;

  name: string | null;

  requested_language: string;
  content_language: string | null;
  fallback_used: boolean;
}

export interface AttractionListResult {
  data: AttractionListItem[];

  pagination: {
    page: number;
    page_size: number;
    total: number;
    total_pages: number;
  };
}

export async function getPublishedAttractions(
  requestedLanguage: string,
  page: number,
  pageSize: number
): Promise<AttractionListResult> {
  const offset = (page - 1) * pageSize;

  const [rows, total] = await Promise.all([
    findPublishedAttractions(
      requestedLanguage,
      pageSize,
      offset
    ),
    countPublishedAttractions(),
  ]);

  const data: AttractionListItem[] = rows.map((row) => {
    const hasRequestedLanguage =
      row.requested_name !== null;

    const name =
      row.requested_name ??
      row.vi_name;

    const contentLanguage =
      hasRequestedLanguage
        ? requestedLanguage
        : row.vi_name !== null
        ? "vi"
        : null;

    return {
      id: Number(row.attraction_id),
      slug: row.slug,
      area_code: row.area_code,

      latitude: row.latitude,
      longitude: row.longitude,
      trigger_radius_m: row.trigger_radius_m,

      name,

      requested_language: requestedLanguage,
      content_language: contentLanguage,

      fallback_used:
        requestedLanguage !== "vi" &&
        !hasRequestedLanguage &&
        row.vi_name !== null,
    };
  });

  return {
    data,

    pagination: {
      page,
      page_size: pageSize,
      total,
      total_pages: Math.ceil(total / pageSize),
    },
  };
}
export interface AttractionDetailResult {
  id: number;
  slug: string;
  area_code: string;

  latitude: number;
  longitude: number;
  trigger_radius_m: number;

  name: string;
  description: string;

  requested_language: string;
  content_language: string;
  fallback_used: boolean;
}

export class AttractionNotFoundError extends Error {
  constructor() {
    super("Attraction not found");
    this.name = "AttractionNotFoundError";
  }
}

export async function getPublishedAttractionById(
  attractionId: number,
  requestedLanguage: string
): Promise<AttractionDetailResult> {
  const row = await findPublishedAttractionById(
    attractionId,
    requestedLanguage
  );

  if (!row) {
    throw new AttractionNotFoundError();
  }

  const hasRequestedLanguage =
    row.requested_name !== null;

  const name =
    row.requested_name ??
    row.vi_name;

  const description =
    row.requested_description ??
    row.vi_description;

  if (name === null || description === null) {
    throw new AttractionNotFoundError();
  }

  const contentLanguage =
    hasRequestedLanguage
      ? requestedLanguage
      : "vi";

  return {
    id: Number(row.attraction_id),
    slug: row.slug,
    area_code: row.area_code,

    latitude: row.latitude,
    longitude: row.longitude,
    trigger_radius_m: row.trigger_radius_m,

    name,
    description,

    requested_language: requestedLanguage,
    content_language: contentLanguage,

    fallback_used:
      requestedLanguage !== "vi" &&
      !hasRequestedLanguage,
  };
}