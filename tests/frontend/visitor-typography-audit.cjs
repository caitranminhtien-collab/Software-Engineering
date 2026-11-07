'use strict';
// FE07: đo cỡ chữ và chữ/ô bị cắt trên Visitor Web ở 1280/1366/1920px (API mock, chỉ đọc).
// Chạy: node tests/frontend/visitor-typography-audit.cjs [--min 12] [--json out.json]
const { chromium } = require('playwright');
const { startServer, open } = require('./_support/visitor-harness.cjs');
const fs = require('node:fs');
const arg = (n, d) => { const i = process.argv.indexOf('--' + n); return i > 0 ? process.argv[i + 1] : d; };
const MIN = Number(arg('min', 12));
const PAGES = ['home', 'explore', 'map', 'routes', 'audio', 'chat', 'weather', 'popular'];
function inPage(min) {
  const vis = el => { const r = el.getBoundingClientRect(), s = getComputedStyle(el); return r.width > 0 && r.height > 0 && s.visibility !== 'hidden' && s.display !== 'none' && !el.closest('[hidden],[aria-hidden="true"]'); };
  const own = el => { const c = typeof el.className === 'string' ? el.className.trim().split(/\s+/).filter(Boolean).slice(0, 2).join('.') : ''; return el.tagName.toLowerCase() + (el.id ? '#' + el.id : '') + (c ? '.' + c : ''); };
  // Phần tử không có class/id: kèm cha gần nhất có class để biết đang ở khối nào.
  const sel = el => { if (el.id || (typeof el.className === 'string' && el.className.trim())) return own(el); const p = el.closest('[class],[id]'); return (p ? own(p) + ' > ' : '') + el.tagName.toLowerCase(); };
  const small = {}, clipped = {};
  document.querySelectorAll('body *').forEach(el => {
    if (!vis(el)) return;
    const own = [...el.childNodes].some(n => n.nodeType === 3 && n.textContent.trim()) || (el.matches('input,textarea') && el.placeholder);
    if (!own) return;
    const fs = parseFloat(getComputedStyle(el).fontSize);
    if (fs < min) { const k = sel(el); small[k] = small[k] || { size: fs, n: 0, sample: (el.textContent || el.placeholder || '').trim().slice(0, 24) }; small[k].n++; small[k].size = Math.min(small[k].size, fs); }
    const s = getComputedStyle(el);
    const ell = s.textOverflow === 'ellipsis' && el.scrollWidth > el.clientWidth + 1;
    const hid = (s.overflow !== 'visible' && s.overflow !== 'auto' && s.overflow !== 'scroll') && ((el.scrollWidth > el.clientWidth + 2 && s.overflowX !== 'visible') || (el.scrollHeight > el.clientHeight + 2 && s.overflowY !== 'visible')) && !el.matches('img,svg,iframe,video,.hue-map,#hue-map,[class*=map]');
    if (ell || hid) { const k = sel(el); clipped[k] = clipped[k] || { kind: ell ? 'ellipsis' : 'overflow-hidden', sample: (el.textContent || '').trim().slice(0, 40) }; }
  });
  return { small, clipped };
}
(async () => {
  const { server, port } = await startServer(); const browser = await chromium.launch(); const all = {};
  for (const w of [1280, 1366, 1920]) for (const p of PAGES) {
    const { ctx, page } = await open(browser, port, { hash: p, viewport: { width: w, height: w === 1920 ? 1080 : 768 } });
    await page.waitForTimeout(800); all[`${p}@${w}`] = await page.evaluate(inPage, MIN); await ctx.close();
  }
  await browser.close(); server.close();
  const agg = {}, clip = {};
  for (const [k, v] of Object.entries(all)) {
    for (const [s, d] of Object.entries(v.small)) { agg[s] = agg[s] || { size: d.size, sample: d.sample, where: new Set() }; agg[s].size = Math.min(agg[s].size, d.size); agg[s].where.add(k.split('@')[0]); }
    for (const [s, d] of Object.entries(v.clipped)) { clip[s] = clip[s] || { ...d, where: new Set() }; clip[s].where.add(k); }
  }
  console.log(`Phần tử có chữ nhỏ hơn ${MIN}px:`);
  Object.entries(agg).sort((a, b) => a[1].size - b[1].size).forEach(([s, d]) => console.log(`  ${d.size}px  ${s}  "${d.sample}"  [${[...d.where].join(',')}]`));
  console.log('\nChữ/ô có dấu hiệu bị cắt:'); const cl = Object.entries(clip); if (!cl.length) console.log('  (không có)');
  cl.forEach(([s, d]) => console.log(`  ${d.kind}  ${s}  "${d.sample}"  [${[...d.where].slice(0, 4).join(',')}]`));
  const j = process.argv.indexOf('--json'); if (j > 0) fs.writeFileSync(process.argv[j + 1], JSON.stringify({ small: agg, clipped: clip }, (k, v) => v instanceof Set ? [...v] : v, 1));
})();
