import {
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from "vitest";

vi.mock(
  "../../src/repositories/audio-play.repository",
  () => ({
    createAudioPlay:
      vi.fn(),

    findAudioPlayByIdAndSession:
      vi.fn(),

    findPublishedAudioMediaById:
      vi.fn(),

    updateAudioPlayProgress:
      vi.fn(),
  })
);

import {
  createAudioPlay,
  findAudioPlayByIdAndSession,
  findPublishedAudioMediaById,
  updateAudioPlayProgress,
} from "../../src/repositories/audio-play.repository";

import {
  AudioMediaNotFoundError,
  AudioPlayNotFoundError,
  InvalidAudioProgressError,
  startAudioPlay,
  updateAudioPlay,
} from "../../src/services/audio-play.service";

// A real public visitor session context, not a numeric session ID.
const publicVisitorSession = {
  sessionId: 16,
  accessScope: "public" as const,
  accessRouteId: null,
  accessAttractionId: null,
  accessExpiresAt: null,
};

describe(
  "audio-play.service",
  () => {
    beforeEach(() => {
      vi.resetAllMocks();
    });

    it(
      "starts an audio play for published audio media",
      async () => {
        const startedAt =
          new Date(
            "2026-10-18T06:00:00.000Z"
          );

        vi.mocked(
          findPublishedAudioMediaById
        ).mockResolvedValue({
          media_id:
            "8",

          attraction_id:
            "3",

          language_code:
            "vi",

          duration_seconds:
            120,
        });

        vi.mocked(
          createAudioPlay
        ).mockResolvedValue({
          play_id:
            "20",

          session_id:
            "16",

          media_id:
            "8",

          started_at:
            startedAt,

          played_seconds:
            0,

          completed:
            false,
        });

        const result =
          await startAudioPlay(
            publicVisitorSession,
            8
          );

        expect(
          findPublishedAudioMediaById
        ).toHaveBeenCalledWith(
          8
        );

        expect(
          createAudioPlay
        ).toHaveBeenCalledWith(
          16,
          8
        );

        expect(
          result
        ).toEqual({
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
      }
    );

    it(
      "denies playback outside the visitor attraction grant",
      async () => {
        vi.mocked(
          findPublishedAudioMediaById
        ).mockResolvedValue({
          media_id: "8",
          attraction_id: "3",
          language_code: "vi",
          duration_seconds: 120,
        });

        await expect(
          startAudioPlay(
            {
              ...publicVisitorSession,
              accessScope: "attraction",
              accessAttractionId: 999,
              accessExpiresAt: new Date(Date.now() + 60000),
            },
            8
          )
        ).rejects.toThrow(
          "Visitor session does not grant access to this resource"
        );

        expect(createAudioPlay).not.toHaveBeenCalled();
      }
    );

    it(
      "rejects start when media is not published audio",
      async () => {
        vi.mocked(
          findPublishedAudioMediaById
        ).mockResolvedValue(
          null
        );

        await expect(
          startAudioPlay(
            publicVisitorSession,
            999
          )
        ).rejects.toBeInstanceOf(
          AudioMediaNotFoundError
        );

        expect(
          createAudioPlay
        ).not.toHaveBeenCalled();
      }
    );

    it(
      "rejects update when the play does not belong to the visitor session",
      async () => {
        vi.mocked(
          findAudioPlayByIdAndSession
        ).mockResolvedValue(
          null
        );

        await expect(
          updateAudioPlay(
            20,
            { ...publicVisitorSession, sessionId: 99 },
            10,
            false
          )
        ).rejects.toBeInstanceOf(
          AudioPlayNotFoundError
        );

        expect(
          findPublishedAudioMediaById
        ).not.toHaveBeenCalled();

        expect(
          updateAudioPlayProgress
        ).not.toHaveBeenCalled();
      }
    );

    it(
      "rejects negative played_seconds",
      async () => {
        vi.mocked(
          findAudioPlayByIdAndSession
        ).mockResolvedValue({
          play_id:
            "20",

          session_id:
            "16",

          media_id:
            "8",

          started_at:
            new Date(),

          played_seconds:
            0,

          completed:
            false,
        });

        await expect(
          updateAudioPlay(
            20,
            publicVisitorSession,
            -1,
            false
          )
        ).rejects.toBeInstanceOf(
          InvalidAudioProgressError
        );

        expect(
          findPublishedAudioMediaById
        ).not.toHaveBeenCalled();

        expect(
          updateAudioPlayProgress
        ).not.toHaveBeenCalled();
      }
    );

    it(
      "rejects update when the referenced media is no longer published audio",
      async () => {
        vi.mocked(
          findAudioPlayByIdAndSession
        ).mockResolvedValue({
          play_id:
            "20",

          session_id:
            "16",

          media_id:
            "8",

          started_at:
            new Date(),

          played_seconds:
            5,

          completed:
            false,
        });

        vi.mocked(
          findPublishedAudioMediaById
        ).mockResolvedValue(
          null
        );

        await expect(
          updateAudioPlay(
            20,
            publicVisitorSession,
            10,
            false
          )
        ).rejects.toBeInstanceOf(
          AudioMediaNotFoundError
        );

        expect(
          updateAudioPlayProgress
        ).not.toHaveBeenCalled();
      }
    );

    it(
      "rejects progress beyond the audio duration",
      async () => {
        vi.mocked(
          findAudioPlayByIdAndSession
        ).mockResolvedValue({
          play_id:
            "20",

          session_id:
            "16",

          media_id:
            "8",

          started_at:
            new Date(),

          played_seconds:
            10,

          completed:
            false,
        });

        vi.mocked(
          findPublishedAudioMediaById
        ).mockResolvedValue({
          media_id:
            "8",

          attraction_id:
            "3",

          language_code:
            "vi",

          duration_seconds:
            120,
        });

        await expect(
          updateAudioPlay(
            20,
            publicVisitorSession,
            121,
            false
          )
        ).rejects.toThrow(
          "played_seconds cannot exceed audio duration"
        );

        expect(
          updateAudioPlayProgress
        ).not.toHaveBeenCalled();
      }
    );

    it(
      "allows progress when audio duration is unknown",
      async () => {
        const startedAt =
          new Date(
            "2026-10-18T06:00:00.000Z"
          );

        vi.mocked(
          findAudioPlayByIdAndSession
        ).mockResolvedValue({
          play_id:
            "20",

          session_id:
            "16",

          media_id:
            "8",

          started_at:
            startedAt,

          played_seconds:
            10,

          completed:
            false,
        });

        vi.mocked(
          findPublishedAudioMediaById
        ).mockResolvedValue({
          media_id:
            "8",

          attraction_id:
            "3",

          language_code:
            "vi",

          duration_seconds:
            null,
        });

        vi.mocked(
          updateAudioPlayProgress
        ).mockResolvedValue({
          play_id:
            "20",

          session_id:
            "16",

          media_id:
            "8",

          started_at:
            startedAt,

          played_seconds:
            999,

          completed:
            true,
        });

        const result =
          await updateAudioPlay(
            20,
            publicVisitorSession,
            999,
            true
          );

        expect(
          result
        ).toEqual({
          id:
            20,

          session_id:
            16,

          media_id:
            8,

          started_at:
            startedAt,

          played_seconds:
            999,

          completed:
            true,
        });
      }
    );

    it(
      "throws not found if the play disappears before update completes",
      async () => {
        vi.mocked(
          findAudioPlayByIdAndSession
        ).mockResolvedValue({
          play_id:
            "20",

          session_id:
            "16",

          media_id:
            "8",

          started_at:
            new Date(),

          played_seconds:
            10,

          completed:
            false,
        });

        vi.mocked(
          findPublishedAudioMediaById
        ).mockResolvedValue({
          media_id:
            "8",

          attraction_id:
            "3",

          language_code:
            "vi",

          duration_seconds:
            120,
        });

        vi.mocked(
          updateAudioPlayProgress
        ).mockResolvedValue(
          null
        );

        await expect(
          updateAudioPlay(
            20,
            publicVisitorSession,
            30,
            false
          )
        ).rejects.toBeInstanceOf(
          AudioPlayNotFoundError
        );
      }
    );

    it(
      "updates progress for the same visitor session",
      async () => {
        const startedAt =
          new Date(
            "2026-10-18T06:00:00.000Z"
          );

        vi.mocked(
          findAudioPlayByIdAndSession
        ).mockResolvedValue({
          play_id:
            "20",

          session_id:
            "16",

          media_id:
            "8",

          started_at:
            startedAt,

          played_seconds:
            10,

          completed:
            false,
        });

        vi.mocked(
          findPublishedAudioMediaById
        ).mockResolvedValue({
          media_id:
            "8",

          attraction_id:
            "3",

          language_code:
            "vi",

          duration_seconds:
            120,
        });

        vi.mocked(
          updateAudioPlayProgress
        ).mockResolvedValue({
          play_id:
            "20",

          session_id:
            "16",

          media_id:
            "8",

          started_at:
            startedAt,

          played_seconds:
            120,

          completed:
            true,
        });

        const result =
          await updateAudioPlay(
            20,
            publicVisitorSession,
            120,
            true
          );

        expect(
          updateAudioPlayProgress
        ).toHaveBeenCalledWith(
          20,
          16,
          120,
          true
        );

        expect(
          result.completed
        ).toBe(true);

        expect(
          result.played_seconds
        ).toBe(120);
      }
    );
  }
);