import type {
  Request,
  Response,
} from "express";

import {
  createStaffMedia,
  listStaffMedia,
  StaffMediaAttractionNotFoundError,
  StaffMediaStorageInputError,
} from "../services/staff-media.service";

import type {
  CreateStaffMediaBody,
  CreateStaffMediaParams,
} from "../validators/staff-media.validator";

import type {
  ValidatedMediaFile,
} from "../adapters/media/media-file.validator";

export async function createStaffMediaController(
  req: Request,
  res: Response
): Promise<void> {
  try {
    const {
      attractionId,
    } = res.locals
      .createStaffMediaParams as CreateStaffMediaParams;

    const body =
      res.locals
        .createStaffMediaBody as CreateStaffMediaBody;

    const validatedMediaFile =
      res.locals
        .validatedMediaFile as
        | ValidatedMediaFile
        | null;

    const uploaded =
      req.file &&
      validatedMediaFile
        ? {
            file:
              req.file,
            validatedFile:
              validatedMediaFile,
          }
        : null;

    const media =
      await createStaffMedia(
        attractionId,
        body,
        uploaded
      );

    res.status(201).json({
      data: media,
    });
  } catch (error) {
    if (
      error instanceof
      StaffMediaAttractionNotFoundError
    ) {
      res.status(404).json({
        error: {
          code:
            "NOT_FOUND",

          message:
            "Attraction not found",
        },
      });

      return;
    }

    if (
      error instanceof
      StaffMediaStorageInputError
    ) {
      res.status(400).json({
        error: {
          code:
            "VALIDATION_ERROR",

          message:
            error.message,
        },
      });

      return;
    }

    console.error(
      "Create staff media failed:",
      error
    );

    res.status(500).json({
      error: {
        code:
          "INTERNAL_SERVER_ERROR",

        message:
          "Unable to create media",
      },
    });
  }
}

export async function listStaffMediaController(
  _req: Request,
  res: Response
): Promise<void> {
  const params = res.locals.createStaffMediaParams as CreateStaffMediaParams;
  try {
    const items = await listStaffMedia(params.attractionId);
    res.status(200).json({ data: items });
  } catch (error) {
    if (error instanceof StaffMediaAttractionNotFoundError) {
      res.status(404).json({
        error: { code: "NOT_FOUND", message: "Attraction not found" },
      });
      return;
    }
    console.error("List staff media failed:", error);
    res.status(500).json({
      error: { code: "INTERNAL_SERVER_ERROR", message: "Unable to list media" },
    });
  }
}
