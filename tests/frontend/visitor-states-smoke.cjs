'use strict';
// FE10 — Trạng thái Loading / Empty / Error của Visitor Web (mock API). Chụp ảnh vào SHOT_DIR (mặc định ./test-artifacts).
// Chạy: node tests/frontend/visitor-states-smoke.cjs
const assert = require('node:assert/strict');
const fs = require('node:fs'), path = require('node:path');
const { chromium } = require('playwright');
const { startServer, open, makeRunner } = require('./_support/visitor-harness.cjs');
const SHOT_DIR = process.env.SHOT_DIR || path.join(process.cwd(), 'test-artifacts');
fs.mkdirSync(SHOT_DIR, { recursive: true });

(async () => {
  const { server, port } = await startServer();
  const browser = await chromium.launch();
  const t = makeRunner();
  const shot = (page, name) => page.screenshot({ path: path.join(SHOT_DIR, `state-${name}.png`) });
  const bodyText = page => page.evaluate(() => document.body.innerText);

  await t.check('Error (explore 500): có tiêu đề lỗi + nút Thử tải lại, không hiện dữ liệu mẫu', async () => {
    const { ctx, page } = await open(browser, port, { hash: 'explore', attractionsStatus: 500 });
    await page.waitForSelector('button:has-text("Thử tải lại")');
    assert.match(await bodyText(page), /Không tải được dữ liệu di tích/);
    assert.equal(await page.$$eval('.hue-explorer-card', l => l.length), 0);
    await shot(page, 'explore-error'); await ctx.close();
  });

  await t.check('Error (routes 500): có thông báo + nút Thử lại, không hiện tuyến mẫu', async () => {
    const { ctx, page } = await open(browser, port, { hash: 'routes', routesStatus: 500 });
    await page.waitForSelector('button:has-text("Thử lại")');
    assert.equal(await page.$$eval('.route-choice', l => l.length), 0);
    await shot(page, 'routes-error'); await ctx.close();
  });

  await t.check('Empty (routes 0): hiện "Chưa có tuyến tham quan", không có tuyến mẫu', async () => {
    const { ctx, page } = await open(browser, port, { hash: 'routes', routes: 0 });
    await page.waitForFunction(() => /Chưa có tuyến tham quan/.test(document.body.innerText));
    assert.equal(await page.$$eval('.route-choice', l => l.length), 0);
    await shot(page, 'routes-empty'); await ctx.close();
  });

  await t.check('Empty (không ảnh) & ảnh lỗi: khối thay thế có chữ, không để ô trống', async () => {
    for (const [k, o] of [['noimg', { noImages: true }], ['badimg', { failImages: true }]]) {
      const { ctx, page } = await open(browser, port, { hash: 'explore', attractions: 3, ...o });
      await page.waitForSelector('.hue-explorer-placeholder');
      const txt = await page.$$eval('.hue-explorer-placeholder', l => l.map(x => x.innerText.trim() || x.getAttribute('aria-label') || ''));
      assert.ok(txt.length === 3 && txt.every(s => s.length > 3), 'khối thay thế trống: ' + JSON.stringify(txt));
      await shot(page, 'explore-' + k); await ctx.close();
    }
  });

  await t.check('Loading: trong lúc API chậm trang không trắng và không có lỗi JS; sau đó hiện dữ liệu', async () => {
    const { ctx, page, pageErrors } = await open(browser, port, { hash: 'explore', attractions: 3, delayMs: 1200 });
    await page.waitForTimeout(300);
    const early = (await bodyText(page)).trim();
    assert.ok(early.length > 30, 'trang trống khi đang tải');
    await shot(page, 'explore-loading');
    await page.waitForSelector('.hue-explorer-card', { timeout: 8000 });
    assert.equal(pageErrors.length, 0); await ctx.close();
  });

  await browser.close(); server.close();
  process.exit(t.report());
})();
