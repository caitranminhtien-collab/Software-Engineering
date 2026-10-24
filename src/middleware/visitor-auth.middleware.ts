import type {
  NextFunction,
  Request,
  Response,
} from "express";

import { createHash } from "node:crypto";

import {
  findActiveVisitorSessionByTokenHash,
} from "../repositories/session.repository";

function hashToken(token: string): string {
  return createHash("sha256")
    .update(token)
    .digest("hex");
}

export async function requireVisitorSession(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const authorization =
      req.header("authorization");

    if (
      !authorization ||
      !authorization.startsWith("Bearer ")
    ) {
      res.status(401).json({
        error: {
          code: "UNAUTHORIZED",
          message: "Visitor token is required",
        },
      });

      return;
    }

    const token = authorization
      .slice("Bearer ".length)
      .trim();

    if (!token) {
      res.status(401).json({
        error: {
          code: "UNAUTHORIZED",
          message: "Visitor token is required",
        },
      });

      return;
    }

    const tokenHash = hashToken(token);

    const session =
      await findActiveVisitorSessionByTokenHash(
        tokenHash
      );

    if (!session) {
      res.status(401).json({
        error: {
          code: "UNAUTHORIZED",
          message:
            "Visitor session is invalid or expired",
        },
      });

      return;
    }

    res.locals.visitorSession = {
  sessionId: Number(session.session_id),

  languageCode: session.language_code,

  accessScope: session.access_scope,

  accessRouteId:
    session.access_route_id === null
      ? null
      : Number(session.access_route_id),

  accessAttractionId:
    session.access_attraction_id === null
      ? null
      : Number(session.access_attraction_id),

  // M2.6: Pass scoped access expiration to Analytics Service
  accessExpiresAt:
    session.access_expires_at ?? null,
};

    next();
  } catch (error) {
    console.error(
      "Visitor authentication failed:",
      error
    );

    res.status(500).json({
      error: {
        code: "INTERNAL_SERVER_ERROR",
        message:
          "Unable to authenticate visitor session",
      },
    });
  }
}