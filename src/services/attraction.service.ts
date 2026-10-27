import {
  countPublishedAttractions,
  findPublishedAttractionById,
  findPublishedAttractionMedia,
  findPublishedAttractions,
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

  const data: AttractionListItem[] = rows.map(
    (row) => {
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
        trigger_radius_m:
          row.trigger_radius_m,

        name,

        requested_language:
          requestedLanguage,

        content_language:
          contentLanguage,

        fallback_used:
          requestedLanguage !== "vi" &&
          !hasRequestedLanguage &&
          row.vi_name !== null,
      };
    }
  );

  return {
    data,

    pagination: {
      page,
      page_size: pageSize,
      total,
      total_pages:
        Math.ceil(total / pageSize),
    },
  };
}

export interface AttractionMediaResult {
  id: number;
  type: "image" | "audio";
  language: string | null;

  url: string;
  caption: string | null;

  credit: string;
  rights_reference: string;

  duration_seconds: number | null;
  display_order: number;

  fallback_used: boolean;
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

  media: AttractionMediaResult[];

  sources: unknown[];
}

export class AttractionNotFoundError
  extends Error {
  constructor() {
    super("Attraction not found");
    this.name =
      "AttractionNotFoundError";
  }
}

function parseSources(
  value: string | null
): unknown[] {
  if (value === null) {
    return [];
  }

  try {
    const parsed = JSON.parse(value);

    return Array.isArray(parsed)
      ? parsed
      : [];
  } catch {
    return [];
  }
}

function resolveMediaUrl(
  fileUrl: string
): string {
  const legacyMediaOrigin =
    "https://dicke-arrives-genealogy-millions.trycloudflare.com";

  try {
    const parsedUrl = new URL(fileUrl);

    const isLegacyLocalMedia =
      parsedUrl.origin === legacyMediaOrigin &&
      /^\/uploads\/media\/[1-9]\d*\/[a-zA-Z0-9_-]+\.(jpg|jpeg|png|webp|gif|mp3|wav|ogg|m4a)$/i.test(
        parsedUrl.pathname
      );

    if (isLegacyLocalMedia) {
      // Dùng origin của frontend để tải qua proxy.
      return parsedUrl.pathname;
    }
  } catch {
    // Giữ nguyên đường dẫn tương đối hoặc giá trị không parse được.
  }

  // Giữ nguyên URL của các nguồn media bên ngoài khác.
  return fileUrl;
}

export async function getPublishedAttractionById(
  attractionId: number,
  requestedLanguage: string
): Promise<AttractionDetailResult> {
  const row =
    await findPublishedAttractionById(
      attractionId,
      requestedLanguage
    );

  if (!row) {
    throw new AttractionNotFoundError();
  }

  const hasRequestedLanguage =
    row.requested_name !== null &&
    row.requested_description !== null;

  const name =
    hasRequestedLanguage
      ? row.requested_name
      : row.vi_name;

  const description =
    hasRequestedLanguage
      ? row.requested_description
      : row.vi_description;

  if (
    name === null ||
    description === null
  ) {
    throw new AttractionNotFoundError();
  }

  const contentLanguage =
    hasRequestedLanguage
      ? requestedLanguage
      : "vi";

  const sourceReferences =
    hasRequestedLanguage
      ? row.requested_source_references
      : row.vi_source_references;

  const sources =
    parseSources(sourceReferences);

  const mediaRows =
    await findPublishedAttractionMedia(
      attractionId,
      requestedLanguage
    );

  const imageRows =
    mediaRows.filter(
      (media) =>
        media.media_type === "image"
    );

  const requestedAudioRows =
    mediaRows.filter(
      (media) =>
        media.media_type === "audio" &&
        media.language_code ===
          requestedLanguage
    );

  const fallbackAudioRows =
    requestedLanguage !== "vi" &&
    requestedAudioRows.length === 0
      ? mediaRows.filter(
          (media) =>
            media.media_type ===
              "audio" &&
            media.language_code === "vi"
        )
      : [];

  const selectedMediaRows = [
    ...imageRows,

    ...(requestedAudioRows.length > 0
      ? requestedAudioRows
      : fallbackAudioRows),
  ].sort(
    (a, b) =>
      a.display_order -
        b.display_order ||
      Number(a.media_id) -
        Number(b.media_id)
  );

  const media: AttractionMediaResult[] =
    selectedMediaRows.map(
      (item) => ({
        id: Number(item.media_id),

        type: item.media_type,

        language:
          item.language_code,

        url: resolveMediaUrl(item.file_url),

        caption:
          item.caption,

        credit:
          item.credit,

        rights_reference:
          item.rights_reference,

        duration_seconds:
          item.duration_seconds,

        display_order:
          item.display_order,

        fallback_used:
          item.media_type ===
            "audio" &&
          item.language_code !==
            requestedLanguage,
      })
    );

  return {
    id: Number(row.attraction_id),

    slug: row.slug,
    area_code: row.area_code,

    latitude: row.latitude,
    longitude: row.longitude,

    trigger_radius_m:
      row.trigger_radius_m,

    name,
    description,

    requested_language:
      requestedLanguage,

    content_language:
      contentLanguage,

    fallback_used:
      requestedLanguage !== "vi" &&
      !hasRequestedLanguage,

    media,

    sources,
  };
}