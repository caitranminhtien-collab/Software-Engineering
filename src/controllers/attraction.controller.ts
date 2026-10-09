import type { Request, Response } from "express";

import {
  AttractionNotFoundError,
  getPublishedAttractionById,
  getPublishedAttractions,
} from "../services/attraction.service";

import type {
  AttractionDetailQuery,
  AttractionListQuery,
} from "../validators/attraction.validator";


// GET /api/v1/attractions
export async function getAttractions(
  _req: Request,
  res: Response
): Promise<void> {
  try {
    const {
      language,
      page,
      pageSize,
    } = res.locals.attractionQuery as AttractionListQuery;

    const result = await getPublishedAttractions(
      language,
      page,
      pageSize
    );

    res.status(200).json(result);
  } catch (error) {
    console.error("Get attractions failed:", error);

    res.status(500).json({
      error: {
        code: "INTERNAL_SERVER_ERROR",
        message: "Unable to load attractions",
      },
    });
  }
}


// GET /api/v1/attractions/:id
export async function getAttractionById(
  _req: Request,
  res: Response
): Promise<void> {
  try {
    const {
      attractionId,
      language,
    } = res.locals
      .attractionDetailQuery as AttractionDetailQuery;

    const result =
      await getPublishedAttractionById(
        attractionId,
        language
      );

    res.status(200).json({
      data: result,
    });
  } catch (error) {
    if (error instanceof AttractionNotFoundError) {
      res.status(404).json({
        error: {
          code: "NOT_FOUND",
          message: "Attraction not found",
        },
      });

      return;
    }

    console.error(
      "Get attraction detail failed:",
      error
    );

    res.status(500).json({
      error: {
        code: "INTERNAL_SERVER_ERROR",
        message: "Unable to load attraction",
      },
    });
  }
}