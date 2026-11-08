/* Hue Guide — Bộ dịch nhãn giao diện theo DOM (LANG04/LANG06). Chỉ trình duyệt; cần hue-i18n.js + hue-i18n-dict.js.
 * Không sửa app.js: quan sát DOM, đổi các chuỗi tiếng Việt GỐC khớp CHÍNH XÁC một mục trong từ điển
 * (nội dung văn bản, aria-label, placeholder, title) sang ngôn ngữ đang chọn; phần tử có data-i18n được dịch theo khóa.
 * KHÔNG dịch: chuỗi có chèn dữ liệu (tên di tích, số liệu, nội dung API/chat), thẻ script/style, ô nhập liệu (value),
 * vùng có data-no-i18n. Chuỗi chưa có bản dịch giữ nguyên tiếng Việt (không dịch giả). */
(function () {
  'use strict';
  const I18n = window.HueI18n;
  if (!I18n || !document.body) return;
  const ATTRS = ['aria-label', 'placeholder', 'title'];
  const SKIP = new Set(['SCRIPT', 'STYLE', 'TEXTAREA', 'NOSCRIPT']);
  const textState = new WeakMap();   // Text -> { src, last, pre, post }
  const attrState = new WeakMap();   // Element -> { attr: { src, last } }
  let applying = false;

  const skipped = el => !el || SKIP.has(el.tagName) || !!(el.closest && el.closest('[data-no-i18n]'));

  function translateText(node) {
    if (skipped(node.parentElement)) return;
    const st = textState.get(node);
    const raw = node.nodeValue;
    let src, pre, post;
    if (st && raw === st.last) { src = st.src; pre = st.pre; post = st.post; }
    else {
      const m = /^(\s*)([\s\S]*?)(\s*)$/.exec(raw); pre = m[1]; src = m[2]; post = m[3];
      if (!src) return;
    }
    const key = I18n.keyForSource(src);
    if (!key) { textState.delete(node); return; }
    const out = pre + I18n.translate(key) + post;
    if (out !== raw) node.nodeValue = out;
    textState.set(node, { src, last: out, pre, post });
  }

  function translateAttrs(el) {
    if (skipped(el)) return;
    let map = attrState.get(el);
    for (const a of ATTRS) {
      if (!el.hasAttribute(a)) continue;
      const cur = el.getAttribute(a);
      const known = map && map[a];
      const src = known && cur === known.last ? known.src : cur;
      const key = I18n.keyForSource(src);
      if (!key) { if (map) delete map[a]; continue; }
      const out = I18n.translate(key);
      if (out !== cur) el.setAttribute(a, out);
      map = map || {}; map[a] = { src, last: out };
      attrState.set(el, map);
    }
  }

  function translateDataI18n(el) {
    if (skipped(el)) return;
    const key = el.getAttribute('data-i18n');
    if (key) { const t = I18n.translate(key); if (el.textContent !== t) el.textContent = t; }
    const spec = el.getAttribute('data-i18n-attr'); // "placeholder:key;aria-label:key"
    if (spec) for (const part of spec.split(';')) {
      const [attr, k] = part.split(':').map(s => s && s.trim());
      if (attr && k) { const t = I18n.translate(k); if (el.getAttribute(attr) !== t) el.setAttribute(attr, t); }
    }
  }

  function walk(root) {
    if (!root) return;
    if (root.nodeType === 3) { translateText(root); return; }
    if (root.nodeType !== 1) return;
    if (skipped(root)) return;
    translateAttrs(root); translateDataI18n(root);
    const tw = document.createTreeWalker(root, 1 | 4);
    let n;
    while ((n = tw.nextNode())) {
      if (n.nodeType === 3) translateText(n);
      else { translateAttrs(n); translateDataI18n(n); }
    }
  }

  const observer = new MutationObserver(muts => {
    if (applying) return;
    applying = true;
    try {
      for (const m of muts) {
        if (m.type === 'characterData') translateText(m.target);
        else if (m.type === 'attributes') { translateAttrs(m.target); }
        else m.addedNodes.forEach(walk);
      }
    } finally { applying = false; observer.takeRecords(); }
  });

  function applyAll() {
    applying = true;
    try { walk(document.body); } finally { applying = false; observer.takeRecords(); }
  }

  function buildSelector() {
    const sel = document.getElementById('lang-select');
    if (!sel) return;
    if (!sel.options.length) {
      for (const l of I18n.languages) { const o = document.createElement('option'); o.value = l.code; o.textContent = l.label; o.setAttribute('lang', l.htmlLang); sel.appendChild(o); }
    }
    sel.value = I18n.getCurrentLanguage();
    sel.addEventListener('change', () => { I18n.setCurrentLanguage(sel.value); });
    I18n.onChange(code => { if (sel.value !== code) sel.value = code; });
  }

  function start() {
    buildSelector();
    applyAll();
    observer.observe(document.body, { subtree: true, childList: true, characterData: true, attributes: true, attributeFilter: ATTRS });
    I18n.onChange(applyAll);
    // Ngôn ngữ giao diện không áp dụng cho nội dung API: chỉ dịch nhãn cố định khớp từ điển.
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start); else start();
})();
