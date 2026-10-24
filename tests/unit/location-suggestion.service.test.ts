import {
  afterEach,
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from "vitest";

const {
  findPublishedAttractionsForLocationMock,
  redisGetMock,
  redisSetMock,
} =
  vi.hoisted(() => ({
    findPublishedAttractionsForLocationMock:
      vi.fn(),

    redisGetMock:
      vi.fn(),

    redisSetMock:
      vi.fn(),
  }));

vi.mock(
  "../../src/repositories/location-suggestion.repository",
  () => ({
    findPublishedAttractionsForLocation:
      findPublishedAttractionsForLocationMock,
  })
);

vi.mock(
  "../../src/config/redis",
  () => ({
    redisClient: {
      get:
        redisGetMock,

      set:
        redisSetMock,
    },
  })
);

function createAttraction(
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

    name:
      "Chùa Thiên Mụ",

    description:
      "Di tích lịch sử tại Huế.",

    content_language:
      "vi",

    fallback_used:
      false,

    ...overrides,
  };
}

// GPS service requires an authenticated, authorized visitor context.
const publicVisitorSession = {
  sessionId: 16,
  accessScope: "public" as const,
  accessRouteId: null,
  accessAttractionId: null,
  accessExpiresAt: null,
};

describe(
  "location-suggestion.service",
  () => {
    const originalMaxAccuracy =
      process.env
        .LOCATION_MAX_ACCURACY_M;

    const originalMaxAge =
      process.env
        .LOCATION_MAX_SAMPLE_AGE_SECONDS;

    const originalCooldown =
      process.env
        .LOCATION_SUGGESTION_COOLDOWN_SECONDS;

    beforeEach(() => {
      process.env
        .LOCATION_MAX_ACCURACY_M =
        "50";

      process.env
        .LOCATION_MAX_SAMPLE_AGE_SECONDS =
        "30";

      process.env
        .LOCATION_SUGGESTION_COOLDOWN_SECONDS =
        "300";

      vi.resetModules();

      findPublishedAttractionsForLocationMock
        .mockReset();

      redisGetMock
        .mockReset();

      redisSetMock
        .mockReset();
    });

    afterEach(() => {
      if (
        originalMaxAccuracy ===
        undefined
      ) {
        delete process.env
          .LOCATION_MAX_ACCURACY_M;
      } else {
        process.env
          .LOCATION_MAX_ACCURACY_M =
          originalMaxAccuracy;
      }

      if (
        originalMaxAge ===
        undefined
      ) {
        delete process.env
          .LOCATION_MAX_SAMPLE_AGE_SECONDS;
      } else {
        process.env
          .LOCATION_MAX_SAMPLE_AGE_SECONDS =
          originalMaxAge;
      }

      if (
        originalCooldown ===
        undefined
      ) {
        delete process.env
          .LOCATION_SUGGESTION_COOLDOWN_SECONDS;
      } else {
        process.env
          .LOCATION_SUGGESTION_COOLDOWN_SECONDS =
          originalCooldown;
      }
    });

    it(
      "returns a nearby attraction inside its trigger radius",
      async () => {
        findPublishedAttractionsForLocationMock
          .mockResolvedValue([
            createAttraction(),
          ]);

        redisGetMock
          .mockResolvedValue(
            null
          );

        redisSetMock
          .mockResolvedValue(
            "OK"
          );

        const {
          getLocationSuggestions,
        } =
          await import(
            "../../src/services/location-suggestion.service"
          );

        const result =
          await getLocationSuggestions(
            16,
            16.4536,
            107.5447,
            5,
            new Date(),
            "vi",
            publicVisitorSession
          );

        expect(
          result.suggestions
        ).toHaveLength(1);

        expect(
          result.suggestions[0]
        ).toMatchObject({
          attraction_id:
            3,

          slug:
            "thien-mu",

          distance_m:
            0,

          content_language:
            "vi",

          fallback_used:
            false,
        });

        expect(
          findPublishedAttractionsForLocationMock
        ).toHaveBeenCalledWith(
          "vi"
        );

        expect(
          redisSetMock
        ).toHaveBeenCalledWith(
          "location-suggestion:16:3",
          "1",
          {
            EX:
              300,
          }
        );
      }
    );

    it(
      "returns manual-selection recommendation when GPS accuracy is too low",
      async () => {
        const {
          getLocationSuggestions,
        } =
          await import(
            "../../src/services/location-suggestion.service"
          );

        const result =
          await getLocationSuggestions(
            16,
            16.4536,
            107.5447,
            100,
            new Date(),
            "vi",
            publicVisitorSession
          );

        expect(
          result
        ).toEqual({
          suggestions:
            [],

          accuracy_m:
            100,

          manual_selection_recommended:
            true,

          reason:
            "low_accuracy",
        });

        expect(
          findPublishedAttractionsForLocationMock
        ).not.toHaveBeenCalled();

        expect(
          redisGetMock
        ).not.toHaveBeenCalled();
      }
    );

    it(
      "rejects a location sample that is too old",
      async () => {
        const {
          getLocationSuggestions,
          InvalidLocationSampleError,
        } =
          await import(
            "../../src/services/location-suggestion.service"
          );

        await expect(
          getLocationSuggestions(
            16,
            16.4536,
            107.5447,
            5,
            new Date(
              Date.now() -
                31 *
                  1000
            ),
            "vi",
            publicVisitorSession
          )
        ).rejects.toBeInstanceOf(
          InvalidLocationSampleError
        );

        expect(
          findPublishedAttractionsForLocationMock
        ).not.toHaveBeenCalled();
      }
    );

    it(
      "rejects a location sample from the future",
      async () => {
        const {
          getLocationSuggestions,
          InvalidLocationSampleError,
        } =
          await import(
            "../../src/services/location-suggestion.service"
          );

        await expect(
          getLocationSuggestions(
            16,
            16.4536,
            107.5447,
            5,
            new Date(
              Date.now() +
                1000
            ),
            "vi",
            publicVisitorSession
          )
        ).rejects.toBeInstanceOf(
          InvalidLocationSampleError
        );
      }
    );

    it(
      "suppresses an attraction already suggested during the cooldown",
      async () => {
        findPublishedAttractionsForLocationMock
          .mockResolvedValue([
            createAttraction(),
          ]);

        redisGetMock
          .mockResolvedValue(
            "1"
          );

        const {
          getLocationSuggestions,
        } =
          await import(
            "../../src/services/location-suggestion.service"
          );

        const result =
          await getLocationSuggestions(
            16,
            16.4536,
            107.5447,
            5,
            new Date(),
            "vi",
            publicVisitorSession
          );

        expect(
          result.suggestions
        ).toEqual([]);

        expect(
          redisSetMock
        ).not.toHaveBeenCalled();
      }
    );

    it(
      "filters attractions outside their trigger radius and sorts nearby results by distance",
      async () => {
        findPublishedAttractionsForLocationMock
          .mockResolvedValue([
            createAttraction({
              attraction_id:
                "10",

              slug:
                "far",

              latitude:
                16.4545,

              longitude:
                107.5447,

              trigger_radius_m:
                50,

              name:
                "Far",
            }),

            createAttraction({
              attraction_id:
                "11",

              slug:
                "near-two",

              latitude:
                16.4538,

              longitude:
                107.5447,

              trigger_radius_m:
                100,

              name:
                "Near Two",
            }),

            createAttraction({
              attraction_id:
                "12",

              slug:
                "near-one",

              latitude:
                16.4537,

              longitude:
                107.5447,

              trigger_radius_m:
                100,

              name:
                "Near One",
            }),
          ]);

        redisGetMock
          .mockResolvedValue(
            null
          );

        redisSetMock
          .mockResolvedValue(
            "OK"
          );

        const {
          getLocationSuggestions,
        } =
          await import(
            "../../src/services/location-suggestion.service"
          );

        const result =
          await getLocationSuggestions(
            16,
            16.4536,
            107.5447,
            5,
            new Date(),
            "vi",
            publicVisitorSession
          );

        expect(
          result.suggestions.map(
            (item) =>
              item.slug
          )
        ).toEqual([
          "near-one",
          "near-two",
        ]);

        expect(
          result.suggestions[0]
            .distance_m
        ).toBeLessThanOrEqual(
          result.suggestions[1]
            .distance_m
        );
      }
    );
  }
);