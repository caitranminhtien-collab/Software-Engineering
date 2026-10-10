import {
  randomBytes,
  timingSafeEqual,
} from "node:crypto";

import type {
  NextFunction,
  Request,
  Response,
} from "express";

export function createCsrfToken(
  req: Request
): string {
  const token =
    randomBytes(32).toString("hex");

  req.session.csrfToken = token;

  return token;
}

export function requireCsrfToken(
  req: Request,
  res: Response,
  next: NextFunction
): void {
  const sessionToken =
    req.session.csrfToken;

  const headerToken =
    req.get("x-csrf-token");

  if (
    !sessionToken ||
    !headerToken
  ) {
    res.status(403).json({
      error: {
        code: "CSRF_VALIDATION_ERROR",
        message:
          "Valid CSRF token is required",
      },
    });

    return;
  }

  const sessionBuffer =
    Buffer.from(sessionToken);

  const headerBuffer =
    Buffer.from(headerToken);

  if (
    sessionBuffer.length !==
      headerBuffer.length ||
    !timingSafeEqual(
      sessionBuffer,
      headerBuffer
    )
  ) {
    res.status(403).json({
      error: {
        code: "CSRF_VALIDATION_ERROR",
        message:
          "Valid CSRF token is required",
      },
    });

    return;
  }

  next();
}