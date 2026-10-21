import type {
  NextFunction,
  Request,
  Response,
} from "express";

export interface CreateStaffRouteBody {
  slug: string;
  nameVi: string;
  descriptionVi: string;
  areaCode: string;
  estimatedMinutes: number;
}

export interface StaffRouteParams {
  routeId: number;
}

export interface StaffRouteStopInput {
  attractionId: number;
  stopOrder: number;
  visitMinutes: number | null;
  travelMinutesFromPrevious:
    number | null;
}

export interface UpdateStaffRouteStopsBody {
  stops: StaffRouteStopInput[];
}

export function validateCreateStaffRoute(
  req: Request,
  res: Response,
  next: NextFunction
): void {
  const errors: string[] = [];

  const slug =
    typeof req.body.slug === "string"
      ? req.body.slug.trim()
      : "";

  const nameVi =
    typeof req.body.name_vi === "string"
      ? req.body.name_vi.trim()
      : "";

  const descriptionVi =
    typeof req.body.description_vi ===
    "string"
      ? req.body.description_vi.trim()
      : "";

  const areaCode =
    typeof req.body.area_code === "string"
      ? req.body.area_code.trim()
      : "";

  const estimatedMinutes =
    Number(
      req.body.estimated_minutes
    );

  if (
    !slug ||
    !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(
      slug
    )
  ) {
    errors.push(
      "slug must contain lowercase letters, numbers, and hyphens only"
    );
  }

  if (!nameVi) {
    errors.push(
      "name_vi is required"
    );
  }

  if (!descriptionVi) {
    errors.push(
      "description_vi is required"
    );
  }

  if (!areaCode) {
    errors.push(
      "area_code is required"
    );
  }

  if (
    !Number.isInteger(
      estimatedMinutes
    ) ||
    estimatedMinutes <= 0
  ) {
    errors.push(
      "estimated_minutes must be a positive integer"
    );
  }

  if (errors.length > 0) {
    res.status(400).json({
      error: {
        code: "VALIDATION_ERROR",
        message:
          "Invalid route request body",
        details: errors,
      },
    });

    return;
  }

  res.locals.createStaffRouteBody = {
    slug,
    nameVi,
    descriptionVi,
    areaCode,
    estimatedMinutes,
  } satisfies CreateStaffRouteBody;

  next();
}

export function validateStaffRouteParams(
  req: Request,
  res: Response,
  next: NextFunction
): void {
  const routeId =
    Number(req.params.id);

  if (
    !Number.isInteger(routeId) ||
    routeId <= 0
  ) {
    res.status(400).json({
      error: {
        code: "VALIDATION_ERROR",
        message:
          "Invalid request parameters",
        details: [
          "route id must be a positive integer",
        ],
      },
    });

    return;
  }

  res.locals.staffRouteParams = {
    routeId,
  } satisfies StaffRouteParams;

  next();
}

export function validateUpdateStaffRouteStops(
  req: Request,
  res: Response,
  next: NextFunction
): void {
  const errors: string[] = [];

  if (!Array.isArray(req.body.stops)) {
    res.status(400).json({
      error: {
        code: "VALIDATION_ERROR",
        message:
          "Invalid route stops request body",
        details: [
          "stops must be an array",
        ],
      },
    });

    return;
  }

  if (req.body.stops.length === 0) {
    res.status(400).json({
      error: {
        code: "VALIDATION_ERROR",
        message:
          "Invalid route stops request body",
        details: [
          "stops must contain at least one stop",
        ],
      },
    });

    return;
  }

  const stops: StaffRouteStopInput[] =
    [];

  const stopOrders =
    new Set<number>();

  req.body.stops.forEach(
    (
      rawStop: unknown,
      index: number
    ) => {
      if (
        typeof rawStop !==
          "object" ||
        rawStop === null ||
        Array.isArray(rawStop)
      ) {
        errors.push(
          `stops[${index}] must be an object`
        );

        return;
      }

      const stop =
        rawStop as Record<
          string,
          unknown
        >;

      const attractionId =
        Number(
          stop.attraction_id
        );

      const stopOrder =
        Number(
          stop.stop_order
        );

      const visitMinutes =
        stop.visit_minutes === null ||
        stop.visit_minutes ===
          undefined
          ? null
          : Number(
              stop.visit_minutes
            );

      const travelMinutesFromPrevious =
        stop
          .travel_minutes_from_previous ===
          null ||
        stop
          .travel_minutes_from_previous ===
          undefined
          ? null
          : Number(
              stop
                .travel_minutes_from_previous
            );

      if (
        !Number.isInteger(
          attractionId
        ) ||
        attractionId <= 0
      ) {
        errors.push(
          `stops[${index}].attraction_id must be a positive integer`
        );
      }

      if (
        !Number.isInteger(
          stopOrder
        ) ||
        stopOrder <= 0
      ) {
        errors.push(
          `stops[${index}].stop_order must be a positive integer`
        );
      }

      if (
        visitMinutes !== null &&
        (
          !Number.isInteger(
            visitMinutes
          ) ||
          visitMinutes <= 0
        )
      ) {
        errors.push(
          `stops[${index}].visit_minutes must be a positive integer or null`
        );
      }

      if (
        travelMinutesFromPrevious !==
          null &&
        (
          !Number.isInteger(
            travelMinutesFromPrevious
          ) ||
          travelMinutesFromPrevious <
            0
        )
      ) {
        errors.push(
          `stops[${index}].travel_minutes_from_previous must be a non-negative integer or null`
        );
      }

      if (
        Number.isInteger(
          stopOrder
        ) &&
        stopOrder > 0
      ) {
        if (
          stopOrders.has(
            stopOrder
          )
        ) {
          errors.push(
            `stop_order ${stopOrder} is duplicated`
          );
        }

        stopOrders.add(
          stopOrder
        );
      }

      stops.push({
        attractionId,
        stopOrder,
        visitMinutes,
        travelMinutesFromPrevious,
      });
    }
  );

  if (errors.length === 0) {
    const sortedOrders =
      [...stopOrders].sort(
        (a, b) => a - b
      );

    for (
      let index = 0;
      index <
      sortedOrders.length;
      index += 1
    ) {
      if (
        sortedOrders[index] !==
        index + 1
      ) {
        errors.push(
          "stop_order must be continuous starting from 1"
        );

        break;
      }
    }
  }

  if (errors.length > 0) {
    res.status(400).json({
      error: {
        code: "VALIDATION_ERROR",
        message:
          "Invalid route stops request body",
        details: errors,
      },
    });

    return;
  }

  stops.sort(
    (a, b) =>
      a.stopOrder -
      b.stopOrder
  );

  if (
    stops[0] &&
    stops[0]
      .travelMinutesFromPrevious !==
      null
  ) {
    res.status(400).json({
      error: {
        code: "VALIDATION_ERROR",
        message:
          "Invalid route stops request body",
        details: [
          "The first stop must have travel_minutes_from_previous = null",
        ],
      },
    });

    return;
  }

  res.locals.updateStaffRouteStopsBody = {
    stops,
  } satisfies UpdateStaffRouteStopsBody;

  next();
}

export interface UpdateStaffRouteBody {
  nameVi?: string;
  descriptionVi?: string;
  estimatedMinutes?: number;
}

export function validateUpdateStaffRoute(
  req: Request,
  res: Response,
  next: NextFunction
): void {
  const errors: string[] = [];
  const rawBody: unknown = req.body;

  if (
    typeof rawBody !== "object" ||
    rawBody === null ||
    Array.isArray(rawBody)
  ) {
    res.status(400).json({
      error: {
        code: "VALIDATION_ERROR",
        message: "Invalid route update body",
        details: ["Request body must be an object"],
      },
    });
    return;
  }

  const body = rawBody as Record<string, unknown>;

  const allowedFields = [
    "name_vi",
    "description_vi",
    "estimated_minutes",
  ];

  const keys = Object.keys(body);

  if (keys.length === 0) {
    errors.push("At least one field is required");
  }

  for (const key of keys) {
    if (!allowedFields.includes(key)) {
      errors.push(`Field ${key} is not allowed`);
    }
  }

  const updated: UpdateStaffRouteBody = {};

  if (Object.prototype.hasOwnProperty.call(body, "name_vi")) {
    if (
      typeof body.name_vi !== "string" ||
      !body.name_vi.trim()
    ) {
      errors.push("name_vi must be a non-empty string");
    } else {
      updated.nameVi = body.name_vi.trim();
    }
  }

  if (Object.prototype.hasOwnProperty.call(body, "description_vi")) {
    if (
      typeof body.description_vi !== "string" ||
      !body.description_vi.trim()
    ) {
      errors.push("description_vi must be a non-empty string");
    } else {
      updated.descriptionVi = body.description_vi.trim();
    }
  }

  if (Object.prototype.hasOwnProperty.call(body, "estimated_minutes")) {
    if (
      typeof body.estimated_minutes !== "number" ||
      !Number.isInteger(body.estimated_minutes) ||
      body.estimated_minutes <= 0
    ) {
      errors.push("estimated_minutes must be a positive integer");
    } else {
      updated.estimatedMinutes = body.estimated_minutes;
    }
  }

  if (errors.length > 0) {
    res.status(400).json({
      error: {
        code: "VALIDATION_ERROR",
        message: "Invalid route update body",
        details: errors,
      },
    });
    return;
  }

  res.locals.updateStaffRouteBody = updated;

  next();
}
