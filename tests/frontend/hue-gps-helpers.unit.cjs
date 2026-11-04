'use strict';
// FE03: kiểm thử helper GPS/bản đồ (node --test tests/frontend/hue-gps-helpers.unit.cjs). Không mạng, không GPS thật.
const test = require('node:test'), assert = require('node:assert/strict');
const g = require('../../frontend/hue-gps-helpers.js');
const DAI_NOI = { latitude: 16.4698, longitude: 107.5786 };

test('validHuePoint loại 0/0, NaN, ngoài Huế, chuỗi rác', () => {
  assert.ok(g.validHuePoint(16.47, 107.58));
  for (const [a, b] of [[0, 0], [NaN, 107.5], [16.47, undefined], [21.03, 105.85], ['x', 'y'], [null, null]]) assert.equal(g.validHuePoint(a, b), false, `${a},${b}`);
});
test('classifyGeoError: denied/unavailable/timeout/unknown đều cho chọn thủ công', () => {
  assert.equal(g.classifyGeoError({ code: 1 }).kind, 'denied'); assert.equal(g.classifyGeoError({ code: 1 }).retryable, false);
  assert.equal(g.classifyGeoError({ code: 2 }).kind, 'unavailable');
  assert.equal(g.classifyGeoError({ code: 3 }).kind, 'timeout');
  assert.equal(g.classifyGeoError(undefined).kind, 'unknown');
  for (const c of [1, 2, 3, 9]) assert.equal(g.classifyGeoError({ code: c }).manualFallback, true);
});
test('assessFix: 0/0, sai số lớn, ngoài Huế, hợp lệ', () => {
  assert.equal(g.assessFix({ latitude: 0, longitude: 0, accuracy: 5 }).reason, 'null_island');
  assert.equal(g.assessFix({ latitude: 16.47, longitude: 107.58, accuracy: 900 }).reason, 'low_accuracy');
  assert.equal(g.assessFix({ latitude: 16.47, longitude: 107.58, accuracy: NaN }).reason, 'low_accuracy');
  assert.equal(g.assessFix({ latitude: 10.7, longitude: 106.7, accuracy: 10 }).reason, 'outside_hue');
  assert.equal(g.assessFix({ latitude: 'a', longitude: 1, accuracy: 10 }).reason, 'invalid');
  assert.equal(g.assessFix({ ...DAI_NOI, accuracy: 20 }).ok, true);
  assert.equal(g.assessFix(null).ok, false);
});
test('link Google Maps/OSM đúng tọa độ; tọa độ hỏng -> rỗng/mặc định', () => {
  const u = new URL(g.googleMapsDirectionsUrl(16.4698, 107.5786));
  assert.equal(u.hostname, 'www.google.com'); assert.equal(u.searchParams.get('destination'), '16.4698,107.5786'); assert.equal(u.searchParams.get('travelmode'), 'walking');
  assert.equal(new URL(g.googleMapsDirectionsUrl(16.47, 107.58, 'driving')).searchParams.get('travelmode'), 'driving');
  assert.equal(new URL(g.googleMapsDirectionsUrl(16.47, 107.58, 'hacked&x=1')).searchParams.get('travelmode'), 'walking');
  assert.equal(g.googleMapsDirectionsUrl(0, 0), '');
  assert.match(g.osmUrl(16.4698, 107.5786), /mlat=16\.4698&mlon=107\.5786#map=16\/16\.4698\/107\.5786/);
  assert.match(g.osmUrl(0, 0), /#map=11\/16\.45\/107\.57$/);
});
test('distanceM: 0 m cùng điểm, ~1.1 km cho 0.01° vĩ độ', () => {
  assert.equal(g.distanceM(16.47, 107.58, 16.47, 107.58), 0);
  const d = g.distanceM(16.47, 107.58, 16.48, 107.58); assert.ok(d > 1050 && d < 1170, d);
});
test('nearbyAttractions: đúng bán kính, gần nhất trước, bỏ điểm sai tọa độ', () => {
  const list = [
    { id: 'far', latitude: 16.40, longitude: 107.58 },
    { id: 'near', latitude: 16.4700, longitude: 107.5790 },
    { id: 'mid', latitude: 16.4720, longitude: 107.5786 },
    { id: 'bad', latitude: 0, longitude: 0 }
  ];
  const r = g.nearbyAttractions(DAI_NOI, list, 500);
  assert.deepEqual(r.map(x => x.attraction.id), ['near', 'mid']);
  assert.deepEqual(g.nearbyAttractions({ latitude: 0, longitude: 0 }, list, 5000), []);
  assert.deepEqual(g.nearbyAttractions(DAI_NOI, null, 500), []);
});
test('createSingleFlight: gọi đồng thời chỉ chạy 1 lần', async () => {
  let calls = 0;
  const f = g.createSingleFlight(async () => { calls++; await new Promise(r => setTimeout(r, 20)); return 'ok'; });
  const results = await Promise.all([f(), f(), f()]);
  assert.deepEqual(results, ['ok', 'ok', 'ok']); assert.equal(calls, 1);
  await f(); assert.equal(calls, 2); // xong rồi thì gọi lại được
});
