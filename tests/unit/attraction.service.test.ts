import {
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from "vitest";

vi.mock(
  "../../src/repositories/attraction.repository",
  () => ({
    countPublishedAttractions:
      vi.fn(),

    findPublishedAttractionById:
      vi.fn(),

    findPublishedAttractionMedia:
      vi.fn(),

    findPublishedAttractions:
      vi.fn(),
  })
);

import {
  countPublishedAttractions,
  findPublishedAttractionById,
  findPublishedAttractionMedia,
  findPublishedAttractions,
} from "../../src/repositories/attraction.repository";

import {
  AttractionNotFoundError,
  getPublishedAttractionById,
  getPublishedAttractions,
} from "../../src/services/attraction.service";

function createListRow(
  overrides: Record<string, unknown> = {}
) {
  return {
    attraction_id:
      "3",

    slug:
      "thien-mu",

    area_code:
      "HUE",

    latitude:
      16.4536,

    longitude:
      107.5447,

    trigger_radius_m:
      100,

    requested_name:
      "Thien Mu Pagoda",

    vi_name:
      "Chùa Thiên Mụ",

    ...overrides,
  } as any;
}

function createDetailRow(
  overrides: Record<string, unknown> = {}
) {
  return {
    attraction_id:
      "3",

    slug:
      "thien-mu",

    area_code:
      "HUE",

    latitude:
      16.4536,

    longitude:
      107.5447,

    trigger_radius_m:
      100,

    requested_name:
      "Thien Mu Pagoda",

    requested_description:
      "Historic pagoda in Hue.",

    requested_source_references:
      JSON.stringify([
        {
          title:
            "English source",
        },
      ]),

    vi_name:
      "Chùa Thiên Mụ",

    vi_description:
      "Di tích lịch sử tại Huế.",

    vi_source_references:
      JSON.stringify([
        {
          title:
            "Nguồn tiếng Việt",
        },
      ]),

    ...overrides,
  } as any;
}

function createMediaRow(
  overrides: Record<string, unknown> = {}
) {
  return {
    media_id:
      "10",

    attraction_id:
      "3",

    language_code:
      null,

    media_type:
      "image",

    file_url:
      "https://cdn.example.com/image.jpg",

    caption:
      "Image",

    credit:
      "TEST_SOURCE",

    rights_reference:
      "TEST_RIGHTS",

    duration_seconds:
      null,

    display_order:
      1,

    ...overrides,
  } as any;
}

describe(
  "attraction.service",
  () => {
    beforeEach(() => {
      vi.resetAllMocks();
    });

    it.each([
      {
        name: "converts legacy local media to a relative URL",
        storedUrl:
          "https://dicke-arrives-genealogy-millions.trycloudflare.com/uploads/media/3/test.jpg",
        expectedUrl:
          "/uploads/media/3/test.jpg",
      },
      {
        name: "preserves external media URLs",
        storedUrl:
          "https://cdn.example.com/uploads/media/3/test.jpg",
        expectedUrl:
          "https://cdn.example.com/uploads/media/3/test.jpg",
      },
      {
        name: "preserves relative media paths",
        storedUrl:
          "/uploads/media/3/test.jpg",
        expectedUrl:
          "/uploads/media/3/test.jpg",
      },
      {
        name: "preserves unrelated paths on the legacy origin",
        storedUrl:
          "https://dicke-arrives-genealogy-millions.trycloudflare.com/other/test.jpg",
        expectedUrl:
          "https://dicke-arrives-genealogy-millions.trycloudflare.com/other/test.jpg",
      },
    ])(
      "$name",
      async ({ storedUrl, expectedUrl }) => {
        vi.mocked(
          findPublishedAttractionById
        ).mockResolvedValue(
          createDetailRow()
        );

        vi.mocked(
          findPublishedAttractionMedia
        ).mockResolvedValue([
          createMediaRow({
            file_url: storedUrl,
          }),
        ]);

        const result =
          await getPublishedAttractionById(
            3,
            "en"
          );

        expect(result.media).toHaveLength(1);
        expect(result.media[0].url).toBe(expectedUrl);
      }
    );

    it(
      "returns paginated attractions in the requested language",
      async () => {
        vi.mocked(
          findPublishedAttractions
        ).mockResolvedValue([
          createListRow(),
        ]);

        vi.mocked(
          countPublishedAttractions
        ).mockResolvedValue(
          21
        );

        const result =
          await getPublishedAttractions(
            "en",
            2,
            10
          );

        expect(
          findPublishedAttractions
        ).toHaveBeenCalledWith(
          "en",
          10,
          10
        );

        expect(
          result.data[0]
        ).toMatchObject({
          id:
            3,

          name:
            "Thien Mu Pagoda",

          requested_language:
            "en",

          content_language:
            "en",

          fallback_used:
            false,
        });

        expect(
          result.pagination
        ).toEqual({
          page:
            2,

          page_size:
            10,

          total:
            21,

          total_pages:
            3,
        });
      }
    );

    it(
      "falls back to Vietnamese on the attraction list",
      async () => {
        vi.mocked(
          findPublishedAttractions
        ).mockResolvedValue([
          createListRow({
            requested_name:
              null,
          }),
        ]);

        vi.mocked(
          countPublishedAttractions
        ).mockResolvedValue(
          1
        );

        const result =
          await getPublishedAttractions(
            "en",
            1,
            10
          );

        expect(
          result.data[0]
        ).toMatchObject({
          name:
            "Chùa Thiên Mụ",

          requested_language:
            "en",

          content_language:
            "vi",

          fallback_used:
            true,
        });
      }
    );

    it(
      "returns requested-language detail and prefers requested audio",
      async () => {
        vi.mocked(
          findPublishedAttractionById
        ).mockResolvedValue(
          createDetailRow()
        );

        vi.mocked(
          findPublishedAttractionMedia
        ).mockResolvedValue([
          createMediaRow({
            media_id:
              "12",

            media_type:
              "audio",

            language_code:
              "vi",

            file_url:
              "https://cdn.example.com/vi.mp3",

            duration_seconds:
              90,

            display_order:
              3,
          }),

          createMediaRow({
            media_id:
              "11",

            media_type:
              "audio",

            language_code:
              "en",

            file_url:
              "https://cdn.example.com/en.mp3",

            duration_seconds:
              100,

            display_order:
              2,
          }),

          createMediaRow({
            media_id:
              "10",

            media_type:
              "image",

            language_code:
              null,

            display_order:
              1,
          }),
        ]);

        const result =
          await getPublishedAttractionById(
            3,
            "en"
          );

        expect(
          result
        ).toMatchObject({
          id:
            3,

          name:
            "Thien Mu Pagoda",

          description:
            "Historic pagoda in Hue.",

          requested_language:
            "en",

          content_language:
            "en",

          fallback_used:
            false,
        });

        expect(
          result.sources
        ).toEqual([
          {
            title:
              "English source",
          },
        ]);

        expect(
          result.media.map(
            (item) => ({
              id:
                item.id,

              type:
                item.type,

              language:
                item.language,

              fallback_used:
                item.fallback_used,
            })
          )
        ).toEqual([
          {
            id:
              10,

            type:
              "image",

            language:
              null,

            fallback_used:
              false,
          },

          {
            id:
              11,

            type:
              "audio",

            language:
              "en",

            fallback_used:
              false,
          },
        ]);
      }
    );

    it(
      "falls back to Vietnamese detail and Vietnamese audio",
      async () => {
        vi.mocked(
          findPublishedAttractionById
        ).mockResolvedValue(
          createDetailRow({
            requested_name:
              null,

            requested_description:
              null,

            requested_source_references:
              null,
          })
        );

        vi.mocked(
          findPublishedAttractionMedia
        ).mockResolvedValue([
          createMediaRow({
            media_id:
              "10",

            media_type:
              "image",

            language_code:
              null,

            display_order:
              2,
          }),

          createMediaRow({
            media_id:
              "12",

            media_type:
              "audio",

            language_code:
              "vi",

            file_url:
              "https://cdn.example.com/vi.mp3",

            duration_seconds:
              90,

            display_order:
              1,
          }),
        ]);

        const result =
          await getPublishedAttractionById(
            3,
            "en"
          );

        expect(
          result
        ).toMatchObject({
          name:
            "Chùa Thiên Mụ",

          description:
            "Di tích lịch sử tại Huế.",

          content_language:
            "vi",

          fallback_used:
            true,
        });

        expect(
          result.sources
        ).toEqual([
          {
            title:
              "Nguồn tiếng Việt",
          },
        ]);

        expect(
          result.media[0]
        ).toMatchObject({
          id:
            12,

          type:
            "audio",

          language:
            "vi",

          fallback_used:
            true,
        });

        expect(
          result.media[1].id
        ).toBe(10);
      }
    );

    it(
      "returns an empty sources array when source references are invalid JSON",
      async () => {
        vi.mocked(
          findPublishedAttractionById
        ).mockResolvedValue(
          createDetailRow({
            requested_source_references:
              "{invalid-json",
          })
        );

        vi.mocked(
          findPublishedAttractionMedia
        ).mockResolvedValue(
          []
        );

        const result =
          await getPublishedAttractionById(
            3,
            "en"
          );

        expect(
          result.sources
        ).toEqual([]);
      }
    );

    it(
      "throws not found when the public attraction does not exist",
      async () => {
        vi.mocked(
          findPublishedAttractionById
        ).mockResolvedValue(
          null
        );

        await expect(
          getPublishedAttractionById(
            999,
            "vi"
          )
        ).rejects.toBeInstanceOf(
          AttractionNotFoundError
        );

        expect(
          findPublishedAttractionMedia
        ).not.toHaveBeenCalled();
      }
    );

    it(
      "throws not found when no complete localization can be resolved",
      async () => {
        vi.mocked(
          findPublishedAttractionById
        ).mockResolvedValue(
          createDetailRow({
            requested_name:
              null,

            requested_description:
              null,

            vi_name:
              null,

            vi_description:
              null,
          })
        );

        await expect(
          getPublishedAttractionById(
            3,
            "en"
          )
        ).rejects.toBeInstanceOf(
          AttractionNotFoundError
        );

        expect(
          findPublishedAttractionMedia
        ).not.toHaveBeenCalled();
      }
    );
  }
);