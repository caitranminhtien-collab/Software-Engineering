'use strict';
// FE09 — Báo cáo CSS chưa dùng trên Visitor Web (CHỈ BÁO CÁO, không xóa gì).
// Dùng CSS coverage của Chromium qua 8 trang × các trạng thái (có dữ liệu, lỗi, rỗng, ảnh lỗi).
// Cảnh báo: styles.css/theme.css DÙNG CHUNG với Admin; một quy tắc "không dùng" ở Visitor có thể Admin cần,
// và nhiều trạng thái động (hover, popup, GPS, mobile) không được kích hoạt hết → KHÔNG xóa chỉ dựa vào báo cáo này.
// Chạy: node tests/frontend/visitor-css-audit.cjs [--out docs/visitor-css-report.md]
const fs = require('node:fs');
const { chromium } = require('playwright');
const { startServer, open } = require('./_support/visitor-harness.cjs');
const PAGES = ['home', 'explore', 'map', 'routes', 'audio', 'chat', 'weather', 'popular'];
const SCEN = [{}, { attractionsStatus: 500, routesStatus: 500 }, { routes: 0 }, { failImages: true }, { noImages: true }];
const FILES = ['styles.css', 'theme.css', 'hue-map.css'];
const arg = n => { const i = process.argv.indexOf(n); return i > 0 ? process.argv[i + 1] : null; };

(async () => {
  const { server, port } = await startServer();
  const browser = await chromium.launch();
  const used = {}, text = {};
  for (const w of [1366, 390]) for (const sc of SCEN) for (const p of PAGES) {
    const { ctx, page } = await open(browser, port, { hash: p, viewport: { width: w, height: 800 }, ...sc });
    await page.coverage.startCSSCoverage();
    await page.waitForTimeout(500);
    for (const sel of ['.nav-button', 'button.filter']) { try { await page.hover(sel, { timeout: 300 }); } catch {} }
    const cov = await page.coverage.stopCSSCoverage();
    for (const c of cov) {
      const f = FILES.find(n => c.url.endsWith('/' + n)); if (!f) continue;
      text[f] = c.text; (used[f] = used[f] || []).push(...c.ranges);
    }
    await ctx.close();
  }
  await browser.close(); server.close();
  const lines = ['# Báo cáo CSS chưa dùng — Visitor Web (FE09)', '',
    'Sinh bởi `tests/frontend/visitor-css-audit.cjs`. **Chỉ để tham khảo**: file CSS dùng chung với Admin và nhiều trạng thái động không được kích hoạt.', '',
    '| File | Byte | Được dùng | Chưa thấy dùng |', '|---|---|---|---|'];
  const details = [];
  for (const f of FILES) {
    if (!text[f]) continue;
    const mark = new Uint8Array(text[f].length);
    for (const r of used[f]) mark.fill(1, r.start, r.end);
    const usedBytes = mark.reduce((a, b) => a + b, 0), n = text[f].length;
    lines.push(`| ${f} | ${n} | ${(100 * usedBytes / n).toFixed(1)}% | ${(100 * (n - usedBytes) / n).toFixed(1)}% |`);
    // Rút ra các selector đầu quy tắc không được đánh dấu
    const re = /([^{}]+)\{[^{}]*\}/g; let m; const unused = [];
    while ((m = re.exec(text[f]))) { const s = m.index + m[0].indexOf('{'); if (!mark[s]) unused.push(m[1].trim().replace(/\s+/g, ' ').slice(0, 90)); }
    details.push(`\n## ${f}: ${unused.length} quy tắc chưa thấy dùng (20 đầu)\n` + unused.slice(0, 20).map(s => '- `' + s + '`').join('\n'));
  }
  const out = lines.concat(details, ['', '## Kết luận', '- Không xóa quy tắc nào trong PR này.', '- Muốn dọn: kiểm thêm Admin, hover/focus, popup, GPS, mobile, rồi dọn từng nhóm nhỏ có ảnh chụp trước/sau.']).join('\n') + '\n';
  const o = arg('--out'); if (o) fs.writeFileSync(o, out); else console.log(out);
})();
