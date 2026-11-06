"use strict";

const assert = require("node:assert/strict");
const { spawn } = require("node:child_process");
const { createHash, randomBytes } = require("node:crypto");
const { once } = require("node:events");
const fs = require("node:fs/promises");
const os = require("node:os");
const path = require("node:path");
const { setTimeout: delay } = require("node:timers/promises");

const root = path.resolve(__dirname, "..");
const id = randomBytes(16).toString("hex");
const containerName = `hue-be11-${id}`;
const volumeName = `${containerName}-data`;
const source = `hue_be11_source_${id}`;
const target = `hue_be11_target_${id}`;
const label = "hue.be11.run";
const archivePath = `/tmp/be11-${id}.dump`;
const restorePath = `/tmp/be11-${id}-restore.dump`;
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
}, 240_000);
const databaseOids = new Map();
let temporaryRoot;
let containerId;
let volumeAttempted = false;
let containerAttempted = false;
let failed = false;
let stage = "prerequisites";
const evidence = {
  runId: id,
  container: containerName,
  source,
  target,
  outcome: "NOT_RUN",
};

function interrupt() {
  controller.abort();
}
process.on("SIGINT", interrupt);
process.on("SIGTERM", interrupt);

function digest(value) {
  return createHash("sha256").update(value).digest("hex");
}

async function command(executable, args, options = {}) {
  const child = spawn(executable, args, {
    cwd: root,
    env: environment,
    windowsHide: true,
    stdio: ["pipe", "pipe", "pipe"],
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
  child.stdin.on("error", () => {
    // Close/error status below is authoritative if the process exits early.
  });
  child.stdin.end(options.input);
  const timer = setTimeout(() => {
    child.kill();
  }, 30_000);
  try {
    const [code] = await once(child, "close");
    const sqlstate = /(?:ERROR|FATAL):\s+([0-9A-Z]{5})\b/.exec(stderr)?.[1];
    if (code !== 0 && !options.allowFailure) {
      const error = new Error("BE11 command failed");
      error.exitStatus = code;
      error.sqlstate = sqlstate;
      throw error;
    }
    return { code, stdout: stdout.trim(), sqlstate };
  } finally {
    clearTimeout(timer);
  }
}

async function docker(args, options) {
  return command(
    "docker",
    ["--config", path.join(temporaryRoot, "docker-config"), ...args],
    options
  );
}

async function step(name, operation) {
  stage = name;
  console.log(`BE11 START: ${name}`);
  const result = await operation();
  console.log(`BE11 OK: ${name}`);
  return result;
}

async function inspectContainer(cleanup = false) {
  const result = await docker(
    ["container", "inspect", containerId || containerName],
    { cleanup }
  );
  const records = JSON.parse(result.stdout);
  assert.equal(records.length, 1);
  const record = records[0];
  assert.equal(record.Name, `/${containerName}`);
  assert.equal(record.Config.Labels[label], id);
  assert.ok(record.Config.Env.includes(`POSTGRES_DB=${source}`));
  assert.equal(record.HostConfig.NetworkMode, "none");
  assert.equal(Object.keys(record.HostConfig.PortBindings || {}).length, 0);
  assert.equal(record.Mounts.length, 1);
  assert.equal(record.Mounts[0].Type, "volume");
  assert.equal(record.Mounts[0].Name, volumeName);
  if (containerId) {
    assert.equal(record.Id, containerId);
  }
  return record;
}

async function inspectVolume(cleanup = false) {
  const result = await docker(["volume", "inspect", volumeName], { cleanup });
  const records = JSON.parse(result.stdout);
  assert.equal(records.length, 1);
  assert.equal(records[0].Name, volumeName);
  assert.equal(records[0].Labels[label], id);
}

async function rawSql(database, sql, options = {}) {
  assert.ok([source, target].includes(database));
  return docker(
    [
      "exec", "-i", containerId,
      "psql", "-X", "-q", "-A", "-t",
      "-v", "ON_ERROR_STOP=1", "-v", "VERBOSITY=sqlstate",
      "-U", "postgres", "-d", database,
    ],
    { ...options, input: sql }
  );
}

async function verifyDatabase(database, empty = false) {
  assert.ok([source, target].includes(database));
  await inspectContainer();
  await inspectVolume();
  const identity = await rawSql(database, [
    "SELECT json_build_object(",
    "  'name', current_database(), 'user', current_user,",
    "  'oid', (SELECT oid FROM pg_database WHERE datname = current_database())",
    ")::text;",
  ].join("\n"));
  const actual = JSON.parse(identity.stdout);
  assert.equal(actual.name, database);
  assert.equal(actual.user, "postgres");
  if (databaseOids.has(database)) {
    assert.equal(actual.oid, databaseOids.get(database));
  } else {
    databaseOids.set(database, actual.oid);
  }
  if (empty) {
    const result = await rawSql(database, [
      "SELECT COUNT(*) FROM pg_class AS c",
      "JOIN pg_namespace AS n ON n.oid = c.relnamespace",
      "WHERE n.nspname NOT IN ('pg_catalog', 'information_schema')",
      "AND n.nspname NOT LIKE 'pg_toast%'",
      "AND c.relkind IN ('r', 'p', 'v', 'm', 'S', 'f');",
    ].join("\n"));
    assert.equal(result.stdout, "0");
  }
}

async function query(database, sql, options) {
  await verifyDatabase(database);
  return rawSql(database, sql, options);
}

async function jsonQuery(database, sql) {
  const result = await query(database, sql);
  return JSON.parse(result.stdout);
}

async function snapshot(database) {
  const names = await jsonQuery(database, [
    "SELECT json_agg(tablename ORDER BY tablename)::text",
    "FROM pg_tables WHERE schemaname = 'public';",
  ].join("\n"));
  const tables = {};
  for (const name of names) {
    assert.match(name, /^[a-z][a-z0-9_]*$/);
    tables[name] = await jsonQuery(database, [
      "SELECT COALESCE(",
      "  jsonb_agg(to_jsonb(t) ORDER BY to_jsonb(t)::text), '[]'::jsonb",
      `)::text FROM public."${name}" AS t;`,
    ].join("\n"));
  }
  return tables;
}

async function sequences(database) {
  const names = await jsonQuery(database, [
    "SELECT json_agg(sequencename ORDER BY sequencename)::text",
    "FROM pg_sequences WHERE schemaname = 'public';",
  ].join("\n"));
  const states = {};
  for (const name of names) {
    assert.match(name, /^[a-z][a-z0-9_]*$/);
    states[name] = await jsonQuery(database, [
      "SELECT json_build_object(",
      "  'last', last_value, 'called', is_called",
      `)::text FROM public."${name}";`,
    ].join("\n"));
  }
  return states;
}

async function setup() {
  temporaryRoot = await fs.mkdtemp(path.join(os.tmpdir(), "hue-be11-"));
  await fs.mkdir(path.join(temporaryRoot, "docker-config"));
  await fs.writeFile(path.join(temporaryRoot, "docker-config", "config.json"), "{}\n");
  await step("prerequisite Docker and PostgreSQL 18 image", async () => {
    await docker(["info", "--format", "{{.ServerVersion}}"]);
    await docker(["image", "inspect", "postgres:18"]);
    const git = await command("git", [
      "-c", `safe.directory=${root}`, "rev-parse", "--short", "HEAD",
    ]);
    assert.match(git.stdout, /^[a-f0-9]+$/);
    evidence.commit = git.stdout;
  });
  await step("create private labelled volume and container", async () => {
    const existing = await docker([
      "container", "ls", "--all", "--filter", `name=^/${containerName}$`,
      "--format", "{{.ID}}",
    ]);
    assert.equal(existing.stdout, "");
    const volumes = await docker([
      "volume", "ls", "--filter", `name=^${volumeName}$`,
      "--format", "{{.Name}}",
    ]);
    assert.equal(volumes.stdout, "");
    volumeAttempted = true;
    await docker(["volume", "create", "--label", `${label}=${id}`, volumeName]);
    await inspectVolume();
    containerAttempted = true;
    const created = await docker([
      "create", "--name", containerName, "--label", `${label}=${id}`,
      "--network", "none",
      "--mount", `type=volume,source=${volumeName},target=/var/lib/postgresql`,
      "--env", `POSTGRES_DB=${source}`,
      "--env", `POSTGRES_PASSWORD=${randomBytes(24).toString("hex")}`,
      "--health-cmd", `pg_isready -h 127.0.0.1 -U postgres -d ${source}`,
      "--health-interval", "1s", "--health-timeout", "2s",
      "--health-retries", "30", "postgres:18",
    ]);
    assert.match(created.stdout, /^[a-f0-9]{64}$/);
    containerId = created.stdout;
    await inspectContainer();
    await docker(["start", containerId]);
    const started = Date.now();
    while (true) {
      const record = await inspectContainer();
      if (record.State.Health.Status === "healthy") {
        break;
      }
      assert.ok(Date.now() - started < 35_000);
      await delay(250, undefined, { signal: controller.signal });
    }
    await verifyDatabase(source, true);
  });
}

async function prepareSource() {
  await step("source schema and linked synthetic fixture", async () => {
    await verifyDatabase(source, true);
    await query(source, [
      "CREATE ROLE hue_app NOLOGIN NOSUPERUSER NOCREATEDB NOCREATEROLE;",
      "CREATE ROLE be11_restore NOLOGIN NOSUPERUSER NOCREATEDB NOCREATEROLE;",
    ].join("\n"));
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
      await query(source, sql.replace(/^\uFEFF/, ""));
    }
    const fixtureSql = await fs.readFile(
      path.join(__dirname, "fixtures", "be11", "fixture.sql"),
      "utf8"
    );
    await query(source, fixtureSql);
  });
}

async function backupAndRestore(sourceTables) {
  await step("custom binary dump, archive listing and SHA-256 transport", async () => {
    await verifyDatabase(source);
    await docker([
      "exec", containerId, "pg_dump", "-U", "postgres", "-d", source,
      "-Fc", "--no-owner", "--no-acl", "--file", archivePath,
    ]);
    const localArchive = path.join(temporaryRoot, "synthetic.dump");
    await inspectContainer();
    await docker(["cp", `${containerId}:${archivePath}`, localArchive]);
    await fs.chmod(localArchive, 0o600);
    const bytes = await fs.readFile(localArchive);
    assert.equal(bytes.subarray(0, 5).toString("ascii"), "PGDMP");
    evidence.archiveSha256 = digest(bytes);
    const originalHash = await docker(["exec", containerId, "sha256sum", archivePath]);
    assert.equal(originalHash.stdout.split(/\s+/)[0], evidence.archiveSha256);
    const listing = await docker(["exec", containerId, "pg_restore", "--list", archivePath]);
    const archiveTables = Array.from(listing.stdout.matchAll(
      /^\d+;\s+\d+\s+\d+\s+TABLE public ([a-z][a-z0-9_]*) /gm
    ), (match) => {
      return match[1];
    }).sort();
    assert.deepEqual(archiveTables, Object.keys(sourceTables).sort());
    assert.ok(!/^\d+;.*\sACL\s/m.test(listing.stdout));
    await inspectContainer();
    await docker(["cp", localArchive, `${containerId}:${restorePath}`]);
    const copiedHash = await docker(["exec", containerId, "sha256sum", restorePath]);
    assert.equal(copiedHash.stdout.split(/\s+/)[0], evidence.archiveSha256);
    evidence.archiveTables = archiveTables.length;
  });
  await step("new empty destination and atomic restore", async () => {
    await verifyDatabase(source);
    const absent = await query(source, `SELECT COUNT(*) FROM pg_database WHERE datname = '${target}';`);
    assert.equal(absent.stdout, "0");
    await inspectContainer();
    await docker([
      "exec", containerId, "createdb", "-U", "postgres",
      "--maintenance-db", source, "--template", "template0",
      "--owner", "be11_restore", target,
    ]);
    await verifyDatabase(target, true);
    await docker([
      "exec", containerId, "pg_restore", "-U", "postgres", "-d", target,
      "--role", "be11_restore", "--no-owner", "--no-privileges",
      "--exit-on-error", "--single-transaction", restorePath,
    ]);
  });
}

async function compare(sourceTables, sourceSequences) {
  await step("table lists, every row value and sequence state", async () => {
    const restored = await snapshot(target);
    assert.deepEqual(restored, sourceTables);
    assert.deepEqual(await sequences(target), sourceSequences);
    const expectedCounts = {
      staff_accounts: 1,
      attractions: 2,
      attraction_localizations: 2,
      routes: 1,
      route_stops: 2,
      attraction_media: 1,
    };
    assert.equal(Object.keys(restored).length, 13);
    evidence.tables = {};
    for (const [name, rows] of Object.entries(restored)) {
      assert.equal(rows.length, expectedCounts[name] || 0);
      evidence.tables[name] = {
        count: rows.length,
        sha256: digest(JSON.stringify(rows)),
      };
    }
    const localization = restored.attraction_localizations.find((row) => {
      return row.name === "BE11 Đại Nội";
    });
    assert.ok(localization);
    assert.equal(localization.description, "Dòng 1\nDòng 2: 'Huế'");
    assert.deepEqual(JSON.parse(localization.source_references), [
      { source: "BE11 synthetic", verified: true },
    ]);
    const first = restored.attractions.find((row) => {
      return row.slug === "be11-first";
    });
    assert.ok(first);
    assert.equal(first.latitude, 16.4698);
    assert.equal(first.longitude, 107.5792);
    const stops = restored.route_stops.slice().sort((a, b) => {
      return a.stop_order - b.stop_order;
    });
    assert.equal(stops[0].attraction_id, first.attraction_id);
    assert.equal(stops[0].travel_minutes_from_previous, null);
    assert.equal(stops[1].travel_minutes_from_previous, 5);
    const owners = await query(target, [
      "SELECT bool_and(tableowner = 'be11_restore')",
      "FROM pg_tables WHERE schemaname = 'public';",
    ].join("\n"));
    assert.equal(owners.stdout, "t");
    const acl = await query(target,
      "SELECT has_table_privilege('hue_app', 'public.visitor_events', 'SELECT');"
    );
    assert.equal(acl.stdout, "f");
    evidence.rowCount = Object.values(restored).reduce((total, rows) => {
      return total + rows.length;
    }, 0);
    evidence.sequenceCount = Object.keys(sourceSequences).length;
  });
  await step("restored sequence nextval and FK/unique/check enforcement", async () => {
    for (const [name, state] of Object.entries(sourceSequences)) {
      assert.match(name, /^[a-z][a-z0-9_]*$/);
      const next = await query(target, `SELECT nextval('public.${name}');`);
      const expected = state.called ? state.last + 1 : state.last;
      assert.equal(Number(next.stdout), expected);
    }
    const probes = [
      {
        code: "23503",
        sql: [
          "INSERT INTO public.route_stops (route_id, attraction_id, stop_order)",
          "SELECT (SELECT MAX(route_id) + 1000 FROM public.routes),",
          "attraction_id, 99 FROM public.attractions WHERE slug = 'be11-first';",
        ].join("\n"),
      },
      {
        code: "23505",
        sql: "INSERT INTO public.staff_accounts OVERRIDING SYSTEM VALUE SELECT * FROM public.staff_accounts;",
      },
      {
        code: "23514",
        sql: "UPDATE public.attractions SET latitude = 100 WHERE slug = 'be11-first';",
      },
    ];
    for (const probe of probes) {
      const result = await query(
        target,
        `BEGIN;\nSET LOCAL ROLE be11_restore;\n${probe.sql}\nROLLBACK;`,
        { allowFailure: true }
      );
      assert.notEqual(result.code, 0);
      assert.equal(result.sqlstate, probe.code);
    }
    assert.deepEqual(await snapshot(target), sourceTables);
    assert.deepEqual(await sequences(source), sourceSequences);
    evidence.constraintSqlstates = probes.map((probe) => {
      return probe.code;
    });
  });
  console.log(
    `BE11 evidence: ${Object.keys(sourceTables).length} tables; ` +
    `${evidence.rowCount} rows; ${evidence.sequenceCount} sequences; 3 constraint probes.`
  );
}

async function exists(kind, name, cleanup = true) {
  const args = [kind, "ls"];
  if (kind === "container") {
    args.push("--all");
  }
  args.push("--filter", `name=^${kind === "container" ? "/" : ""}${name}$`);
  args.push("--format", kind === "container" ? "{{.ID}}" : "{{.Name}}");
  const result = await docker(args, { cleanup });
  return result.stdout !== "";
}

async function cleanup() {
  let clean = true;
  if (containerAttempted) {
    try {
      if (await exists("container", containerName)) {
        await inspectContainer(true);
        await inspectVolume(true);
        await docker(["rm", "--force", containerId || containerName], { cleanup: true });
      }
      assert.equal(await exists("container", containerName), false);
    } catch {
      clean = false;
      console.error(`BE11 cleanup FAIL: container ${containerName} retained/unverified.`);
    }
  }
  if (volumeAttempted) {
    try {
      if (await exists("volume", volumeName)) {
        assert.ok(clean);
        await inspectVolume(true);
        await docker(["volume", "rm", volumeName], { cleanup: true });
      }
      assert.equal(await exists("volume", volumeName), false);
    } catch {
      clean = false;
      console.error(`BE11 cleanup FAIL: volume ${volumeName} retained/unverified.`);
    }
  }
  if (temporaryRoot && clean) {
    try {
      assert.equal(path.dirname(path.resolve(temporaryRoot)), path.resolve(os.tmpdir()));
      assert.ok(path.basename(temporaryRoot).startsWith("hue-be11-"));
      await fs.rm(temporaryRoot, { recursive: true, force: true });
    } catch {
      clean = false;
    }
  }
  if (clean) {
    console.log("BE11 cleanup OK: owned container, volume and temporary archive/config removed.");
  } else {
    console.error(`BE11 recovery directory: ${temporaryRoot}`);
  }
  return clean;
}

async function main() {
  try {
    await setup();
    await prepareSource();
    const tables = await snapshot(source);
    const states = await sequences(source);
    await backupAndRestore(tables);
    await compare(tables, states);
  } catch (error) {
    failed = true;
    const diagnostic = {};
    if (Number.isInteger(error.exitStatus)) {
      diagnostic.exitStatus = error.exitStatus;
    }
    if (/^[0-9A-Z]{5}$/.test(error.sqlstate || "")) {
      diagnostic.sqlstate = error.sqlstate;
    }
    evidence.outcome = stage.includes("prerequisite") ? "BLOCKED" : "FAIL";
    evidence.failedStage = stage;
    console.error(`BE11 ${evidence.outcome}: ${stage} ${JSON.stringify(diagnostic)}`);
  } finally {
    clearTimeout(deadline);
    evidence.cleanup = await cleanup();
    if (!evidence.cleanup || controller.signal.aborted) {
      failed = true;
    }
    process.removeListener("SIGINT", interrupt);
    process.removeListener("SIGTERM", interrupt);
  }
  if (!failed) {
    evidence.outcome = "PASS";
  } else if (evidence.outcome === "NOT_RUN") {
    evidence.outcome = "FAIL";
  }
  const report = path.join(os.tmpdir(), `hue-be11-evidence-${id}.json`);
  try {
    await fs.writeFile(report, JSON.stringify(evidence, null, 2) + "\n", {
      flag: "wx",
      mode: 0o600,
    });
    console.log(`BE11 safe evidence: ${report}`);
  } catch {
    failed = true;
    console.error("BE11 FAIL: safe evidence could not be saved.");
  }
  if (failed) {
    process.exitCode = 1;
    return;
  }
  console.log("BE11 PASS: custom dump restored, data/sequences/constraints verified; cleanup completed.");
}

void main();
