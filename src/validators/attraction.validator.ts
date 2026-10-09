import type {
  NextFunction,
  Request,
  Response,
} from "express";

export interface AttractionListQuery {
  language: string;
  page: number;
  pageSize: number;
}

export function validateAttractionListQuery(
  req: Request,
  res: Response,
  next: NextFunction
): void {
  const errors: string[] = [];

  let language = "vi";
  let page = 1;
  let pageSize = 10;

  // Validate language
  if (req.query.language !== undefined) {
    if (typeof req.query.language !== "string") {
      errors.push("language must be a string");
    } else {
      language = req.query.language.toLowerCase();

      const languagePattern =
        /^[a-z]{2,3}(?:-[a-z]{2})?$/;

      if (!languagePattern.test(language)) {
        errors.push("language format is invalid");
      }
    }
  }

  // Validate page
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

  // Validate page_size
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

  // CÓ LỖI THÌ DỪNG TẠI ĐÂY
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

  // Chỉ request hợp lệ mới được đưa sang Controller
  res.locals.attractionQuery = {
    language,
    page,
    pageSize,
  };

  next();
}
export interface AttractionDetailQuery {
  attractionId: number;
  language: string;
}

export function validateAttractionDetailQuery(
  req: Request,
  res: Response,
  next: NextFunction
): void {
  const errors: string[] = [];

  const idRaw = req.params.id;
  const attractionId = Number(idRaw);

  if (
    !Number.isInteger(attractionId) ||
    attractionId < 1
  ) {
    errors.push(
      "attraction id must be a positive integer"
    );
  }

  let language = "vi";

  if (req.query.language !== undefined) {
    if (typeof req.query.language !== "string") {
      errors.push("language must be a string");
    } else {
      language = req.query.language.toLowerCase();

      const languagePattern =
        /^[a-z]{2,3}(?:-[a-z]{2})?$/;

      if (!languagePattern.test(language)) {
        errors.push("language format is invalid");
      }
    }
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

  res.locals.attractionDetailQuery = {
    attractionId,
    language,
  };

  next();
}