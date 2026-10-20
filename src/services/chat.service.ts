import {
  ChatGenerationUnavailableError,
  generateChatAnswer,
  type ChatAnswerResult,
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
  response_status: "answered" | "insufficient" | "error" | null;
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
    super("Knowledge service is temporarily unavailable");
    this.name = "ChatDependencyUnavailableError";
  }
}

function mapChatMessage(message: ChatMessageRow): ChatMessageResult {
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

function insufficientAnswer(languageCode: string): string {
  return languageCode === "en"
    ? "I do not have enough approved information to answer this question."
    : "Tôi chưa có đủ thông tin đã được phê duyệt để trả lời câu hỏi này.";
}

export async function saveVisitorMessage(
  sessionId: number,
  content: string
): Promise<ChatMessageResult> {
  const message = await createVisitorMessage(sessionId, content);
  return mapChatMessage(message);
}

export async function createChatExchange(
  sessionId: number,
  question: string,
  languageCode: string,
  attractionId: number | null
): Promise<ChatExchangeResult> {
  // sessionId must come from the authenticated Visitor Session.
  const visitorMessage = await createVisitorMessage(sessionId, question);

  let knowledge: Awaited<ReturnType<typeof searchKnowledge>>;

  try {
    knowledge = await searchKnowledge(question, languageCode, attractionId);
  } catch (error) {
    if (error instanceof KnowledgeEmbeddingUnavailableError) {
      const errorText = languageCode === "en"
        ? "The knowledge service is temporarily unavailable. Please try again later."
        : "Dịch vụ tra cứu kiến thức đang tạm thời không khả dụng. Vui lòng thử lại sau.";

      await createAssistantMessage(sessionId, errorText, null, "error");
      throw new ChatDependencyUnavailableError();
    }
    throw error;
  }

  async function returnInsufficient(): Promise<ChatExchangeResult> {
    const answer = insufficientAnswer(languageCode);
    const assistantMessage = await createAssistantMessage(
      sessionId,
      answer,
      null,
      "insufficient"
    );

    return {
      visitor_message: mapChatMessage(visitorMessage),
      assistant_message: mapChatMessage(assistantMessage),
      answer,
      citations: null,
      response_status: "insufficient",
      requested_language: languageCode,
      content_language: knowledge.content_language,
      fallback_used: knowledge.fallback_used,
      attraction_id: attractionId,
    };
  }

  if (knowledge.matches.length === 0) {
    return returnInsufficient();
  }

  let groundedAnswer: ChatAnswerResult;
  try {
    const generated = await generateChatAnswer({
      question,
      languageCode,
      matches: knowledge.matches,
      grounded: true,
    });

    // Backwards-compatible path for legacy/extractive mocks and callers.
    // Real Gemini/OpenAI grounded mode returns structured metadata.
    groundedAnswer = typeof generated === "string"
      ? {
          answer: generated,
          supported: true,
          used_chunk_ids: knowledge.matches.map(
            (match) => match.citation.chunk_id
          ),
        }
      : generated;
  } catch (error) {
    if (error instanceof ChatGenerationUnavailableError) {
      const errorText = languageCode === "en"
        ? "The AI assistant is temporarily unavailable. Please try again later."
        : "Trợ lý AI đang tạm thời không khả dụng. Vui lòng thử lại sau.";

      await createAssistantMessage(sessionId, errorText, null, "error");
      throw new ChatDependencyUnavailableError();
    }
    throw error;
  }

  const usedChunkIds = new Set(groundedAnswer.used_chunk_ids);
  const citations: KnowledgeCitation[] = knowledge.matches
    .filter((match) => usedChunkIds.has(match.citation.chunk_id))
    .map((match) => match.citation);

  if (
    !groundedAnswer.supported ||
    !groundedAnswer.answer.trim() ||
    citations.length === 0
  ) {
    return returnInsufficient();
  }

  const answer = groundedAnswer.answer.trim();
  const assistantMessage = await createAssistantMessage(
    sessionId,
    answer,
    citations,
    "answered"
  );

  return {
    visitor_message: mapChatMessage(visitorMessage),
    assistant_message: mapChatMessage(assistantMessage),
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
  const rows = await findChatMessagesBySession(sessionId);
  return rows.map(mapChatMessage);
}
