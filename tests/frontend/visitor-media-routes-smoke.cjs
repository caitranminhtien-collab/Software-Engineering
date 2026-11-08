'use strict';
// FE12 — Ảnh di tích, thứ tự điểm dừng tuyến, liên kết bản đồ. API được MOCK (không backend/DB/CDN).
// Chạy: node tests/frontend/visitor-media-routes-smoke.cjs
// Lưu ý: dữ liệu mock chỉ để kiểm thử cơ chế; KHÔNG dùng ảnh chụp mock làm ảnh minh họa thật.
const assert = require('node:assert/strict');
const { chromium } = require('playwright');
const { startServer, open, makeRunner } = require('./_support/visitor-harness.cjs');

(async () => {
  const { server, port } = await startServer();
  const browser = await chromium.launch();
  const t = makeRunner();

  await t.check('Có ảnh: mỗi thẻ có <img> với alt, ảnh tải được (naturalWidth > 0)', async () => {
    const { ctx, page } = await open(browser, port, { hash: 'explore', attractions: 4 });
    await page.waitForSelector('.hue-explorer-card img.hue-published-photo');
    await page.waitForFunction(() => [...document.querySelectorAll('.hue-explorer-card img')].every(i => i.complete));
    const imgs = await page.$$eval('.hue-explorer-card img', l => l.map(i => ({ alt: i.alt, ok: i.naturalWidth > 0 })));
    assert.equal(imgs.length, 4);
    for (const i of imgs) { assert.ok(i.alt.trim().length > 3, 'thiếu alt'); assert.ok(i.ok, 'ảnh không tải được'); }
    await ctx.close();
  });

  await t.check('Ảnh lỗi (404): hiện khối thay thế, không còn ảnh vỡ, trang vẫn dùng được', async () => {
    const { ctx, page, pageErrors } = await open(browser, port, { hash: 'explore', attractions: 3, failImages: true });
    await page.waitForSelector('.hue-explorer-placeholder');
    assert.equal(await page.$$eval('.hue-explorer-card img', l => l.filter(i => i.complete && i.naturalWidth === 0).length), 0, 'còn ảnh vỡ');
    assert.ok((await page.textContent('.hue-explorer-placeholder')).includes('Chưa tải được ảnh'));
    assert.equal(pageErrors.length, 0);
    assert.ok(await page.$('.hue-explorer-card button[data-detail]'), 'nút Khám phá vẫn còn');
    await ctx.close();
  });

  await t.check('Chưa có ảnh: khối "Chưa có ảnh" có nhãn truy cập, không có <img>', async () => {
    const { ctx, page } = await open(browser, port, { hash: 'explore', attractions: 3, noImages: true });
    await page.waitForSelector('.hue-explorer-placeholder[role="img"]');
    assert.equal(await page.$$eval('.hue-explorer-card img', l => l.length), 0);
    const label = await page.getAttribute('.hue-explorer-placeholder[role="img"]', 'aria-label');
    assert.match(label, /chưa có ảnh/i);
    await ctx.close();
  });

  await t.check('Tuyến: điểm dừng hiển thị đúng thứ tự stop_order dù API trả lộn xộn', async () => {
    const { ctx, page } = await open(browser, port, { hash: 'routes', routes: 2 });
    await page.click('button.route-choice');
    await page.waitForSelector('.route-journey-stops li');
    const nums = await page.$$eval('.route-journey-stops li', l => l.map(li => li.textContent.trim().match(/^\d+/)[0]));
    assert.deepEqual(nums, nums.map((_, i) => String(i + 1)), 'số thứ tự không tăng dần 1..n: ' + nums);
    assert.ok(nums.length >= 2);
    await ctx.close();
  });

  await t.check('Liên kết bản đồ: Google Maps dir đủ origin/destination/waypoints, OSM đúng tọa độ, mở tab mới an toàn', async () => {
    const { ctx, page } = await open(browser, port, { hash: 'routes', routes: 1 });
    await page.click('button.route-choice');
    await page.waitForSelector('.route-journey-stops li');
    const links = await page.$$eval('a[href]', l => l.map(a => ({ href: a.href, target: a.target, rel: a.rel })).filter(x => /google\.com\/maps|openstreetmap\.org/.test(x.href)));
    const g = links.find(x => x.href.includes('google.com/maps/dir'));
    assert.ok(g, 'thiếu liên kết Google Maps dẫn đường');
    const u = new URL(g.href);
    assert.equal(u.searchParams.get('api'), '1');
    for (const k of ['origin', 'destination']) assert.match(u.searchParams.get(k), /^-?\d+(\.\d+)?,-?\d+(\.\d+)?$/);
    const osm = links.filter(x => x.href.includes('openstreetmap.org'));
    assert.ok(osm.length >= 2, 'thiếu liên kết OSM cho điểm dừng');
    for (const o of osm) assert.match(o.href, /mlat=-?\d+(\.\d+)?&mlon=-?\d+(\.\d+)?/);
    for (const l of links) if (l.target === '_blank') assert.match(l.rel, /noopener/, 'target=_blank thiếu rel=noopener');
    await ctx.close();
  });

  await browser.close(); server.close();
  process.exit(t.report());
})();
