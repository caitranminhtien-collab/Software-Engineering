const {
  spawnSync,
} = require("node:child_process");

const {
  resolve,
} = require("node:path");

const result = spawnSync(
  process.execPath,
  ["dist/server.js"],
  {
    cwd: resolve(__dirname, ".."),
    stdio: "inherit",

    env: {
      ...process.env,

      NODE_ENV: "test",
      PORT: "3001",

      DB_HOST: "127.0.0.1",
      DB_PORT: "5434",
      DB_NAME: "hue_tourism_test",
      DB_USER: "hue_app",
      DB_PASSWORD: "hue_test_only",
      DB_SSL: "false",

      REDIS_URL: "redis://127.0.0.1:6380",

      SESSION_SECRET:
        "be06-local-test-session-secret",

      EMBEDDING_PROVIDER: "dev",
      CHAT_PROVIDER: "extractive",

      OPENAI_API_KEY: "",
      GEMINI_API_KEY: "",
      GOOGLE_API_KEY: "",
    },
  }
);

if (result.error) {
  console.error(result.error.message);
}

process.exitCode =
  result.error ? 1 : (result.status ?? 1);