import {
  findApprovedKnowledgeChunks,
  type KnowledgeChunkRow,
} from "../repositories/knowledge.repository";

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

function calculateScore(
  question: string,
  chunk: KnowledgeChunkRow,
  attractionId: number | null
): number {
  const keywords =
    getKeywords(
      question
    );

  if (
    keywords.length === 0
  ) {
    return 0;
  }

  const normalizedTitle =
    normalizeText(
      chunk.title
    );

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

  /*
   * attraction_id chỉ là request context.
   * Chỉ boost khi chunk đã có lexical match,
   * tránh trả nội dung không liên quan chỉ vì
   * cùng attraction.
   */
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
    requestedChunks.length >
      0 ||
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

  const scoredChunks =
    chunks
      .map((chunk) => ({
        chunk,
        score:
          calculateScore(
            question,
            chunk,
            attractionId
          ),
      }))
      .filter(
        (item) =>
          item.score > 0
      )
      .sort(
        (a, b) =>
          b.score -
          a.score
      );

  const bestScore =
    scoredChunks[0]
      ?.score ?? 0;

  /*
   * Chỉ giữ các chunk đủ gần
   * với kết quả tốt nhất.
   */
  const minimumRelevantScore =
    bestScore <= 2
      ? bestScore
      : Math.ceil(
          bestScore *
            0.5
        );

  const matches =
    scoredChunks
      .filter(
        (item) =>
          item.score >=
          minimumRelevantScore
      )
      .slice(0, 3)
      .map(
        ({
          chunk,
          score,
        }) => ({
          content:
            chunk.content,

          score,

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