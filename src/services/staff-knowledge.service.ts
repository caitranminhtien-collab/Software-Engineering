import {
  findAllStaffKnowledgeDocuments,
  createDraftKnowledgeDocument,
  findStaffKnowledgeDocumentById,
  replaceKnowledgeChunksAtomically,
} from "../repositories/staff-knowledge.repository";

import {
  findStaffAttractionById,
} from "../repositories/staff-attraction.repository";

import {
  getEmbeddingProvider,
} from "../adapters/embedding/embedding-provider.factory";

import {
  EmbeddingProviderError,
} from "../adapters/embedding/embedding-provider";

export interface CreateStaffKnowledgeInput {
  attractionId: number | null;
  title: string;
  languageCode: string;
  sourceUrl: string | null;
  sourceCredit: string;
  bodyText: string;
}

export interface StaffKnowledgeResult {
  id: number;
  attraction_id: number | null;
  title: string;
  language_code: string;
  source_url: string | null;
  source_credit: string;
  body_text: string;
  version: number;
  status: string;
  created_by: number;
  approved_by: number | null;
  approved_at: Date | null;
}

export interface StaffKnowledgeReindexResult {
  id: number;
  version: number;
  chunk_count: number;
  embedding_model: string;
}

export class StaffKnowledgeAttractionNotFoundError
  extends Error {
  constructor() {
    super("Attraction not found");
    this.name =
      "StaffKnowledgeAttractionNotFoundError";
  }
}

export class StaffKnowledgeDocumentNotFoundError
  extends Error {
  constructor() {
    super("Knowledge document not found");
    this.name =
      "StaffKnowledgeDocumentNotFoundError";
  }
}

export class StaffKnowledgeReindexConflictError
  extends Error {
  constructor() {
    super(
      "Knowledge document cannot be indexed in its current state"
    );

    this.name =
      "StaffKnowledgeReindexConflictError";
  }
}

export class StaffKnowledgeEmbeddingUnavailableError
  extends Error {
  constructor() {
    super(
      "Embedding service is temporarily unavailable"
    );

    this.name =
      "StaffKnowledgeEmbeddingUnavailableError";
  }
}

function splitKnowledgeText(
  bodyText: string
): string[] {
  const normalized =
    bodyText
      .replace(/\r\n/g, "\n")
      .trim();

  if (!normalized) {
    return [];
  }

  const paragraphs =
    normalized
      .split(/\n+/)
      .map(
        (part) =>
          part.trim()
      )
      .filter(Boolean);

  const chunks: string[] = [];
  const maxLength = 600;

  for (
    const paragraph of paragraphs
  ) {
    if (
      paragraph.length <=
      maxLength
    ) {
      chunks.push(paragraph);
      continue;
    }

    const sentences =
      paragraph
        .split(
          /(?<=[.!?])\s+/
        )
        .map(
          (sentence) =>
            sentence.trim()
        )
        .filter(Boolean);

    let current = "";

    for (
      const sentence of sentences
    ) {
      const candidate =
        current
          ? `${current} ${sentence}`
          : sentence;

      if (
        candidate.length <=
        maxLength
      ) {
        current = candidate;
        continue;
      }

      if (current) {
        chunks.push(current);
      }

      if (
        sentence.length <=
        maxLength
      ) {
        current = sentence;
      } else {
        for (
          let start = 0;
          start <
          sentence.length;
          start += maxLength
        ) {
          chunks.push(
            sentence.slice(
              start,
              start + maxLength
            )
          );
        }

        current = "";
      }
    }

    if (current) {
      chunks.push(current);
    }
  }

  return chunks;
}

export async function createStaffKnowledgeDocument(
  input: CreateStaffKnowledgeInput,
  createdBy: number
): Promise<StaffKnowledgeResult> {
  if (
    input.attractionId !== null
  ) {
    const attraction =
      await findStaffAttractionById(
        input.attractionId
      );

    if (!attraction) {
      throw new StaffKnowledgeAttractionNotFoundError();
    }
  }

  const document =
    await createDraftKnowledgeDocument(
      input.attractionId,
      input.title,
      input.languageCode,
      input.sourceUrl,
      input.sourceCredit,
      input.bodyText,
      createdBy
    );

  return {
    id: Number(document.document_id),

    attraction_id:
      document.attraction_id === null
        ? null
        : Number(
            document.attraction_id
          ),

    title:
      document.title,

    language_code:
      document.language_code,

    source_url:
      document.source_url,

    source_credit:
      document.source_credit,

    body_text:
      document.body_text,

    version:
      Number(document.version),

    status:
      document.status,

    created_by:
      Number(document.created_by),

    approved_by:
      document.approved_by === null
        ? null
        : Number(
            document.approved_by
          ),

    approved_at:
      document.approved_at,
  };
}

export async function reindexStaffKnowledgeDocument(
  documentId: number
): Promise<StaffKnowledgeReindexResult> {
  const document =
    await findStaffKnowledgeDocumentById(
      documentId
    );

  if (!document) {
    throw new StaffKnowledgeDocumentNotFoundError();
  }

  if (
    document.status !==
    "in_review"
  ) {
    throw new StaffKnowledgeReindexConflictError();
  }

  const bodyText =
    document.body_text.trim();

  if (!bodyText) {
    throw new StaffKnowledgeReindexConflictError();
  }

  const textChunks =
    splitKnowledgeText(bodyText);

  if (
    textChunks.length === 0
  ) {
    throw new StaffKnowledgeReindexConflictError();
  }

  const provider =
    getEmbeddingProvider();

  let embeddingResult;

  try {
    embeddingResult =
      await provider.embedTexts(
        textChunks
      );
  } catch (error) {
    if (
      error instanceof
      EmbeddingProviderError
    ) {
      throw new StaffKnowledgeEmbeddingUnavailableError();
    }

    throw error;
  }

  if (
    embeddingResult.embeddings.length !==
      textChunks.length
  ) {
    throw new Error(
      "Embedding result count does not match chunk count"
    );
  }

  const chunks =
    textChunks.map(
      (content, index) => ({
        chunkOrder:
          index + 1,

        content,

        embeddingModel:
          embeddingResult.modelKey,

        embedding:
          embeddingResult
            .embeddings[index],
      })
    );

  const result =
    await replaceKnowledgeChunksAtomically(
      documentId,
      Number(
        document.version
      ),
      document.body_text,
      chunks
    );

  if (!result) {
    throw new StaffKnowledgeReindexConflictError();
  }

  return {
    id:
      result.documentId,

    version:
      result.version,

    chunk_count:
      result.chunkCount,

    embedding_model:
      embeddingResult.modelKey,
  };
}

export type StaffKnowledgeSummaryResult =
  Omit<StaffKnowledgeResult, "body_text">;

function mapStaffKnowledgeSummary(
  document: {
    document_id: string;
    attraction_id: string | null;
    title: string;
    language_code: string;
    source_url: string | null;
    source_credit: string;
    version: number;
    status: string;
    created_by: string;
    approved_by: string | null;
    approved_at: Date | null;
  }
): StaffKnowledgeSummaryResult {
  return {
    id: Number(document.document_id),
    attraction_id:
      document.attraction_id === null
        ? null
        : Number(document.attraction_id),
    title: document.title,
    language_code: document.language_code,
    source_url: document.source_url,
    source_credit: document.source_credit,
    version: Number(document.version),
    status: document.status,
    created_by: Number(document.created_by),
    approved_by:
      document.approved_by === null
        ? null
        : Number(document.approved_by),
    approved_at: document.approved_at,
  };
}

export async function listStaffKnowledgeDocuments(): Promise<
  StaffKnowledgeSummaryResult[]
> {
  const documents =
    await findAllStaffKnowledgeDocuments();

  return documents.map(mapStaffKnowledgeSummary);
}

export async function getStaffKnowledgeDocument(
  documentId: number
): Promise<StaffKnowledgeResult> {
  const document =
    await findStaffKnowledgeDocumentById(
      documentId
    );

  if (!document) {
    throw new StaffKnowledgeDocumentNotFoundError();
  }

  return {
    ...mapStaffKnowledgeSummary(document),
    body_text: document.body_text,
  };
}
