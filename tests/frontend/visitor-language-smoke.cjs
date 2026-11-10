'use strict';
// LANG06 — Bộ chọn ngôn ngữ trên Visitor Web (mock API). Chạy: node tests/frontend/visitor-language-smoke.cjs
// Chạy được với Chromium (và "chrome"/"firefox"/"edge" qua --browser). Trình duyệt không có → ghi CHUA CHAY, không PASS.
const assert = require('node:assert/strict');
const pw = require('playwright');
const { startServer, open, makeRunner } = require('./_support/visitor-harness.cjs');
const dictionary = require('../../frontend/hue-i18n-dict.js');
const attractionTranslations = {
  en: {
    1: {
      name: 'English heritage fixture',
      description: 'Published English description for the language smoke test.'
    }
  }
};
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
      await page.waitForSelector('.dash-categories');
      await page.waitForFunction(() => {
        return !/Tổng quan|Một góc nhìn/.test(document.querySelector('#content').innerText);
      });
    }
    assert.equal(await page.evaluate(() => document.documentElement.lang), 'de');
    assert.equal(pageErrors.length, 0);
    await ctx.close();
  });

  await t.check('Reload giữ en, html lang=en và request danh sách đầu tiên language=en', async () => {
    const { ctx, page, requests } = await open(browser, port, {
      hash: 'explore',
      attractions: 3,
      attractionTranslations
    });
    try {
      await page.selectOption('#lang-select', 'en');
      await page.getByRole('heading', { name: attractionTranslations.en[1].name, exact: true }).waitFor();
      requests.length = 0;
      await page.reload();
      await page.getByRole('heading', { name: attractionTranslations.en[1].name, exact: true }).waitFor();
      assert.equal(await page.inputValue('#lang-select'), 'en');
      assert.equal(await page.getAttribute('html', 'lang'), 'en');
      const firstList = requests.find(request => {
        return request.startsWith('/api/v1/attractions?');
      });
      assert.ok(firstList, 'Không ghi nhận request danh sách sau reload');
      assert.equal(new URL(firstList, 'http://fixture.invalid').searchParams.get('language'), 'en');
      await page.selectOption('#lang-select', 'vi');
      await page.getByRole('heading', { name: 'Đại Nội Huế', exact: true }).waitFor();
      assert.equal(await page.getAttribute('html', 'lang'), 'vi');
    } finally {
      await ctx.close();
    }
  });

  await t.check('vi → en: list/detail dùng language=en, chi tiết tiếng Anh và fallback tiếng Việt', async () => {
    const { ctx, page, requests, list, pageErrors } = await open(browser, port, {
      hash: 'explore',
      attractions: 3,
      attractionTranslations
    });
    try {
      await page.getByRole('heading', { name: list[0].name, exact: true }).waitFor();
      await page.selectOption('#lang-select', 'en');
      await page.getByRole('heading', { name: attractionTranslations.en[1].name, exact: true }).waitFor();
      assert.ok(requests.some(request => {
        return request.startsWith('/api/v1/attractions?language=en&');
      }));
      assert.ok(requests.includes('/api/v1/attractions/1?language=en'));
      assert.ok(requests.includes('/api/v1/attractions/2?language=en'));
      await page.locator('#content [data-detail="di-tich-01"]').click();
      const detail = page.locator('#modal .hue-heritage-detail');
      await detail.getByRole('heading', { name: attractionTranslations.en[1].name, exact: true }).waitFor();
      assert.equal(await detail.locator('.hue-detail-intro').innerText(), attractionTranslations.en[1].description);
      assert.equal(await detail.getByRole('status').count(), 0);
      await page.locator('#close-modal').click();
      await page.locator('#content [data-detail="di-tich-02"]').click();
      await detail.getByRole('heading', { name: list[1].name, exact: true }).waitFor();
      assert.equal(await detail.locator('.hue-detail-intro').innerText(), list[1].description);
      await detail.getByRole('status').filter({ hasText: 'tiếng Việt dự phòng' }).waitFor();
      assert.equal(pageErrors.length, 0);
    } finally {
      await ctx.close();
    }
  });

  await t.check('Chat: en → de → vi cập nhật thông báo và giữ nguyên câu hỏi nháp', async () => {
    const { ctx, page } = await open(browser, port, { hash: 'chat', attractions: 3 });
    try {
      await page.selectOption('#lang-select', 'en');
      const notice = page.locator('#chat-language-notice');
      await notice.waitFor({ state: 'hidden' });
      const draft = 'Câu hỏi nháp LANG12 chưa gửi';
      await page.locator('#chat-input').fill(draft);
      await page.selectOption('#lang-select', 'de');
      await notice.waitFor({ state: 'visible' });
      await page.waitForFunction(expected => {
        return document.querySelector('#chat-language-notice')?.textContent === expected;
      }, dictionary.de['chat.languageLimit']);
      assert.equal(await page.inputValue('#chat-input'), draft);
      await page.selectOption('#lang-select', 'vi');
      await notice.waitFor({ state: 'hidden' });
      assert.equal(await page.inputValue('#chat-input'), draft);
    } finally {
      await ctx.close();
    }
  });

  await t.check('Nhãn nút và trạng thái trống Visitor được dịch sang tiếng Anh', async () => {
    const { ctx, page } = await open(browser, port, { hash: 'routes', attractions: 3, routes: 0 });
    try {
      await page.selectOption('#lang-select', 'en');
      await page.locator('#nav').getByRole('button', { name: dictionary.en['nav.chat'], exact: true }).waitFor();
      await page.getByRole('heading', { name: dictionary.en['empty.routes'], exact: true }).waitFor();
    } finally {
      await ctx.close();
    }
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
