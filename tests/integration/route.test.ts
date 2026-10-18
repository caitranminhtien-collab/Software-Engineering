import request from "supertest";

import {
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from "vitest";

vi.mock(
  "../../src/services/route.service",
  async (importOriginal) => {
    const actual =
      await importOriginal<
        typeof import(
          "../../src/services/route.service"
        )
      >();

    return {
      ...actual,

      getPublishedRoutes:
        vi.fn(),

      getPublishedRouteById:
        vi.fn(),
    };
  }
);

import app
  from "../../src/app";

import {
  getPublishedRouteById,
  getPublishedRoutes,
  RouteNotFoundError,
} from "../../src/services/route.service";

describe(
  "routes API",
  () => {
    beforeEach(() => {
      vi.mocked(
        getPublishedRoutes
      ).mockReset();

      vi.mocked(
        getPublishedRouteById
      ).mockReset();
    });

    it(
      "GET /api/v1/routes uses default pagination",
      async () => {
        vi.mocked(
          getPublishedRoutes
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
              "/api/v1/routes"
            );

        expect(
          response.status
        ).toBe(200);

        expect(
          getPublishedRoutes
        ).toHaveBeenCalledWith(
          1,
          10
        );

        expect(
          response.body
            .pagination
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
      "GET /api/v1/routes accepts page and page_size",
      async () => {
        vi.mocked(
          getPublishedRoutes
        ).mockResolvedValue({
          data: [
            {
              id:
                2,

              slug:
                "hue-one-day",

              name:
                "Huế một ngày",

              description:
                "Tuyến tham quan Huế.",

              area_code:
                "HUE",

              estimated_minutes:
                240,

              verified_at:
                new Date(
                  "2026-10-18T06:00:00.000Z"
                ),
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
              "/api/v1/routes?page=2&page_size=5"
            );

        expect(
          response.status
        ).toBe(200);

        expect(
          getPublishedRoutes
        ).toHaveBeenCalledWith(
          2,
          5
        );

        expect(
          response.body.data
        ).toHaveLength(1);
      }
    );

    it(
      "GET /api/v1/routes rejects invalid pagination",
      async () => {
        const response =
          await request(app)
            .get(
              "/api/v1/routes?page=0&page_size=101"
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
            "page must be a positive integer",
            "page_size must be an integer from 1 to 100",
          ])
        );

        expect(
          getPublishedRoutes
        ).not.toHaveBeenCalled();
      }
    );

    it(
      "GET /api/v1/routes/:id returns route detail with stops",
      async () => {
        vi.mocked(
          getPublishedRouteById
        ).mockResolvedValue({
          id:
            2,

          slug:
            "hue-one-day",

          name:
            "Huế một ngày",

          description:
            "Tuyến tham quan Huế.",

          area_code:
            "HUE",

          estimated_minutes:
            240,

          verified_at:
            new Date(
              "2026-10-18T06:00:00.000Z"
            ),

          stops: [
            {
              id:
                10,

              order:
                1,

              attraction_id:
                3,

              attraction_slug:
                "thien-mu",

              attraction_name:
                "Chùa Thiên Mụ",

              latitude:
                16.4536,

              longitude:
                107.5447,

              visit_minutes:
                45,

              travel_minutes_from_previous:
                null,
            },
          ],
        });

        const response =
          await request(app)
            .get(
              "/api/v1/routes/2"
            );

        expect(
          response.status
        ).toBe(200);

        expect(
          getPublishedRouteById
        ).toHaveBeenCalledWith(
          2
        );

        expect(
          response.body.data
        ).toMatchObject({
          id:
            2,

          slug:
            "hue-one-day",
        });

        expect(
          response.body.data
            .stops
        ).toHaveLength(1);

        expect(
          response.body.data
            .stops[0].order
        ).toBe(1);
      }
    );

    it(
      "GET /api/v1/routes/:id rejects invalid route id",
      async () => {
        const response =
          await request(app)
            .get(
              "/api/v1/routes/abc"
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
          getPublishedRouteById
        ).not.toHaveBeenCalled();
      }
    );

    it(
      "GET /api/v1/routes/:id maps unavailable public route to 404",
      async () => {
        vi.mocked(
          getPublishedRouteById
        ).mockRejectedValue(
          new RouteNotFoundError()
        );

        const response =
          await request(app)
            .get(
              "/api/v1/routes/999"
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
              "Route not found",
          },
        });
      }
    );
  }
);