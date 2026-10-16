import {
  type EmbeddingProvider,
  type EmbeddingResult,
} from "./embedding-provider";

function createDevEmbedding(
  text: string
): number[] {
  const vector =
    new Array<number>(8).fill(0);

  const normalized =
    text.toLowerCase();

  for (
    let index = 0;
    index < normalized.length;
    index += 1
  ) {
    const bucket =
      index % vector.length;

    vector[bucket] +=
      normalized.charCodeAt(index) /
      1000;
  }

  const magnitude =
    Math.sqrt(
      vector.reduce(
        (total, value) =>
          total + value * value,
        0
      )
    );

  if (magnitude === 0) {
    return vector;
  }

  return vector.map(
    (value) =>
      value / magnitude
  );
}

class DevEmbeddingProvider
  implements EmbeddingProvider {
  readonly modelKey =
    "dev-local-v1";

  async embedTexts(
    texts: string[]
  ): Promise<EmbeddingResult> {
    return {
      modelKey:
        this.modelKey,

      embeddings:
        texts.map(
          createDevEmbedding
        ),
    };
  }
}

export const devEmbeddingProvider =
  new DevEmbeddingProvider();