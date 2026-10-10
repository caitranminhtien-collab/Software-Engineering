import type {
  NextFunction,
  Request,
  Response,
} from "express";

export interface StaffLocalizationParams {
  attractionId: number;
  language: string;
}

export interface UpsertStaffLocalizationBody {
  name: string;
  description: string;
  sourceReferences: unknown[];
}

export function validateStaffLocalizationParams(
  req: Request,
  res: Response,
  next: NextFunction
): void {
  const attractionId = Number(req.params.id);

  const language =
    typeof req.params.language === "string"
      ? req.params.language.trim().toLowerCase()
      : "";

  const errors: string[] = [];

  if (
    !Number.isInteger(attractionId) ||
    attractionId <= 0
  ) {
    errors.push(
      "attraction id must be a positive integer"
    );
  }

  if (
    !/^[a-z]{2}(?:-[a-z]{2})?$/.test(
      language
    )
  ) {
    errors.push(
      "language must be a valid language code"
    );
  }

  if (errors.length > 0) {
    res.status(400).json({
      error: {
        code: "VALIDATION_ERROR",
        message:
          "Invalid request parameters",
        details: errors,
      },
    });

    return;
  }

  res.locals.staffLocalizationParams = {
    attractionId,
    language,
  } satisfies StaffLocalizationParams;

  next();
}

export function validateUpsertStaffLocalization(
  req: Request,
  res: Response,
  next: NextFunction
): void {
  const errors: string[] = [];

  const name =
    typeof req.body.name === "string"
      ? req.body.name.trim()
      : "";

  const description =
    typeof req.body.description === "string"
      ? req.body.description.trim()
      : "";

  const sourceReferences =
    req.body.source_references === undefined
      ? []
      : req.body.source_references;

  if (!name || name.length > 255) {
    errors.push(
      "name must not be empty or exceed 255 characters"
    );
  }

  if (!description) {
    errors.push(
      "description must not be empty"
    );
  }

  if (!Array.isArray(sourceReferences)) {
    errors.push(
      "source_references must be an array"
    );
  }

  if (errors.length > 0) {
    res.status(400).json({
      error: {
        code: "VALIDATION_ERROR",
        message:
          "Invalid request body",
        details: errors,
      },
    });

    return;
  }

  res.locals.upsertStaffLocalizationBody = {
    name,
    description,
    sourceReferences,
  } satisfies UpsertStaffLocalizationBody;

  next();
}