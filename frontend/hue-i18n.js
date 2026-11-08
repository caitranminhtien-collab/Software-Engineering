/* Hue Guide — Visitor i18n (LANG01/LANG02/LANG04/LANG05).
 * Script thuần, không framework. Dùng được trong trình duyệt (window.HueI18n) và Node (require) để kiểm thử.
 * Chức năng: danh sách 7 ngôn ngữ, ngôn ngữ hiện tại (lưu localStorage, mặc định vi),
 * translate(key) có fallback, sự kiện `hue:languagechange`.
 * Phạm vi: chỉ nhãn giao diện cố định. KHÔNG dịch nội dung di tích/tuyến từ API; không dịch giả. */
(function (root, factory) {
  'use strict';
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  else {
    root.HueI18n = api;
    const dict = root.HueI18nDict;
    if (dict) api.init({ dict, storage: safeStorage(root), doc: root.document, win: root });
  }
  function safeStorage(r) { try { return r.localStorage || null; } catch (e) { return null; } }
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  const STORAGE_KEY = 'hue-language-v1';
  const DEFAULT_LANGUAGE = 'vi';
  const LANGUAGES = [
    { code: 'vi', label: 'Tiếng Việt', htmlLang: 'vi' },
    { code: 'en', label: 'English', htmlLang: 'en' },
    { code: 'zh', label: '中文', htmlLang: 'zh-CN' },
    { code: 'ja', label: '日本語', htmlLang: 'ja' },
    { code: 'ko', label: '한국어', htmlLang: 'ko' },
    { code: 'fr', label: 'Français', htmlLang: 'fr' },
    { code: 'de', label: 'Deutsch', htmlLang: 'de' }
  ];
  const CODES = LANGUAGES.map(l => l.code);
  const isSupported = code => typeof code === 'string' && CODES.includes(code);

  /** Tạo một bản i18n độc lập (để test). storage/doc/win đều tùy chọn. */
  function create({ dict, storage, doc, win } = {}) {
    dict = dict || {};
    let current = DEFAULT_LANGUAGE;
    const listeners = new Set();

    function readStored() {
      try { const v = storage && storage.getItem(STORAGE_KEY); return isSupported(v) ? v : null; } catch (e) { return null; }
    }
    function writeStored(code) { try { storage && storage.setItem(STORAGE_KEY, code); } catch (e) { /* private mode / bị chặn: bỏ qua */ } }

    function applyToDocument(code) {
      if (!doc || !doc.documentElement) return;
      const meta = LANGUAGES.find(l => l.code === code);
      doc.documentElement.setAttribute('lang', meta ? meta.htmlLang : code);
    }

    function getCurrentLanguage() { return current; }

    /** Đổi ngôn ngữ. Mã không hỗ trợ → bỏ qua, trả false. */
    function setCurrentLanguage(code, options = {}) {
      if (!isSupported(code)) return false;
      const changed = code !== current;
      current = code;
      if (options.persist !== false) writeStored(code);
      applyToDocument(code);
      if (changed || options.force) {
        const detail = { language: code };
        listeners.forEach(fn => { try { fn(code); } catch (e) { /* một listener lỗi không làm hỏng các listener khác */ } });
        try {
          if (win && typeof win.CustomEvent === 'function' && doc) doc.dispatchEvent(new win.CustomEvent('hue:languagechange', { detail }));
        } catch (e) { /* bỏ qua */ }
      }
      return true;
    }

    /** translate(key[, lang]) — thiếu bản dịch → dùng tiếng Việt → thiếu nữa → trả lại chính key. */
    function translate(key, lang) {
      const code = isSupported(lang) ? lang : current;
      const own = dict[code] && dict[code][key];
      if (typeof own === 'string' && own !== '') return own;
      const vi = dict[DEFAULT_LANGUAGE] && dict[DEFAULT_LANGUAGE][key];
      if (typeof vi === 'string' && vi !== '') return vi;
      return key;
    }

    /** Khóa ứng với một chuỗi tiếng Việt gốc (dùng cho bộ dịch DOM). */
    let reverse = null;
    function keyForSource(text) {
      if (!reverse) {
        reverse = new Map();
        const vi = dict[DEFAULT_LANGUAGE] || {};
        for (const k of Object.keys(vi)) if (!reverse.has(vi[k])) reverse.set(vi[k], k);
      }
      return reverse.get(text) || null;
    }

    function onChange(fn) { listeners.add(fn); return () => listeners.delete(fn); }

    /** Đọc ngôn ngữ đã lưu (mặc định vi) và đặt lang cho <html>. Không phát sự kiện. */
    function init(opts) {
      if (opts) { dict = opts.dict || dict; storage = opts.storage !== undefined ? opts.storage : storage; doc = opts.doc || doc; win = opts.win || win; reverse = null; }
      current = readStored() || DEFAULT_LANGUAGE;
      applyToDocument(current);
      return current;
    }

    return { init, getCurrentLanguage, setCurrentLanguage, translate, keyForSource, onChange, languages: LANGUAGES, isSupported, STORAGE_KEY, DEFAULT_LANGUAGE };
  }

  // Bản dùng chung trong trình duyệt; init() được gọi ở trên khi có window.HueI18nDict.
  const shared = create();
  const api = Object.assign({ create }, shared);
  // Giữ tham chiếu hàm theo đối tượng chung để init() cập nhật cùng trạng thái.
  return api;
});
