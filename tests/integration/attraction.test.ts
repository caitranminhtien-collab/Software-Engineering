import request from "supertest";

import {
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from "vitest";

vi.mock(
  "../../src/services/attraction.service",
  async (importOriginal) => {
    const actual =
      await importOriginal<
        typeof import(
          "../../src/services/attraction.service"
        )
      >();

    return {
      ...actual,

      getPublishedAttractions:
        vi.fn(),

      getPublishedAttractionById:
        vi.fn(),
    };
  }
);

import app
  from "../../src/app";

import {
  AttractionNotFoundError,
  getPublishedAttractionById,
  getPublishedAttractions,
} from "../../src/services/attraction.service";

describe(
  "attractions API",
  () => {
    beforeEach(() => {
      vi.mocked(
        getPublishedAttractions
      ).mockReset();

      vi.mocked(
        getPublishedAttractionById
      ).mockReset();
    });

    it(
      "GET /api/v1/attractions uses default query values",
      async () => {
        vi.mocked(
          getPublishedAttractions
        ).mockResolvedValue({
          data:
            [],

          pagination: {
            page:
              1,

            page_size:
              10,

            total:
              0,

            total_pages:
              0,
          },
        });

        const response =
          await request(app)
            .get(
              "/api/v1/attractions"
            );

        expect(
          response.status
        ).toBe(200);

        expect(
          getPublishedAttractions
        ).toHaveBeenCalledWith(
          "vi",
          1,
          10
        );

        expect(
          response.body.pagination
        ).toEqual({
          page:
            1,

          page_size:
            10,

          total:
            0,

          total_pages:
            0,
        });
      }
    );

    it(
      "GET /api/v1/attractions accepts language and pagination",
      async () => {
        vi.mocked(
          getPublishedAttractions
        ).mockResolvedValue({
          data: [
            {
              id:
                3,

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

              name:
                "Thien Mu Pagoda",

              requested_language:
                "en",

              content_language:
                "en",

              fallback_used:
                false,
            },
          ],

          pagination: {
            page:
              2,

            page_size:
              5,

            total:
              6,

            total_pages:
              2,
          },
        });

        const response =
          await request(app)
            .get(
              "/api/v1/attractions?language=EN&page=2&page_size=5"
            );

        expect(
          response.status
        ).toBe(200);

        expect(
          getPublishedAttractions
        ).toHaveBeenCalledWith(
          "en",
          2,
          5
        );

        expect(
          response.body.data
        ).toHaveLength(1);
      }
    );

    it(
      "GET /api/v1/attractions rejects invalid query parameters",
      async () => {
        const response =
          await request(app)
            .get(
              "/api/v1/attractions?language=english&page=0&page_size=101"
            );

        expect(
          response.status
        ).toBe(400);

        expect(
          response.body.error
            .code
        ).toBe(
          "VALIDATION_ERROR"
        );

        expect(
          response.body.error
            .details
        ).toEqual(
          expect.arrayContaining([
            "language format is invalid",
            "page must be a positive integer",
            "page_size must be an integer from 1 to 100",
          ])
        );

        expect(
          getPublishedAttractions
        ).not.toHaveBeenCalled();
      }
    );

    it(
      "GET /api/v1/attractions/:id returns public attraction detail",
      async () => {
        vi.mocked(
          getPublishedAttractionById
        ).mockResolvedValue({
          id:
            3,

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

          name:
            "Thien Mu Pagoda",

          description:
            "Historic pagoda.",

          requested_language:
            "en",

          content_language:
            "en",

          fallback_used:
            false,

          media:
            [],

          sources:
            [],
        });

        const response =
          await request(app)
            .get(
              "/api/v1/attractions/3?language=EN"
            );

        expect(
          response.status
        ).toBe(200);

        expect(
          getPublishedAttractionById
        ).toHaveBeenCalledWith(
          3,
          "en"
        );

        expect(
          response.body.data
        ).toMatchObject({
          id:
            3,

          requested_language:
            "en",

          content_language:
            "en",
        });
      }
    );

    it(
      "GET /api/v1/attractions/:id rejects invalid id or language",
      async () => {
        const invalidId =
          await request(app)
            .get(
              "/api/v1/attractions/abc"
            );

        expect(
          invalidId.status
        ).toBe(400);

        const invalidLanguage =
          await request(app)
            .get(
              "/api/v1/attractions/3?language=english"
            );

        expect(
          invalidLanguage.status
        ).toBe(400);

        expect(
          getPublishedAttractionById
        ).not.toHaveBeenCalled();
      }
    );

    it(
      "GET /api/v1/attractions/:id maps unavailable public content to 404",
      async () => {
        vi.mocked(
          getPublishedAttractionById
        ).mockRejectedValue(
          new AttractionNotFoundError()
        );

        const response =
          await request(app)
            .get(
              "/api/v1/attractions/999"
            );

        expect(
          response.status
        ).toBe(404);

        expect(
          response.body
        ).toEqual({
          error: {
            code:
              "NOT_FOUND",

            message:
              "Attraction not found",
          },
        });
      }
    );
  }
);