import {
  EmbeddingProviderError,
  isFiniteVector,
  type EmbeddingProvider,
  type EmbeddingResult,
} from "./embedding-provider";

interface OpenAIEmbeddingItem {
  index: number;
  embedding: number[];
}

interface OpenAIEmbeddingResponse {
  data?: OpenAIEmbeddingItem[];
}

function getPositiveInteger(
  rawValue: string | undefined,
  fallback: number
): number {
  const parsed = Number(rawValue);

  return (
    Number.isInteger(parsed) &&
    parsed > 0
  )
    ? parsed
    : fallback;
}

class OpenAIEmbeddingProvider
  implements EmbeddingProvider {
  private readonly apiKey =
    process.env.OPENAI_API_KEY
      ?.trim() ?? "";

  private readonly model =
    process.env.OPENAI_EMBEDDING_MODEL
      ?.trim() ||
    "text-embedding-3-small";

  private readonly dimensions =
    getPositiveInteger(
      process.env.OPENAI_EMBEDDING_DIMENSIONS,
      256
    );

  private readonly timeoutMs =
    getPositiveInteger(
      process.env.OPENAI_EMBEDDING_TIMEOUT_MS,
      15000
    );

  private readonly endpoint =
    process.env.OPENAI_EMBEDDING_ENDPOINT
      ?.trim() ||
    "https://api.openai.com/v1/embeddings";

  readonly modelKey =
    `openai:${this.model}:${this.dimensions}`;

  async embedTexts(
    texts: string[]
  ): Promise<EmbeddingResult> {
    if (texts.length === 0) {
      return {
        modelKey: this.modelKey,
        embeddings: [],
      };
    }

    if (!this.apiKey) {
      throw new EmbeddingProviderError(
        "OPENAI_API_KEY is not configured"
      );
    }

    let response: Response;

    try {
      response =
        await fetch(
          this.endpoint,
          {
            method: "POST",

            headers: {
              Authorization:
                `Bearer ${this.apiKey}`,

              "Content-Type":
                "application/json",
            },

            body:
              JSON.stringify({
                model:
                  this.model,

                input:
                  texts,

                encoding_format:
                  "float",

                dimensions:
                  this.dimensions,
              }),

            signal:
              AbortSignal.timeout(
                this.timeoutMs
              ),
          }
        );
    } catch {
      throw new EmbeddingProviderError();
    }

    if (!response.ok) {
      throw new EmbeddingProviderError(
        `Embedding provider returned HTTP ${response.status}`
      );
    }

    let payload:
      OpenAIEmbeddingResponse;

    try {
      payload =
        await response.json() as
          OpenAIEmbeddingResponse;
    } catch {
      throw new EmbeddingProviderError(
        "Embedding provider returned invalid JSON"
      );
    }

    if (
      !Array.isArray(payload.data) ||
      payload.data.length !==
        texts.length
    ) {
      throw new EmbeddingProviderError(
        "Embedding provider returned an unexpected result count"
      );
    }

    const embeddings =
      [...payload.data]
        .sort(
          (a, b) =>
            a.index -
            b.index
        )
        .map(
          (item) =>
            item.embedding
        );

    if (
      embeddings.some(
        (vector) =>
          !isFiniteVector(vector) ||
          vector.length !==
            this.dimensions
      )
    ) {
      throw new EmbeddingProviderError(
        "Embedding provider returned an invalid vector"
      );
    }

    return {
      modelKey:
        this.modelKey,

      embeddings,
    };
  }
}

export const openAIEmbeddingProvider =
  new OpenAIEmbeddingProvider();