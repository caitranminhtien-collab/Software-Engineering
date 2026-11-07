'use strict';
// FE07/FE10/FE12: chụp ảnh các màn hình + trạng thái của Visitor Web (API mock) để so sánh before/after.
// Chạy: node tests/frontend/visitor-capture.cjs --out <thư mục> [--widths 1280,1366,1920] [--only home,map]
// Dùng FRONTEND_ROOT=<đường dẫn frontend khác> để chụp bản cũ. Ảnh KHÔNG được commit (test-artifacts/).
const { chromium } = require('playwright');
const path = require('node:path'), fs = require('node:fs');
const { startServer, open } = require('./_support/visitor-harness.cjs');
const arg = (n, d) => { const i = process.argv.indexOf('--' + n); return i > 0 ? process.argv[i + 1] : d; };
const out = arg('out', path.join(process.cwd(), 'test-artifacts', 'capture')); fs.mkdirSync(out, { recursive: true });
const widths = arg('widths', '1280,1366,1920').split(',').map(Number);
const only = arg('only', '') ? arg('only', '').split(',') : null;
const H = { 1280: 800, 1366: 768, 1920: 1080 };

// [tên, tùy chọn open, hành động sau khi mở]
const SCENES = [
  ['home', { hash: 'home' }],
  ['explore', { hash: 'explore' }],
  ['detail', { hash: 'explore' }, async p => { await p.locator('.hue-explorer-card, [data-open], .place-card').first().click().catch(() => {}); await p.waitForTimeout(500); }],
  ['map', { hash: 'map' }],
  ['routes', { hash: 'routes', routes: 1 }],
  ['routes-empty', { hash: 'routes', routes: 0 }],
  ['routes-error', { hash: 'routes', routesStatus: 500 }],
  ['audio', { hash: 'audio' }],
  ['chat', { hash: 'chat' }],
  ['weather', { hash: 'weather' }],
  ['popular', { hash: 'popular' }],
  ['explore-error', { hash: 'explore', attractionsStatus: 500 }],
  ['explore-noimg', { hash: 'explore', noImages: true }],
  ['explore-badimg', { hash: 'explore', failImages: true }]
];
(async () => {
  const { server, port } = await startServer(); const browser = await chromium.launch();
  for (const w of widths) for (const [name, o, act] of SCENES) {
    if (only && !only.includes(name)) continue;
    const { ctx, page, consoleErrors, pageErrors } = await open(browser, port, { ...o, viewport: { width: w, height: H[w] || 800 } });
    await page.waitForTimeout(1100); if (act) await act(page);
    const over = await page.evaluate(() => document.documentElement.scrollWidth - innerWidth);
    await page.screenshot({ path: path.join(out, `${name}-${w}.png`), fullPage: false });
    console.log(`${name}@${w} overflowX=${over} consoleErr=${consoleErrors.length} pageErr=${pageErrors.length}`);
    await ctx.close();
  }
  await browser.close(); server.close();
})();
