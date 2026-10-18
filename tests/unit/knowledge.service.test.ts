import {
  afterEach,
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from "vitest";

vi.mock(
  "../../src/repositories/knowledge.repository",
  () => ({
    findApprovedKnowledgeChunks:
      vi.fn(),
  })
);

vi.mock(
  "../../src/adapters/embedding/embedding-provider.factory",
  () => ({
    getEmbeddingProvider:
      vi.fn(),
  })
);

import {
  findApprovedKnowledgeChunks,
  type KnowledgeChunkRow,
} from "../../src/repositories/knowledge.repository";

import {
  getEmbeddingProvider,
} from "../../src/adapters/embedding/embedding-provider.factory";

import {
  EmbeddingProviderError,
  type EmbeddingProvider,
} from "../../src/adapters/embedding/embedding-provider";

import {
  KnowledgeEmbeddingUnavailableError,
  searchKnowledge,
} from "../../src/services/knowledge.service";

function createChunk(
  overrides:
    Partial<KnowledgeChunkRow> = {}
): KnowledgeChunkRow {
  return {
    chunk_id: "1",
    document_id: "1",
    document_version: 1,
    chunk_order: 1,

    content:
      "Chùa Thiên Mụ là một di tích lịch sử nổi tiếng tại Huế.",

    embedding_model:
      null,

    embedding:
      null,

    attraction_id:
      "3",

    title:
      "Lịch sử Chùa Thiên Mụ",

    language_code:
      "vi",

    source_url:
      "https://example.com/source",

    source_credit:
      "TEST_SOURCE",

    ...overrides,
  };
}

function createProvider(
  modelKey: string
): EmbeddingProvider {
  return {
    modelKey,

    embedTexts:
      vi.fn(),
  };
}

describe(
  "knowledge.service",
  () => {
    const originalSemanticThreshold =
      process.env
        .KNOWLEDGE_SEMANTIC_MIN_SCORE;

    beforeEach(() => {
      vi.mocked(
        findApprovedKnowledgeChunks
      ).mockReset();

      vi.mocked(
        getEmbeddingProvider
      ).mockReset();

      process.env
        .KNOWLEDGE_SEMANTIC_MIN_SCORE =
        "0.35";
    });

    afterEach(() => {
      if (
        originalSemanticThreshold ===
        undefined
      ) {
        delete process.env
          .KNOWLEDGE_SEMANTIC_MIN_SCORE;
      } else {
        process.env
          .KNOWLEDGE_SEMANTIC_MIN_SCORE =
          originalSemanticThreshold;
      }
    });

    it(
      "returns a lexical match",
      async () => {
        const provider =
          createProvider(
            "dev-local-v1"
          );

        vi.mocked(
          getEmbeddingProvider
        ).mockReturnValue(
          provider
        );

        vi.mocked(
          findApprovedKnowledgeChunks
        ).mockResolvedValue([
          createChunk(),
        ]);

        const result =
          await searchKnowledge(
            "Thiên Mụ lịch sử",
            "vi",
            3
          );

        expect(
          result.matches
        ).toHaveLength(1);

        expect(
          result.matches[0]
            .citation
            .document_id
        ).toBe(1);

        expect(
          result.content_language
        ).toBe("vi");

        expect(
          result.fallback_used
        ).toBe(false);
      }
    );

    it(
      "uses semantic similarity for a compatible production embedding model",
      async () => {
        const provider =
          createProvider(
            "test-semantic-v1"
          );

        vi.mocked(
          provider.embedTexts
        ).mockResolvedValue({
          modelKey:
            "test-semantic-v1",

          embeddings: [
            [1, 0],
          ],
        });

        vi.mocked(
          getEmbeddingProvider
        ).mockReturnValue(
          provider
        );

        vi.mocked(
          findApprovedKnowledgeChunks
        ).mockResolvedValue([
          createChunk({
            chunk_id: "10",
            document_id: "10",

            title:
              "Tài liệu A",

            content:
              "Nội dung A",

            embedding_model:
              "test-semantic-v1",

            embedding:
              [1, 0],
          }),

          createChunk({
            chunk_id: "11",
            document_id: "11",

            title:
              "Tài liệu B",

            content:
              "Nội dung B",

            embedding_model:
              "test-semantic-v1",

            embedding:
              [0, 1],
          }),
        ]);

        const result =
          await searchKnowledge(
            "câu hỏi không có từ khóa trùng",
            "vi",
            null
          );

        expect(
          provider.embedTexts
        ).toHaveBeenCalledWith([
          "câu hỏi không có từ khóa trùng",
        ]);

        expect(
          result.matches
        ).toHaveLength(1);

        expect(
          result.matches[0]
            .citation
            .document_id
        ).toBe(10);
      }
    );

    it(
      "prioritizes a matching attraction when lexical scores are relevant",
      async () => {
        const provider =
          createProvider(
            "dev-local-v1"
          );

        vi.mocked(
          getEmbeddingProvider
        ).mockReturnValue(
          provider
        );

        vi.mocked(
          findApprovedKnowledgeChunks
        ).mockResolvedValue([
          createChunk({
            chunk_id: "20",
            document_id: "20",

            attraction_id:
              null,

            title:
              "Lịch sử",

            content:
              "Địa điểm có lịch sử lâu đời.",
          }),

          createChunk({
            chunk_id: "21",
            document_id: "21",

            attraction_id:
              "3",

            title:
              "Lịch sử",

            content:
              "Địa điểm có lịch sử lâu đời.",
          }),
        ]);

        const result =
          await searchKnowledge(
            "lịch sử",
            "vi",
            3
          );

        expect(
          result.matches.length
        ).toBeGreaterThan(0);

        expect(
          result.matches[0]
            .citation
            .attraction_id
        ).toBe(3);
      }
    );

    it(
      "falls back from en to vi when English knowledge is unavailable",
      async () => {
        const provider =
          createProvider(
            "dev-local-v1"
          );

        vi.mocked(
          getEmbeddingProvider
        ).mockReturnValue(
          provider
        );

        vi.mocked(
          findApprovedKnowledgeChunks
        ).mockImplementation(
          async (
            languageCode
          ) => {
            if (
              languageCode === "en"
            ) {
              return [];
            }

            return [
              createChunk({
                language_code:
                  "vi",
              }),
            ];
          }
        );

        const result =
          await searchKnowledge(
            "Thiên Mụ",
            "en",
            3
          );

        expect(
          findApprovedKnowledgeChunks
        ).toHaveBeenNthCalledWith(
          1,
          "en",
          3
        );

        expect(
          findApprovedKnowledgeChunks
        ).toHaveBeenNthCalledWith(
          2,
          "vi",
          3
        );

        expect(
          result.content_language
        ).toBe("vi");

        expect(
          result.fallback_used
        ).toBe(true);

        expect(
          result.matches.length
        ).toBeGreaterThan(0);
      }
    );

    it(
      "returns no matches when chunks are unrelated",
      async () => {
        const provider =
          createProvider(
            "dev-local-v1"
          );

        vi.mocked(
          getEmbeddingProvider
        ).mockReturnValue(
          provider
        );

        vi.mocked(
          findApprovedKnowledgeChunks
        ).mockResolvedValue([
          createChunk({
            title:
              "Ẩm thực Huế",

            content:
              "Món ăn truyền thống.",
          }),
        ]);

        const result =
          await searchKnowledge(
            "kiến trúc hoàng cung",
            "vi",
            null
          );

        expect(
          result.matches
        ).toEqual([]);
      }
    );

    it(
      "ignores embeddings created by a different embedding model",
      async () => {
        const provider =
          createProvider(
            "current-model"
          );

        vi.mocked(
          getEmbeddingProvider
        ).mockReturnValue(
          provider
        );

        vi.mocked(
          findApprovedKnowledgeChunks
        ).mockResolvedValue([
          createChunk({
            title:
              "Không liên quan",

            content:
              "Nội dung khác",

            embedding_model:
              "old-model",

            embedding:
              [1, 0],
          }),
        ]);

        const result =
          await searchKnowledge(
            "câu hỏi semantic",
            "vi",
            null
          );

        expect(
          provider.embedTexts
        ).not.toHaveBeenCalled();

        expect(
          result.matches
        ).toEqual([]);
      }
    );

    it(
      "throws KnowledgeEmbeddingUnavailableError when the embedding provider fails",
      async () => {
        const provider =
          createProvider(
            "test-semantic-v1"
          );

        vi.mocked(
          provider.embedTexts
        ).mockRejectedValue(
          new EmbeddingProviderError(
            "Provider failed"
          )
        );

        vi.mocked(
          getEmbeddingProvider
        ).mockReturnValue(
          provider
        );

        vi.mocked(
          findApprovedKnowledgeChunks
        ).mockResolvedValue([
          createChunk({
            embedding_model:
              "test-semantic-v1",

            embedding:
              [1, 0],
          }),
        ]);

        await expect(
          searchKnowledge(
            "Thiên Mụ",
            "vi",
            3
          )
        ).rejects.toBeInstanceOf(
          KnowledgeEmbeddingUnavailableError
        );
      }
    );
  }
);