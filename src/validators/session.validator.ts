import type {
  NextFunction,
  Request,
  Response,
} from "express";

export interface CreateSessionBody {
  languageCode: string;
}

const SUPPORTED_LANGUAGES = new Set([
  "vi",
  "en",
]);

export function validateCreateSession(
  req: Request,
  res: Response,
  next: NextFunction
): void {
  const errors: string[] = [];

  let languageCode = "vi";

  if (req.body.language_code !== undefined) {
    if (
      typeof req.body.language_code !== "string"
    ) {
      errors.push(
        "language_code must be a string"
      );
    } else {
      languageCode =
        req.body.language_code
          .trim()
          .toLowerCase();

      if (
        !SUPPORTED_LANGUAGES.has(
          languageCode
        )
      ) {
        errors.push(
          "language_code must be vi or en"
        );
      }
    }
  }

  if (errors.length > 0) {
    res.status(400).json({
      error: {
        code: "VALIDATION_ERROR",
        message: "Invalid request body",
        details: errors,
      },
    });

    return;
  }

  res.locals.createSessionBody = {
    languageCode,
  } satisfies CreateSessionBody;

  next();
}