import type {
  Request,
  Response,
} from "express";

import {
  getStaffLocalization,
  StaffLocalizationAttractionNotFoundError,
  StaffLocalizationNotFoundError,
  StaffLocalizationWorkflowConflictError,
  upsertStaffLocalization,
} from "../services/staff-localization.service";

import type {
  StaffLocalizationParams,
  UpsertStaffLocalizationBody,
} from "../validators/staff-localization.validator";

export async function getStaffLocalizationController(
  _req: Request,
  res: Response
): Promise<void> {
  try {
    const {
      attractionId,
      language,
    } = res.locals
      .staffLocalizationParams as StaffLocalizationParams;

    const localization =
      await getStaffLocalization(
        attractionId,
        language
      );

    res.status(200).json({
      data: localization,
    });
  } catch (error) {
    if (
      error instanceof
      StaffLocalizationNotFoundError
    ) {
      res.status(404).json({
        error: {
          code: "NOT_FOUND",
          message: "Localization not found",
        },
      });

      return;
    }

    console.error(
      "Get staff localization failed:",
      error
    );

    res.status(500).json({
      error: {
        code: "INTERNAL_SERVER_ERROR",
        message:
          "Unable to load localization",
      },
    });
  }
}

export async function upsertStaffLocalizationController(
  _req: Request,
  res: Response
): Promise<void> {
  try {
    const {
      attractionId,
      language,
    } = res.locals
      .staffLocalizationParams as StaffLocalizationParams;

    const body =
      res.locals
        .upsertStaffLocalizationBody as UpsertStaffLocalizationBody;

    const localization =
      await upsertStaffLocalization(
        attractionId,
        language,
        body
      );

    res.status(200).json({
      data: localization,
    });
  } catch (error) {
    if (
      error instanceof
      StaffLocalizationAttractionNotFoundError
    ) {
      res.status(404).json({
        error: {
          code: "NOT_FOUND",
          message: "Attraction not found",
        },
      });

      return;
    }

    if (
      error instanceof
      StaffLocalizationWorkflowConflictError
    ) {
      res.status(409).json({
        error: {
          code: "WORKFLOW_CONFLICT",
          message:
            "Localization cannot be edited in its current status",
        },
      });

      return;
    }

    console.error(
      "Upsert staff localization failed:",
      error
    );

    res.status(500).json({
      error: {
        code:
          "INTERNAL_SERVER_ERROR",
        message:
          "Unable to save localization",
      },
    });
  }
}