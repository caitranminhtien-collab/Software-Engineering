export interface EmbeddingResult {
  modelKey: string;
  embeddings: number[][];
}

export interface EmbeddingProvider {
  readonly modelKey: string;

  embedTexts(
    texts: string[]
  ): Promise<EmbeddingResult>;
}

export class EmbeddingProviderError extends Error {
  constructor(message: string = "Embedding provider is unavailable") {
    super(message);
    this.name = "EmbeddingProviderError";
  }
}

export function isFiniteVector(
  value: unknown
): value is number[] {
  return (
    Array.isArray(value) &&
    value.length > 0 &&
    value.every(
      (item) =>
        typeof item === "number" &&
        Number.isFinite(item)
    )
  );
}