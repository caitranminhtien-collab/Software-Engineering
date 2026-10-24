import type {
  Request,
  Response,
} from "express";

import {
  AudioMediaNotFoundError,
  AudioPlayNotFoundError,
  InvalidAudioProgressError,
  startAudioPlay,
  updateAudioPlay,
} from "../services/audio-play.service";

import {
  VisitorGrantDeniedError,
  type VisitorGrantSession,
} from "../services/visitor-access.service";

import type {
  CreateAudioPlayBody,
  UpdateAudioPlayBody,
  UpdateAudioPlayParams,
} from "../validators/audio-play.validator";

interface VisitorSessionLocal {
  sessionId: number;
  languageCode: string;
  accessScope: "public" | "route" | "attraction";
  accessRouteId: number | null;
  accessAttractionId: number | null;
}

// POST /api/v1/audio-plays
export async function createAudioPlayController(
  _req: Request,
  res: Response
): Promise<void> {
  try {
    const {
      mediaId,
    } = res.locals
      .createAudioPlayBody as CreateAudioPlayBody;

    const visitorSession = res.locals.visitorSession as VisitorGrantSession;

    const result = await startAudioPlay(
      visitorSession,
      mediaId
    );

    res.status(201).json({
      data: result,
    });
  } catch (error) {
    if (error instanceof VisitorGrantDeniedError) {
      res.status(403).json({error:{code:"FORBIDDEN",message:error.message}});
      return;
    }
    if (error instanceof AudioMediaNotFoundError) {
      res.status(404).json({
        error: {
          code: "NOT_FOUND",
          message: "Audio media not found",
        },
      });

      return;
    }

    console.error(
      "Create audio play failed:",
      error
    );

    res.status(500).json({
      error: {
        code: "INTERNAL_SERVER_ERROR",
        message: "Unable to start audio play",
      },
    });
  }
}
// PATCH /api/v1/audio-plays/:id
export async function updateAudioPlayController(
  _req: Request,
  res: Response
): Promise<void> {
  try {
    const {
      playId,
    } = res.locals
      .updateAudioPlayParams as UpdateAudioPlayParams;

    const {
      playedSeconds,
      completed,
    } = res.locals
      .updateAudioPlayBody as UpdateAudioPlayBody;

    const visitorSession = res.locals.visitorSession as VisitorGrantSession;

    const result = await updateAudioPlay(
      playId,
      visitorSession,
      playedSeconds,
      completed
    );

    res.status(200).json({
      data: result,
    });
  } catch (error) {
    if (error instanceof VisitorGrantDeniedError) {
      res.status(403).json({error:{code:"FORBIDDEN",message:error.message}});
      return;
    }
    if (error instanceof AudioPlayNotFoundError) {
      res.status(404).json({
        error: {
          code: "NOT_FOUND",
          message: "Audio play not found",
        },
      });

      return;
    }

    if (error instanceof InvalidAudioProgressError) {
      res.status(400).json({
        error: {
          code: "VALIDATION_ERROR",
          message: error.message,
        },
      });

      return;
    }

    if (error instanceof AudioMediaNotFoundError) {
      res.status(404).json({
        error: {
          code: "NOT_FOUND",
          message: "Audio media not found",
        },
      });

      return;
    }

    console.error(
      "Update audio play failed:",
      error
    );

    res.status(500).json({
      error: {
        code: "INTERNAL_SERVER_ERROR",
        message:
          "Unable to update audio play",
      },
    });
  }
}