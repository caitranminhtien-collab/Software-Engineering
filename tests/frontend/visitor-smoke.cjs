'use strict';
// FE06: smoke test trình duyệt cho luồng Visitor, API được MOCK bằng page.route
// (không backend, không DB, không gọi AI/Open-Meteo/CDN thật). Cần playwright cài sẵn
// (chưa thêm vào package.json — cần nhóm đồng ý). Chạy: node tests/frontend/visitor-smoke.cjs
// Ảnh chụp ghi vào thư mục SHOT_DIR (mặc định ./test-artifacts, đã nên nằm trong .gitignore).
const http = require('node:http'), fs = require('node:fs'), path = require('node:path'), assert = require('node:assert/strict');
const { chromium } = require('playwright');
const ROOT = path.join(__dirname, '../../frontend');
const SHOT_DIR = process.env.SHOT_DIR || path.join(process.cwd(), 'test-artifacts');
fs.mkdirSync(SHOT_DIR, { recursive: true });
const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.png': 'image/png' };
const server = http.createServer((req, res) => {
  const f = path.join(ROOT, decodeURIComponent(req.url.split('?')[0]).replace(/^\/$/, '/index.html'));
  if (!f.startsWith(ROOT) || !fs.existsSync(f)) { res.writeHead(404); return res.end(); }
  res.writeHead(200, { 'Content-Type': MIME[path.extname(f)] || 'application/octet-stream' }); fs.createReadStream(f).pipe(res);
});

const mkRoutes = n => Array.from({ length: n }, (_, i) => ({ id: i + 1, name: 'Tuyến thử ' + (i + 1), description: 'Mô tả ' + (i + 1), estimated_minutes: 90 }));
const detail = id => ({ data: { id, name: 'Tuyến thử ' + id, description: 'Mô tả', estimated_minutes: 90, stops: [
  { order: 2, attraction_id: 2, attraction_name: 'Điểm B', attraction_slug: 'b', latitude: 16.4, longitude: 107.57, visit_minutes: 30, travel_minutes_from_previous: 12 },
  { order: 1, attraction_id: 1, attraction_name: 'Điểm A', attraction_slug: 'a', latitude: 16.47, longitude: 107.58, visit_minutes: 45, travel_minutes_from_previous: null } ] } });

async function withPage(browser, scenario, viewport, fn) {
  const ctx = await browser.newContext({ viewport });
  const page = await ctx.newPage();
  const events = [];
  const sessions = { count: 0 };
  await page.route('**/api/v1/**', route => {
    const url = new URL(route.request().url());
    const json = body => route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(body) });
    if (url.pathname === '/api/v1/visitor-sessions') { sessions.count++; return json({ data: { token: 'test-token-not-real' } }); }
    if (/\/visitor-events|\/visitor-presence/.test(url.pathname)) { events.push(route.request().postData()); return json({ data: {} }); }
    if (url.pathname === '/api/v1/routes') {
      if (scenario.routesStatus) return route.fulfill({ status: scenario.routesStatus, body: '{}' });
      const all = mkRoutes(scenario.routes ?? 0), p = +url.searchParams.get('page'), s = +url.searchParams.get('page_size');
      return json({ data: all.slice((p - 1) * s, p * s), pagination: { page: p, page_size: s, total_items: all.length, total_pages: Math.max(1, Math.ceil(all.length / s)) } });
    }
    const m = url.pathname.match(/^\/api\/v1\/routes\/(\d+)$/); if (m) return json(detail(+m[1]));
    if (url.pathname.startsWith('/api/v1/attractions')) return json({ data: { items: [] }, pagination: { total_pages: 1 } });
    return json({ data: [] });
  });
  await page.route(/open-meteo|unpkg|cdn|openstreetmap/, r => r.abort());
  await page.goto('http://127.0.0.1:' + server.address().port + '/#routes');
  await page.waitForSelector('#content *');
  try { await fn(page, events, sessions); } finally { await ctx.close(); }
}
const results = [];
async function check(name, fn) { try { await fn(); results.push(['PASS', name]); } catch (e) { results.push(['FAIL', name + ' — ' + e.message]); } }
const noHScroll = page => page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1);

(async () => {
  await new Promise(r => server.listen(0, '127.0.0.1', r));
  const browser = await chromium.launch();
  const phone = { width: 360, height: 740 };
  await check('0 tuyến: hiện trạng thái rỗng, không hiện tuyến mẫu', () => withPage(browser, { routes: 0 }, phone, async page => {
    await page.waitForSelector('text=Chưa có tuyến tham quan');
    assert.equal(await page.locator('[data-public-route-select]').count(), 0);
    assert.ok(!(await page.content()).includes('Dấu ấn cung đình'));
  }));
  await check('11 tuyến: hiện đủ, chi tiết sắp theo stop_order, 360px không tràn ngang', () => withPage(browser, { routes: 11 }, phone, async page => {
    await page.waitForSelector('.route-journey-stops li');
    assert.equal(await page.locator('[data-public-route-select]').count(), 11);
    const names = await page.locator('.route-journey-stops li strong').allTextContents();
    assert.deepEqual(names, ['Điểm A', 'Điểm B']);
    assert.ok(await noHScroll(page), 'có thanh cuộn ngang');
    const w = await page.locator('[data-public-route-select]').first().evaluate(el => el.getBoundingClientRect().width);
    assert.ok(w >= 180, 'thẻ tuyến bị bóp hẹp: ' + w + 'px'); // bắt lỗi chữ xuống dòng từng ký tự
    await page.screenshot({ path: path.join(SHOT_DIR, 'routes-360-11routes.png'), fullPage: true });
  }));
  await check('250 tuyến: tải đủ qua 3 trang', () => withPage(browser, { routes: 250 }, { width: 1366, height: 800 }, async page => {
    await page.waitForSelector('.route-journey-stops li');
    assert.equal(await page.locator('[data-public-route-select]').count(), 250);
    await page.screenshot({ path: path.join(SHOT_DIR, 'routes-1366-250routes.png') });
  }));
  await check('API lỗi 500: hiện lỗi + nút Thử lại, không hiện tuyến mẫu', () => withPage(browser, { routesStatus: 500 }, phone, async page => {
    await page.waitForSelector('#retry-public-routes');
    assert.ok(!(await page.content()).includes('Dấu ấn cung đình'));
  }));
  await check('Bắt đầu hành trình gửi đúng 1 event route_started', () => withPage(browser, { routes: 2 }, { width: 768, height: 900 }, async (page, events, sessions) => {
    await page.waitForSelector('#start-public-route');
    const before = events.filter(b => /route_started/.test(b || '')).length;
    await page.click('#start-public-route');
    await page.waitForSelector('#next-public-stop');
    await page.waitForTimeout(300);
    assert.equal(events.filter(b => /route_started/.test(b || '')).length - before, 1);
    await page.click('#next-public-stop'); // chuyển điểm dừng không tạo thêm route_started
    await page.waitForTimeout(300);
    assert.equal(events.filter(b => /route_started/.test(b || '')).length - before, 1);
    assert.ok(sessions.count <= 1, 'tạo quá nhiều visitor session: ' + sessions.count);
  }));
  await browser.close(); server.close();
  for (const [s, m] of results) console.log(s, m);
  process.exit(results.some(r => r[0] === 'FAIL') ? 1 : 0);
})();
