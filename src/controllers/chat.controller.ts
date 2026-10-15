import type {
  Request,
  Response,
} from "express";

import {
  createChatExchange,
  getChatHistory,
} from "../services/chat.service";

import type {
  CreateChatMessageBody,
} from "../validators/chat.validator";

interface VisitorSessionLocal {
  sessionId: number;
  languageCode: string;

  accessScope:
    | "public"
    | "route"
    | "attraction";

  accessRouteId:
    | number
    | null;

  accessAttractionId:
    | number
    | null;
}

// POST /api/v1/chat/messages
export async function createChatMessageController(
  _req: Request,
  res: Response
): Promise<void> {
  try {
    const {
      sessionId,
    } =
      res.locals
        .visitorSession as
        VisitorSessionLocal;

    const {
      question,
      languageCode,
      attractionId,
    } =
      res.locals
        .createChatMessageBody as
        CreateChatMessageBody;

    const result =
      await createChatExchange(
        sessionId,
        question,
        languageCode,
        attractionId
      );

    res.status(201).json({
      data: result,
    });
  } catch (error) {
    console.error(
      "Create chat exchange failed:",
      error
    );

    res.status(500).json({
      error: {
        code:
          "INTERNAL_SERVER_ERROR",
        message:
          "Unable to process chat message",
      },
    });
  }
}

// GET /api/v1/chat/messages
export async function getChatHistoryController(
  _req: Request,
  res: Response
): Promise<void> {
  try {
    const {
      sessionId,
    } =
      res.locals
        .visitorSession as
        VisitorSessionLocal;

    const messages =
      await getChatHistory(
        sessionId
      );

    res.status(200).json({
      data: messages,
    });
  } catch (error) {
    console.error(
      "Get chat history failed:",
      error
    );

    res.status(500).json({
      error: {
        code:
          "INTERNAL_SERVER_ERROR",
        message:
          "Unable to load chat history",
      },
    });
  }
}