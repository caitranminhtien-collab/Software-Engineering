import type { Request, Response } from "express";

import {
  getPublishedRouteById,
  getPublishedRoutes,
  RouteNotFoundError,
} from "../services/route.service";

import type {
  RouteDetailQuery,
  RouteListQuery,
} from "../validators/route.validator";


// GET /api/v1/routes
export async function getRoutes(
  _req: Request,
  res: Response
): Promise<void> {
  try {
    const {
      page,
      pageSize,
    } = res.locals.routeQuery as RouteListQuery;

    const result = await getPublishedRoutes(
      page,
      pageSize
    );

    res.status(200).json(result);
  } catch (error) {
    console.error("Get routes failed:", error);

    res.status(500).json({
      error: {
        code: "INTERNAL_SERVER_ERROR",
        message: "Unable to load routes",
      },
    });
  }
}


// GET /api/v1/routes/:id
export async function getRouteById(
  _req: Request,
  res: Response
): Promise<void> {
  try {
    const {
      routeId,
    } = res.locals.routeDetailQuery as RouteDetailQuery;

    const result = await getPublishedRouteById(
      routeId
    );

    res.status(200).json({
      data: result,
    });
  } catch (error) {
    if (error instanceof RouteNotFoundError) {
      res.status(404).json({
        error: {
          code: "NOT_FOUND",
          message: "Route not found",
        },
      });

      return;
    }

    console.error(
      "Get route detail failed:",
      error
    );

    res.status(500).json({
      error: {
        code: "INTERNAL_SERVER_ERROR",
        message: "Unable to load route",
      },
    });
  }
}