import type {
  NextFunction,
  Request,
  Response,
} from "express";

import {
  MediaFileValidationError,
  validateUploadedMediaFile,
  type ValidatedMediaFile,
} from "../adapters/media/media-file.validator";

export interface CreateStaffMediaParams {
  attractionId: number;
}

export interface CreateStaffMediaBody {
  languageCode: string | null;

  mediaType:
    | "image"
    | "audio";

  /*
   * JSON registration supplies fileUrl.
   * Multipart upload sets it to null and
   * the storage adapter generates the URL.
   */
  fileUrl: string | null;

  caption: string | null;

  credit: string;
  rightsReference: string;

  durationSeconds: number | null;
  displayOrder: number;
}

export function validateStaffMediaParams(
  req: Request,
  res: Response,
  next: NextFunction
): void {
  const attractionId =
    Number(req.params.id);

  if (
    !Number.isInteger(
      attractionId
    ) ||
    attractionId <= 0
  ) {
    res.status(400).json({
      error: {
        code:
          "VALIDATION_ERROR",

        message:
          "Invalid request parameters",

        details: [
          "attraction id must be a positive integer",
        ],
      },
    });

    return;
  }

  res.locals.createStaffMediaParams = {
    attractionId,
  } satisfies CreateStaffMediaParams;

  next();
}

export function validateCreateStaffMedia(
  req: Request,
  res: Response,
  next: NextFunction
): void {
  const errors: string[] =
    [];

  const mediaType =
    req.body.media_type;

  const languageCode =
    req.body.language_code ===
      null ||
    req.body.language_code ===
      undefined ||
    req.body.language_code ===
      ""
      ? null
      : typeof
          req.body
            .language_code ===
        "string"
      ? req.body.language_code
          .trim()
          .toLowerCase()
      : "";

  const rawFileUrl =
    typeof
        req.body.file_url ===
      "string"
      ? req.body.file_url
          .trim()
      : "";

  const caption =
    req.body.caption ===
      null ||
    req.body.caption ===
      undefined ||
    req.body.caption === ""
      ? null
      : typeof
          req.body.caption ===
        "string"
      ? req.body.caption.trim()
      : null;

  const credit =
    typeof
        req.body.credit ===
      "string"
      ? req.body.credit.trim()
      : "";

  const rightsReference =
    typeof
        req.body
          .rights_reference ===
      "string"
      ? req.body
          .rights_reference
          .trim()
      : "";

  const durationSeconds =
    req.body.duration_seconds ===
      null ||
    req.body.duration_seconds ===
      undefined ||
    req.body.duration_seconds ===
      ""
      ? null
      : Number(
          req.body
            .duration_seconds
        );

  const displayOrder =
    req.body.display_order ===
      undefined ||
    req.body.display_order ===
      ""
      ? 1
      : Number(
          req.body
            .display_order
        );

  const isMediaTypeValid =
    mediaType === "image" ||
    mediaType === "audio";

  if (!isMediaTypeValid) {
    errors.push(
      "media_type must be image or audio"
    );
  }

  const isMultipart =
    Boolean(
      req.is(
        "multipart/form-data"
      )
    );

  /*
   * Legacy JSON registration still requires
   * a persisted HTTPS URL.
   *
   * Multipart upload does not accept the
   * client URL as authoritative; the local
   * storage adapter generates file_url.
   */
  if (
    !isMultipart &&
    (
      !rawFileUrl ||
      !rawFileUrl.startsWith(
        "https://"
      )
    )
  ) {
    errors.push(
      "file_url must be a valid HTTPS URL"
    );
  }

  if (!credit) {
    errors.push(
      "credit is required"
    );
  }

  if (!rightsReference) {
    errors.push(
      "rights_reference is required"
    );
  }

  if (
    languageCode !== null &&
    !/^[a-z]{2}(?:-[a-z]{2})?$/.test(
      languageCode
    )
  ) {
    errors.push(
      "language_code must be a valid language code"
    );
  }

  if (
    mediaType === "audio" &&
    languageCode === null
  ) {
    errors.push(
      "audio media requires language_code"
    );
  }

  if (
    mediaType === "audio" &&
    (
      durationSeconds ===
        null ||
      !Number.isFinite(
        durationSeconds
      ) ||
      durationSeconds <= 0
    )
  ) {
    errors.push(
      "audio media requires positive duration_seconds"
    );
  }

  if (
    mediaType === "image" &&
    durationSeconds !== null
  ) {
    errors.push(
      "image media must not have duration_seconds"
    );
  }

  if (
    !Number.isInteger(
      displayOrder
    ) ||
    displayOrder <= 0
  ) {
    errors.push(
      "display_order must be a positive integer"
    );
  }

  let validatedMediaFile:
    | ValidatedMediaFile
    | null = null;

  if (
    isMultipart &&
    !req.file
  ) {
    errors.push(
      "file is required for multipart media upload"
    );
  }

  if (
    req.file &&
    isMediaTypeValid
  ) {
    try {
      validatedMediaFile =
        validateUploadedMediaFile(
          req.file,
          mediaType
        );
    } catch (error) {
      if (
        error instanceof
        MediaFileValidationError
      ) {
        errors.push(
          error.message
        );
      } else {
        throw error;
      }
    }
  }

  if (
    errors.length > 0
  ) {
    res.status(400).json({
      error: {
        code:
          "VALIDATION_ERROR",

        message:
          "Invalid media request body",

        details:
          errors,
      },
    });

    return;
  }

  res.locals.createStaffMediaBody = {
    languageCode,

    mediaType:
      mediaType as
        | "image"
        | "audio",

    fileUrl:
      isMultipart
        ? null
        : rawFileUrl,

    caption,
    credit,
    rightsReference,
    durationSeconds,
    displayOrder,
  } satisfies CreateStaffMediaBody;

  res.locals.validatedMediaFile =
    validatedMediaFile;

  next();
}