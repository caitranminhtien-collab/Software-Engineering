import type { QueryResultRow } from "pg";
import { db } from "../config/database";

export interface AudioPlayRow extends QueryResultRow {
  play_id: string;
  session_id: string;
  media_id: string;

  started_at: Date;
  played_seconds: number;
  completed: boolean;
}
export interface PublishedAudioMediaRow extends QueryResultRow {
  media_id: string;
  attraction_id: string;
  language_code: string;
  duration_seconds: number | null;
}
export async function createAudioPlay(
  sessionId: number,
  mediaId: number
): Promise<AudioPlayRow> {
  const result = await db.query<AudioPlayRow>(
    `
      INSERT INTO audio_plays (
        session_id,
        media_id
      )
      VALUES ($1, $2)
      RETURNING
        play_id,
        session_id,
        media_id,
        started_at,
        played_seconds,
        completed
    `,
    [
      sessionId,
      mediaId,
    ]
  );

  return result.rows[0];
}

export async function findAudioPlayByIdAndSession(
  playId: number,
  sessionId: number
): Promise<AudioPlayRow | null> {
  const result = await db.query<AudioPlayRow>(
    `
      SELECT
        play_id,
        session_id,
        media_id,
        started_at,
        played_seconds,
        completed
      FROM audio_plays
      WHERE play_id = $1
        AND session_id = $2
      LIMIT 1
    `,
    [
      playId,
      sessionId,
    ]
  );

  return result.rows[0] ?? null;
}
export async function findPublishedAudioMediaById(
  mediaId: number
): Promise<PublishedAudioMediaRow | null> {
  const result =
    await db.query<PublishedAudioMediaRow>(
      `
        SELECT
          media_id,
          attraction_id,
          language_code,
          duration_seconds
        FROM attraction_media
        WHERE media_id = $1
          AND media_type = 'audio'
          AND status = 'published'
        LIMIT 1
      `,
      [mediaId]
    );

  return result.rows[0] ?? null;
}
export async function updateAudioPlayProgress(
  playId: number,
  sessionId: number,
  playedSeconds: number,
  completed: boolean
): Promise<AudioPlayRow | null> {
  const result = await db.query<AudioPlayRow>(
    `
      UPDATE audio_plays
      SET
        played_seconds = $3,
        completed = $4
      WHERE play_id = $1
        AND session_id = $2
      RETURNING
        play_id,
        session_id,
        media_id,
        started_at,
        played_seconds,
        completed
    `,
    [
      playId,
      sessionId,
      playedSeconds,
      completed,
    ]
  );

  return result.rows[0] ?? null;
}