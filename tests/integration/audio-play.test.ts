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
  "../../src/services/audio-play.service",
  async (importOriginal) => {
    const actual =
      await importOriginal<
        typeof import(
          "../../src/services/audio-play.service"
        )
      >();

    return {
      ...actual,

      startAudioPlay:
        vi.fn(),

      updateAudioPlay:
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
  AudioMediaNotFoundError,
  AudioPlayNotFoundError,
  InvalidAudioProgressError,
  startAudioPlay,
  updateAudioPlay,
} from "../../src/services/audio-play.service";

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
  "audio play API",
  () => {
    beforeEach(() => {
      vi.mocked(
        findActiveVisitorSessionByTokenHash
      ).mockReset();

      vi.mocked(
        startAudioPlay
      ).mockReset();

      vi.mocked(
        updateAudioPlay
      ).mockReset();

      mockValidVisitorSession();
    });

    it(
      "POST /api/v1/audio-plays starts playback",
      async () => {
        const startedAt =
          new Date(
            "2026-10-18T06:00:00.000Z"
          );

        vi.mocked(
          startAudioPlay
        ).mockResolvedValue({
          id:
            20,

          session_id:
            16,

          media_id:
            8,

          attraction_id:
            3,

          language_code:
            "vi",

          started_at:
            startedAt,

          played_seconds:
            0,

          completed:
            false,

          duration_seconds:
            120,
        });

        const response =
          await request(app)
            .post(
              "/api/v1/audio-plays"
            )
            .set(
              "Authorization",
              "Bearer valid-token"
            )
            .send({
              media_id:
                8,
            });

        expect(
          response.status
        ).toBe(201);

        expect(
          startAudioPlay
        ).toHaveBeenCalledWith(
          16,
          8
        );

        expect(
          response.body.data
        ).toMatchObject({
          id:
            20,

          session_id:
            16,

          media_id:
            8,

          attraction_id:
            3,

          played_seconds:
            0,

          completed:
            false,

          duration_seconds:
            120,
        });
      }
    );

    it(
      "POST validates media_id",
      async () => {
        const response =
          await request(app)
            .post(
              "/api/v1/audio-plays"
            )
            .set(
              "Authorization",
              "Bearer valid-token"
            )
            .send({
              media_id:
                0,
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
          startAudioPlay
        ).not.toHaveBeenCalled();
      }
    );

    it(
      "POST maps unpublished or non-audio media to 404",
      async () => {
        vi.mocked(
          startAudioPlay
        ).mockRejectedValue(
          new AudioMediaNotFoundError()
        );

        const response =
          await request(app)
            .post(
              "/api/v1/audio-plays"
            )
            .set(
              "Authorization",
              "Bearer valid-token"
            )
            .send({
              media_id:
                999,
            });

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
              "Audio media not found",
          },
        });
      }
    );

    it(
      "PATCH /api/v1/audio-plays/:id updates playback progress",
      async () => {
        const startedAt =
          new Date(
            "2026-10-18T06:00:00.000Z"
          );

        vi.mocked(
          updateAudioPlay
        ).mockResolvedValue({
          id:
            20,

          session_id:
            16,

          media_id:
            8,

          started_at:
            startedAt,

          played_seconds:
            75,

          completed:
            false,
        });

        const response =
          await request(app)
            .patch(
              "/api/v1/audio-plays/20"
            )
            .set(
              "Authorization",
              "Bearer valid-token"
            )
            .send({
              played_seconds:
                75,

              completed:
                false,
            });

        expect(
          response.status
        ).toBe(200);

        expect(
          updateAudioPlay
        ).toHaveBeenCalledWith(
          20,
          16,
          75,
          false
        );

        expect(
          response.body.data
        ).toMatchObject({
          id:
            20,

          session_id:
            16,

          media_id:
            8,

          played_seconds:
            75,

          completed:
            false,
        });
      }
    );

    it(
      "PATCH validates id and request body",
      async () => {
        const invalidId =
          await request(app)
            .patch(
              "/api/v1/audio-plays/abc"
            )
            .set(
              "Authorization",
              "Bearer valid-token"
            )
            .send({
              played_seconds:
                10,

              completed:
                false,
            });

        expect(
          invalidId.status
        ).toBe(400);

        const invalidBody =
          await request(app)
            .patch(
              "/api/v1/audio-plays/20"
            )
            .set(
              "Authorization",
              "Bearer valid-token"
            )
            .send({
              played_seconds:
                -1,

              completed:
                "yes",
            });

        expect(
          invalidBody.status
        ).toBe(400);

        expect(
          updateAudioPlay
        ).not.toHaveBeenCalled();
      }
    );

    it(
      "PATCH maps another session's play to 404",
      async () => {
        vi.mocked(
          updateAudioPlay
        ).mockRejectedValue(
          new AudioPlayNotFoundError()
        );

        const response =
          await request(app)
            .patch(
              "/api/v1/audio-plays/20"
            )
            .set(
              "Authorization",
              "Bearer valid-token"
            )
            .send({
              played_seconds:
                30,

              completed:
                false,
            });

        expect(
          response.status
        ).toBe(404);

        expect(
          response.body.error
            .message
        ).toBe(
          "Audio play not found"
        );
      }
    );

    it(
      "PATCH maps service progress validation to 400",
      async () => {
        vi.mocked(
          updateAudioPlay
        ).mockRejectedValue(
          new InvalidAudioProgressError(
            "played_seconds cannot exceed audio duration"
          )
        );

        const response =
          await request(app)
            .patch(
              "/api/v1/audio-plays/20"
            )
            .set(
              "Authorization",
              "Bearer valid-token"
            )
            .send({
              played_seconds:
                121,

              completed:
                false,
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
              "played_seconds cannot exceed audio duration",
          },
        });
      }
    );

    it(
      "requires an authenticated visitor session",
      async () => {
        const response =
          await request(app)
            .post(
              "/api/v1/audio-plays"
            )
            .send({
              media_id:
                8,
            });

        expect(
          response.status
        ).toBe(401);

        expect(
          startAudioPlay
        ).not.toHaveBeenCalled();
      }
    );
  }
);