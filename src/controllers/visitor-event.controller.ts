import type { Request, Response } from "express";
import {
  InvalidVisitorEventError,
  VisitorEventAccessDeniedError,
  VisitorEventTargetNotFoundError,
  recordVisitorEvent,
  type RecordVisitorEventInput,
  type VisitorEventSession,
} from "../services/visitor-event.service";

export async function createVisitorEventController(
  _req: Request,
  res: Response
): Promise<void> {
  const session = res.locals.visitorSession as VisitorEventSession | undefined;
  const input = res.locals.visitorEventBody as RecordVisitorEventInput | undefined;

  if (!session || !input) {
    res.status(401).json({
      error: { code: "UNAUTHORIZED", message: "Visitor session is required" },
    });
    return;
  }

  try {
    const event = await recordVisitorEvent(session, input);
    res.status(201).json({ data: event });
  } catch (error) {
    if (error instanceof InvalidVisitorEventError) {
      res.status(400).json({
        error: { code: "VALIDATION_ERROR", message: error.message },
      });
      return;
    }
    if (error instanceof VisitorEventAccessDeniedError) {
      res.status(403).json({
        error: { code: "FORBIDDEN", message: error.message },
      });
      return;
    }
    if (error instanceof VisitorEventTargetNotFoundError) {
      res.status(404).json({
        error: { code: "NOT_FOUND", message: error.message },
      });
      return;
    }
    console.error("Create visitor event failed:", error);
    res.status(500).json({
      error: {
        code: "INTERNAL_SERVER_ERROR",
        message: "Unable to record visitor event",
      },
    });
  }
}
