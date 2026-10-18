import express from "express";
import request from "supertest";

import {
  afterEach,
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from "vitest";

describe(
  "staff-media-upload.middleware",
  () => {
    const originalMaxUploadBytes =
      process.env
        .MEDIA_UPLOAD_MAX_BYTES;

    beforeEach(() => {
      /*
       * Keep upload-limit tests tiny.
       * The middleware reads this at module load.
       */
      process.env
        .MEDIA_UPLOAD_MAX_BYTES =
        "10";

      vi.resetModules();
    });

    afterEach(() => {
      if (
        originalMaxUploadBytes ===
        undefined
      ) {
        delete process.env
          .MEDIA_UPLOAD_MAX_BYTES;
      } else {
        process.env
          .MEDIA_UPLOAD_MAX_BYTES =
          originalMaxUploadBytes;
      }
    });

    async function createTestApp() {
      const {
        parseStaffMediaUpload,
      } =
        await import(
          "../../src/middleware/staff-media-upload.middleware"
        );

      const app =
        express();

      app.use(
        express.json()
      );

      app.post(
        "/upload",
        parseStaffMediaUpload,
        (
          req,
          res
        ) => {
          res.status(200).json({
            data: {
              has_file:
                Boolean(
                  req.file
                ),

              size:
                req.file
                  ?.size ??
                null,
            },
          });
        }
      );

      return app;
    }

    it(
      "passes through non-multipart requests",
      async () => {
        const app =
          await createTestApp();

        const response =
          await request(app)
            .post(
              "/upload"
            )
            .send({
              file_url:
                "https://example.com/media.png",
            });

        expect(
          response.status
        ).toBe(200);

        expect(
          response.body
        ).toEqual({
          data: {
            has_file:
              false,

            size:
              null,
          },
        });
      }
    );

    it(
      "accepts one multipart file within the upload limit",
      async () => {
        const app =
          await createTestApp();

        const buffer =
          Buffer.from(
            "123456789"
          );

        const response =
          await request(app)
            .post(
              "/upload"
            )
            .attach(
              "file",
              buffer,
              {
                filename:
                  "test.bin",

                contentType:
                  "application/octet-stream",
              }
            );

        expect(
          response.status
        ).toBe(200);

        expect(
          response.body.data
            .has_file
        ).toBe(true);

        expect(
          response.body.data
            .size
        ).toBe(
          buffer.length
        );
      }
    );

    it(
      "returns 413 when the uploaded file exceeds the limit",
      async () => {
        const app =
          await createTestApp();

        const response =
          await request(app)
            .post(
              "/upload"
            )
            .attach(
              "file",
              Buffer.alloc(
                11,
                1
              ),
              {
                filename:
                  "too-large.bin",

                contentType:
                  "application/octet-stream",
              }
            );

        expect(
          response.status
        ).toBe(413);

        expect(
          response.body
        ).toEqual({
          error: {
            code:
              "MEDIA_FILE_TOO_LARGE",

            message:
              "Uploaded media file is too large",
          },
        });
      }
    );

    it(
      "returns 400 when more than one file is uploaded",
      async () => {
        const app =
          await createTestApp();

        const response =
          await request(app)
            .post(
              "/upload"
            )
            .attach(
              "file",
              Buffer.from(
                "one"
              ),
              "one.bin"
            )
            .attach(
              "file",
              Buffer.from(
                "two"
              ),
              "two.bin"
            );

        expect(
          response.status
        ).toBe(400);

        expect(
          response.body.error
            .code
        ).toBe(
          "MEDIA_UPLOAD_ERROR"
        );
      }
    );
  }
);