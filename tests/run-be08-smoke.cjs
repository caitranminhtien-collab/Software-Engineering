"use strict";

const { spawn } = require("node:child_process");
const { randomUUID } = require("node:crypto");
const { once } = require("node:events");
const fs = require("node:fs/promises");
const net = require("node:net");
const os = require("node:os");
const path = require("node:path");
const { setTimeout: delay } = require("node:timers/promises");
const fixture = require("./fixtures/be08/fixture.cjs");
const { prepareFixture } = require("./fixtures/be08/prepare.cjs");
const { runSmoke } = require("./BE08-smoke.cjs");
const { safeDiagnostics } = require("./fixtures/be08/diagnostics.cjs");

const root = path.resolve(__dirname, "..");
const runId = randomUUID().replaceAll("-", "");
const databaseName = `hue_be08_test_${runId}`;
const ownerLabel = "hue.be08.run";
const controller = new AbortController();
const deadline = setTimeout(() => {
  controller.abort();
}, 180_000);

// Copy only process-launch essentials. Never load .env or inherit app secrets.
const environment = {};
const allowedKeys = new Set([
  "path", "systemroot", "windir", "temp", "tmp", "tmpdir",
]);

for (const key of Object.keys(process.env)) {
  if (allowedKeys.has(key.toLowerCase())) {
    environment[key] = process.env[key];
  }
}

let temporaryRoot;
let client;
let backend;
let backendClosed;
let stage = "prerequisites";
let smokeResult;
let failed = false;
const containers = [];
const reportedErrors = new WeakSet();

async function step(label, operation) {
  stage = label;
  console.log(`BE08 START: ${label}`);
  try {
    const result = await operation();
    console.log(`BE08 OK: ${label}`);
    return result;
  } catch (error) {
    if (!reportedErrors.has(error)) {
      console.error(
        `BE08 ERROR: ${label} ${JSON.stringify(safeDiagnostics(error))}`
      );
      reportedErrors.add(error);
    }
    throw error;
  }
}

function interrupt() {
  controller.abort();
}

process.on("SIGINT", interrupt);
process.on("SIGTERM", interrupt);

async function command(executable, args, cleanup = false) {
  const child = spawn(executable, args, {
    cwd: root,
    env: environment,
    windowsHide: true,
    stdio: ["ignore", "pipe", "pipe"],
    signal: cleanup ? undefined : controller.signal,
  });
  let output = "";
  child.stdout.on("data", (chunk) => {
    output += chunk.toString();
    if (output.length > 1_000_000) {
      child.kill();
    }
  });
  // Do not print CLI diagnostics: Docker errors may contain host configuration.
  child.stderr.resume();
  const timer = setTimeout(() => {
    child.kill();
  }, 30_000);

  try {
    const [code] = await once(child, "close");
    if (code !== 0) {
      const error = new Error("Command failed");
      error.exitStatus = code;
      throw error;
    }
    return output.trim();
  } finally {
    clearTimeout(timer);
  }
}

async function docker(args, cleanup = false) {
  return command(
    "docker",
    ["--config", path.join(temporaryRoot, "docker-config"), ...args],
    cleanup
  );
}

async function inspectOwned(resource, cleanup = false) {
  const output = await docker(["inspect", resource.name], cleanup);
  const records = JSON.parse(output);
  const record = records[0];

  if (
    records.length !== 1 ||
    record.Name !== `/${resource.name}` ||
    record.Config.Labels[ownerLabel] !== runId
  ) {
    throw new Error("Container ownership not verified");
  }

  if (
    resource.kind === "postgres" &&
    !record.Config.Env.includes(`POSTGRES_DB=${databaseName}`)
  ) {
    throw new Error("Database container target not verified");
  }

  return record;
}

async function startContainer(kind, image, containerPort, extra) {
  const resource = {
    kind,
    name: `hue-be08-${kind}-${runId}`,
    created: false,
  };
  containers.push(resource);

  // docker create never starts a process or writes fixture data.
  await docker([
    "create",
    "--name", resource.name,
    "--label", `${ownerLabel}=${runId}`,
    "--publish", `127.0.0.1::${containerPort}`,
    ...extra,
    image,
  ]);
  resource.created = true;
  await inspectOwned(resource);
  await docker(["start", resource.name]);
  const record = await inspectOwned(resource);
  const bindings = record.NetworkSettings.Ports[`${containerPort}/tcp`];

  if (
    bindings.length !== 1 ||
    bindings[0].HostIp !== "127.0.0.1"
  ) {
    throw new Error("Loopback binding not verified");
  }

  resource.port = Number(bindings[0].HostPort);
  if (!Number.isInteger(resource.port) || resource.port < 1) {
    throw new Error("Invalid container port");
  }
  return resource;
}

async function verifyDatabase(postgres) {
  await inspectOwned(postgres);
  if (
    client.host !== "127.0.0.1" ||
    client.port !== postgres.port ||
    client.database !== databaseName
  ) {
    throw new Error("Database connection target not verified");
  }
  const result = await client.query(
    "SELECT current_database() AS name, current_user AS username"
  );
  if (
    result.rows[0].name !== databaseName ||
    result.rows[0].username !== "hue_app"
  ) {
    throw new Error("Database identity not verified");
  }
}

async function unusedPort() {
  const server = net.createServer();
  server.listen(0, "127.0.0.1");
  await once(server, "listening");
  const port = server.address().port;
  await new Promise((resolve, reject) => {
    server.close((error) => {
      if (error) {
        reject(error);
        return;
      }
      resolve();
    });
  });
  return port;
}

async function waitUntilReady(baseUrl) {
  const started = Date.now();
  while (Date.now() - started < 30_000) {
    controller.signal.throwIfAborted();
    if (backend.exitCode !== null || backend.signalCode !== null) {
      throw new Error("Backend exited before readiness");
    }
    try {
      const response = await fetch(`${baseUrl}/api/v1/health/ready`, {
        method: "GET",
        redirect: "error",
        signal: AbortSignal.any([
          controller.signal,
          AbortSignal.timeout(1_000),
        ]),
      });
      const body = await response.json();
      if (response.status === 200 && body.status === "ready") {
        return;
      }
    } catch {
      controller.signal.throwIfAborted();
    }
    await delay(250, undefined, { signal: controller.signal });
  }
  throw new Error("Readiness timeout");
}

async function execute() {
  temporaryRoot = await fs.mkdtemp(path.join(os.tmpdir(), "hue-be08-"));
  await fs.mkdir(path.join(temporaryRoot, "docker-config"));
  // A private Docker config avoids reading the user's registry credentials.
  await fs.writeFile(
    path.join(temporaryRoot, "docker-config", "config.json"),
    "{}\n"
  );
  const { Client } = require("pg");
  await step("prerequisite Docker daemon", async () => {
    await docker(["info", "--format", "{{.ServerVersion}}"]);
  });
  for (const image of ["postgres:18", "redis:7-alpine"]) {
    await step(`prerequisite image ${image}`, async () => {
      await docker(["image", "inspect", image]);
    });
  }

  stage = "temporary build";
  const buildDirectory = path.join(temporaryRoot, "dist");
  await step("temporary TypeScript build", async () => {
    await command(process.execPath, [
      path.join(root, "node_modules", "typescript", "lib", "tsc.js"),
      "--project", path.join(root, "tsconfig.json"),
      "--outDir", buildDirectory,
      "--incremental", "false",
    ]);
  });

  stage = "isolated services";
  const postgres = await step("create isolated PostgreSQL", async () => {
    return startContainer("postgres", "postgres:18", 5432, [
      "--env", "POSTGRES_USER=hue_app",
      "--env", "POSTGRES_PASSWORD=be08-disposable-test-only",
      "--env", `POSTGRES_DB=${databaseName}`,
      "--health-cmd",
      `pg_isready -h 127.0.0.1 -U hue_app -d ${databaseName}`,
      "--health-interval", "1s",
      "--health-timeout", "2s",
      "--health-retries", "30",
    ]);
  });
  const redis = await step("create isolated Redis", async () => {
    return startContainer("redis", "redis:7-alpine", 6379, []);
  });

  await step("PostgreSQL health", async () => {
    const started = Date.now();
    while (true) {
      const record = await inspectOwned(postgres);
      if (record.State.Health.Status === "healthy") {
        break;
      }
      if (Date.now() - started > 35_000) {
        throw new Error("PostgreSQL health timeout");
      }
      await delay(250, undefined, { signal: controller.signal });
    }
  });

  client = new Client({
    host: "127.0.0.1",
    port: postgres.port,
    database: databaseName,
    user: "hue_app",
    password: "be08-disposable-test-only",
    ssl: false,
    connectionTimeoutMillis: 5_000,
    query_timeout: 5_000,
    statement_timeout: 5_000,
  });
  client.on("error", () => {
    controller.abort();
  });
  await step("connect isolated PostgreSQL", async () => {
    await client.connect();
  });

  async function write(sql, parameters, label) {
    return step(label, async () => {
      controller.signal.throwIfAborted();
      await verifyDatabase(postgres);
      return client.query(sql, parameters);
    });
  }

  stage = "verified test schema and fixture";
  await step("verify BE08 database identity", async () => {
    await verifyDatabase(postgres);
  });
  await step("verify empty BE08 database", async () => {
    const existing = await client.query(
      "SELECT COUNT(*)::int AS count FROM information_schema.tables " +
      "WHERE table_schema = 'public' AND table_type = 'BASE TABLE'"
    );
    if (existing.rows[0].count !== 0) {
      throw new Error("Expected an empty BE08 database");
    }
  });

  const migrations = [
    "src/database/migrations/001_core_schema.sql",
    "M25_01_create_attraction_localization_revisions.sql",
    "M26_02_create_visitor_events.sql",
    "src/database/migrations/20261026_visitor_presence_last_seen.sql",
    "src/database/migrations/007_add_performance_indexes.sql",
    "src/database/migrations/008_allow_relative_media_url.sql",
  ];
  for (const migration of migrations) {
    const sql = await fs.readFile(path.join(root, migration), "utf8");
    // pg's SQL parser does not consume a UTF-8 BOM like psql does.
    await write(
      sql
        .replace(/^\uFEFF/, "")
        .replace(/^\\encoding UTF8\r?\n/m, ""),
      undefined,
      `migration ${migration}`
    );
  }

  const mediaPath = await step("prepare fixture", async () => {
    return prepareFixture(write);
  });
  const mediaFile = path.join(temporaryRoot, ...mediaPath.split("/"));
  await step("write temporary fixture PNG", async () => {
    await fs.mkdir(path.dirname(mediaFile), { recursive: true });
    await fs.writeFile(mediaFile, fixture.mediaBytes);
  });

  stage = "backend readiness";
  const port = await unusedPort();
  const baseUrl = `http://127.0.0.1:${port}`;
  backend = spawn(process.execPath, [path.join(buildDirectory, "server.js")], {
    cwd: temporaryRoot,
    env: {
      ...environment,
      NODE_PATH: path.join(root, "node_modules"),
      NODE_ENV: "test",
      DOTENV_CONFIG_PATH: path.join(temporaryRoot, "disabled.env"),
      DOTENV_CONFIG_QUIET: "true",
      PORT: String(port),
      DB_HOST: "127.0.0.1",
      DB_PORT: String(postgres.port),
      DB_NAME: databaseName,
      DB_USER: "hue_app",
      DB_PASSWORD: "be08-disposable-test-only",
      DB_SSL: "false",
      REDIS_URL: `redis://127.0.0.1:${redis.port}`,
      SESSION_SECRET: "be08-disposable-session-test-only",
      EMBEDDING_PROVIDER: "dev",
      CHAT_PROVIDER: "extractive",
      OPENAI_API_KEY: "",
      GEMINI_API_KEY: "",
      GOOGLE_API_KEY: "",
      MEDIA_LEGACY_ORIGINS: "",
    },
    windowsHide: true,
    // Raw application errors are not copied to logs or artifacts.
    stdio: "ignore",
  });
  backendClosed = new Promise((resolve) => {
    backend.once("close", resolve);
    backend.once("error", () => {
      controller.abort();
    });
  });
  await step("backend readiness", async () => {
    await waitUntilReady(baseUrl);
  });

  stage = "GET smoke assertions";
  smokeResult = await step("GET smoke assertions", async () => {
    return runSmoke(baseUrl, controller.signal);
  });
}

async function cleanup() {
  const errors = [];
  if (backend) {
    try {
      backend.kill();
      const forceTimer = setTimeout(() => {
        backend.kill("SIGKILL");
      }, 2_000);
      try {
        await step("cleanup backend process", async () => {
          await backendClosed;
        });
      } finally {
        clearTimeout(forceTimer);
      }
    } catch {
      errors.push("backend process");
    }
  }
  if (client) {
    try {
      await step("cleanup database connection", async () => {
        await client.end();
      });
    } catch {
      errors.push("database connection");
    }
  }

  for (const resource of containers.reverse()) {
    if (!resource.created) {
      // A failed create may still have allocated a container. Inspect by the
      // unique name, and only clean up after ownership verification below.
      try {
        const remaining = await docker([
          "container", "ls", "--all",
          "--filter", `name=^/${resource.name}$`,
          "--format", "{{.ID}}",
        ], true);
        if (!remaining) {
          continue;
        }
      } catch {
        errors.push(`unverified ${resource.kind} allocation ${resource.name}`);
        continue;
      }
    }
    try {
      await step(`cleanup owned ${resource.kind} container`, async () => {
        await inspectOwned(resource, true);
        await docker(["rm", "--force", "--volumes", resource.name], true);
        const remaining = await docker([
          "container", "ls", "--all",
          "--filter", `name=^/${resource.name}$`,
          "--format", "{{.ID}}",
        ], true);
        if (remaining) {
          throw new Error("Container still exists after removal");
        }
      });
    } catch {
      errors.push(`owned ${resource.kind} container ${resource.name}`);
    }
  }

  if (temporaryRoot) {
    try {
      const resolved = path.resolve(temporaryRoot);
      if (
        path.dirname(resolved) !== path.resolve(os.tmpdir()) ||
        !path.basename(resolved).startsWith("hue-be08-")
      ) {
        throw new Error("Temporary directory target not verified");
      }
      await step("cleanup temporary directory", async () => {
        await fs.rm(resolved, { recursive: true, force: true });
      });
    } catch {
      errors.push("owned temporary directory");
    }
  }
  if (errors.length > 0) {
    console.error(`BE08 cleanup failed: ${errors.join(", ")}.`);
    failed = true;
  }
}

async function main() {
  try {
    await execute();
  } catch (error) {
    failed = true;
    if (!reportedErrors.has(error)) {
      console.error(
        `BE08 ERROR: ${stage} ${JSON.stringify(safeDiagnostics(error))}`
      );
    }
    if (stage === "prerequisites" || stage.startsWith("prerequisite ")) {
      console.error(
        "BE08 BLOCKED / CHƯA CHẠY: cần dependency local, Docker daemon " +
        "và image postgres:18, redis:7-alpine đã có sẵn."
      );
    } else {
      console.error(`BE08 FAIL: ${stage}; raw diagnostics suppressed.`);
    }
  } finally {
    clearTimeout(deadline);
    await cleanup();
    process.removeListener("SIGINT", interrupt);
    process.removeListener("SIGTERM", interrupt);
  }

  if (controller.signal.aborted) {
    failed = true;
  }
  if (failed) {
    process.exitCode = 1;
    return;
  }
  console.log(
    `BE08 PASS: ${smokeResult.checks} GET checks; ` +
    `${smokeResult.attractions} attractions; ${smokeResult.stops} stops; ` +
    "media MIME/bytes matched; cleanup completed."
  );
}

void main();
