import {
  createAssistantMessage,
  createVisitorMessage,
  findChatMessagesBySession,
  type ChatMessageRow,
} from "../repositories/chat.repository";

import {
  searchKnowledge,
  type KnowledgeCitation,
} from "./knowledge.service";

export interface ChatMessageResult {
  id: number;
  session_id: number;

  speaker:
    | "visitor"
    | "assistant";

  content: string;

  citations:
    | unknown
    | null;

  response_status:
    | "answered"
    | "insufficient"
    | "error"
    | null;

  created_at: Date;
}

export interface ChatExchangeResult {
  visitor_message:
    ChatMessageResult;

  assistant_message:
    ChatMessageResult;

  answer: string;

  citations:
    | KnowledgeCitation[]
    | null;

  response_status:
    | "answered"
    | "insufficient";

  requested_language: string;
  content_language: string;
  fallback_used: boolean;

  attraction_id:
    | number
    | null;
}

function mapChatMessage(
  message: ChatMessageRow
): ChatMessageResult {
  return {
    id:
      Number(
        message.message_id
      ),

    session_id:
      Number(
        message.session_id
      ),

    speaker:
      message.speaker,

    content:
      message.content,

    citations:
      message.citations,

    response_status:
      message.response_status,

    created_at:
      message.created_at,
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

  return mapChatMessage(
    message
  );
}

export async function createChatExchange(
  sessionId: number,
  question: string,
  languageCode: string,
  attractionId:
    | number
    | null
): Promise<ChatExchangeResult> {
  /*
   * sessionId luôn được lấy từ
   * visitor session đã xác thực,
   * không nhận từ request body.
   */
  const visitorMessage =
    await createVisitorMessage(
      sessionId,
      question
    );

  const knowledge =
    await searchKnowledge(
      question,
      languageCode,
      attractionId
    );

  if (
    knowledge.matches.length ===
    0
  ) {
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
        mapChatMessage(
          visitorMessage
        ),

      assistant_message:
        mapChatMessage(
          assistantMessage
        ),

      answer:
        insufficientText,

      citations:
        null,

      response_status:
        "insufficient",

      requested_language:
        languageCode,

      content_language:
        knowledge.content_language,

      fallback_used:
        knowledge.fallback_used,

      attraction_id:
        attractionId,
    };
  }

  const uniqueContents = [
    ...new Set(
      knowledge.matches.map(
        (match) =>
          match.content
      )
    ),
  ];

  const answer =
    uniqueContents.join(
      " "
    );

  const citations:
    KnowledgeCitation[] =
    knowledge.matches.map(
      (match) =>
        match.citation
    );

  const assistantMessage =
    await createAssistantMessage(
      sessionId,
      answer,
      citations,
      "answered"
    );

  return {
    visitor_message:
      mapChatMessage(
        visitorMessage
      ),

    assistant_message:
      mapChatMessage(
        assistantMessage
      ),

    answer,

    citations,

    response_status:
      "answered",

    requested_language:
      languageCode,

    content_language:
      knowledge.content_language,

    fallback_used:
      knowledge.fallback_used,

    attraction_id:
      attractionId,
  };
}

export async function getChatHistory(
  sessionId: number
): Promise<
  ChatMessageResult[]
> {
  const rows =
    await findChatMessagesBySession(
      sessionId
    );

  return rows.map(
    mapChatMessage
  );
}