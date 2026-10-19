import type {
  Request,
  Response,
} from "express";

import {
  createStaffRoute,
  replaceStaffRouteStops,
  StaffRouteAttractionNotFoundError,
  StaffRouteEditConflictError,
  StaffRouteNotFoundError,
  StaffRouteSlugConflictError,
  getStaffRoute,
  listStaffRoutes,
} from "../services/staff-route.service";

import type {
  CreateStaffRouteBody,
  StaffRouteParams,
  UpdateStaffRouteStopsBody,
} from "../validators/staff-route.validator";

export async function createStaffRouteController(
  req: Request,
  res: Response
): Promise<void> {
  try {
    const body =
      res.locals
        .createStaffRouteBody as CreateStaffRouteBody;

    const staffId =
      req.session.staffId;

    if (!staffId) {
      res.status(401).json({
        error: {
          code: "UNAUTHORIZED",
          message:
            "Staff authentication required",
        },
      });

      return;
    }

    const route =
      await createStaffRoute(
        body,
        Number(staffId)
      );

    res.status(201).json({
      data: route,
    });
  } catch (error) {
    if (
      error instanceof
      StaffRouteSlugConflictError
    ) {
      res.status(409).json({
        error: {
          code:
            "ROUTE_SLUG_CONFLICT",
          message:
            "Route slug already exists",
        },
      });

      return;
    }

    console.error(
      "Create staff route failed:",
      error
    );

    res.status(500).json({
      error: {
        code:
          "INTERNAL_SERVER_ERROR",
        message:
          "Unable to create route",
      },
    });
  }
}

export async function replaceStaffRouteStopsController(
  _req: Request,
  res: Response
): Promise<void> {
  try {
    const {
      routeId,
    } =
      res.locals
        .staffRouteParams as StaffRouteParams;

    const {
      stops,
    } =
      res.locals
        .updateStaffRouteStopsBody as UpdateStaffRouteStopsBody;

    const result =
      await replaceStaffRouteStops(
        routeId,
        stops
      );

    res.status(200).json({
      data: result,
    });
  } catch (error) {
    if (
      error instanceof
      StaffRouteNotFoundError
    ) {
      res.status(404).json({
        error: {
          code: "NOT_FOUND",
          message:
            "Route not found",
        },
      });

      return;
    }

    if (
      error instanceof
      StaffRouteAttractionNotFoundError
    ) {
      res.status(400).json({
        error: {
          code:
            "INVALID_ROUTE_STOPS",
          message:
            "One or more attractions do not exist",
          details: {
            attraction_ids:
              error.attractionIds,
          },
        },
      });

      return;
    }

    if (
      error instanceof
      StaffRouteEditConflictError
    ) {
      res.status(409).json({
        error: {
          code:
            "ROUTE_EDIT_CONFLICT",
          message:
            "Route cannot be edited in its current status",
        },
      });

      return;
    }

    console.error(
      "Replace staff route stops failed:",
      error
    );

    res.status(500).json({
      error: {
        code:
          "INTERNAL_SERVER_ERROR",
        message:
          "Unable to replace route stops",
      },
    });
  }
}
export async function listStaffRoutesController(
  _req: Request,
  res: Response
): Promise<void> {
  try {
    const routes =
      await listStaffRoutes();

    res.status(200).json({
      data: routes,
    });
  } catch (error) {
    console.error(
      "List staff routes failed:",
      error
    );

    res.status(500).json({
      error: {
        code: "INTERNAL_SERVER_ERROR",
        message: "Unable to list routes",
      },
    });
  }
}

export async function getStaffRouteController(
  _req: Request,
  res: Response
): Promise<void> {
  try {
    const {
      routeId,
    } = res.locals
      .staffRouteParams as StaffRouteParams;

    const result =
      await getStaffRoute(routeId);

    res.status(200).json({
      data: result,
    });
  } catch (error) {
    if (
      error instanceof
      StaffRouteNotFoundError
    ) {
      res.status(404).json({
        error: {
          code: "NOT_FOUND",
          message: "Route not found",
        },
      });

      return;
    }

    console.error(
      "Get staff route failed:",
      error
    );

    res.status(500).json({
      error: {
        code: "INTERNAL_SERVER_ERROR",
        message: "Unable to get route",
      },
    });
  }
}