"use strict";

const assert = require("node:assert/strict");
const { spawn } = require("node:child_process");
const { randomBytes } = require("node:crypto");
const { once } = require("node:events");
const fs = require("node:fs/promises");
const net = require("node:net");
const os = require("node:os");
const path = require("node:path");

const repository = path.resolve(__dirname, "../..");
const id = randomBytes(16).toString("hex");
const project = `hue-be10-${id}`;
const database = `hue_be10_test_${id}`;
const imageTags = [
  `hue-guide-backend:be10-${id}`,
  `hue-guide-frontend:be10-${id}`,
];
const observedAnonymousVolumes = new Set();
const environment = {};
const allowedEnvironment = new Set([
  "path", "systemroot", "windir", "temp", "tmp", "tmpdir",
]);
for (const key of Object.keys(process.env)) {
  if (allowedEnvironment.has(key.toLowerCase())) {
    environment[key] = process.env[key];
  }
}
const controller = new AbortController();
const deadline = setTimeout(() => {
  controller.abort();
}, 600_000);
let temporaryRoot;
let composeArguments;
let stackAttempted = false;
let buildAttempted = false;
let stage = "prerequisites";
let failed = false;

function interrupt() {
  controller.abort();
}
process.on("SIGINT", interrupt);
process.on("SIGTERM", interrupt);

async function command(executable, args, options = {}) {
  const child = spawn(executable, args, {
    cwd: repository,
    env: environment,
    windowsHide: true,
    stdio: ["ignore", "pipe", "pipe"],
    signal: options.cleanup ? undefined : controller.signal,
  });
  let stdout = "";
  let stderr = "";
  child.stdout.on("data", (chunk) => {
    stdout += chunk.toString();
    if (stdout.length > 2_000_000) {
      child.kill();
    }
  });
  child.stderr.on("data", (chunk) => {
    stderr += chunk.toString();
    if (stderr.length > 2_000_000) {
      child.kill();
    }
  });
  const timer = setTimeout(() => {
    child.kill();
  }, options.timeout || 120_000);
  try {
    const [code] = await once(child, "close");
    if (code !== 0 && !options.allowFailure) {
      const error = new Error("BE10 command failed; raw diagnostics suppressed");
      error.exitStatus = code;
      throw error;
    }
    return { code, stdout: stdout.trim(), stderr };
  } finally {
    clearTimeout(timer);
  }
}

async function docker(args, options) {
  return command(
    "docker",
    [
      "--config",
      path.join(temporaryRoot, "docker-config"),
      ...args,
    ],
    options
  );
}

async function compose(args, options) {
  return docker(["compose", ...composeArguments, ...args], options);
}

async function step(label, operation) {
  stage = label;
  console.log(`BE10 START: ${label}`);
  const result = await operation();
  console.log(`BE10 OK: ${label}`);
  return result;
}

async function availablePort() {
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

async function resourceIds(kind, cleanup = false) {
  const { stdout } = await docker(
    [
      kind,
      "ls",
      ...(kind === "container" ? ["--all"] : []),
      "--filter",
      `label=com.docker.compose.project=${project}`,
      "--format",
      kind === "volume" ? "{{.Name}}" : "{{.ID}}",
    ],
    { cleanup }
  );
  return stdout.split(/\s+/).filter(Boolean);
}

async function verifyOwnedResources(cleanup = false) {
  for (const kind of ["container", "network", "volume"]) {
    for (const resourceId of await resourceIds(kind, cleanup)) {
      const { stdout } = await docker(
        [kind, "inspect", resourceId],
        { cleanup }
      );
      const records = JSON.parse(stdout);
      assert.equal(records.length, 1);
      const record = records[0];
      const labels = record.Labels || record.Config?.Labels;
      assert.equal(labels["com.docker.compose.project"], project);
      if (kind === "network") {
        assert.equal(record.Name, `${project}_default`);
      }
      if (kind === "volume") {
        assert.equal(record.Name, `${project}_postgres_data`);
      }
      if (kind === "container") {
        const service = labels["com.docker.compose.service"];
        assert.ok(["postgres", "redis", "backend", "frontend", "bootstrap"].includes(service));
        if (service === "postgres") {
          assert.ok(record.Config.Env.includes(`POSTGRES_DB=${database}`));
        }
        if (service === "backend") {
          assert.ok(record.Config.Env.includes(`DB_NAME=${database}`));
        }
        if (["postgres", "redis", "backend"].includes(service)) {
          assert.equal(Object.keys(record.HostConfig.PortBindings || {}).length, 0);
        }
        if (service === "frontend") {
          const bindings = record.HostConfig.PortBindings["80/tcp"];
          assert.equal(bindings.length, 1);
          assert.equal(bindings[0].HostIp, "127.0.0.1");
        }
        for (const mount of record.Mounts || []) {
          if (mount.Type === "volume" && mount.Name !== `${project}_postgres_data`) {
            assert.equal(service, "redis");
            assert.equal(mount.Destination, "/data");
            assert.match(mount.Name, /^[a-f0-9]{64}$/);
            observedAnonymousVolumes.add(mount.Name);
          }
        }
      }
    }
  }
}

async function prepare() {
  temporaryRoot = await fs.mkdtemp(path.join(os.tmpdir(), "hue-be10-"));
  const dockerConfig = path.join(temporaryRoot, "docker-config");
  await fs.mkdir(dockerConfig);
  const dockerSettings = {};
  if (process.platform === "win32") {
    const searchPath = Object.entries(environment).find(([key]) => {
      return key.toLowerCase() === "path";
    });
    for (const directory of (searchPath?.[1] || "").split(path.delimiter)) {
      const plugins = path.resolve(directory, "..", "cli-plugins");
      try {
        await fs.access(path.join(directory, "docker.exe"));
        await fs.access(path.join(plugins, "docker-compose.exe"));
        dockerSettings.cliPluginsExtraDirs = [plugins];
        break;
      } catch {
        // Inspect executable locations only; do not read user Docker config.
      }
    }
  }
  await fs.writeFile(
    path.join(dockerConfig, "config.json"),
    JSON.stringify(dockerSettings) + "\n"
  );
  const source = path.join(temporaryRoot, "context");
  await fs.mkdir(source);
  const { stdout: tracked } = await command("git", [
    "-c", `safe.directory=${repository}`, "ls-files", "-z",
  ]);
  const rootFiles = new Set([
    "Dockerfile", "Dockerfile.frontend", ".dockerignore",
    "package.json", "package-lock.json", "tsconfig.json",
    "deploy/nginx/default.conf",
  ]);
  // Copy only tracked build inputs; never read existing untracked files or .env.
  for (const file of tracked.split("\0").filter(Boolean)) {
    if (
      !rootFiles.has(file) &&
      !file.startsWith("src/") &&
      !file.startsWith("frontend/")
    ) {
      continue;
    }
    assert.ok(!file.split("/").some((part) => part.startsWith(".env")));
    const destination = path.join(source, file);
    await fs.mkdir(path.dirname(destination), { recursive: true });
    await fs.copyFile(path.join(repository, file), destination);
  }
  const uploads = path.join(temporaryRoot, "uploads");
  await fs.mkdir(uploads);
  await fs.chmod(uploads, 0o777);
  const port = await availablePort();
  const configFile = path.join(temporaryRoot, "synthetic.env");
  const settings = {
    BE04_POSTGRES_PASSWORD: randomBytes(24).toString("hex"),
    BE04_APP_PASSWORD: randomBytes(24).toString("hex"),
    BE04_SESSION_SECRET: randomBytes(32).toString("hex"),
    BE04_UPLOADS_PATH: uploads.replaceAll("\\", "/"),
    BE04_MEDIA_LEGACY_ORIGINS: "",
    BE04_DB_NAME: database,
    BE04_HTTP_PORT: String(port),
    BE04_BACKEND_IMAGE: imageTags[0],
    BE04_FRONTEND_IMAGE: imageTags[1],
    BE10_RUN_ID: id,
    BE10_BOOTSTRAP_CONFIRM: `new-empty-${id}`,
  };
  await fs.writeFile(configFile, Object.entries(settings).map(([key, value]) => {
    return `${key}=${value}`;
  }).join("\n") + "\n", { mode: 0o600 });
  const override = path.join(temporaryRoot, "build-context.json");
  await fs.writeFile(override, JSON.stringify({
    services: {
      backend: { build: { context: source } },
      frontend: { build: { context: source } },
    },
  }));
  composeArguments = [
    "--env-file", configFile,
    "--project-name", project,
    "--file", path.join(repository, "compose.staging.yml"),
    "--file", override,
  ];
  return { port, uploads };
}

async function sql(statement) {
  await verifyOwnedResources();
  const { stdout } = await compose([
    "exec", "-T", "postgres", "psql", "-X", "-A", "-t",
    "-v", "ON_ERROR_STOP=1", "-U", "postgres", "-d", database,
    "-c", statement,
  ]);
  return stdout;
}

async function get(url) {
  const response = await fetch(url, {
    method: "GET",
    redirect: "error",
    signal: AbortSignal.any([controller.signal, AbortSignal.timeout(5_000)]),
  });
  assert.equal(response.status, 200);
  return response;
}

async function validateHttp(port) {
  const origin = `http://127.0.0.1:${port}`;
  const live = await (await get(`${origin}/api/v1/health/live`)).json();
  assert.equal(live.status, "ok");
  const ready = await (await get(`${origin}/api/v1/health/ready`)).json();
  assert.deepEqual(ready, {
    status: "ready", database: "connected", redis: "connected",
  });
  for (const endpoint of ["attractions", "routes"]) {
    const body = await (await get(`${origin}/api/v1/${endpoint}`)).json();
    assert.deepEqual(body.data, []);
    assert.equal(body.pagination.total, 0);
  }
  const assets = new Set(["/hue-admin-crud.js"]);
  for (const entry of ["/index.html", "/admin.html"]) {
    const html = await (await get(origin + entry)).text();
    for (const match of html.matchAll(/<(?:script|link|img)\b[^>]*?\b(?:src|href)=["']([^"']+)/gi)) {
      const target = new URL(match[1], origin + entry);
      if (target.origin === origin) {
        assets.add(target.pathname);
      }
    }
  }
  for (const asset of assets) {
    const response = await get(origin + asset);
    assert.ok((await response.arrayBuffer()).byteLength > 0);
  }
  console.log(`BE10 evidence: proxy APIs OK; ${assets.size} referenced static assets OK.`);
}

async function execute() {
  const { port, uploads } = await prepare();
  await step("prerequisite Docker daemon", async () => {
    await docker(["info", "--format", "{{.ServerVersion}}"]);
  });
  await step("prerequisite Compose and unused project", async () => {
    await docker(["compose", "version"]);
    for (const kind of ["container", "network", "volume"]) {
      assert.equal((await resourceIds(kind)).length, 0);
    }
  });
  await step("Compose config --quiet (no secret output)", async () => {
    await compose(["--profile", "be10-bootstrap", "config", "--quiet"]);
  });
  await step("build isolated image tags from tracked inputs", async () => {
    buildAttempted = true;
    await compose(["build", "backend", "frontend"], { timeout: 240_000 });
  });
  stackAttempted = true;
  await step("start private PostgreSQL and Redis", async () => {
    await compose(["up", "-d", "--wait", "--wait-timeout", "120", "postgres", "redis"]);
    await verifyOwnedResources();
    assert.equal(await sql("SELECT current_database();"), database);
    assert.equal(await sql("SELECT COUNT(*) FROM information_schema.tables WHERE table_schema = 'public';"), "0");
  });
  await step("explicit bootstrap of verified empty BE10 database", async () => {
    await verifyOwnedResources();
    const result = await compose(["--profile", "be10-bootstrap", "run", "--rm", "-T", "bootstrap"]);
    assert.ok(result.stdout.includes("restricted runtime role and schema prepared"));
  });
  await step("schema and restricted application role", async () => {
    assert.equal(await sql("SELECT COUNT(*) FROM information_schema.tables WHERE table_schema = 'public';"), "13");
    const flags = await sql(
      "SELECT rolsuper OR rolcreatedb OR rolcreaterole OR rolinherit OR rolreplication OR rolbypassrls " +
      "FROM pg_roles WHERE rolname = 'hue_app';"
    );
    assert.equal(flags, "f");
    assert.equal(await sql("SELECT has_schema_privilege('hue_app', 'public', 'CREATE');"), "f");
    assert.equal(await sql(
      "SELECT bool_and(has_table_privilege('hue_app', " +
      "quote_ident(schemaname) || '.' || quote_ident(tablename), permission)) " +
      "FROM pg_tables CROSS JOIN (VALUES ('SELECT'), ('INSERT'), ('UPDATE'), ('DELETE')) " +
      "AS permissions(permission) WHERE schemaname = 'public';"
    ), "t");
    assert.equal(await sql(
      `SELECT has_database_privilege('hue_app', '${database}', 'CREATE');`
    ), "f");
    const refused = await compose([
      "--profile", "be10-bootstrap", "run", "--rm", "-T", "bootstrap",
    ], { allowFailure: true });
    assert.notEqual(refused.code, 0);
    assert.ok((refused.stdout + refused.stderr).includes("bootstrap REFUSED"));
    const wrongTarget = await compose([
      "--profile", "be10-bootstrap", "run", "--rm", "-T",
      "-e", "PGDATABASE=hue_tourism_staging", "bootstrap",
    ], { allowFailure: true });
    assert.notEqual(wrongTarget.code, 0);
    assert.ok((wrongTarget.stdout + wrongTarget.stderr).includes("bootstrap REFUSED"));
    assert.equal(await sql("SELECT COUNT(*) FROM information_schema.tables WHERE table_schema = 'public';"), "13");
  });
  await step("start backend/frontend after bootstrap", async () => {
    await compose(["up", "-d", "--wait", "--wait-timeout", "120", "backend", "frontend"]);
    await verifyOwnedResources();
    const { stdout } = await compose(["ps", "--format", "json"]);
    const rows = stdout.split("\n").flatMap((line) => {
      const value = JSON.parse(line);
      return Array.isArray(value) ? value : [value];
    });
    assert.equal(rows.length, 4);
    for (const row of rows) {
      assert.equal(row.State, "running");
      assert.equal(row.Health, "healthy");
      console.log(`BE10 ps: ${row.Service} running/healthy`);
    }
    await compose(["exec", "-T", "frontend", "nginx", "-t"]);
  });
  await step("GET proxy APIs and referenced static assets", async () => {
    await validateHttp(port);
  });
  await step("private uploads persistence across backend/frontend recreate", async () => {
    const sentinel = "BE10 synthetic persistence fixture\n";
    await verifyOwnedResources();
    await compose([
      "exec", "-T", "backend", "node", "-e",
      "const fs = require('node:fs');\n" +
      "fs.mkdirSync('/app/uploads/media', { recursive: true });\n" +
      `fs.writeFileSync('/app/uploads/media/be10-persistence.txt', ${JSON.stringify(sentinel)});`,
    ]);
    assert.equal(await fs.readFile(path.join(uploads, "media", "be10-persistence.txt"), "utf8"), sentinel);
    await verifyOwnedResources();
    await compose([
      "up", "-d", "--force-recreate", "--wait", "--wait-timeout", "120",
      "backend", "frontend",
    ]);
    await compose([
      "exec", "-T", "backend", "node", "-e",
      "const assert = require('node:assert/strict');\n" +
      "const fs = require('node:fs');\n" +
      `assert.equal(fs.readFileSync('/app/uploads/media/be10-persistence.txt', 'utf8'), ${JSON.stringify(sentinel)});`,
    ]);
    await validateHttp(port);
  });
}

async function cleanup() {
  let clean = true;
  if (stackAttempted) {
    try {
      await verifyOwnedResources(true);
      await compose([
        "--profile", "be10-bootstrap", "down", "--volumes", "--remove-orphans",
      ], { cleanup: true });
      for (const kind of ["container", "network", "volume"]) {
        assert.equal((await resourceIds(kind, true)).length, 0);
      }
      for (const volume of observedAnonymousVolumes) {
        const result = await docker(
          [
            "volume",
            "ls",
            "--filter",
            `name=^${volume}$`,
            "--format",
            "{{.Name}}",
          ],
          { cleanup: true }
        );
        assert.equal(result.stdout, "");
      }
      console.log("BE10 cleanup OK: owned containers/network/volumes removed.");
    } catch {
      clean = false;
      console.error("BE10 cleanup FAIL: project ownership/removal could not be verified.");
    }
  }
  if (temporaryRoot) {
    let removedImages = 0;
    for (const tag of buildAttempted ? imageTags : []) {
      try {
        const result = await docker(
          [
            "image",
            "ls",
            "--format",
            "{{.Repository}}:{{.Tag}}",
            tag,
          ],
          { cleanup: true }
        );

        if (result.stdout === tag) {
          await docker(
            ["image", "rm", tag],
            { cleanup: true }
          );
          removedImages += 1;
        }
      } catch {
        clean = false;
        console.error("BE10 cleanup FAIL: unique image tag could not be removed.");
      }
    }
    if (removedImages > 0) {
      console.log(`BE10 cleanup OK: ${removedImages} unique image tags removed.`);
    }
    if (clean) {
      try {
        assert.equal(path.dirname(path.resolve(temporaryRoot)), path.resolve(os.tmpdir()));
        assert.ok(path.basename(temporaryRoot).startsWith("hue-be10-"));
        await fs.rm(temporaryRoot, { recursive: true, force: true });
        console.log("BE10 cleanup OK: temporary context/config/uploads removed.");
      } catch {
        clean = false;
      }
    }
    if (!clean) {
      console.error(`BE10 recovery: project=${project}; temporary directory=${temporaryRoot}`);
    }
  }
  return clean;
}

async function main() {
  try {
    await execute();
  } catch (error) {
    failed = true;
    const status = Number.isInteger(error.exitStatus) ? error.exitStatus : "suppressed";
    const outcome = stage.includes("prerequisite") ? "BLOCKED" : "FAIL";
    console.error(`BE10 ${outcome}: ${stage}; exit status=${status}; no raw diagnostics.`);
  } finally {
    clearTimeout(deadline);
    if (!await cleanup()) {
      failed = true;
    }
    process.removeListener("SIGINT", interrupt);
    process.removeListener("SIGTERM", interrupt);
  }
  if (failed || controller.signal.aborted) {
    process.exitCode = 1;
    return;
  }
  console.log("BE10 PASS: isolated stack validated and cleaned. Published-media HTTP was not tested.");
}

void main();
