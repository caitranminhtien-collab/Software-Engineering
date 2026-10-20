import {
  ChatGenerationUnavailableError,
  generateChatAnswer,
} from "../adapters/llm/chat-answer.provider";

import {
  createAssistantMessage,
  createVisitorMessage,
  findChatMessagesBySession,
  type ChatMessageRow,
} from "../repositories/chat.repository";

import {
  KnowledgeEmbeddingUnavailableError,
  searchKnowledge,
  type KnowledgeCitation,
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
  answer: string;
  citations: KnowledgeCitation[] | null;
  response_status: "answered" | "insufficient";
  requested_language: string;
  content_language: string;
  fallback_used: boolean;
  attraction_id: number | null;
}

export class ChatDependencyUnavailableError extends Error {
  constructor() {
    super(
      "Knowledge service is temporarily unavailable"
    );

    this.name = "ChatDependencyUnavailableError";
  }
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
    response_status: message.response_status,
    created_at: message.created_at,
  };
}

export async function saveVisitorMessage(
  sessionId: number,
  content: string
): Promise<ChatMessageResult> {
  const message = await createVisitorMessage(
    sessionId,
    content
  );

  return mapChatMessage(message);
}

export async function createChatExchange(
  sessionId: number,
  question: string,
  languageCode: string,
  attractionId: number | null
): Promise<ChatExchangeResult> {
  // sessionId được lấy từ visitor session
  // đã xác thực, không lấy trực tiếp từ body.

  const visitorMessage = await createVisitorMessage(
    sessionId,
    question
  );

  let knowledge: Awaited<
    ReturnType<typeof searchKnowledge>
  >;

  // 1. Truy xuất Knowledge đã được phê duyệt
  try {
    knowledge = await searchKnowledge(
      question,
      languageCode,
      attractionId
    );
  } catch (error) {
    if (
      error instanceof
      KnowledgeEmbeddingUnavailableError
    ) {
      const errorText =
        languageCode === "en"
          ? "The knowledge service is temporarily unavailable. Please try again later."
          : "Dịch vụ tra cứu kiến thức đang tạm thời không khả dụng. Vui lòng thử lại sau.";

      // Ghi lịch sử khi Embedding gặp sự cố.
      await createAssistantMessage(
        sessionId,
        errorText,
        null,
        "error"
      );

      // Controller sẽ xử lý lỗi này.
      throw new ChatDependencyUnavailableError();
    }

    throw error;
  }

  // 2. Không tìm thấy Knowledge phù hợp
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
      visitor_message: mapChatMessage(
        visitorMessage
      ),
      assistant_message: mapChatMessage(
        assistantMessage
      ),
      answer: insufficientText,
      citations: null,
      response_status: "insufficient",
      requested_language: languageCode,
      content_language: knowledge.content_language,
      fallback_used: knowledge.fallback_used,
      attraction_id: attractionId,
    };
  }

  // 3. Loại bỏ các đoạn Knowledge trùng nhau
  
  let answer: string;

  try {
    answer = await generateChatAnswer({
      question,
      languageCode,
      matches: knowledge.matches,
    });
  } catch (error) {
    if (
      error instanceof ChatGenerationUnavailableError
    ) {
      const errorText =
        languageCode === "en"
          ? "The AI assistant is temporarily unavailable. Please try again later."
          : "Trợ lý AI đang tạm thời không khả dụng. Vui lòng thử lại sau.";

      await createAssistantMessage(
        sessionId,
        errorText,
        null,
        "error"
      );

      throw new ChatDependencyUnavailableError();
    }

    throw error;
  }

  // 5. Lấy citations tương ứng
  const citations: KnowledgeCitation[] =
    knowledge.matches.map(
      (match) => match.citation
    );

  // 6. Lưu câu trả lời Assistant
  const assistantMessage =
    await createAssistantMessage(
      sessionId,
      answer,
      citations,
      "answered"
    );

  // 7. Trả kết quả cho API
  return {
    visitor_message: mapChatMessage(
      visitorMessage
    ),
    assistant_message: mapChatMessage(
      assistantMessage
    ),
    answer,
    citations,
    response_status: "answered",
    requested_language: languageCode,
    content_language: knowledge.content_language,
    fallback_used: knowledge.fallback_used,
    attraction_id: attractionId,
  };
}

export async function getChatHistory(
  sessionId: number
): Promise<ChatMessageResult[]> {
  const rows = await findChatMessagesBySession(
    sessionId
  );

  return rows.map(mapChatMessage);
}
