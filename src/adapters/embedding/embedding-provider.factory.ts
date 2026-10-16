import {
  type EmbeddingProvider,
} from "./embedding-provider";

import {
  devEmbeddingProvider,
} from "./dev-embedding.provider";

import {
  openAIEmbeddingProvider,
} from "./openai-embedding.provider";

export function getEmbeddingProvider():
  EmbeddingProvider {
  const provider =
    process.env.EMBEDDING_PROVIDER
      ?.trim()
      .toLowerCase() ||
    "dev";

  if (provider === "dev") {
    return devEmbeddingProvider;
  }

  if (provider === "openai") {
    return openAIEmbeddingProvider;
  }

  throw new Error(
    `Unsupported EMBEDDING_PROVIDER: ${provider}`
  );
}