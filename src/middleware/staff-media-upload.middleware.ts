import type {
  NextFunction,
  Request,
  Response,
} from "express";

import multer from "multer";

function getPositiveIntegerConfig(
  rawValue: string | undefined,
  fallback: number
): number {
  const parsed =
    Number(rawValue);

  if (
    Number.isInteger(parsed) &&
    parsed > 0
  ) {
    return parsed;
  }

  return fallback;
}

const MAX_UPLOAD_BYTES =
  getPositiveIntegerConfig(
    process.env.MEDIA_UPLOAD_MAX_BYTES,
    25 * 1024 * 1024
  );

const upload =
  multer({
    storage:
      multer.memoryStorage(),

    limits: {
      files: 1,
      fileSize:
        MAX_UPLOAD_BYTES,
    },
  }).single("file");

export function parseStaffMediaUpload(
  req: Request,
  res: Response,
  next: NextFunction
): void {
  if (
    !req.is(
      "multipart/form-data"
    )
  ) {
    next();
    return;
  }

  upload(
    req,
    res,
    (error) => {
      if (!error) {
        next();
        return;
      }

      if (
        error instanceof
          multer.MulterError
      ) {
        if (
          error.code ===
          "LIMIT_FILE_SIZE"
        ) {
          res.status(413).json({
            error: {
              code:
                "MEDIA_FILE_TOO_LARGE",
              message:
                "Uploaded media file is too large",
            },
          });

          return;
        }

        res.status(400).json({
          error: {
            code:
              "MEDIA_UPLOAD_ERROR",
            message:
              "Invalid media upload",
            details: [
              error.message,
            ],
          },
        });

        return;
      }

      next(error);
    }
  );
}