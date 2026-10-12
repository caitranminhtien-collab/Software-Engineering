import type {
  NextFunction,
  Request,
  Response,
} from "express";

export interface CreateStaffKnowledgeBody {
  attractionId: number | null;
  title: string;
  languageCode: string;
  sourceUrl: string | null;
  sourceCredit: string;
  bodyText: string;
}

export interface StaffKnowledgeParams {
  documentId: number;
}

export function validateCreateStaffKnowledge(
  req: Request,
  res: Response,
  next: NextFunction
): void {
  const errors: string[] = [];

  const attractionId =
    req.body.attraction_id === null ||
    req.body.attraction_id === undefined
      ? null
      : Number(
          req.body.attraction_id
        );

  const title =
    typeof req.body.title === "string"
      ? req.body.title.trim()
      : "";

  const languageCode =
    typeof req.body.language_code ===
    "string"
      ? req.body.language_code
          .trim()
          .toLowerCase()
      : "";

  const sourceUrl =
    req.body.source_url === null ||
    req.body.source_url === undefined
      ? null
      : typeof req.body.source_url ===
          "string"
      ? req.body.source_url.trim()
      : "";

  const sourceCredit =
    typeof req.body.source_credit ===
    "string"
      ? req.body.source_credit.trim()
      : "";

  const bodyText =
    typeof req.body.body_text ===
    "string"
      ? req.body.body_text.trim()
      : "";

  if (
    attractionId !== null &&
    (
      !Number.isInteger(
        attractionId
      ) ||
      attractionId <= 0
    )
  ) {
    errors.push(
      "attraction_id must be a positive integer or null"
    );
  }

  if (!title) {
    errors.push(
      "title is required"
    );
  }

  if (
    !languageCode ||
    !/^[a-z]{2}(?:-[a-z]{2})?$/.test(
      languageCode
    )
  ) {
    errors.push(
      "language_code must be a valid language code"
    );
  }

  if (
    sourceUrl !== null &&
    (
      !sourceUrl ||
      !sourceUrl.startsWith(
        "https://"
      )
    )
  ) {
    errors.push(
      "source_url must be a valid HTTPS URL or null"
    );
  }

  if (!sourceCredit) {
    errors.push(
      "source_credit is required"
    );
  }

  if (!bodyText) {
    errors.push(
      "body_text is required"
    );
  }

  if (errors.length > 0) {
    res.status(400).json({
      error: {
        code: "VALIDATION_ERROR",
        message:
          "Invalid knowledge document request body",
        details: errors,
      },
    });

    return;
  }

  res.locals.createStaffKnowledgeBody = {
    attractionId,
    title,
    languageCode,
    sourceUrl,
    sourceCredit,
    bodyText,
  } satisfies CreateStaffKnowledgeBody;

  next();
}

export function validateStaffKnowledgeParams(
  req: Request,
  res: Response,
  next: NextFunction
): void {
  const documentId =
    Number(req.params.id);

  if (
    !Number.isInteger(
      documentId
    ) ||
    documentId <= 0
  ) {
    res.status(400).json({
      error: {
        code:
          "VALIDATION_ERROR",
        message:
          "Invalid request parameters",
        details: [
          "document id must be a positive integer",
        ],
      },
    });

    return;
  }

  res.locals.staffKnowledgeParams = {
    documentId,
  } satisfies StaffKnowledgeParams;

  next();
}