"use strict";

const assert = require("node:assert/strict");
const fixture = require("./fixtures/be08/fixture.cjs");

function checkId(id) {
  assert.ok(Number.isSafeInteger(id));
  assert.ok(id > 0);
}

function checkPagination(body, expectedCount) {
  assert.ok(Array.isArray(body.data));
  assert.equal(body.data.length, expectedCount);
  assert.deepEqual(body.pagination, {
    page: 1,
    page_size: 10,
    total: expectedCount,
    total_pages: 1,
  });
}

async function runSmoke(baseUrl, signal) {
  const base = new URL(baseUrl);
  assert.equal(base.protocol, "http:");
  assert.equal(base.hostname, "127.0.0.1");
  assert.equal(base.username, "");
  assert.equal(base.password, "");

  async function get(path) {
    const url = new URL(path, base);
    assert.equal(url.origin, base.origin);
    assert.equal(url.search, "");
    assert.equal(url.hash, "");

    const response = await fetch(url, {
      method: "GET",
      redirect: "error",
      signal: AbortSignal.any([
        signal,
        AbortSignal.timeout(5_000),
      ]),
    });
    assert.equal(response.status, 200);
    const bytes = Buffer.from(await response.arrayBuffer());
    return { response, bytes };
  }

  async function getJson(path) {
    const { response, bytes } = await get(path);
    assert.match(
      response.headers.get("content-type") || "",
      /^application\/json(?:;|$)/i
    );
    return JSON.parse(bytes.toString("utf8"));
  }

  const live = await getJson("/api/v1/health/live");
  assert.equal(live.status, "ok");
  assert.equal(typeof live.message, "string");

  const ready = await getJson("/api/v1/health/ready");
  assert.deepEqual(ready, {
    status: "ready",
    database: "connected",
    redis: "connected",
  });

  const attractions = await getJson("/api/v1/attractions");
  checkPagination(attractions, fixture.attractions.length);
  const ids = [];

  for (const expected of fixture.attractions) {
    const actual = attractions.data.find((item) => {
      return item.slug === expected.slug;
    });
    assert.ok(actual);
    checkId(actual.id);
    ids.push(actual.id);
    assert.equal(actual.name, expected.name);
    assert.equal(actual.area_code, "BE08_TEST");
    assert.equal(actual.latitude, expected.latitude);
    assert.equal(actual.longitude, expected.longitude);
    assert.equal(actual.requested_language, "vi");
    assert.equal(actual.content_language, "vi");
    assert.equal(actual.fallback_used, false);
  }

  const routes = await getJson("/api/v1/routes");
  checkPagination(routes, 1);
  const route = routes.data[0];
  checkId(route.id);
  assert.equal(route.slug, fixture.routeSlug);
  assert.equal(route.name, "BE08 Walking Route");
  assert.equal(route.area_code, "BE08_TEST");
  assert.equal(route.estimated_minutes, 60);

  const detail = await getJson(`/api/v1/routes/${route.id}`);
  assert.equal(detail.data.id, route.id);
  assert.equal(detail.data.slug, fixture.routeSlug);
  assert.ok(Array.isArray(detail.data.stops));
  assert.equal(detail.data.stops.length, ids.length);

  for (const [index, stop] of detail.data.stops.entries()) {
    checkId(stop.id);
    assert.equal(stop.order, index + 1);
    assert.equal(stop.attraction_id, ids[index]);
    assert.equal(stop.attraction_slug, fixture.attractions[index].slug);
    assert.equal(stop.attraction_name, fixture.attractions[index].name);
    assert.equal(stop.latitude, fixture.attractions[index].latitude);
    assert.equal(stop.longitude, fixture.attractions[index].longitude);
    assert.equal(stop.visit_minutes, 20);
    assert.equal(stop.travel_minutes_from_previous, index * 5);
  }

  const attraction = await getJson(`/api/v1/attractions/${ids[0]}`);
  assert.equal(attraction.data.id, ids[0]);
  assert.equal(attraction.data.slug, fixture.attractions[0].slug);
  assert.equal(attraction.data.name, fixture.attractions[0].name);
  assert.equal(attraction.data.description, "Synthetic BE08 content");
  assert.ok(Array.isArray(attraction.data.media));
  assert.equal(attraction.data.media.length, 1);
  const media = attraction.data.media[0];
  checkId(media.id);
  assert.equal(media.type, "image");
  assert.equal(
    media.url,
    `/uploads/media/${ids[0]}/${fixture.mediaName}`
  );

  const downloaded = await get(media.url);
  assert.equal(
    downloaded.response.headers.get("content-type"),
    fixture.mediaMime
  );
  assert.deepEqual(downloaded.bytes, fixture.mediaBytes);

  return { checks: 7, attractions: ids.length, stops: ids.length };
}

module.exports = { runSmoke };

if (require.main === module) {
  console.error("BE08: use node tests/run-be08-smoke.cjs.");
  process.exitCode = 1;
}
