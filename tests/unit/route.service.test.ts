import {
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from "vitest";

vi.mock(
  "../../src/repositories/route.repository",
  () => ({
    countPublishedRoutes:
      vi.fn(),

    findPublishedRouteById:
      vi.fn(),

    findPublishedRoutes:
      vi.fn(),

    findRouteStopsByRouteId:
      vi.fn(),
  })
);

import {
  countPublishedRoutes,
  findPublishedRouteById,
  findPublishedRoutes,
  findRouteStopsByRouteId,
} from "../../src/repositories/route.repository";

import {
  getPublishedRouteById,
  getPublishedRoutes,
  RouteNotFoundError,
} from "../../src/services/route.service";

function createRouteRow(
  overrides: Record<string, unknown> = {}
) {
  return {
    route_id:
      "2",

    slug:
      "hue-one-day",

    name_vi:
      "Huế một ngày",

    description_vi:
      "Tuyến tham quan Huế.",

    area_code:
      "HUE",

    estimated_minutes:
      240,

    verified_at:
      new Date(
        "2026-10-18T06:00:00.000Z"
      ),

    ...overrides,
  } as any;
}

function createStopRow(
  overrides: Record<string, unknown> = {}
) {
  return {
    route_stop_id:
      "10",

    route_id:
      "2",

    attraction_id:
      "3",

    stop_order:
      1,

    visit_minutes:
      45,

    travel_minutes_from_previous:
      null,

    attraction_slug:
      "thien-mu",

    attraction_name:
      "Chùa Thiên Mụ",

    latitude:
      16.4536,

    longitude:
      107.5447,

    ...overrides,
  } as any;
}

describe(
  "route.service",
  () => {
    beforeEach(() => {
      vi.resetAllMocks();
    });

    it(
      "returns paginated published routes",
      async () => {
        const verifiedAt =
          new Date(
            "2026-10-18T06:00:00.000Z"
          );

        vi.mocked(
          findPublishedRoutes
        ).mockResolvedValue([
          createRouteRow({
            verified_at:
              verifiedAt,
          }),
        ]);

        vi.mocked(
          countPublishedRoutes
        ).mockResolvedValue(
          21
        );

        const result =
          await getPublishedRoutes(
            2,
            10
          );

        expect(
          findPublishedRoutes
        ).toHaveBeenCalledWith(
          10,
          10
        );

        expect(
          countPublishedRoutes
        ).toHaveBeenCalledTimes(
          1
        );

        expect(
          result
        ).toEqual({
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
                verifiedAt,
            },
          ],

          pagination: {
            page:
              2,

            page_size:
              10,

            total:
              21,

            total_pages:
              3,
          },
        });
      }
    );

    it(
      "returns zero total pages when there are no public routes",
      async () => {
        vi.mocked(
          findPublishedRoutes
        ).mockResolvedValue(
          []
        );

        vi.mocked(
          countPublishedRoutes
        ).mockResolvedValue(
          0
        );

        const result =
          await getPublishedRoutes(
            1,
            10
          );

        expect(
          result.data
        ).toEqual([]);

        expect(
          result.pagination
            .total_pages
        ).toBe(0);
      }
    );

    it(
      "returns route detail with mapped stops",
      async () => {
        const verifiedAt =
          new Date(
            "2026-10-18T06:00:00.000Z"
          );

        vi.mocked(
          findPublishedRouteById
        ).mockResolvedValue(
          createRouteRow({
            verified_at:
              verifiedAt,
          })
        );

        vi.mocked(
          findRouteStopsByRouteId
        ).mockResolvedValue([
          createStopRow(),

          createStopRow({
            route_stop_id:
              "11",

            attraction_id:
              "4",

            stop_order:
              2,

            visit_minutes:
              60,

            travel_minutes_from_previous:
              15,

            attraction_slug:
              "hue-imperial-city",

            attraction_name:
              "Đại Nội Huế",

            latitude:
              16.4695,

            longitude:
              107.577,
          }),
        ]);

        const result =
          await getPublishedRouteById(
            2
          );

        expect(
          findPublishedRouteById
        ).toHaveBeenCalledWith(
          2
        );

        expect(
          findRouteStopsByRouteId
        ).toHaveBeenCalledWith(
          2
        );

        expect(
          result
        ).toEqual({
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
            verifiedAt,

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

            {
              id:
                11,

              order:
                2,

              attraction_id:
                4,

              attraction_slug:
                "hue-imperial-city",

              attraction_name:
                "Đại Nội Huế",

              latitude:
                16.4695,

              longitude:
                107.577,

              visit_minutes:
                60,

              travel_minutes_from_previous:
                15,
            },
          ],
        });
      }
    );

    it(
      "preserves the repository stop order in the response",
      async () => {
        vi.mocked(
          findPublishedRouteById
        ).mockResolvedValue(
          createRouteRow()
        );

        vi.mocked(
          findRouteStopsByRouteId
        ).mockResolvedValue([
          createStopRow({
            route_stop_id:
              "20",

            stop_order:
              1,
          }),

          createStopRow({
            route_stop_id:
              "21",

            attraction_id:
              "4",

            stop_order:
              2,
          }),

          createStopRow({
            route_stop_id:
              "22",

            attraction_id:
              "5",

            stop_order:
              3,
          }),
        ]);

        const result =
          await getPublishedRouteById(
            2
          );

        expect(
          result.stops.map(
            (stop) =>
              stop.order
          )
        ).toEqual([
          1,
          2,
          3,
        ]);
      }
    );

    it(
      "throws not found when the route is not publicly available",
      async () => {
        vi.mocked(
          findPublishedRouteById
        ).mockResolvedValue(
          null
        );

        await expect(
          getPublishedRouteById(
            999
          )
        ).rejects.toBeInstanceOf(
          RouteNotFoundError
        );

        expect(
          findRouteStopsByRouteId
        ).not.toHaveBeenCalled();
      }
    );
  }
);