import type {
  NextFunction,
  Request,
  Response,
} from "express";

export interface CreateAudioPlayBody {
  mediaId: number;
}
export interface UpdateAudioPlayParams {
  playId: number;
}

export interface UpdateAudioPlayBody {
  playedSeconds: number;
  completed: boolean;
}
export function validateCreateAudioPlay(
  req: Request,
  res: Response,
  next: NextFunction
): void {
  const errors: string[] = [];

  const rawMediaId = req.body.media_id;
  const mediaId = Number(rawMediaId);

  if (
    rawMediaId === undefined ||
    !Number.isInteger(mediaId) ||
    mediaId <= 0
  ) {
    errors.push(
      "media_id must be a positive integer"
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

  res.locals.createAudioPlayBody = {
    mediaId,
  } satisfies CreateAudioPlayBody;

  next();
}
export function validateAudioPlayId(
  req: Request,
  res: Response,
  next: NextFunction
): void {
  const playId = Number(req.params.id);

  if (
    !Number.isInteger(playId) ||
    playId <= 0
  ) {
    res.status(400).json({
      error: {
        code: "VALIDATION_ERROR",
        message: "Invalid request parameters",
        details: [
          "audio play id must be a positive integer",
        ],
      },
    });

    return;
  }

  res.locals.updateAudioPlayParams = {
    playId,
  } satisfies UpdateAudioPlayParams;

  next();
}
export function validateUpdateAudioPlay(
  req: Request,
  res: Response,
  next: NextFunction
): void {
  const errors: string[] = [];

  const rawPlayedSeconds =
    req.body.played_seconds;

  const playedSeconds =
    Number(rawPlayedSeconds);

  const completed =
    req.body.completed;

  if (
    rawPlayedSeconds === undefined ||
    !Number.isInteger(playedSeconds) ||
    playedSeconds < 0
  ) {
    errors.push(
      "played_seconds must be a non-negative integer"
    );
  }

  if (typeof completed !== "boolean") {
    errors.push(
      "completed must be a boolean"
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

  res.locals.updateAudioPlayBody = {
    playedSeconds,
    completed,
  } satisfies UpdateAudioPlayBody;

  next();
}