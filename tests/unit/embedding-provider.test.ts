import {
  afterEach,
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from "vitest";

describe(
  "Embedding providers",
  () => {
    const originalProvider =
      process.env
        .EMBEDDING_PROVIDER;

    const originalApiKey =
      process.env
        .OPENAI_API_KEY;

    const originalModel =
      process.env
        .OPENAI_EMBEDDING_MODEL;

    const originalDimensions =
      process.env
        .OPENAI_EMBEDDING_DIMENSIONS;

    beforeEach(() => {
      vi.resetModules();
    });

    afterEach(() => {
      if (
        originalProvider ===
        undefined
      ) {
        delete process.env
          .EMBEDDING_PROVIDER;
      } else {
        process.env
          .EMBEDDING_PROVIDER =
          originalProvider;
      }

      if (
        originalApiKey ===
        undefined
      ) {
        delete process.env
          .OPENAI_API_KEY;
      } else {
        process.env
          .OPENAI_API_KEY =
          originalApiKey;
      }

      if (
        originalModel ===
        undefined
      ) {
        delete process.env
          .OPENAI_EMBEDDING_MODEL;
      } else {
        process.env
          .OPENAI_EMBEDDING_MODEL =
          originalModel;
      }

      if (
        originalDimensions ===
        undefined
      ) {
        delete process.env
          .OPENAI_EMBEDDING_DIMENSIONS;
      } else {
        process.env
          .OPENAI_EMBEDDING_DIMENSIONS =
          originalDimensions;
      }

      vi.restoreAllMocks();
    });

    it(
      "creates an 8-dimensional dev embedding",
      async () => {
        const {
          devEmbeddingProvider,
        } =
          await import(
            "../../src/adapters/embedding/dev-embedding.provider"
          );

        const result =
          await devEmbeddingProvider
            .embedTexts([
              "Hue tourism",
            ]);

        expect(
          result.modelKey
        ).toBe(
          "dev-local-v1"
        );

        expect(
          result.embeddings
        ).toHaveLength(1);

        expect(
          result.embeddings[0]
        ).toHaveLength(8);
      }
    );

    it(
      "normalizes a non-empty dev embedding vector",
      async () => {
        const {
          devEmbeddingProvider,
        } =
          await import(
            "../../src/adapters/embedding/dev-embedding.provider"
          );

        const result =
          await devEmbeddingProvider
            .embedTexts([
              "Chùa Thiên Mụ",
            ]);

        const vector =
          result.embeddings[0];

        const magnitude =
          Math.sqrt(
            vector.reduce(
              (
                total,
                value
              ) =>
                total +
                value *
                  value,
              0
            )
          );

        expect(
          magnitude
        ).toBeCloseTo(
          1,
          10
        );
      }
    );

    it(
      "uses the dev provider by default",
      async () => {
        delete process.env
          .EMBEDDING_PROVIDER;

        const {
          getEmbeddingProvider,
        } =
          await import(
            "../../src/adapters/embedding/embedding-provider.factory"
          );

        const provider =
          getEmbeddingProvider();

        expect(
          provider.modelKey
        ).toBe(
          "dev-local-v1"
        );
      }
    );

    it(
      "selects the OpenAI provider when configured",
      async () => {
        process.env
          .EMBEDDING_PROVIDER =
          "openai";

        process.env
          .OPENAI_EMBEDDING_MODEL =
          "text-embedding-3-small";

        process.env
          .OPENAI_EMBEDDING_DIMENSIONS =
          "256";

        const {
          getEmbeddingProvider,
        } =
          await import(
            "../../src/adapters/embedding/embedding-provider.factory"
          );

        const provider =
          getEmbeddingProvider();

        expect(
          provider.modelKey
        ).toBe(
          "openai:text-embedding-3-small:256"
        );
      }
    );

    it(
      "throws when the configured provider is unsupported",
      async () => {
        process.env
          .EMBEDDING_PROVIDER =
          "unknown-provider";

        const {
          getEmbeddingProvider,
        } =
          await import(
            "../../src/adapters/embedding/embedding-provider.factory"
          );

        expect(
          () =>
            getEmbeddingProvider()
        ).toThrow(
          "Unsupported EMBEDDING_PROVIDER: unknown-provider"
        );
      }
    );

    it(
      "throws EmbeddingProviderError when OpenAI API key is missing",
      async () => {
        process.env
          .EMBEDDING_PROVIDER =
          "openai";

        delete process.env
          .OPENAI_API_KEY;

        const {
          openAIEmbeddingProvider,
        } =
          await import(
            "../../src/adapters/embedding/openai-embedding.provider"
          );

        const {
          EmbeddingProviderError,
        } =
          await import(
            "../../src/adapters/embedding/embedding-provider"
          );

        await expect(
          openAIEmbeddingProvider
            .embedTexts([
              "test",
            ])
        ).rejects.toBeInstanceOf(
          EmbeddingProviderError
        );
      }
    );
  }
);