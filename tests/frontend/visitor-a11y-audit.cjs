'use strict';
// FE08: audit accessibility Visitor Web (chỉ ĐỌC, không sửa trang). Chạy từng màn hình ở 1366px với API mock.
// Kiểm: tên truy cập của điều khiển, alt ảnh, phần tử bấm được nhưng không focus được bằng bàn phím,
// vòng focus nhìn thấy khi Tab, tiêu đề/landmark, độ tương phản chữ (ước lượng, bỏ qua chữ trên ảnh nền).
// Chạy: node tests/frontend/visitor-a11y-audit.cjs [--json out.json]   (cần playwright)
const { chromium } = require('playwright');
const { startServer, open } = require('./_support/visitor-harness.cjs');
const fs = require('node:fs');
const PAGES = ['home', 'explore', 'map', 'routes', 'audio', 'chat', 'weather', 'popular'];

function inPage() {
  const vis = el => { const r = el.getBoundingClientRect(), s = getComputedStyle(el); return r.width > 0 && r.height > 0 && s.visibility !== 'hidden' && s.display !== 'none' && !el.closest('[hidden],[aria-hidden="true"]'); };
  const desc = el => el.tagName.toLowerCase() + (el.id ? '#' + el.id : '') + (el.className && typeof el.className === 'string' ? '.' + el.className.trim().split(/\s+/).slice(0, 2).join('.') : '');
  const accName = el => {
    const lab = el.getAttribute('aria-label'); if (lab && lab.trim()) return lab.trim();
    const lb = el.getAttribute('aria-labelledby'); if (lb) { const t = lb.split(/\s+/).map(id => document.getElementById(id)?.textContent || '').join(' ').trim(); if (t) return t; }
    if (el.id) { const l = document.querySelector(`label[for="${CSS.escape(el.id)}"]`); if (l && l.textContent.trim()) return l.textContent.trim(); }
    if (el.closest('label')?.textContent.trim()) return el.closest('label').textContent.trim();
    const img = el.querySelector('img[alt]'); const t = (el.textContent || '').trim();
    if (t) return t; if (img && img.alt.trim()) return img.alt.trim();
    if (el.title) return el.title.trim(); return '';
  };
  const out = { noName: [], imgNoAlt: [], mouseOnly: [], h1: document.querySelectorAll('h1').length, landmarks: [...document.querySelectorAll('main,nav,header,footer,aside,[role=main],[role=navigation]')].map(desc), lang: document.documentElement.lang };
  document.querySelectorAll('button,a[href],input:not([type=hidden]),select,textarea,[role=button],[role=tab],[role=link],summary,audio[controls]').forEach(el => {
    if (!vis(el)) return; if (!accName(el)) out.noName.push(desc(el));
  });
  document.querySelectorAll('img').forEach(el => { if (vis(el) && !el.hasAttribute('alt')) out.imgNoAlt.push(desc(el) + ' src=' + (el.getAttribute('src') || '').slice(0, 40)); });
  const natively = el => el.matches('a[href],button,input,select,textarea,summary,audio[controls],[tabindex],[role=button],[role=tab],[role=link]') || el.closest('a[href],button,[role=button],label');
  document.querySelectorAll('body *').forEach(el => {
    if (!vis(el)) return; const s = getComputedStyle(el);
    if (s.cursor === 'pointer' && !natively(el) && !el.querySelector('a[href],button')) out.mouseOnly.push(desc(el) + ' "' + (el.textContent || '').trim().slice(0, 30) + '"');
  });
  // độ tương phản
  const lum = c => { const f = v => { v /= 255; return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4); }; return 0.2126 * f(c[0]) + 0.7152 * f(c[1]) + 0.0722 * f(c[2]); };
  const parse = s => { const m = s.match(/rgba?\(([^)]+)\)/); if (!m) return null; const p = m[1].split(',').map(parseFloat); return [p[0], p[1], p[2], p.length > 3 ? p[3] : 1]; };
  const bgOf = el => { for (let n = el; n; n = n.parentElement) { const s = getComputedStyle(n); if (s.backgroundImage !== 'none') return null; const c = parse(s.backgroundColor); if (c && c[3] > 0.95) return c; } return [255, 255, 255, 1]; };
  const low = new Map();
  document.querySelectorAll('body *').forEach(el => {
    if (!vis(el) || ![...el.childNodes].some(n => n.nodeType === 3 && n.textContent.trim())) return;
    const s = getComputedStyle(el); const fg = parse(s.color), bg = bgOf(el); if (!fg || !bg || fg[3] < 1) return;
    const a = lum(fg) + 0.05, b = lum(bg) + 0.05, ratio = Math.max(a, b) / Math.min(a, b);
    const size = parseFloat(s.fontSize), bold = parseInt(s.fontWeight) >= 700; const need = (size >= 24 || (size >= 18.66 && bold)) ? 3 : 4.5;
    if (ratio < need) { const k = desc(el) + ' ' + s.color + ' on ' + `rgb(${bg.slice(0, 3)})`; if (!low.has(k)) low.set(k, { el: k, ratio: +ratio.toFixed(2), need, text: el.textContent.trim().slice(0, 30) }); }
  });
  out.lowContrast = [...low.values()];
  return out;
}

(async () => {
  const { server, port } = await startServer();
  const browser = await chromium.launch();
  const report = {};
  for (const p of PAGES) {
    const { ctx, page } = await open(browser, port, { hash: p });
    await page.waitForTimeout(900);
    const r = await page.evaluate(inPage);
    // Tab order + vòng focus
    const seq = []; let noRing = 0; const noRingList = [];
    await page.evaluate(() => document.activeElement && document.activeElement.blur());
    for (let i = 0; i < 40; i++) {
      await page.keyboard.press('Tab');
      const info = await page.evaluate(() => {
        const el = document.activeElement; if (!el || el === document.body) return null;
        const s = getComputedStyle(el); const ring = (parseFloat(s.outlineWidth) > 0 && s.outlineStyle !== 'none') || (s.boxShadow && s.boxShadow !== 'none');
        const r = el.getBoundingClientRect();
        return { d: el.tagName.toLowerCase() + (el.id ? '#' + el.id : '') + (typeof el.className === 'string' && el.className ? '.' + el.className.trim().split(/\s+/)[0] : ''), ring: !!ring, onScreen: r.width > 0 && r.bottom > 0 && r.top < innerHeight };
      });
      if (!info) break; seq.push(info.d); /* iframe: Chromium không áp :focus/outline lên chính thẻ iframe (tiêu điểm nằm trong tài liệu con) — để kiểm tay, ghi trong docs/visitor-a11y-checklist.md */ if (!info.ring && !info.d.startsWith('iframe')) { noRing++; noRingList.push(info.d); }
    }
    r.noRingList = noRingList; r.tabStops = seq.length; r.tabNoRing = noRing; r.tabFirst = seq.slice(0, 8);
    report[p] = r; await ctx.close();
  }
  await browser.close(); server.close();
  const uniq = a => [...new Set(a)];
  let problems = 0;
  for (const p of PAGES) {
    const r = report[p];
    const n = r.noName.length + r.imgNoAlt.length + r.mouseOnly.length + r.lowContrast.length + r.tabNoRing;
    problems += n;
    console.log(`\n== ${p}: Tab stops=${r.tabStops}, thiếu vòng focus=${r.tabNoRing}${r.noRingList.length ? ' (' + [...new Set(r.noRingList)].join(', ') + ')' : ''}, h1=${r.h1}, lang=${r.lang}`);
    if (r.noName.length) console.log('  Thiếu tên truy cập:', uniq(r.noName).join(' | '));
    if (r.imgNoAlt.length) console.log('  <img> thiếu alt:', uniq(r.imgNoAlt).join(' | '));
    if (r.mouseOnly.length) console.log('  Bấm được nhưng KHÔNG focus được bằng phím:', uniq(r.mouseOnly).slice(0, 12).join(' | '));
    if (r.lowContrast.length) console.log('  Tương phản thấp:', r.lowContrast.slice(0, 8).map(x => `${x.el} [${x.ratio}<${x.need}] "${x.text}"`).join(' | '));
  }
  const j = process.argv.indexOf('--json'); if (j > 0) fs.writeFileSync(process.argv[j + 1], JSON.stringify(report, null, 1));
  console.log('\nTổng số điểm cần xem xét:', problems);
})();
