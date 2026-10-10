import type { QueryResultRow } from "pg";
import { db } from "../config/database";

export interface ChatMessageRow extends QueryResultRow {
  message_id: string;
  session_id: string;

  speaker: "visitor" | "assistant";
  content: string;

  citations: unknown | null;

  response_status:
    | "answered"
    | "insufficient"
    | "error"
    | null;

  created_at: Date;
}

export async function createVisitorMessage(
  sessionId: number,
  content: string
): Promise<ChatMessageRow> {
  const result = await db.query<ChatMessageRow>(
    `
      INSERT INTO chat_messages (
        session_id,
        speaker,
        content,
        response_status
      )
      VALUES ($1, 'visitor', $2, NULL)
      RETURNING
        message_id,
        session_id,
        speaker,
        content,
        citations,
        response_status,
        created_at
    `,
    [
      sessionId,
      content,
    ]
  );

  return result.rows[0];
}

export async function createAssistantMessage(
  sessionId: number,
  content: string,
  citations: unknown | null,
  responseStatus:
    | "answered"
    | "insufficient"
    | "error"
): Promise<ChatMessageRow> {
  const result = await db.query<ChatMessageRow>(
    `
      INSERT INTO chat_messages (
        session_id,
        speaker,
        content,
        citations,
        response_status
      )
      VALUES (
        $1,
        'assistant',
        $2,
        $3::jsonb,
        $4
      )
      RETURNING
        message_id,
        session_id,
        speaker,
        content,
        citations,
        response_status,
        created_at
    `,
    [
      sessionId,
      content,
      citations === null
        ? null
        : JSON.stringify(citations),
      responseStatus,
    ]
  );

  return result.rows[0];
}

export async function findChatMessagesBySession(
  sessionId: number
): Promise<ChatMessageRow[]> {
  const result = await db.query<ChatMessageRow>(
    `
      SELECT
        message_id,
        session_id,
        speaker,
        content,
        citations,
        response_status,
        created_at
      FROM chat_messages
      WHERE session_id = $1
      ORDER BY message_id ASC
    `,
    [sessionId]
  );

  return result.rows;
}