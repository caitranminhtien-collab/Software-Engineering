import type {
  NextFunction,
  Request,
  Response,
} from "express";

export interface CreateChatMessageBody {
  question: string;
  languageCode: "vi" | "en";
  attractionId: number | null;
}

export function validateCreateChatMessage(
  req: Request,
  res: Response,
  next: NextFunction
): void {
  const errors: string[] = [];

  const rawQuestion =
    req.body.question;

  const rawLanguage =
    req.body.language;

  const rawAttractionId =
    req.body.attraction_id;

  const question =
    typeof rawQuestion === "string"
      ? rawQuestion.trim()
      : "";

  const languageCode =
    typeof rawLanguage === "string"
      ? rawLanguage
          .trim()
          .toLowerCase()
      : "";

  let attractionId:
    | number
    | null = null;

  if (
    typeof rawQuestion !== "string"
  ) {
    errors.push(
      "question must be a string"
    );
  } else if (
    question.length === 0
  ) {
    errors.push(
      "question must not be empty"
    );
  } else if (
    question.length > 2000
  ) {
    errors.push(
      "question must not exceed 2000 characters"
    );
  }

  if (
    languageCode !== "vi" &&
    languageCode !== "en"
  ) {
    errors.push(
      "language must be either vi or en"
    );
  }

  if (
    rawAttractionId !==
      undefined &&
    rawAttractionId !== null
  ) {
    const parsedAttractionId =
      Number(
        rawAttractionId
      );

    if (
      !Number.isInteger(
        parsedAttractionId
      ) ||
      parsedAttractionId <= 0
    ) {
      errors.push(
        "attraction_id must be a positive integer"
      );
    } else {
      attractionId =
        parsedAttractionId;
    }
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

  res.locals.createChatMessageBody = {
    question,
    languageCode:
      languageCode as
        | "vi"
        | "en",
    attractionId,
  } satisfies CreateChatMessageBody;

  next();
}