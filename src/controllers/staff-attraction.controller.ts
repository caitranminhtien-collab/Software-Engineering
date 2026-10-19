import type {
  Request,
  Response,
} from "express";

import {
  AttractionSlugConflictError,
  AttractionWorkflowConflictError,
  createStaffAttraction,
  getStaffAttraction,
  listStaffAttractions,
  StaffAttractionNotFoundError,
  updateStaffAttraction,
} from "../services/staff-attraction.service";


import type {
  CreateStaffAttractionBody,
  UpdateStaffAttractionBody,
  UpdateStaffAttractionParams,
} from "../validators/staff-attraction.validator";

interface StaffLocal {
  id: number;
}
export async function listStaffAttractionsController(
  _req: Request,
  res: Response
): Promise<void> {
  try {
    const attractions =
      await listStaffAttractions();

    res.status(200).json({
      data: attractions,
    });
  } catch (error) {
    console.error(
      "List staff attractions failed:",
      error
    );

    res.status(500).json({
      error: {
        code:
          "INTERNAL_SERVER_ERROR",
        message:
          "Unable to list attractions",
      },
    });
  }
}

export async function getStaffAttractionController(
  _req: Request,
  res: Response
): Promise<void> {
  try {
    const {
      attractionId,
    } = res.locals
      .staffAttractionParams as UpdateStaffAttractionParams;

    const attraction =
      await getStaffAttraction(
        attractionId
      );

    res.status(200).json({
      data: attraction,
    });
  } catch (error) {
    if (
      error instanceof
      StaffAttractionNotFoundError
    ) {
      res.status(404).json({
        error: {
          code: "NOT_FOUND",
          message:
            "Attraction not found",
        },
      });

      return;
    }

    console.error(
      "Get staff attraction failed:",
      error
    );

    res.status(500).json({
      error: {
        code:
          "INTERNAL_SERVER_ERROR",
        message:
          "Unable to get attraction",
      },
    });
  }
}
export async function createStaffAttractionController(
  _req: Request,
  res: Response
): Promise<void> {
  try {
    const {
      slug,
      areaCode,
      latitude,
      longitude,
      triggerRadiusM,
    } = res.locals
      .createStaffAttractionBody as CreateStaffAttractionBody;

    const staff =
      res.locals.staff as StaffLocal;

    const attraction =
      await createStaffAttraction(
        slug,
        areaCode,
        latitude,
        longitude,
        triggerRadiusM,
        staff.id
      );

    res.status(201).json({
      data: attraction,
    });
  } catch (error) {
    if (
      error instanceof
      AttractionSlugConflictError
    ) {
      res.status(409).json({
        error: {
          code: "CONFLICT",
          message:
            "Attraction slug already exists",
        },
      });

      return;
    }

    console.error(
      "Create staff attraction failed:",
      error
    );

    res.status(500).json({
      error: {
        code:
          "INTERNAL_SERVER_ERROR",
        message:
          "Unable to create attraction",
      },
    });
  }
}

export async function updateStaffAttractionController(
  _req: Request,
  res: Response
): Promise<void> {
  try {
    const {
      attractionId,
    } = res.locals
      .staffAttractionParams as UpdateStaffAttractionParams;

    const input =
      res.locals
        .updateStaffAttractionBody as UpdateStaffAttractionBody;

    const attraction =
      await updateStaffAttraction(
        attractionId,
        input
      );

    res.status(200).json({
      data: attraction,
    });
  } catch (error) {
    if (
      error instanceof
      StaffAttractionNotFoundError
    ) {
      res.status(404).json({
        error: {
          code: "NOT_FOUND",
          message:
            "Attraction not found",
        },
      });

      return;
    }

    if (
      error instanceof
      AttractionSlugConflictError
    ) {
      res.status(409).json({
        error: {
          code: "CONFLICT",
          message:
            "Attraction slug already exists",
        },
      });

      return;
    }

    if (
      error instanceof
      AttractionWorkflowConflictError
    ) {
      res.status(409).json({
        error: {
          code: "WORKFLOW_CONFLICT",
          message:
            "Attraction cannot be edited in its current status",
        },
      });

      return;
    }

    console.error(
      "Update staff attraction failed:",
      error
    );

    res.status(500).json({
      error: {
        code:
          "INTERNAL_SERVER_ERROR",
        message:
          "Unable to update attraction",
      },
    });
  }
}