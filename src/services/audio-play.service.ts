import {
  createAudioPlay,
  findAudioPlayByIdAndSession,
  findPublishedAudioMediaById,
  updateAudioPlayProgress,
} from "../repositories/audio-play.repository";

export interface CreateAudioPlayResult {
  id: number;
  session_id: number;
  media_id: number;

  attraction_id: number;
  language_code: string;

  started_at: Date;
  played_seconds: number;
  completed: boolean;

  duration_seconds: number | null;
}
export interface UpdateAudioPlayProgressResult {
  id: number;
  session_id: number;
  media_id: number;
  started_at: Date;
  played_seconds: number;
  completed: boolean;
}

export class AudioPlayNotFoundError extends Error {
  constructor() {
    super("Audio play not found");
    this.name = "AudioPlayNotFoundError";
  }
}

export class InvalidAudioProgressError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "InvalidAudioProgressError";
  }
}
export class AudioMediaNotFoundError extends Error {
  constructor() {
    super("Audio media not found");
    this.name = "AudioMediaNotFoundError";
  }
}

export async function startAudioPlay(
  sessionId: number,
  mediaId: number
): Promise<CreateAudioPlayResult> {
  const media =
    await findPublishedAudioMediaById(mediaId);

  if (!media) {
    throw new AudioMediaNotFoundError();
  }

  const play = await createAudioPlay(
    sessionId,
    mediaId
  );

  return {
    id: Number(play.play_id),
    session_id: Number(play.session_id),
    media_id: Number(play.media_id),

    attraction_id: Number(
      media.attraction_id
    ),

    language_code: media.language_code,

    started_at: play.started_at,
    played_seconds: play.played_seconds,
    completed: play.completed,

    duration_seconds:
      media.duration_seconds,
  };
}
export async function updateAudioPlay(
  playId: number,
  sessionId: number,
  playedSeconds: number,
  completed: boolean
): Promise<UpdateAudioPlayProgressResult> {
  const currentPlay =
    await findAudioPlayByIdAndSession(
      playId,
      sessionId
    );

  if (!currentPlay) {
    throw new AudioPlayNotFoundError();
  }

  if (playedSeconds < 0) {
    throw new InvalidAudioProgressError(
      "played_seconds must be greater than or equal to 0"
    );
  }

  const media =
    await findPublishedAudioMediaById(
      Number(currentPlay.media_id)
    );

  if (!media) {
    throw new AudioMediaNotFoundError();
  }

  if (
    media.duration_seconds !== null &&
    playedSeconds > media.duration_seconds
  ) {
    throw new InvalidAudioProgressError(
      "played_seconds cannot exceed audio duration"
    );
  }

  const updated =
    await updateAudioPlayProgress(
      playId,
      sessionId,
      playedSeconds,
      completed
    );

  if (!updated) {
    throw new AudioPlayNotFoundError();
  }

  return {
    id: Number(updated.play_id),
    session_id: Number(updated.session_id),
    media_id: Number(updated.media_id),

    started_at: updated.started_at,
    played_seconds: updated.played_seconds,
    completed: updated.completed,
  };
}