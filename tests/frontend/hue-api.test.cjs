'use strict';
// FE02/FE06: kiểm thử logic tuyến Visitor bằng Node thuần (node --test), không cần trình duyệt,
// không gọi mạng, không đụng dữ liệu thật. Chạy: node --test tests/frontend/hue-api.test.cjs
const test = require('node:test');
const assert = require('node:assert/strict');
const { fetchJson, loadAllPublishedRoutes, normalizeRouteDetail, ApiError } = require('../../frontend/hue-api.js');

const inHue = (lat, lon) => lat >= 16.2 && lat <= 16.7 && lon >= 107.3 && lon <= 107.9;

// Giả lập backend phân trang: total tuyến published, trả đúng page_size.
function fakePagedApi(total) {
  const all = Array.from({ length: total }, (_, i) => ({ id: i + 1, name: 'Tuyến ' + (i + 1), description: 'd', estimated_minutes: 60 }));
  const calls = [];
  const getJson = async path => {
    calls.push(path);
    const q = new URL(path, 'http://x').searchParams;
    const page = Number(q.get('page')), size = Number(q.get('page_size'));
    return { data: all.slice((page - 1) * size, page * size), pagination: { page, page_size: size, total_items: total, total_pages: Math.ceil(total / size) } };
  };
  return { getJson, calls };
}

for (const [total, pages] of [[0, 1], [1, 1], [11, 1], [100, 1], [101, 2], [250, 3]]) {
  test(`tải đủ ${total} tuyến published qua ${pages} trang`, async () => {
    const { getJson, calls } = fakePagedApi(total);
    const items = await loadAllPublishedRoutes(getJson);
    assert.equal(items.length, total);
    assert.equal(calls.length, pages);
  });
}

test('loại bản ghi id hỏng và id trùng', async () => {
  const getJson = async () => ({ data: [{ id: 1 }, { id: 1 }, { id: 'abc' }, { id: -3 }, { id: 2 }, null], pagination: { total_pages: 1 } });
  const items = await loadAllPublishedRoutes(getJson);
  assert.deepEqual(items.map(r => r.id), [1, 2]);
});

test('payload sai cấu trúc -> ApiError shape', async () => {
  await assert.rejects(loadAllPublishedRoutes(async () => ({ data: 'oops' })), e => e instanceof ApiError && e.kind === 'shape');
  await assert.rejects(loadAllPublishedRoutes(async () => null), e => e.kind === 'shape');
});

test('total_pages vô lý không gây vòng lặp vô hạn', async () => {
  await assert.rejects(loadAllPublishedRoutes(async () => ({ data: [{ id: 1 }], pagination: { total_pages: 999999 } })), e => e.kind === 'shape');
  let n = 0;
  const items = await loadAllPublishedRoutes(async () => (++n, { data: [], pagination: { total_pages: 50 } }));
  assert.equal(items.length, 0);
  assert.equal(n, 1); // trang rỗng -> dừng
});

test('lỗi mạng từ getJson được truyền lên', async () => {
  await assert.rejects(loadAllPublishedRoutes(async () => { throw new ApiError('x', 'network'); }), e => e.kind === 'network');
});

const stop = (order, extra = {}) => ({ order, attraction_id: order, latitude: 16.46, longitude: 107.58, visit_minutes: 30, travel_minutes_from_previous: order > 1 ? 10 : null, ...extra });

test('sắp xếp stops theo order (stop_order) dù API trả lộn xộn', () => {
  const r = normalizeRouteDetail({ id: 5, stops: [stop(3), stop(1), stop('2')] }, 5, inHue);
  assert.deepEqual(r.stops.map(s => s.order), [1, 2, 3]);
  assert.equal(r.stops[0].travel_minutes_from_previous, null);
});

test('visit/travel minutes: null giữ null, chuỗi số ép về số, rác -> null', () => {
  const r = normalizeRouteDetail({ id: 5, stops: [stop(1, { visit_minutes: '45' }), stop(2, { travel_minutes_from_previous: 'x', visit_minutes: null })] }, 5, inHue);
  assert.equal(r.stops[0].visit_minutes, 45);
  assert.equal(r.stops[1].visit_minutes, null);
  assert.equal(r.stops[1].travel_minutes_from_previous, null);
});

test('route không đủ stops được gắn cờ issues', () => {
  assert.deepEqual(normalizeRouteDetail({ id: 1, stops: [] }, 1, inHue).issues, ['empty']);
  assert.deepEqual(normalizeRouteDetail({ id: 1, stops: [stop(1)] }, 1, inHue).issues, ['single_stop']);
  assert.deepEqual(normalizeRouteDetail({ id: 1, stops: [stop(1), stop(1)] }, 1, inHue).issues, ['duplicate_order']);
  assert.deepEqual(normalizeRouteDetail({ id: 1, stops: [stop(1), stop(2)] }, 1, inHue).issues, []);
});

test('chi tiết tuyến hỏng bị từ chối', () => {
  assert.throws(() => normalizeRouteDetail(null, 1, inHue), e => e.kind === 'shape');
  assert.throws(() => normalizeRouteDetail({ id: 2, stops: [] }, 1, inHue), e => e.kind === 'shape'); // id lệch
  assert.throws(() => normalizeRouteDetail({ id: 1 }, 1, inHue), e => e.kind === 'shape');            // thiếu stops
  assert.throws(() => normalizeRouteDetail({ id: 1, stops: [stop(1, { latitude: 0, longitude: 0 })] }, 1, inHue), e => e.kind === 'shape'); // 0/0
  assert.throws(() => normalizeRouteDetail({ id: 1, stops: [stop(1, { latitude: 'NaN' })] }, 1, inHue), e => e.kind === 'shape');
  assert.throws(() => normalizeRouteDetail({ id: 1, stops: [{ ...stop(1), order: undefined }] }, 1, inHue), e => e.kind === 'shape');
});

test('fetchJson: HTTP lỗi, JSON hỏng, mạng đứt, timeout', async () => {
  const mk = impl => ({ fetchImpl: impl, timeoutMs: 30 });
  await assert.rejects(fetchJson('/x', mk(async () => ({ ok: false, status: 500 }))), e => e.kind === 'http' && e.status === 500);
  await assert.rejects(fetchJson('/x', mk(async () => ({ ok: true, json: async () => { throw new SyntaxError('bad'); } }))), e => e.kind === 'parse');
  await assert.rejects(fetchJson('/x', mk(async () => { throw new TypeError('Failed to fetch'); })), e => e.kind === 'network');
  const hang = (_p, opt) => new Promise((_, rej) => opt.signal.addEventListener('abort', () => { const e = new Error('aborted'); e.name = 'AbortError'; rej(e); }));
  await assert.rejects(fetchJson('/x', mk(hang)), e => e.kind === 'timeout');
  assert.deepEqual(await fetchJson('/x', mk(async () => ({ ok: true, json: async () => ({ data: [] }) }))), { data: [] });
});
