import type {
  Request,
  Response,
} from "express";

import {
  createVisitorSession,
} from "../services/session.service";

import type {
  CreateSessionBody,
} from "../validators/session.validator";


// POST /api/v1/sessions
export async function createSession(
  _req: Request,
  res: Response
): Promise<void> {
  try {
    const {
      languageCode,
    } = res.locals
      .createSessionBody as CreateSessionBody;

    const result =
      await createVisitorSession(
        languageCode
      );

    res.status(201).json({
      data: result,
    });
  } catch (error) {
    console.error(
      "Create visitor session failed:",
      error
    );

    res.status(500).json({
      error: {
        code: "INTERNAL_SERVER_ERROR",
        message:
          "Unable to create visitor session",
      },
    });
  }
}