import request from "supertest";

import {
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from "vitest";

vi.mock(
  "../../src/repositories/session.repository",
  async (importOriginal) => {
    const actual =
      await importOriginal<
        typeof import(
          "../../src/repositories/session.repository"
        )
      >();

    return {
      ...actual,

      findActiveVisitorSessionByTokenHash:
        vi.fn(),
    };
  }
);

vi.mock(
  "../../src/services/location-suggestion.service",
  async (importOriginal) => {
    const actual =
      await importOriginal<
        typeof import(
          "../../src/services/location-suggestion.service"
        )
      >();

    return {
      ...actual,

      getLocationSuggestions:
        vi.fn(),
    };
  }
);

import app
  from "../../src/app";

import {
  findActiveVisitorSessionByTokenHash,
} from "../../src/repositories/session.repository";

import {
  getLocationSuggestions,
  InvalidLocationSampleError,
} from "../../src/services/location-suggestion.service";

function mockValidVisitorSession(): void {
  vi.mocked(
    findActiveVisitorSessionByTokenHash
  ).mockResolvedValue({
    session_id:
      "16",

    token_hash:
      "stored-hash",

    language_code:
      "vi",

    started_at:
      new Date(),

    expires_at:
      new Date(
        Date.now() +
          60 *
            60 *
            1000
      ),

    revoked_at:
      null,

    access_scope:
      "public",

    access_route_id:
      null,

    access_attraction_id:
      null,

    access_expires_at:
      null,
  });
}

describe(
  "POST /api/v1/location-suggestions",
  () => {
    beforeEach(() => {
      vi.mocked(
        findActiveVisitorSessionByTokenHash
      ).mockReset();

      vi.mocked(
        getLocationSuggestions
      ).mockReset();

      mockValidVisitorSession();
    });

    it(
      "returns suggestions and location-quality metadata",
      async () => {
        vi.mocked(
          getLocationSuggestions
        ).mockResolvedValue({
          suggestions: [
            {
              attraction_id:
                3,

              slug:
                "thien-mu",

              area_code:
                "HUE",

              name:
                "Chùa Thiên Mụ",

              description:
                "Di tích lịch sử.",

              latitude:
                16.4536,

              longitude:
                107.5447,

              distance_m:
                0,

              trigger_radius_m:
                100,

              content_language:
                "vi",

              fallback_used:
                false,
            },
          ],

          accuracy_m:
            5,

          manual_selection_recommended:
            false,

          reason:
            null,
        });

        const sampledAt =
          new Date().toISOString();

        const response =
          await request(app)
            .post(
              "/api/v1/location-suggestions"
            )
            .set(
              "Authorization",
              "Bearer valid-token"
            )
            .send({
              latitude:
                16.4536,

              longitude:
                107.5447,

              accuracy_m:
                5,

              sampled_at:
                sampledAt,
            });

        expect(
          response.status
        ).toBe(200);

        expect(
          response.body.data
        ).toHaveLength(1);

        expect(
          response.body.meta
        ).toEqual({
          accuracy_m:
            5,

          manual_selection_recommended:
            false,

          reason:
            null,
        });

        expect(
          getLocationSuggestions
        ).toHaveBeenCalledTimes(
          1
        );

        const call =
          vi.mocked(
            getLocationSuggestions
          ).mock.calls[0];

        expect(
          call[0]
        ).toBe(16);

        expect(
          call[1]
        ).toBe(16.4536);

        expect(
          call[2]
        ).toBe(107.5447);

        expect(
          call[3]
        ).toBe(5);

        expect(
          call[4]
        ).toBeInstanceOf(
          Date
        );

        expect(
          call[5]
        ).toBe("vi");
      }
    );

    it(
      "returns 400 when coordinates are invalid",
      async () => {
        const response =
          await request(app)
            .post(
              "/api/v1/location-suggestions"
            )
            .set(
              "Authorization",
              "Bearer valid-token"
            )
            .send({
              latitude:
                100,

              longitude:
                200,

              accuracy_m:
                -1,

              sampled_at:
                "not-a-date",
            });

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
          getLocationSuggestions
        ).not.toHaveBeenCalled();
      }
    );

    it(
      "maps an old or future location sample to 400",
      async () => {
        vi.mocked(
          getLocationSuggestions
        ).mockRejectedValue(
          new InvalidLocationSampleError(
            "Location sample is too old or from the future"
          )
        );

        const response =
          await request(app)
            .post(
              "/api/v1/location-suggestions"
            )
            .set(
              "Authorization",
              "Bearer valid-token"
            )
            .send({
              latitude:
                16.4536,

              longitude:
                107.5447,

              accuracy_m:
                5,

              sampled_at:
                new Date()
                  .toISOString(),
            });

        expect(
          response.status
        ).toBe(400);

        expect(
          response.body
        ).toEqual({
          error: {
            code:
              "VALIDATION_ERROR",

            message:
              "Location sample is too old or from the future",
          },
        });
      }
    );

    it(
      "returns manual-selection metadata for low accuracy",
      async () => {
        vi.mocked(
          getLocationSuggestions
        ).mockResolvedValue({
          suggestions:
            [],

          accuracy_m:
            100,

          manual_selection_recommended:
            true,

          reason:
            "low_accuracy",
        });

        const response =
          await request(app)
            .post(
              "/api/v1/location-suggestions"
            )
            .set(
              "Authorization",
              "Bearer valid-token"
            )
            .send({
              latitude:
                16.4536,

              longitude:
                107.5447,

              accuracy_m:
                100,

              sampled_at:
                new Date()
                  .toISOString(),
            });

        expect(
          response.status
        ).toBe(200);

        expect(
          response.body.data
        ).toEqual([]);

        expect(
          response.body.meta
        ).toEqual({
          accuracy_m:
            100,

          manual_selection_recommended:
            true,

          reason:
            "low_accuracy",
        });
      }
    );

    it(
      "requires an authenticated visitor session",
      async () => {
        const response =
          await request(app)
            .post(
              "/api/v1/location-suggestions"
            )
            .send({
              latitude:
                16.4536,

              longitude:
                107.5447,

              accuracy_m:
                5,

              sampled_at:
                new Date()
                  .toISOString(),
            });

        expect(
          response.status
        ).toBe(401);

        expect(
          getLocationSuggestions
        ).not.toHaveBeenCalled();
      }
    );
  }
);