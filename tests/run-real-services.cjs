const {
  spawnSync,
} = require("node:child_process");

const {
  resolve,
} = require("node:path");

const projectRoot = resolve(__dirname, "..");

// Cấu hình riêng cho tiến trình test.
// Không sửa .env hoặc biến môi trường của Terminal.
const testEnvironment = {
  ...process.env,

  NODE_ENV: "test",

  DB_HOST: "127.0.0.1",
  DB_PORT: process.env.TEST_DB_PORT || "5434",
  DB_NAME: "hue_tourism_test",
  DB_USER: "hue_app",
  DB_PASSWORD:
    process.env.TEST_DB_PASSWORD || "hue_test_only",
  DB_SSL: "false",

  REDIS_URL:
    process.env.TEST_REDIS_URL ||
    "redis://127.0.0.1:6380",

  SESSION_SECRET:
    "be03-test-session-secret-not-for-production",

  EMBEDDING_PROVIDER: "dev",
  CHAT_PROVIDER: "extractive",

  OPENAI_API_KEY: "",
  GEMINI_API_KEY: "",
  GOOGLE_API_KEY: "",
};

const testScripts = [
  "tests/BE01-analytics-regression.cjs",
  "tests/BE03-session-regression.cjs",
];

for (const testScript of testScripts) {
  console.log(`Running: ${testScript}`);

  const result = spawnSync(
    process.execPath,
    [testScript],
    {
      cwd: projectRoot,
      env: testEnvironment,
      stdio: "inherit",
      timeout: 60_000,
    }
  );

  if (result.error) {
    console.error(result.error.message);
    process.exit(1);
  }

  if (result.status !== 0) {
    process.exit(result.status || 1);
  }
}