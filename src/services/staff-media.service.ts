import {
  resolveMediaUrl,
} from "../adapters/media/media-url";

import {
  createDraftMedia,
  listStaffMediaByAttraction,
} from "../repositories/staff-media.repository";

import {
  findStaffAttractionById,
} from "../repositories/staff-attraction.repository";

import {
  localMediaStorage,
} from "../adapters/media/local-media-storage.adapter";

import type {
  ValidatedMediaFile,
} from "../adapters/media/media-file.validator";

export interface CreateStaffMediaInput {
  languageCode: string | null;

  mediaType:
    | "image"
    | "audio";

  fileUrl: string | null;

  caption: string | null;

  credit: string;
  rightsReference: string;

  durationSeconds: number | null;
  displayOrder: number;
}

export interface UploadedStaffMediaInput {
  file: Express.Multer.File;
  validatedFile: ValidatedMediaFile;
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

export class StaffMediaStorageInputError
  extends Error {
  constructor() {
    super(
      "Media requires either an uploaded file or file_url"
    );

    this.name =
      "StaffMediaStorageInputError";
  }
}

export async function createStaffMedia(
  attractionId: number,
  input: CreateStaffMediaInput,
  uploaded:
    | UploadedStaffMediaInput
    | null = null
): Promise<StaffMediaResult> {
  const attraction =
    await findStaffAttractionById(
      attractionId
    );

  if (!attraction) {
    throw new StaffMediaAttractionNotFoundError();
  }

  let storedFile:
    | Awaited<
        ReturnType<
          typeof localMediaStorage.save
        >
      >
    | null = null;

  let fileUrl =
    input.fileUrl;

  if (uploaded) {
    storedFile =
      await localMediaStorage.save({
        attractionId,
        mediaType:
          input.mediaType,
        buffer:
          uploaded.file.buffer,
        validatedFile:
          uploaded.validatedFile,
      });

    fileUrl =
      storedFile.publicUrl;
  }

  if (!fileUrl) {
    throw new StaffMediaStorageInputError();
  }

  try {
    const media =
      await createDraftMedia(
        attractionId,
        input.languageCode,
        input.mediaType,
        fileUrl,
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
        resolveMediaUrl(media.file_url),

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
  } catch (error) {
    /*
     * Avoid orphan files when the database
     * insert fails after local storage succeeds.
     */
    if (storedFile) {
      await localMediaStorage.remove(
        storedFile.absolutePath
      );
    }

    throw error;
  }
}

/** Return all media for one existing attraction; do not filter out drafts for staff. */
export async function listStaffMedia(
  attractionId: number
) {
  const attraction = await findStaffAttractionById(attractionId);
  if (!attraction) {
    throw new StaffMediaAttractionNotFoundError();
  }
  const rows = await listStaffMediaByAttraction(attractionId);
  return rows.map((media) => ({
    id: Number(media.media_id),
    attraction_id: Number(media.attraction_id),
    language_code: media.language_code,
    media_type: media.media_type,
    file_url: resolveMediaUrl(media.file_url),
    caption: media.caption,
    credit: media.credit,
    rights_reference: media.rights_reference,
    duration_seconds: media.duration_seconds,
    display_order: media.display_order,
    status: media.status,
    approved_by: media.approved_by === null ? null : Number(media.approved_by),
    published_at: media.published_at,
  }));
}
