import {
  afterEach,
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from "vitest";

import {
  join,
  resolve,
} from "node:path";

const {
  mkdirMock,
  rmMock,
  writeFileMock,
  randomUUIDMock,
} =
  vi.hoisted(() => ({
    mkdirMock:
      vi.fn(),

    rmMock:
      vi.fn(),

    writeFileMock:
      vi.fn(),

    randomUUIDMock:
      vi.fn(
        () =>
          "00000000-0000-4000-8000-000000000000"
      ),
  }));

vi.mock(
  "node:fs/promises",
  () => ({
    mkdir:
      mkdirMock,

    rm:
      rmMock,

    writeFile:
      writeFileMock,
  })
);

vi.mock(
  "node:crypto",
  () => ({
    randomUUID:
      randomUUIDMock,
  })
);

import {
  localMediaStorage,
} from "../../src/adapters/media/local-media-storage.adapter";

describe(
  "local-media-storage.adapter",
  () => {
    const originalBaseUrl =
      process.env
        .MEDIA_PUBLIC_BASE_URL;

    const originalPort =
      process.env.PORT;

    beforeEach(() => {
      vi.clearAllMocks();

      delete process.env
        .MEDIA_PUBLIC_BASE_URL;

      process.env.PORT =
        "3000";

      mkdirMock.mockResolvedValue(
        undefined
      );

      writeFileMock.mockResolvedValue(
        undefined
      );

      rmMock.mockResolvedValue(
        undefined
      );
    });

    afterEach(() => {
      if (
        originalBaseUrl ===
        undefined
      ) {
        delete process.env
          .MEDIA_PUBLIC_BASE_URL;
      } else {
        process.env
          .MEDIA_PUBLIC_BASE_URL =
          originalBaseUrl;
      }

      if (
        originalPort ===
        undefined
      ) {
        delete process.env.PORT;
      } else {
        process.env.PORT =
          originalPort;
      }
    });

    it(
      "stores media under uploads/media/<attractionId> with a generated filename",
      async () => {
        const buffer =
          Buffer.from([
            0x89,
            0x50,
            0x4e,
            0x47,
          ]);

        const result =
          await localMediaStorage
            .save({
              attractionId:
                3,

              mediaType:
                "image",

              buffer,

              validatedFile: {
                mediaType:
                  "image",

                mimeType:
                  "image/png",

                extension:
                  "png",

                sizeBytes:
                  buffer.length,
              },
            });

        const expectedDirectory =
          resolve(
            process.cwd(),
            "uploads",
            "media",
            "3"
          );

        const expectedPath =
          join(
            expectedDirectory,
            "00000000-0000-4000-8000-000000000000.png"
          );

        expect(
          mkdirMock
        ).toHaveBeenCalledWith(
          expectedDirectory,
          {
            recursive:
              true,
          }
        );

        expect(
          writeFileMock
        ).toHaveBeenCalledWith(
          expectedPath,
          buffer,
          {
            flag:
              "wx",
          }
        );

        expect(
          result.absolutePath
        ).toBe(
          expectedPath
        );

        expect(
          result.publicUrl
        ).toBe(
          "http://localhost:3000/uploads/media/3/00000000-0000-4000-8000-000000000000.png"
        );
      }
    );

    it(
      "uses MEDIA_PUBLIC_BASE_URL and removes trailing slashes",
      async () => {
        process.env
          .MEDIA_PUBLIC_BASE_URL =
          "https://cdn.example.com///";

        const buffer =
          Buffer.from(
            "ID3test",
            "ascii"
          );

        const result =
          await localMediaStorage
            .save({
              attractionId:
                7,

              mediaType:
                "audio",

              buffer,

              validatedFile: {
                mediaType:
                  "audio",

                mimeType:
                  "audio/mpeg",

                extension:
                  "mp3",

                sizeBytes:
                  buffer.length,
              },
            });

        expect(
          result.publicUrl
        ).toBe(
          "https://cdn.example.com/uploads/media/7/00000000-0000-4000-8000-000000000000.mp3"
        );
      }
    );

    it(
      "uses PORT in the localhost fallback URL",
      async () => {
        process.env.PORT =
          "4567";

        const buffer =
          Buffer.from([
            0xff,
            0xd8,
            0xff,
          ]);

        const result =
          await localMediaStorage
            .save({
              attractionId:
                9,

              mediaType:
                "image",

              buffer,

              validatedFile: {
                mediaType:
                  "image",

                mimeType:
                  "image/jpeg",

                extension:
                  "jpg",

                sizeBytes:
                  buffer.length,
              },
            });

        expect(
          result.publicUrl
        ).toContain(
          "http://localhost:4567/uploads/media/9/"
        );
      }
    );

    it(
      "removes a stored file with force enabled",
      async () => {
        const filePath =
          resolve(
            process.cwd(),
            "uploads",
            "media",
            "3",
            "test.png"
          );

        await localMediaStorage
          .remove(
            filePath
          );

        expect(
          rmMock
        ).toHaveBeenCalledWith(
          filePath,
          {
            force:
              true,
          }
        );
      }
    );
  }
);