import {
  createDraftMedia,
} from "../repositories/staff-media.repository";

import {
  findStaffAttractionById,
} from "../repositories/staff-attraction.repository";

export interface CreateStaffMediaInput {
  languageCode: string | null;

  mediaType:
    | "image"
    | "audio";

  fileUrl: string;
  caption: string | null;

  credit: string;
  rightsReference: string;

  durationSeconds: number | null;
  displayOrder: number;
}

export interface StaffMediaResult {
  id: number;
  attraction_id: number;

  language_code: string | null;

  media_type:
    | "image"
    | "audio";

  file_url: string;
  caption: string | null;

  credit: string;
  rights_reference: string;

  duration_seconds: number | null;
  display_order: number;

  status: "draft";

  approved_by: number | null;
  published_at: Date | null;
}

export class StaffMediaAttractionNotFoundError
  extends Error {
  constructor() {
    super("Attraction not found");

    this.name =
      "StaffMediaAttractionNotFoundError";
  }
}

export async function createStaffMedia(
  attractionId: number,
  input: CreateStaffMediaInput
): Promise<StaffMediaResult> {
  const attraction =
    await findStaffAttractionById(
      attractionId
    );

  if (!attraction) {
    throw new StaffMediaAttractionNotFoundError();
  }

  const media =
    await createDraftMedia(
      attractionId,
      input.languageCode,
      input.mediaType,
      input.fileUrl,
      input.caption,
      input.credit,
      input.rightsReference,
      input.durationSeconds,
      input.displayOrder
    );

  return {
    id: Number(
      media.media_id
    ),

    attraction_id: Number(
      media.attraction_id
    ),

    language_code:
      media.language_code,

    media_type:
      media.media_type,

    file_url:
      media.file_url,

    caption:
      media.caption,

    credit:
      media.credit,

    rights_reference:
      media.rights_reference,

    duration_seconds:
      media.duration_seconds,

    display_order:
      media.display_order,

    status: "draft",

    approved_by:
      media.approved_by === null
        ? null
        : Number(
            media.approved_by
          ),

    published_at:
      media.published_at,
  };
}