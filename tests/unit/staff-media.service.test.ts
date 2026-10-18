import {
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from "vitest";

vi.mock(
  "../../src/repositories/staff-media.repository",
  () => ({
    createDraftMedia:
      vi.fn(),
  })
);

vi.mock(
  "../../src/repositories/staff-attraction.repository",
  () => ({
    findStaffAttractionById:
      vi.fn(),
  })
);

vi.mock(
  "../../src/adapters/media/local-media-storage.adapter",
  () => ({
    localMediaStorage: {
      save:
        vi.fn(),

      remove:
        vi.fn(),
    },
  })
);

import {
  createDraftMedia,
} from "../../src/repositories/staff-media.repository";

import {
  findStaffAttractionById,
} from "../../src/repositories/staff-attraction.repository";

import {
  localMediaStorage,
} from "../../src/adapters/media/local-media-storage.adapter";

import {
  createStaffMedia,
  StaffMediaAttractionNotFoundError,
  StaffMediaStorageInputError,
  type CreateStaffMediaInput,
} from "../../src/services/staff-media.service";

function createInput(
  overrides:
    Partial<CreateStaffMediaInput> = {}
): CreateStaffMediaInput {
  return {
    languageCode:
      null,

    mediaType:
      "image",

    fileUrl:
      "https://cdn.example.com/image.png",

    caption:
      "Test image",

    credit:
      "TEST_SOURCE",

    rightsReference:
      "TEST_RIGHTS",

    durationSeconds:
      null,

    displayOrder:
      1,

    ...overrides,
  };
}

function mockExistingAttraction(): void {
  vi.mocked(
    findStaffAttractionById
  ).mockResolvedValue(
    {
      attraction_id:
        "3",
    } as any
  );
}

function mockCreatedMedia(
  fileUrl:
    string =
      "https://cdn.example.com/image.png"
): void {
  vi.mocked(
    createDraftMedia
  ).mockResolvedValue(
    {
      media_id:
        "8",

      attraction_id:
        "3",

      language_code:
        null,

      media_type:
        "image",

      file_url:
        fileUrl,

      caption:
        "Test image",

      credit:
        "TEST_SOURCE",

      rights_reference:
        "TEST_RIGHTS",

      duration_seconds:
        null,

      display_order:
        1,

      status:
        "draft",

      approved_by:
        null,

      published_at:
        null,
    } as any
  );
}

describe(
  "staff-media.service",
  () => {
    beforeEach(() => {
      vi.resetAllMocks();
    });

    it(
      "throws when the attraction does not exist",
      async () => {
        vi.mocked(
          findStaffAttractionById
        ).mockResolvedValue(
          null
        );

        await expect(
          createStaffMedia(
            999,
            createInput()
          )
        ).rejects.toBeInstanceOf(
          StaffMediaAttractionNotFoundError
        );

        expect(
          createDraftMedia
        ).not.toHaveBeenCalled();

        expect(
          localMediaStorage.save
        ).not.toHaveBeenCalled();
      }
    );

    it(
      "creates draft media from an HTTPS file_url",
      async () => {
        mockExistingAttraction();
        mockCreatedMedia();

        const result =
          await createStaffMedia(
            3,
            createInput()
          );

        expect(
          createDraftMedia
        ).toHaveBeenCalledWith(
          3,
          null,
          "image",
          "https://cdn.example.com/image.png",
          "Test image",
          "TEST_SOURCE",
          "TEST_RIGHTS",
          null,
          1
        );

        expect(
          result
        ).toEqual({
          id:
            8,

          attraction_id:
            3,

          language_code:
            null,

          media_type:
            "image",

          file_url:
            "https://cdn.example.com/image.png",

          caption:
            "Test image",

          credit:
            "TEST_SOURCE",

          rights_reference:
            "TEST_RIGHTS",

          duration_seconds:
            null,

          display_order:
            1,

          status:
            "draft",

          approved_by:
            null,

          published_at:
            null,
        });

        expect(
          localMediaStorage.save
        ).not.toHaveBeenCalled();
      }
    );

    it(
      "uses the generated local URL when a file is uploaded",
      async () => {
        mockExistingAttraction();

        const generatedUrl =
          "http://localhost:3000/uploads/media/3/generated.png";

        vi.mocked(
          localMediaStorage.save
        ).mockResolvedValue({
          publicUrl:
            generatedUrl,

          absolutePath:
            "C:\\temp\\generated.png",
        });

        mockCreatedMedia(
          generatedUrl
        );

        const buffer =
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

        const file =
          {
            buffer,
          } as Express.Multer.File;

        const result =
          await createStaffMedia(
            3,
            createInput({
              fileUrl:
                null,
            }),
            {
              file,

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
            }
          );

        expect(
          localMediaStorage.save
        ).toHaveBeenCalledWith({
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

        expect(
          createDraftMedia
        ).toHaveBeenCalledWith(
          3,
          null,
          "image",
          generatedUrl,
          "Test image",
          "TEST_SOURCE",
          "TEST_RIGHTS",
          null,
          1
        );

        expect(
          result.file_url
        ).toBe(
          generatedUrl
        );
      }
    );

    it(
      "removes the stored file when database insertion fails",
      async () => {
        mockExistingAttraction();

        vi.mocked(
          localMediaStorage.save
        ).mockResolvedValue({
          publicUrl:
            "http://localhost:3000/uploads/media/3/generated.png",

          absolutePath:
            "C:\\temp\\generated.png",
        });

        vi.mocked(
          createDraftMedia
        ).mockRejectedValue(
          new Error(
            "Database insert failed"
          )
        );

        const buffer =
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

        await expect(
          createStaffMedia(
            3,
            createInput({
              fileUrl:
                null,
            }),
            {
              file:
                {
                  buffer,
                } as Express.Multer.File,

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
            }
          )
        ).rejects.toThrow(
          "Database insert failed"
        );

        expect(
          localMediaStorage.remove
        ).toHaveBeenCalledWith(
          "C:\\temp\\generated.png"
        );
      }
    );

    it(
      "requires either an uploaded file or file_url",
      async () => {
        mockExistingAttraction();

        await expect(
          createStaffMedia(
            3,
            createInput({
              fileUrl:
                null,
            }),
            null
          )
        ).rejects.toBeInstanceOf(
          StaffMediaStorageInputError
        );

        expect(
          createDraftMedia
        ).not.toHaveBeenCalled();
      }
    );
  }
);