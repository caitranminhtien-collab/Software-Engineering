'use strict';
// FE11 — Kiểm tra Visitor Web trên nhiều trình duyệt desktop.
// Dùng: node tests/frontend/visitor-browser-matrix.cjs [--browsers chrome,edge,firefox] [--json out.json]
// Mặc định chỉ chạy "chromium" (có sẵn với Playwright). "chrome" và "edge" dùng trình duyệt cài trên máy
// (channel msedge/chrome); "firefox" cần `npx playwright install firefox`.
// Trình duyệt không khởi chạy được sẽ được ghi "CHUA CHAY" — KHÔNG bao giờ ghi PASS cho thứ chưa chạy.
const { chromium, firefox } = require('playwright');
const { startServer, open } = require('./_support/visitor-harness.cjs');

const arg = n => { const i = process.argv.indexOf(n); return i > 0 ? process.argv[i + 1] : null; };
const wanted = (arg('--browsers') || 'chromium').split(',').map(s => s.trim()).filter(Boolean);
const LAUNCH = {
  chromium: () => chromium.launch(),
  chrome: () => chromium.launch({ channel: 'chrome' }),
  edge: () => chromium.launch({ channel: 'msedge' }),
  firefox: () => firefox.launch()
};
const PAGES = ['home', 'explore', 'map', 'routes', 'audio', 'chat', 'weather', 'popular'];
const WIDTHS = [1280, 1366, 1920];

async function runOne(name, port) {
  const browser = await LAUNCH[name]();
  const version = browser.version();
  const rows = [];
  for (const w of WIDTHS) for (const p of PAGES) {
    const { ctx, page, pageErrors } = await open(browser, port, { hash: p, viewport: { width: w, height: 800 } });
    await page.waitForTimeout(500);
    const m = await page.evaluate(() => ({
      h1: document.querySelectorAll('h1').length,
      overflow: document.documentElement.scrollWidth - document.documentElement.clientWidth,
      textLen: (document.querySelector('main, #app, body') || document.body).innerText.length
    }));
    rows.push({ page: p, width: w, ok: m.h1 === 1 && m.overflow <= 0 && m.textLen > 50 && pageErrors.length === 0, ...m, pageErrors: pageErrors.length });
    await ctx.close();
  }
  await browser.close();
  return { name, version, rows };
}

(async () => {
  const { server, port } = await startServer();
  const results = [];
  for (const name of wanted) {
    if (!LAUNCH[name]) { results.push({ name, status: 'CHUA CHAY', reason: 'tên trình duyệt không hỗ trợ' }); continue; }
    try {
      const r = await runOne(name, port);
      const bad = r.rows.filter(x => !x.ok);
      results.push({ name, version: r.version, status: bad.length ? 'FAIL' : 'PASS', failed: bad });
    } catch (e) {
      results.push({ name, status: 'CHUA CHAY', reason: String(e.message).split('\n')[0] });
    }
  }
  server.close();
  for (const r of results) console.log(`${r.status.padEnd(9)} ${r.name}${r.version ? ' ' + r.version : ''}${r.reason ? ' — ' + r.reason : ''}${r.failed && r.failed.length ? ' — lỗi: ' + r.failed.map(f => `${f.page}@${f.width}`).join(', ') : ''}`);
  const out = arg('--json'); if (out) require('fs').writeFileSync(out, JSON.stringify(results, null, 2));
  process.exit(results.some(r => r.status === 'FAIL') ? 1 : 0);
})();
