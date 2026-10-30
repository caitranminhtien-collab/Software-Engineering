const { performance } = require("node:perf_hooks");
const os = require("node:os");

const baseUrl = "http://127.0.0.1:3001";
const warmups = 5;
const samples = 30;

async function sendRequest(path) {
  const started = performance.now();

  const response = await fetch(`${baseUrl}${path}`, {
    signal: AbortSignal.timeout(10_000),
  });

  const body = await response.text();

  if (response.status !== 200) {
    throw new Error(`${path}: HTTP ${response.status}`);
  }

  return {
    elapsedMs: performance.now() - started,
    body,
  };
}

function round(value) {
  return Math.round(value * 100) / 100;
}

async function main() {
  const initial = await sendRequest("/api/v1/attractions");
  const attractionData = JSON.parse(initial.body);

  const results = [];

  for (const path of [
    "/api/v1/health/live",
    "/api/v1/health/ready",
    "/api/v1/attractions",
  ]) {
    for (let index = 0; index < warmups; index++) {
      await sendRequest(path);
    }

    const durations = [];

    for (let index = 0; index < samples; index++) {
      const result = await sendRequest(path);
      durations.push(result.elapsedMs);
    }

    durations.sort((a, b) => a - b);

    const percentile = (fraction) =>
      durations[Math.ceil(durations.length * fraction) - 1];

    results.push({
      path,
      requests: samples,
      successful: samples,
      minMs: round(durations[0]),
      meanMs: round(
        durations.reduce((sum, value) => sum + value, 0) /
          durations.length
      ),
      p50Ms: round(percentile(0.5)),
      p95Ms: round(percentile(0.95)),
      maxMs: round(durations.at(-1)),
    });
  }

  console.log(JSON.stringify({
    measuredAt: new Date().toISOString(),
    baseUrl,
    node: process.version,
    platform: process.platform,
    logicalCpus: os.cpus().length,
    totalMemoryGiB: round(os.totalmem() / 1024 ** 3),
    concurrency: 1,
    warmupsPerEndpoint: warmups,
    samplesPerEndpoint: samples,
    attractionCount: attractionData.pagination?.total,
    results,
  }, null, 2));
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});