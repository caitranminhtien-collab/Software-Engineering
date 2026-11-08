'use strict';
// LANG06 — Bộ chọn ngôn ngữ trên Visitor Web (mock API). Chạy: node tests/frontend/visitor-language-smoke.cjs
// Chạy được với Chromium (và "chrome"/"firefox"/"edge" qua --browser). Trình duyệt không có → ghi CHUA CHAY, không PASS.
const assert = require('node:assert/strict');
const pw = require('playwright');
const { startServer, open, makeRunner } = require('./_support/visitor-harness.cjs');
const bi = process.argv.indexOf('--browser'); const which = bi > 0 ? process.argv[bi + 1] : 'chromium';
const LAUNCH = { chromium: () => pw.chromium.launch(), chrome: () => pw.chromium.launch({ channel: 'chrome' }), edge: () => pw.chromium.launch({ channel: 'msedge' }), firefox: () => pw.firefox.launch() };
const EXPECT = { en: 'Map', zh: '地图', ja: '地図', ko: '지도', fr: 'Carte', de: 'Karte' };
const navTexts = page => page.$$eval('#nav button', l => l.map(b => b.innerText.trim()));

(async () => {
  let browser;
  try { browser = await LAUNCH[which](); } catch (e) { console.log(`CHUA CHAY ${which} — ${String(e.message).split('\n')[0]}`); process.exit(0); }
  const { server, port } = await startServer();
  const t = makeRunner();

  await t.check('Mặc định vi, selector ở góc phải trên cùng hàng với ô tìm kiếm, có đủ 7 lựa chọn', async () => {
    const { ctx, page } = await open(browser, port, { hash: 'home', attractions: 3 });
    assert.equal(await page.inputValue('#lang-select'), 'vi');
    assert.deepEqual(await page.$$eval('#lang-select option', l => l.map(o => o.value)), ['vi', 'en', 'zh', 'ja', 'ko', 'fr', 'de']);
    const a = await page.locator('#lang-select').boundingBox(), s = await page.locator('.global-search').boundingBox();
    assert.ok(a.y < 120 && Math.abs(a.y - s.y) < 20, 'không cùng hàng trên cùng');
    assert.ok(a.x > 400, 'không nằm phía phải');
    assert.equal(await page.evaluate(() => document.documentElement.lang), 'vi');
    await ctx.close();
  });

  await t.check('Đổi từng ngôn ngữ: menu điều hướng + tiêu đề + placeholder đổi, <html lang> đổi', async () => {
    const { ctx, page, pageErrors } = await open(browser, port, { hash: 'home', attractions: 3 });
    for (const [code, mapLabel] of Object.entries(EXPECT)) {
      await page.selectOption('#lang-select', code);
      await page.waitForFunction(l => [...document.querySelectorAll('#nav button')].some(b => b.innerText.trim() === l), mapLabel);
      assert.ok((await navTexts(page)).includes(mapLabel), code);
      const ph = await page.getAttribute('#global-search', 'placeholder');
      assert.ok(ph && !/Tìm một câu chuyện/.test(ph), `placeholder chưa đổi ở ${code}`);
      assert.ok(!/Tổng quan|Một góc nhìn/.test(await page.innerText('#content')), `tiêu đề trang chủ còn tiếng Việt ở ${code}`);
    }
    assert.equal(await page.evaluate(() => document.documentElement.lang), 'de');
    assert.equal(pageErrors.length, 0);
    await ctx.close();
  });

  await t.check('Trang tải lại giữ ngôn ngữ đã chọn (localStorage); quay về vi hoạt động', async () => {
    const { ctx, page } = await open(browser, port, { hash: 'home', attractions: 3 });
    await page.selectOption('#lang-select', 'fr');
    await page.waitForFunction(() => document.querySelector('#nav').innerText.includes('Carte'));
    await page.reload();
    await page.waitForFunction(() => document.querySelector('#nav') && document.querySelector('#nav').innerText.includes('Carte'));
    assert.equal(await page.inputValue('#lang-select'), 'fr');
    await page.selectOption('#lang-select', 'vi');
    await page.waitForFunction(() => document.querySelector('#nav').innerText.includes('Bản đồ'));
    assert.ok(!(await page.innerText('#nav')).includes('Carte'));
    await ctx.close();
  });

  await t.check('Chuyển trang khi đang ở en: nhãn trang mới vẫn dịch; tên di tích/dữ liệu API KHÔNG bị đổi', async () => {
    const { ctx, page } = await open(browser, port, { hash: 'home', attractions: 3 });
    await page.selectOption('#lang-select', 'en');
    await page.click('#nav button:has-text("Explore Heritage Sites")');
    await page.waitForSelector('.hue-explorer-card h2');
    assert.ok((await page.innerText('#content')).includes('Explore heritage sites.'));
    const names = await page.$$eval('.hue-explorer-card h2', l => l.map(h => h.textContent.trim()));
    assert.ok(names.every(n => /[À-ỹ]|Đại Nội|Chùa|Lăng/.test(n)), 'tên di tích bị đổi: ' + names);
    assert.ok((await page.innerText('.hue-explorer-card p')).includes('Mô tả thử nghiệm'), 'mô tả từ API bị đổi');
    await ctx.close();
  });

  await t.check('localStorage bị chặn: trang vẫn chạy, đổi ngôn ngữ vẫn có tác dụng trong phiên', async () => {
    const { ctx, page, pageErrors } = await open(browser, port, { hash: 'home', attractions: 3, blockStorage: true });
    await page.selectOption('#lang-select', 'ja');
    await page.waitForFunction(() => document.querySelector('#nav').innerText.includes('地図'));
    assert.equal(pageErrors.length, 0);
    await ctx.close();
  });

  await t.check('Điều hướng bàn phím tới selector + focus ring', async () => {
    const { ctx, page } = await open(browser, port, { hash: 'home', attractions: 3 });
    await page.focus('#lang-select'); await page.keyboard.press('Tab'); await page.keyboard.press('Shift+Tab');
    const ring = await page.evaluate(() => { const s = getComputedStyle(document.activeElement); return document.activeElement.id === 'lang-select' && parseFloat(s.outlineWidth) > 0; });
    assert.ok(ring, 'selector không có vòng focus');
    await ctx.close();
  });

  console.log(`Trình duyệt: ${which} ${browser.version()}`);
  await browser.close(); server.close();
  process.exit(t.report());
})();
