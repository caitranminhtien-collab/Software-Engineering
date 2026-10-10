import type {
  NextFunction,
  Request,
  Response,
} from "express";

export interface CreateChatMessageBody {
  content: string;
}

export function validateCreateChatMessage(
  req: Request,
  res: Response,
  next: NextFunction
): void {
  const errors: string[] = [];

  const rawContent = req.body.content;

  if (typeof rawContent !== "string") {
    errors.push(
      "content must be a string"
    );
  }

  const content =
    typeof rawContent === "string"
      ? rawContent.trim()
      : "";

  if (
    typeof rawContent === "string" &&
    content.length === 0
  ) {
    errors.push(
      "content must not be empty"
    );
  }

  if (
    typeof rawContent === "string" &&
    content.length > 2000
  ) {
    errors.push(
      "content must not exceed 2000 characters"
    );
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

  res.locals.createChatMessageBody = {
    content,
  } satisfies CreateChatMessageBody;

  next();
}