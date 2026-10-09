import type {
  NextFunction,
  Request,
  Response,
} from "express";

export interface RouteListQuery {
  page: number;
  pageSize: number;
}

export function validateRouteListQuery(
  req: Request,
  res: Response,
  next: NextFunction
): void {
  const errors: string[] = [];

  let page = 1;
  let pageSize = 10;

  if (req.query.page !== undefined) {
    if (typeof req.query.page !== "string") {
      errors.push("page must be a number");
    } else {
      const parsedPage = Number(req.query.page);

      if (
        !Number.isInteger(parsedPage) ||
        parsedPage < 1
      ) {
        errors.push(
          "page must be a positive integer"
        );
      } else {
        page = parsedPage;
      }
    }
  }

  if (req.query.page_size !== undefined) {
    if (typeof req.query.page_size !== "string") {
      errors.push("page_size must be a number");
    } else {
      const parsedPageSize =
        Number(req.query.page_size);

      if (
        !Number.isInteger(parsedPageSize) ||
        parsedPageSize < 1 ||
        parsedPageSize > 100
      ) {
        errors.push(
          "page_size must be an integer from 1 to 100"
        );
      } else {
        pageSize = parsedPageSize;
      }
    }
  }

  if (errors.length > 0) {
    res.status(400).json({
      error: {
        code: "VALIDATION_ERROR",
        message: "Invalid query parameters",
        details: errors,
      },
    });

    return;
  }

  res.locals.routeQuery = {
    page,
    pageSize,
  };

  next();
}
export interface RouteDetailQuery {
  routeId: number;
}

export function validateRouteDetailQuery(
  req: Request,
  res: Response,
  next: NextFunction
): void {
  const errors: string[] = [];

  const routeId = Number(req.params.id);

  if (
    !Number.isInteger(routeId) ||
    routeId < 1
  ) {
    errors.push(
      "route id must be a positive integer"
    );
  }

  if (errors.length > 0) {
    res.status(400).json({
      error: {
        code: "VALIDATION_ERROR",
        message: "Invalid request parameters",
        details: errors,
      },
    });

    return;
  }

  res.locals.routeDetailQuery = {
    routeId,
  };

  next();
}