'use strict';
// FE04: smoke test màn Thuyết minh với API mock (không backend, không AI, không CDN).
// Chạy: node tests/frontend/visitor-audio-smoke.cjs  (cần playwright cài sẵn)
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
const N = 15;
const list = Array.from({ length: N }, (_, i) => ({ id: i + 1, slug: 'di-tich-' + String(i + 1).padStart(2, '0'), name: 'Di tích ' + String(i + 1).padStart(2, '0'), category: 'Di tích', description: 'Mô tả vi ' + (i + 1), latitude: 16.46 + i * 0.001, longitude: 107.58, content_language: 'vi' }));
// Ngôn ngữ -> phản hồi chi tiết: en có bản published; ja bị API fallback sang vi (không được đọc); ko trống.
function detailFor(id, lang) {
  const base = list[id - 1]; if (!base) return null;
  if (lang === 'en') return { ...base, description: 'English text ' + id, content_language: 'en', fallback_used: false, media: [] };
  if (lang === 'ja') return { ...base, description: 'Bản tiếng Việt thay thế', content_language: 'vi', fallback_used: true, media: [] };
  if (lang === 'ko') return { ...base, description: '', content_language: 'ko', fallback_used: false, media: [] };
  return { ...base, content_language: 'vi', fallback_used: false, media: [] };
}
const results = [];
async function check(name, fn) { try { await fn(); results.push(['PASS', name]); } catch (e) { results.push(['FAIL', name + ' — ' + e.message]); } }

async function open(browser, { noTts = false } = {}) {
  const ctx = await browser.newContext({ viewport: { width: 390, height: 800 } });
  const page = await ctx.newPage(); const errors = [];
  page.on('pageerror', e => errors.push(e.message));
  if (noTts) await page.addInitScript(() => { try { delete window.speechSynthesis; delete window.SpeechSynthesisUtterance; } catch {} Object.defineProperty(window, 'speechSynthesis', { value: undefined, configurable: true }); });
  await page.route('**/api/v1/**', route => {
    const u = new URL(route.request().url()); const json = b => route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(b) });
    if (u.pathname === '/api/v1/attractions') return json({ data: { items: list }, pagination: { page: 1, page_size: 100, total_items: N, total_pages: 1 } });
    const m = u.pathname.match(/^\/api\/v1\/attractions\/(\d+)$/); if (m) return json({ data: detailFor(+m[1], u.searchParams.get('language')) });
    if (u.pathname === '/api/v1/visitor-sessions') return json({ data: { token: 'test-token-not-real' } });
    return json({ data: [], pagination: { total_pages: 1 } });
  });
  await page.route(/open-meteo|unpkg|cdn|openstreetmap/, r => r.abort());
  await page.goto('http://127.0.0.1:' + server.address().port + '/#audio');
  await page.waitForSelector('.audio-library .track:nth-child(' + N + ')', { timeout: 15000 });
  return { ctx, page, errors };
}
(async () => {
  await new Promise(r => server.listen(0, '127.0.0.1', r));
  const browser = await chromium.launch();
  await check(`Thuyết minh liệt kê đủ ${N} điểm (không giới hạn slice(0,10))`, async () => {
    const { ctx, page } = await open(browser);
    try { assert.equal(await page.locator('.audio-library .track').count(), N); await page.screenshot({ path: path.join(SHOT_DIR, 'audio-390.png'), fullPage: true }); } finally { await ctx.close(); }
  });
  await check('Có đủ 7 lựa chọn ngôn ngữ', async () => {
    const { ctx, page } = await open(browser);
    try { assert.equal(await page.locator('#audio-language option').count(), 7); } finally { await ctx.close(); }
  });
  await check('en: hiện bản published; ja: API fallback -> KHÔNG hiện/đọc bản vi, nút Phát bị khoá', async () => {
    const { ctx, page } = await open(browser);
    try {
      await page.selectOption('#audio-language', 'en-US');
      await page.waitForSelector('.transcript:has-text("English text")');
      assert.equal(await page.locator('button[data-play]').isDisabled(), false);
      await page.selectOption('#audio-language', 'ja-JP');
      await page.waitForSelector('#play-status:has-text("Chưa có nội dung")');
      assert.ok(!(await page.locator('.transcript').innerText()).includes('Bản tiếng Việt thay thế'), 'đang hiện bản fallback');
      assert.equal(await page.locator('button[data-play]').isDisabled(), true);
    } finally { await ctx.close(); }
  });
  await check('ko: nội dung trống -> thông báo, không lỗi JS', async () => {
    const { ctx, page, errors } = await open(browser);
    try {
      await page.selectOption('#audio-language', 'ko-KR');
      await page.waitForSelector('#play-status:has-text("Chưa có nội dung")');
      assert.deepEqual(errors, []);
    } finally { await ctx.close(); }
  });
  await check('Thiết bị không có speechSynthesis: trang vẫn render, bấm Phát/Dừng không ném lỗi', async () => {
    const { ctx, page, errors } = await open(browser, { noTts: true });
    try {
      await page.click('#audio-stop');
      if (!(await page.locator('button[data-play]').isDisabled())) await page.click('button[data-play]');
      await page.waitForTimeout(300);
      assert.deepEqual(errors, []);
      assert.ok(await page.locator('#audio-voice').isVisible());
    } finally { await ctx.close(); }
  });
  await browser.close(); server.close();
  for (const [s, m] of results) console.log(s, m);
  process.exit(results.some(r => r[0] === 'FAIL') ? 1 : 0);
})();
