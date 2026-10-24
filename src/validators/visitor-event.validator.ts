import type { NextFunction, Request, Response } from "express";
import type { RecordVisitorEventInput } from "../services/visitor-event.service";

const SUPPORTED_LANGUAGES = new Set([
  "vi", "en", "zh", "ja", "ko", "fr", "de",
]);

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function isPositiveId(value: unknown): value is number {
  return typeof value === "number" && Number.isSafeInteger(value) && value > 0;
}

function invalid(res: Response, message: string): void {
  res.status(400).json({
    error: { code: "VALIDATION_ERROR", message },
  });
}

/** Validate only event payload fields; session information comes from auth. */
export function validateVisitorEventBody(
  req: Request,
  res: Response,
  next: NextFunction
): void {
  const body: unknown = req.body;
  if (!isRecord(body)) {
    invalid(res, "Request body must be a JSON object");
    return;
  }

  const eventType = body.event_type;
  if (eventType !== "attraction_view" &&
      eventType !== "tts_started" &&
      eventType !== "route_started") {
    invalid(res, "Unsupported event_type");
    return;
  }

  const allowedKeys = eventType === "route_started"
    ? ["event_type", "route_id"]
    : eventType === "tts_started"
      ? ["event_type", "attraction_id", "language_code"]
      : ["event_type", "attraction_id"];

  if (Object.keys(body).some((key) => !allowedKeys.includes(key))) {
    invalid(res, "Unexpected field in visitor event payload");
    return;
  }

  let input: RecordVisitorEventInput;
  if (eventType === "route_started") {
    if (!isPositiveId(body.route_id)) {
      invalid(res, "route_started requires a positive integer route_id");
      return;
    }
    input = { eventType, routeId: body.route_id };
  } else if (eventType === "tts_started") {
    if (!isPositiveId(body.attraction_id)) {
      invalid(res, "tts_started requires a positive integer attraction_id");
      return;
    }
    if (typeof body.language_code !== "string" ||
        !SUPPORTED_LANGUAGES.has(body.language_code)) {
      invalid(res, "tts_started requires a supported language_code");
      return;
    }
    input = {
      eventType,
      attractionId: body.attraction_id,
      languageCode: body.language_code,
    };
  } else {
    if (!isPositiveId(body.attraction_id)) {
      invalid(res, "attraction_view requires a positive integer attraction_id");
      return;
    }
    input = { eventType, attractionId: body.attraction_id };
  }

  res.locals.visitorEventBody = input;
  next();
}
