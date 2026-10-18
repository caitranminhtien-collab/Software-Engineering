import {
  afterEach,
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from "vitest";

import {
  Readable,
} from "node:stream";

function createMulterFile(
  buffer: Buffer,
  mimetype: string,
  originalname = "test.bin"
): Express.Multer.File {
  return {
    fieldname:
      "file",

    originalname,

    encoding:
      "7bit",

    mimetype,

    size:
      buffer.length,

    destination:
      "",

    filename:
      originalname,

    path:
      "",

    buffer,

    stream:
      Readable.from(
        buffer
      ),
  };
}

function createWebpBuffer(): Buffer {
  const buffer =
    Buffer.alloc(12);

  buffer.write(
    "RIFF",
    0,
    "ascii"
  );

  buffer.write(
    "WEBP",
    8,
    "ascii"
  );

  return buffer;
}

function createWavBuffer(): Buffer {
  const buffer =
    Buffer.alloc(12);

  buffer.write(
    "RIFF",
    0,
    "ascii"
  );

  buffer.write(
    "WAVE",
    8,
    "ascii"
  );

  return buffer;
}

describe(
  "media-file.validator",
  () => {
    const originalMaxImageBytes =
      process.env
        .MEDIA_MAX_IMAGE_BYTES;

    const originalMaxAudioBytes =
      process.env
        .MEDIA_MAX_AUDIO_BYTES;

    beforeEach(() => {
      /*
       * Keep the tests small and deterministic.
       * The validator reads these values at module load.
       */
      process.env
        .MEDIA_MAX_IMAGE_BYTES =
        "1024";

      process.env
        .MEDIA_MAX_AUDIO_BYTES =
        "1024";

      vi.resetModules();
    });

    afterEach(() => {
      if (
        originalMaxImageBytes ===
        undefined
      ) {
        delete process.env
          .MEDIA_MAX_IMAGE_BYTES;
      } else {
        process.env
          .MEDIA_MAX_IMAGE_BYTES =
          originalMaxImageBytes;
      }

      if (
        originalMaxAudioBytes ===
        undefined
      ) {
        delete process.env
          .MEDIA_MAX_AUDIO_BYTES;
      } else {
        process.env
          .MEDIA_MAX_AUDIO_BYTES =
          originalMaxAudioBytes;
      }
    });

    it.each([
      {
        name:
          "JPEG",

        buffer:
          Buffer.from([
            0xff,
            0xd8,
            0xff,
            0x00,
          ]),

        mimetype:
          "image/jpeg",

        extension:
          "jpg",
      },

      {
        name:
          "PNG",

        buffer:
          Buffer.from([
            0x89,
            0x50,
            0x4e,
            0x47,
            0x0d,
            0x0a,
            0x1a,
            0x0a,
          ]),

        mimetype:
          "image/png",

        extension:
          "png",
      },

      {
        name:
          "GIF",

        buffer:
          Buffer.from(
            "GIF89a",
            "ascii"
          ),

        mimetype:
          "image/gif",

        extension:
          "gif",
      },

      {
        name:
          "WebP",

        buffer:
          createWebpBuffer(),

        mimetype:
          "image/webp",

        extension:
          "webp",
      },
    ])(
      "accepts a valid $name image signature",
      async ({
        buffer,
        mimetype,
        extension,
      }) => {
        const {
          validateUploadedMediaFile,
        } =
          await import(
            "../../src/adapters/media/media-file.validator"
          );

        const result =
          validateUploadedMediaFile(
            createMulterFile(
              buffer,
              mimetype
            ),
            "image"
          );

        expect(
          result.mediaType
        ).toBe("image");

        expect(
          result.mimeType
        ).toBe(mimetype);

        expect(
          result.extension
        ).toBe(extension);

        expect(
          result.sizeBytes
        ).toBe(
          buffer.length
        );
      }
    );

    it.each([
      {
        name:
          "MP3",

        buffer:
          Buffer.from(
            "ID3test",
            "ascii"
          ),

        mimetype:
          "audio/mpeg",

        extension:
          "mp3",
      },

      {
        name:
          "WAV",

        buffer:
          createWavBuffer(),

        mimetype:
          "audio/wav",

        extension:
          "wav",
      },
    ])(
      "accepts a valid $name audio signature",
      async ({
        buffer,
        mimetype,
        extension,
      }) => {
        const {
          validateUploadedMediaFile,
        } =
          await import(
            "../../src/adapters/media/media-file.validator"
          );

        const result =
          validateUploadedMediaFile(
            createMulterFile(
              buffer,
              mimetype
            ),
            "audio"
          );

        expect(
          result.mediaType
        ).toBe("audio");

        expect(
          result.extension
        ).toBe(extension);
      }
    );

    it(
      "rejects an unrecognized file signature",
      async () => {
        const {
          validateUploadedMediaFile,
          MediaFileValidationError,
        } =
          await import(
            "../../src/adapters/media/media-file.validator"
          );

        const file =
          createMulterFile(
            Buffer.from(
              "not-a-real-image",
              "utf8"
            ),
            "image/jpeg",
            "fake.jpg"
          );

        expect(
          () =>
            validateUploadedMediaFile(
              file,
              "image"
            )
        ).toThrow(
          MediaFileValidationError
        );
      }
    );

    it(
      "rejects an image when audio is expected",
      async () => {
        const {
          validateUploadedMediaFile,
        } =
          await import(
            "../../src/adapters/media/media-file.validator"
          );

        const png =
          Buffer.from([
            0x89,
            0x50,
            0x4e,
            0x47,
            0x0d,
            0x0a,
            0x1a,
            0x0a,
          ]);

        expect(
          () =>
            validateUploadedMediaFile(
              createMulterFile(
                png,
                "image/png"
              ),
              "audio"
            )
        ).toThrow(
          "uploaded file signature is image, not audio"
        );
      }
    );

    it(
      "rejects a MIME type that conflicts with the file signature",
      async () => {
        const {
          validateUploadedMediaFile,
        } =
          await import(
            "../../src/adapters/media/media-file.validator"
          );

        const png =
          Buffer.from([
            0x89,
            0x50,
            0x4e,
            0x47,
            0x0d,
            0x0a,
            0x1a,
            0x0a,
          ]);

        expect(
          () =>
            validateUploadedMediaFile(
              createMulterFile(
                png,
                "image/jpeg"
              ),
              "image"
            )
        ).toThrow(
          "uploaded file MIME type does not match its file signature"
        );
      }
    );

    it(
      "rejects an image larger than the configured limit",
      async () => {
        const {
          validateUploadedMediaFile,
        } =
          await import(
            "../../src/adapters/media/media-file.validator"
          );

        const buffer =
          Buffer.alloc(
            1025
          );

        Buffer.from([
          0x89,
          0x50,
          0x4e,
          0x47,
          0x0d,
          0x0a,
          0x1a,
          0x0a,
        ]).copy(
          buffer,
          0
        );

        expect(
          () =>
            validateUploadedMediaFile(
              createMulterFile(
                buffer,
                "image/png"
              ),
              "image"
            )
        ).toThrow(
          "image file must not exceed 0 MB"
        );
      }
    );
  }
);