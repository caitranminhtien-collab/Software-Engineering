import {
  createAssistantMessage,
  createVisitorMessage,
  findChatMessagesBySession,
  type ChatMessageRow,
} from "../repositories/chat.repository";

import {
  searchKnowledge,
} from "./knowledge.service";

export interface ChatMessageResult {
  id: number;
  session_id: number;

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

export interface ChatExchangeResult {
  visitor_message: ChatMessageResult;
  assistant_message: ChatMessageResult;

  content_language: string;
  fallback_used: boolean;
}

function mapChatMessage(
  message: ChatMessageRow
): ChatMessageResult {
  return {
    id: Number(message.message_id),
    session_id: Number(message.session_id),

    speaker: message.speaker,
    content: message.content,

    citations: message.citations,
    response_status:
      message.response_status,

    created_at: message.created_at,
  };
}

export async function saveVisitorMessage(
  sessionId: number,
  content: string
): Promise<ChatMessageResult> {
  const message =
    await createVisitorMessage(
      sessionId,
      content
    );

  return mapChatMessage(message);
}

export async function createChatExchange(
  sessionId: number,
  content: string,
  languageCode: string
): Promise<ChatExchangeResult> {
  // 1. Lưu câu hỏi visitor
  const visitorMessage =
    await createVisitorMessage(
      sessionId,
      content
    );

  // 2. Tìm knowledge phù hợp
  const knowledge =
    await searchKnowledge(
      content,
      languageCode
    );

  // 3. Không tìm thấy thông tin phù hợp
  if (knowledge.matches.length === 0) {
    const insufficientText =
      languageCode === "en"
        ? "I do not have enough approved information to answer this question."
        : "Tôi chưa có đủ thông tin đã được phê duyệt để trả lời câu hỏi này.";

    const assistantMessage =
      await createAssistantMessage(
        sessionId,
        insufficientText,
        null,
        "insufficient"
      );

    return {
      visitor_message:
        mapChatMessage(visitorMessage),

      assistant_message:
        mapChatMessage(
          assistantMessage
        ),

      content_language:
        knowledge.content_language,

      fallback_used:
        knowledge.fallback_used,
    };
  }

  // 4. Ghép các chunk phù hợp thành câu trả lời
  const uniqueContents = [
    ...new Set(
      knowledge.matches.map(
        (match) => match.content
      )
    ),
  ];

  const answer =
    uniqueContents.join(" ");

  // 5. Tạo citations từ các knowledge chunk
  const citations =
    knowledge.matches.map(
      (match) => match.citation
    );

  // 6. Lưu assistant message
  const assistantMessage =
    await createAssistantMessage(
      sessionId,
      answer,
      citations,
      "answered"
    );

  return {
    visitor_message:
      mapChatMessage(visitorMessage),

    assistant_message:
      mapChatMessage(
        assistantMessage
      ),

    content_language:
      knowledge.content_language,

    fallback_used:
      knowledge.fallback_used,
  };
}

export async function getChatHistory(
  sessionId: number
): Promise<ChatMessageResult[]> {
  const rows =
    await findChatMessagesBySession(
      sessionId
    );

  return rows.map(mapChatMessage);
}