import {
  findApprovedKnowledgeChunks,
  type KnowledgeChunkRow,
} from "../repositories/knowledge.repository";

import {
  getEmbeddingProvider,
} from "../adapters/embedding/embedding-provider.factory";

import {
  EmbeddingProviderError,
  isFiniteVector,
} from "../adapters/embedding/embedding-provider";

export interface KnowledgeCitation {
  chunk_id: number;
  document_id: number;
  document_version: number;
  attraction_id: number | null;
  title: string;
  language_code: string;
  source_url: string | null;
  source_credit: string;
}

export interface KnowledgeMatch {
  content: string;
  score: number;
  citation: KnowledgeCitation;
}

export interface KnowledgeSearchResult {
  matches: KnowledgeMatch[];
  content_language: string;
  fallback_used: boolean;
}

export class KnowledgeEmbeddingUnavailableError
  extends Error {
  constructor() {
    super(
      "Knowledge embedding service is unavailable"
    );

    this.name =
      "KnowledgeEmbeddingUnavailableError";
  }
}

const STOP_WORDS = new Set([
  "la",
  "cua",
  "va",
  "co",
  "gi",
  "o",
  "tai",
  "mot",
  "nhung",
  "nay",
  "do",
  "cho",
  "ve",
  "duoc",
  "nhu",
  "the",
  "nao",
  "dac",
  "biet",
]);

function normalizeText(
  value: string
): string {
  return value
    .normalize("NFD")
    .replace(
      /[\u0300-\u036f]/g,
      ""
    )
    .replace(/đ/g, "d")
    .replace(/Đ/g, "D")
    .toLowerCase()
    .replace(
      /[^a-z0-9\s]/g,
      " "
    )
    .replace(/\s+/g, " ")
    .trim();
}

function getKeywords(
  value: string
): string[] {
  return [
    ...new Set(
      normalizeText(value)
        .split(" ")
        .filter(
          (word) =>
            word.length >= 2 &&
            !STOP_WORDS.has(
              word
            )
        )
    ),
  ];
}

function calculateLexicalScore(
  question: string,
  chunk: KnowledgeChunkRow,
  attractionId: number | null
): number {
  const keywords =
    getKeywords(question);

  if (
    keywords.length === 0
  ) {
    return 0;
  }

  const normalizedTitle =
    normalizeText(chunk.title);

  const normalizedContent =
    normalizeText(
      chunk.content
    );

  let score = 0;

  for (
    const keyword of keywords
  ) {
    if (
      normalizedTitle.includes(
        keyword
      )
    ) {
      score += 3;
    }

    if (
      normalizedContent.includes(
        keyword
      )
    ) {
      score += 1;
    }
  }

  if (
    score > 0 &&
    attractionId !== null &&
    chunk.attraction_id !==
      null &&
    Number(
      chunk.attraction_id
    ) === attractionId
  ) {
    score += 2;
  }

  return score;
}

function cosineSimilarity(
  left: number[],
  right: number[]
): number | null {
  if (
    left.length === 0 ||
    left.length !==
      right.length
  ) {
    return null;
  }

  let dot = 0;
  let leftMagnitude = 0;
  let rightMagnitude = 0;

  for (
    let index = 0;
    index <
    left.length;
    index += 1
  ) {
    const leftValue =
      left[index];

    const rightValue =
      right[index];

    dot +=
      leftValue *
      rightValue;

    leftMagnitude +=
      leftValue *
      leftValue;

    rightMagnitude +=
      rightValue *
      rightValue;
  }

  if (
    leftMagnitude === 0 ||
    rightMagnitude === 0
  ) {
    return null;
  }

  return (
    dot /
    (
      Math.sqrt(leftMagnitude) *
      Math.sqrt(rightMagnitude)
    )
  );
}

function getSemanticMinimumScore():
  number {
  const configured =
    Number(
      process.env
        .KNOWLEDGE_SEMANTIC_MIN_SCORE
    );

  if (
    Number.isFinite(configured) &&
    configured >= -1 &&
    configured <= 1
  ) {
    return configured;
  }

  return 0.35;
}

async function loadKnowledgeChunks(
  languageCode: string,
  attractionId: number | null
): Promise<{
  chunks: KnowledgeChunkRow[];
  contentLanguage: string;
  fallbackUsed: boolean;
}> {
  const requestedChunks =
    await findApprovedKnowledgeChunks(
      languageCode,
      attractionId
    );

  if (
    requestedChunks.length > 0 ||
    languageCode === "vi"
  ) {
    return {
      chunks:
        requestedChunks,

      contentLanguage:
        languageCode,

      fallbackUsed:
        false,
    };
  }

  const fallbackChunks =
    await findApprovedKnowledgeChunks(
      "vi",
      attractionId
    );

  return {
    chunks:
      fallbackChunks,

    contentLanguage:
      "vi",

    fallbackUsed:
      true,
  };
}

export async function searchKnowledge(
  question: string,
  languageCode: string,
  attractionId:
    | number
    | null = null
): Promise<KnowledgeSearchResult> {
  const {
    chunks,
    contentLanguage,
    fallbackUsed,
  } =
    await loadKnowledgeChunks(
      languageCode,
      attractionId
    );

  if (
    chunks.length === 0
  ) {
    return {
      matches: [],
      content_language:
        contentLanguage,
      fallback_used:
        fallbackUsed,
    };
  }

  const provider =
    getEmbeddingProvider();

  const hasCompatibleEmbeddings =
    chunks.some(
      (chunk) =>
        chunk.embedding_model ===
          provider.modelKey &&
        isFiniteVector(
          chunk.embedding
        )
    );

  let queryEmbedding:
    | number[]
    | null = null;

  if (
    hasCompatibleEmbeddings
  ) {
    try {
      const result =
        await provider.embedTexts([
          question,
        ]);

      queryEmbedding =
        result.embeddings[0] ??
        null;
    } catch (error) {
      if (
        error instanceof
        EmbeddingProviderError
      ) {
        throw new KnowledgeEmbeddingUnavailableError();
      }

      throw error;
    }
  }

  const semanticMinimum =
    getSemanticMinimumScore();

  const isDevProvider =
    provider.modelKey.startsWith(
      "dev-"
    );

  const scoredChunks =
    chunks
      .map((chunk) => {
        const lexicalScore =
          calculateLexicalScore(
            question,
            chunk,
            attractionId
          );

        let semanticScore:
          | number
          | null = null;

        if (
          queryEmbedding &&
          chunk.embedding_model ===
            provider.modelKey &&
          isFiniteVector(
            chunk.embedding
          )
        ) {
          semanticScore =
            cosineSimilarity(
              queryEmbedding,
              chunk.embedding
            );
        }

        const relevant =
          isDevProvider
            ? lexicalScore > 0
            : (
                lexicalScore > 0 ||
                (
                  semanticScore !==
                    null &&
                  semanticScore >=
                    semanticMinimum
                )
              );

        const combinedScore =
          lexicalScore +
          (
            semanticScore === null
              ? 0
              : isDevProvider
              ? semanticScore *
                0.25
              : semanticScore *
                10
          );

        return {
          chunk,
          combinedScore,
          relevant,
        };
      })
      .filter(
        (item) =>
          item.relevant
      )
      .sort(
        (a, b) =>
          b.combinedScore -
          a.combinedScore
      );

  const bestScore =
    scoredChunks[0]
      ?.combinedScore ?? 0;

  const minimumRelevantScore =
    bestScore <= 2
      ? bestScore
      : bestScore * 0.5;

  const matches =
    scoredChunks
      .filter(
        (item) =>
          item.combinedScore >=
          minimumRelevantScore
      )
      .slice(0, 3)
      .map(
        ({
          chunk,
          combinedScore,
        }) => ({
          content:
            chunk.content,

          score:
            Number(
              combinedScore
                .toFixed(6)
            ),

          citation: {
            chunk_id:
              Number(
                chunk.chunk_id
              ),

            document_id:
              Number(
                chunk.document_id
              ),

            document_version:
              Number(
                chunk.document_version
              ),

            attraction_id:
              chunk.attraction_id ===
              null
                ? null
                : Number(
                    chunk.attraction_id
                  ),

            title:
              chunk.title,

            language_code:
              chunk.language_code,

            source_url:
              chunk.source_url,

            source_credit:
              chunk.source_credit,
          },
        })
      );

  return {
    matches,

    content_language:
      contentLanguage,

    fallback_used:
      fallbackUsed,
  };
}