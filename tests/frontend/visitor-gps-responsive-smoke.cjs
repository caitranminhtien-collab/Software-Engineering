'use strict';
// FE03 + FE05: smoke test trình duyệt với API và GPS MOCK (không GPS thật, không mạng ngoài).
//  - GPS: từ chối / hết giờ / vị trí 0/0 / ngoài Huế / sai số lớn / API gợi ý mất mạng -> không crash, có thông báo, chọn thủ công vẫn dùng được.
//  - Responsive: 8 trang x 360/390/768/1366px không tràn ngang; chụp ảnh vào SHOT_DIR.
// Chạy: node tests/frontend/visitor-gps-responsive-smoke.cjs (cần playwright cài sẵn)
const http = require('node:http'), fs = require('node:fs'), path = require('node:path'), assert = require('node:assert/strict');
const { chromium } = require('playwright');
const ROOT = path.join(__dirname, '../../frontend');
const SHOT_DIR = process.env.SHOT_DIR || path.join(process.cwd(), 'test-artifacts'); fs.mkdirSync(SHOT_DIR, { recursive: true });
const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.png': 'image/png' };
const server = http.createServer((req, res) => {
  const f = path.join(ROOT, decodeURIComponent(req.url.split('?')[0]).replace(/^\/$/, '/index.html'));
  if (!f.startsWith(ROOT) || !fs.existsSync(f)) { res.writeHead(404); return res.end(); }
  res.writeHead(200, { 'Content-Type': MIME[path.extname(f)] || 'application/octet-stream' }); fs.createReadStream(f).pipe(res);
});
const list = Array.from({ length: 12 }, (_, i) => ({ id: i + 1, slug: 'di-tich-' + (i + 1), name: 'Di tích ' + (i + 1), category: 'Di tích', description: 'Mô tả ' + (i + 1), latitude: 16.46 + i * 0.002, longitude: 107.58, content_language: 'vi' }));
const results = [];
async function check(name, fn) { try { await fn(); results.push(['PASS', name]); } catch (e) { results.push(['FAIL', name + ' — ' + e.message]); } }

// geo: {error: code} | {coords:{...}}  — giả lập navigator.geolocation.watchPosition
async function open(browser, { geo, suggestionsFail = false, viewport = { width: 390, height: 800 }, hash = 'map', counters = {} } = {}) {
  const ctx = await browser.newContext({ viewport, ignoreHTTPSErrors: true });
  const page = await ctx.newPage(); const errors = [];
  page.on('pageerror', e => errors.push(e.message));
  await page.addInitScript(g => {
    window.__geoCalls = 0;
    if (!g) return;
    const fake = { watchPosition(ok, err) { window.__geoCalls++; setTimeout(() => g.error ? err({ code: g.error, message: 'mock' }) : ok({ coords: g.coords, timestamp: Date.now() }), 50); return 1; },
      clearWatch() {}, getCurrentPosition(ok, err) { window.__geoCalls++; setTimeout(() => g.error ? err({ code: g.error }) : ok({ coords: g.coords, timestamp: Date.now() }), 50); } };
    Object.defineProperty(navigator, 'geolocation', { value: fake, configurable: true });
  }, geo || null);
  await page.route('**/api/v1/**', route => {
    const u = new URL(route.request().url()); const json = b => route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(b) });
    if (u.pathname === '/api/v1/attractions') return json({ data: { items: list }, pagination: { total_pages: 1 } });
    const m = u.pathname.match(/^\/api\/v1\/attractions\/(\d+)$/); if (m) return json({ data: { ...list[+m[1] - 1], media: [], fallback_used: false } });
    if (u.pathname === '/api/v1/visitor-sessions') return json({ data: { token: 'test-token-not-real' } });
    if (u.pathname === '/api/v1/location-suggestions') { counters.suggest = (counters.suggest || 0) + 1; return suggestionsFail ? route.abort() : json({ data: [], meta: {} }); }
    if (u.pathname === '/api/v1/routes') return json({ data: [], pagination: { total_pages: 1 } });
    return json({ data: [], pagination: { total_pages: 1 } });
  });
  await page.route(/open-meteo|unpkg|cdn|openstreetmap/, r => r.abort());
  await page.goto('http://127.0.0.1:' + server.address().port + '/#' + hash);
  await page.waitForSelector('#content *'); return { ctx, page, errors };
}
const gpsStatus = page => page.locator('#hue-gps-mode-status').innerText();
async function enable(page) { await page.waitForSelector('#enable-gps'); await page.click('#enable-gps'); await page.waitForTimeout(400); }

(async () => {
  await new Promise(r => server.listen(0, '127.0.0.1', r));
  const browser = await chromium.launch();
  // localhost được coi là secure context nên enableGPS không bị chặn bởi HTTPS.
  await check('GPS bị từ chối: thông báo + không crash + nút chọn thủ công còn dùng', async () => {
    const { ctx, page, errors } = await open(browser, { geo: { error: 1 } });
    try { await enable(page); assert.match(await gpsStatus(page), /từ chối/); assert.ok(await page.locator('.map-poi').first().isVisible()); await page.locator('.map-poi').nth(2).click(); assert.deepEqual(errors, []); } finally { await ctx.close(); }
  });
  await check('GPS hết giờ (code 3): có thông báo, không treo', async () => {
    const { ctx, page, errors } = await open(browser, { geo: { error: 3 } });
    try { await enable(page); assert.match(await gpsStatus(page), /GPS|tín hiệu|vị trí/i); assert.deepEqual(errors, []); } finally { await ctx.close(); }
  });
  await check('Vị trí 0/0 và ngoài Huế: không crash, có thông báo khu vực, không gọi API gợi ý', async () => {
    for (const coords of [{ latitude: 0, longitude: 0, accuracy: 5 }, { latitude: 21.03, longitude: 105.85, accuracy: 5 }]) {
      const counters = {}; const { ctx, page, errors } = await open(browser, { geo: { coords }, counters });
      try { await enable(page); assert.match(await gpsStatus(page), /ngoài khu vực/); assert.equal(counters.suggest || 0, 0); assert.deepEqual(errors, []); } finally { await ctx.close(); }
    }
  });
  await check('Sai số lớn (200 m): không gọi API gợi ý, hướng dẫn chọn thủ công', async () => {
    const counters = {}; const { ctx, page, errors } = await open(browser, { geo: { coords: { latitude: 16.47, longitude: 107.58, accuracy: 200 } }, counters });
    try { await enable(page); assert.match(await page.locator('#hue-gps-results').innerText(), /thủ công/); assert.equal(counters.suggest || 0, 0); assert.deepEqual(errors, []); } finally { await ctx.close(); }
  });
  await check('API gợi ý mất mạng: thông báo + chọn thủ công, không crash', async () => {
    const { ctx, page, errors } = await open(browser, { geo: { coords: { latitude: 16.47, longitude: 107.58, accuracy: 10 } }, suggestionsFail: true });
    try { await enable(page); await page.waitForSelector('#hue-gps-results:has-text("thủ công")', { timeout: 5000 }); assert.deepEqual(errors, []); } finally { await ctx.close(); }
  });
  await check('Không gọi geolocation lặp: bấm Bật GPS 1 lần -> đúng 1 watchPosition', async () => {
    const { ctx, page } = await open(browser, { geo: { error: 1 } });
    try { await enable(page); assert.equal(await page.evaluate(() => window.__geoCalls), 1); } finally { await ctx.close(); }
  });
  await check('Nút Google Maps trỏ đúng tọa độ điểm đang chọn; OSM đúng tọa độ', async () => {
    const { ctx, page } = await open(browser);
    try {
      const poi = page.locator('.map-poi').nth(1);
      const n = Number((await poi.locator('strong').innerText()).match(/\d+/)[0]); // danh sách sắp theo tên (vi) nên thứ tự không phải 1,2,3
      const lat = (16.46 + (n - 1) * 0.002).toFixed(3).replace(/0+$/, '');
      await poi.click(); await page.waitForTimeout(300);
      const g = new URL(await page.getAttribute('#hue-open-google-maps', 'href'));
      assert.equal(Number(g.searchParams.get('destination').split(',')[0]).toFixed(3), Number(lat).toFixed(3));
      assert.equal(g.searchParams.get('destination').split(',')[1], '107.58');
      assert.match(await page.getAttribute('#hue-open-osm', 'href'), new RegExp('mlat=' + g.searchParams.get('destination').split(',')[0].replace('.', '\\.') + '&mlon=107\\.58'));
    } finally { await ctx.close(); }
  });
  const pages = ['home', 'explore', 'map', 'routes', 'audio', 'chat', 'weather', 'popular'];
  for (const w of [360, 390, 768, 1366]) {
    await check(`Responsive ${w}px: 8 trang không tràn ngang`, async () => {
      const bad = [];
      const { ctx, page } = await open(browser, { viewport: { width: w, height: w < 700 ? 780 : 900 }, hash: 'explore' });
      try {
        for (const p of pages) {
          await page.evaluate(h => { location.hash = h; }, p); await page.waitForTimeout(450);
          const over = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
          if (over > 1) bad.push(`${p}(+${over}px)`);
          await page.screenshot({ path: path.join(SHOT_DIR, `resp-${w}-${p}.png`) });
        }
      } finally { await ctx.close(); }
      assert.deepEqual(bad, [], 'tràn ngang: ' + bad.join(', '));
    });
  }
  await browser.close(); server.close();
  for (const [s, m] of results) console.log(s, m);
  process.exit(results.some(r => r[0] === 'FAIL') ? 1 : 0);
})();
