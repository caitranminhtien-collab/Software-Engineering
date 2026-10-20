import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("../../src/repositories/knowledge.repository", async (importOriginal) => {
  const actual = await importOriginal<
    typeof import("../../src/repositories/knowledge.repository")
  >();
  return { ...actual, findApprovedKnowledgeChunks: vi.fn() };
});

vi.mock(
  "../../src/adapters/embedding/embedding-provider.factory",
  async (importOriginal) => {
    const actual = await importOriginal<
      typeof import("../../src/adapters/embedding/embedding-provider.factory")
    >();
    return { ...actual, getEmbeddingProvider: vi.fn() };
  }
);

import {
  findApprovedKnowledgeChunks,
  type KnowledgeChunkRow,
} from "../../src/repositories/knowledge.repository";
import { getEmbeddingProvider } from "../../src/adapters/embedding/embedding-provider.factory";
import { searchKnowledge } from "../../src/services/knowledge.service";

const chunk = {
  chunk_id: "6",
  document_id: "4",
  document_version: 1,
  attraction_id: "3",
  title: "Lịch sử Chùa Thiên Mụ",
  language_code: "vi",
  source_url: null,
  source_credit: "TEST_SOURCE",
  content: "Chùa Thiên Mụ là một di tích lịch sử và văn hóa tại Huế.",
  embedding_model: "old-model-key",
  embedding: null,
} as unknown as KnowledgeChunkRow;

describe("Knowledge Retrieval weak lexical matching guard", () => {
  beforeEach(() => {
    vi.mocked(findApprovedKnowledgeChunks).mockReset();
    vi.mocked(getEmbeddingProvider).mockReset();

    vi.mocked(findApprovedKnowledgeChunks).mockResolvedValue([chunk]);
    vi.mocked(getEmbeddingProvider).mockReturnValue({
      modelKey: "dev-test",
      embedTexts: vi.fn(),
    } as ReturnType<typeof getEmbeddingProvider>);
  });

  it("rejects Sao Hoa even though cultural text contains van hoa", async () => {
    const result = await searchKnowledge(
      "Sao Hỏa có bao nhiêu mặt trăng?",
      "vi",
      3
    );
    expect(result.matches).toEqual([]);
  });

  it("keeps relevant named-attraction questions", async () => {
    const result = await searchKnowledge(
      "Chùa Thiên Mụ có gì đặc biệt?",
      "vi",
      3
    );
    expect(result.matches).toHaveLength(1);
    expect(result.matches[0].citation.document_id).toBe(4);
  });
});
