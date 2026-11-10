'use strict';
// Khung dùng chung cho các test trình duyệt của Visitor Web (FE07–FE12, LANG12).
// - Phục vụ thư mục frontend/ bằng server tĩnh cục bộ (cổng ngẫu nhiên).
// - Mock toàn bộ /api/v1/** bằng page.route: KHÔNG gọi backend, DB, AI, Open-Meteo hay CDN thật.
// - Ảnh published là SVG sinh tại chỗ (không dùng ảnh người dùng, không commit ảnh).
// Dữ liệu chỉ phục vụ kiểm thử; không phải dữ liệu thật của dự án.
const http = require('node:http'), fs = require('node:fs'), path = require('node:path');
// FRONTEND_ROOT cho phép so sánh với bản frontend khác (ví dụ ảnh 'before' từ commit cũ).
const ROOT = process.env.FRONTEND_ROOT ? path.resolve(process.env.FRONTEND_ROOT) : path.join(__dirname, '../../../frontend');
const MIME = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.css': 'text/css', '.png': 'image/png', '.svg': 'image/svg+xml' };

function startServer() {
  const server = http.createServer((req, res) => {
    const rel = decodeURIComponent(req.url.split('?')[0]).replace(/^\/$/, '/index.html');
    const f = path.join(ROOT, rel);
    if (!f.startsWith(ROOT) || !fs.existsSync(f) || fs.statSync(f).isDirectory()) { res.writeHead(404); return res.end(); }
    res.writeHead(200, { 'Content-Type': MIME[path.extname(f)] || 'application/octet-stream' });
    fs.createReadStream(f).pipe(res);
  });
  return new Promise(resolve => server.listen(0, '127.0.0.1', () => resolve({ server, port: server.address().port })));
}

const NAMES = ['Đại Nội Huế', 'Chùa Thiên Mụ', 'Lăng Khải Định', 'Lăng Tự Đức', 'Lăng Minh Mạng', 'Cầu Trường Tiền', 'Chợ Đông Ba', 'Điện Hòn Chén', 'Đàn Nam Giao', 'Văn Miếu Huế', 'Phố cổ Bao Vinh'];
function makeAttractions(n = 11) {
  return Array.from({ length: n }, (_, i) => ({
    id: i + 1, slug: 'di-tich-' + String(i + 1).padStart(2, '0'),
    name: NAMES[i % NAMES.length] + (i >= NAMES.length ? ' ' + (i + 1) : ''),
    category: i % 2 ? 'Lăng tẩm' : 'Di tích', content_language: 'vi',
    description: 'Mô tả thử nghiệm cho ' + NAMES[i % NAMES.length] + '. Nội dung này chỉ dùng trong kiểm thử tự động.',
    latitude: 16.40 + (i % 10) * 0.012, longitude: 107.52 + (i % 7) * 0.012
  }));
}
function svg(label, color) {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="800" height="500" viewBox="0 0 800 500"><rect width="800" height="500" fill="${color}"/><text x="400" y="260" font-size="44" text-anchor="middle" fill="#fff" font-family="sans-serif">${label}</text></svg>`;
}

/** options: showOpening(bool: giữ màn mở đầu), attractions(n), routes(n), routesStatus, failImages(bool), geo({error|coords}), viewport, hash, noTts, locale, attractionTranslations(language -> id -> name/description) */
async function open(browser, port, o = {}) {
  const ctx = await browser.newContext({ viewport: o.viewport || { width: 1366, height: 768 }, locale: o.locale || 'vi-VN' });
  const page = await ctx.newPage();
  const consoleErrors = [], pageErrors = [], requests = [], events = [];
  page.on('console', m => { if (m.type() === 'error') consoleErrors.push(m.text()); });
  page.on('pageerror', e => pageErrors.push(e.message));
  await page.addInitScript(g => {
    window.__geoCalls = 0;
    if (g) {
      const fake = { watchPosition(ok, err) { window.__geoCalls++; setTimeout(() => g.error ? err({ code: g.error, message: 'mock' }) : ok({ coords: g.coords, timestamp: Date.now() }), 50); return 1; },
        clearWatch() {}, getCurrentPosition(ok, err) { window.__geoCalls++; setTimeout(() => g.error ? err({ code: g.error }) : ok({ coords: g.coords, timestamp: Date.now() }), 50); } };
      Object.defineProperty(navigator, 'geolocation', { value: fake, configurable: true });
    }
    if (window.__noTts) { Object.defineProperty(window, 'speechSynthesis', { value: undefined, configurable: true }); }
  }, o.geo || null);
  if (!o.showOpening) await page.addInitScript(() => { try { sessionStorage.setItem('hue-opening-seen-v1', '1'); } catch {} });
  if (o.blockStorage) await page.addInitScript(() => { const boom = () => { throw new DOMException('blocked', 'SecurityError'); }; for (const k of ['getItem', 'setItem', 'removeItem']) { try { Object.defineProperty(Storage.prototype, k, { value: boom, configurable: true }); } catch {} } });
  if (o.noTts) await page.addInitScript(() => { window.__noTts = true; });
  const list = makeAttractions(o.attractions ?? 11);
  function localizedAttraction(item, language) {
    if (!o.attractionTranslations) {
      return item;
    }
    const translation = o.attractionTranslations[language]?.[item.id];
    const contentLanguage = translation ? language : 'vi';
    return {
      ...item,
      ...translation,
      requested_language: language,
      content_language: contentLanguage,
      fallback_used: language !== contentLanguage
    };
  }
  const base = 'http://127.0.0.1:' + port;
  await page.route('**/media-mock/**', route => {
    if (o.failImages) return route.fulfill({ status: 404, body: '' });
    const id = (route.request().url().match(/(\d+)\.svg/) || [, '0'])[1];
    return route.fulfill({ status: 200, contentType: 'image/svg+xml', body: svg('Ảnh thử ' + id, ['#7a5230', '#4a6b52', '#5a4a7a'][id % 3]) });
  });
  await page.route('**/api/v1/**', async route => {
    if (o.delayMs && !/visitor-sessions|visitor-events|visitor-presence/.test(route.request().url())) await new Promise(r => setTimeout(r, o.delayMs));
    const u = new URL(route.request().url());
    const json = b => route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(b) });
    if (u.pathname === '/api/v1/visitor-sessions') return json({ data: { token: 'test-token-not-real' } });
    if (/visitor-events|visitor-presence/.test(u.pathname)) { events.push(route.request().postData()); return json({ data: {} }); }
    requests.push(u.pathname + u.search);
    if (u.pathname === '/api/v1/attractions') {
      if (o.attractionsStatus) return route.fulfill({ status: o.attractionsStatus, body: '{}' });
      const language = u.searchParams.get('language') || 'vi';
      const localized = list.map(item => {
        return localizedAttraction(item, language);
      });
      return json({ data: { items: localized }, pagination: { page: 1, page_size: 100, total_items: list.length, total_pages: 1 } });
    }
    let m = u.pathname.match(/^\/api\/v1\/attractions\/(\d+)$/);
    if (m) {
      const item = list[+m[1] - 1];
      if (!item) {
        return route.fulfill({ status: 404, body: '{}' });
      }
      const a = localizedAttraction(item, u.searchParams.get('language') || 'vi');
      return json({ data: { ...a, fallback_used: a.fallback_used ?? false, media: o.noImages ? [] : [
        { id: 100 + a.id, type: 'image', url: `${base}/media-mock/${a.id}.svg`, caption: 'Ảnh minh họa ' + a.name, display_order: 1 },
        { id: 200 + a.id, type: 'image', url: `${base}/media-mock/${a.id + 1}.svg`, caption: '', display_order: 2 }] } });
    }
    if (u.pathname === '/api/v1/routes') {
      if (o.routesStatus) return route.fulfill({ status: o.routesStatus, body: '{}' });
      const all = Array.from({ length: o.routes ?? 1 }, (_, i) => ({ id: i + 1, name: 'Tuyến thử nghiệm ' + (i + 1), description: 'Mô tả tuyến ' + (i + 1), estimated_minutes: 120 }));
      return json({ data: all, pagination: { page: 1, page_size: 100, total_items: all.length, total_pages: 1 } });
    }
    m = u.pathname.match(/^\/api\/v1\/routes\/(\d+)$/);
    if (m) return json({ data: { id: +m[1], name: 'Tuyến thử nghiệm ' + m[1], description: 'Mô tả tuyến', estimated_minutes: 120, stops: [
      { order: 3, attraction_id: 3, attraction_name: list[2].name, attraction_slug: list[2].slug, latitude: list[2].latitude, longitude: list[2].longitude, visit_minutes: 30, travel_minutes_from_previous: 15 },
      { order: 1, attraction_id: 1, attraction_name: list[0].name, attraction_slug: list[0].slug, latitude: list[0].latitude, longitude: list[0].longitude, visit_minutes: 60, travel_minutes_from_previous: null },
      { order: 2, attraction_id: 2, attraction_name: list[1].name, attraction_slug: list[1].slug, latitude: list[1].latitude, longitude: list[1].longitude, visit_minutes: 45, travel_minutes_from_previous: 10 }] } });
    if (u.pathname === '/api/v1/location-suggestions') return json({ data: [], meta: {} });
    return json({ data: [], pagination: { total_pages: 1 } });
  });
  await page.route(/open-meteo|unpkg\.com|cdn\.|openstreetmap\.org\/export\/embed|openstreetmap\.org\/.*\.png|tile\./, r => r.abort());
  await page.goto(`${base}/#${o.hash || 'home'}`);
  await page.waitForSelector('#content *', { timeout: 15000 });
  return { ctx, page, consoleErrors, pageErrors, requests, events, list, base };
}

function makeRunner() {
  const results = [];
  return {
    results,
    async check(name, fn) { try { await fn(); results.push(['PASS', name]); } catch (e) { results.push(['FAIL', name + ' — ' + e.message]); } },
    report() { for (const [s, m] of results) console.log(s, m); return results.some(r => r[0] === 'FAIL') ? 1 : 0; }
  };
}
module.exports = { ROOT, startServer, open, makeRunner, makeAttractions };
