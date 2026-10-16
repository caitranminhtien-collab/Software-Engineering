import type {
  Request,
  Response,
} from "express";

import {
  createStaffKnowledgeDocument,
  reindexStaffKnowledgeDocument,
  StaffKnowledgeAttractionNotFoundError,
  StaffKnowledgeDocumentNotFoundError,
  StaffKnowledgeEmbeddingUnavailableError,
  StaffKnowledgeReindexConflictError,
} from "../services/staff-knowledge.service";

import type {
  CreateStaffKnowledgeBody,
  StaffKnowledgeParams,
} from "../validators/staff-knowledge.validator";

export async function createStaffKnowledgeController(
  req: Request,
  res: Response
): Promise<void> {
  try {
    const body =
      res.locals
        .createStaffKnowledgeBody as CreateStaffKnowledgeBody;

    const staffId =
      req.session.staffId;

    if (!staffId) {
      res.status(401).json({
        error: {
          code: "UNAUTHORIZED",
          message:
            "Staff authentication required",
        },
      });

      return;
    }

    const document =
      await createStaffKnowledgeDocument(
        body,
        Number(staffId)
      );

    res.status(201).json({
      data: document,
    });
  } catch (error) {
    if (
      error instanceof
      StaffKnowledgeAttractionNotFoundError
    ) {
      res.status(404).json({
        error: {
          code:
            "ATTRACTION_NOT_FOUND",
          message:
            "Attraction not found",
        },
      });

      return;
    }

    console.error(
      "Create staff knowledge document failed:",
      error
    );

    res.status(500).json({
      error: {
        code:
          "INTERNAL_SERVER_ERROR",
        message:
          "Unable to create knowledge document",
      },
    });
  }
}

export async function reindexStaffKnowledgeController(
  _req: Request,
  res: Response
): Promise<void> {
  try {
    const {
      documentId,
    } =
      res.locals
        .staffKnowledgeParams as StaffKnowledgeParams;

    const result =
      await reindexStaffKnowledgeDocument(
        documentId
      );

    res.status(200).json({
      data: result,
    });
  } catch (error) {
    if (
      error instanceof
      StaffKnowledgeDocumentNotFoundError
    ) {
      res.status(404).json({
        error: {
          code:
            "KNOWLEDGE_DOCUMENT_NOT_FOUND",
          message:
            "Knowledge document not found",
        },
      });

      return;
    }

    if (
      error instanceof
      StaffKnowledgeReindexConflictError
    ) {
      res.status(409).json({
        error: {
          code:
            "KNOWLEDGE_REINDEX_CONFLICT",
          message:
            "Knowledge document cannot be indexed in its current state",
        },
      });

      return;
    }

    if (
      error instanceof
      StaffKnowledgeEmbeddingUnavailableError
    ) {
      res.status(503).json({
        error: {
          code:
            "EMBEDDING_SERVICE_UNAVAILABLE",
          message:
            "Embedding service is temporarily unavailable",
        },
      });

      return;
    }

    console.error(
      "Reindex staff knowledge document failed:",
      error
    );

    res.status(500).json({
      error: {
        code:
          "INTERNAL_SERVER_ERROR",
        message:
          "Unable to reindex knowledge document",
      },
    });
  }
}