'use strict';
// LANG: kiểm thử module i18n + từ điển (Node thuần, không trình duyệt). Chạy: node --test tests/frontend/hue-i18n.unit.cjs
const test = require('node:test');
const assert = require('node:assert/strict');
const I18n = require('../../frontend/hue-i18n.js');
const dict = require('../../frontend/hue-i18n-dict.js');
const CODES = ['vi', 'en', 'zh', 'ja', 'ko', 'fr', 'de'];
const memStorage = (init = {}) => { const m = { ...init }; return { getItem: k => (k in m ? m[k] : null), setItem: (k, v) => { m[k] = String(v); }, _m: m }; };
const fakeDoc = () => { const attrs = {}; return { documentElement: { setAttribute: (k, v) => { attrs[k] = v; }, getAttribute: k => attrs[k] }, dispatchEvent() {} }; };

test('đủ 7 ngôn ngữ, đúng thứ tự mã', () => {
  assert.deepEqual(I18n.languages.map(l => l.code), CODES);
  assert.deepEqual(Object.keys(dict), CODES);
});

test('mọi ngôn ngữ có cùng bộ khóa với tiếng Việt, không giá trị rỗng', () => {
  const keys = Object.keys(dict.vi).sort();
  for (const c of CODES) {
    assert.deepEqual(Object.keys(dict[c]).sort(), keys, 'lệch khóa ở ' + c);
    for (const k of keys) assert.ok(typeof dict[c][k] === 'string' && dict[c][k].trim() !== '', `${c}.${k} rỗng`);
  }
});

test('bản dịch khác tiếng Việt (không sao chép) cho các nhãn điều hướng', () => {
  for (const c of CODES.filter(c => c !== 'vi')) for (const k of ['nav.home', 'nav.map', 'nav.routes', 'nav.weather']) assert.notEqual(dict[c][k], dict.vi[k], `${c}.${k} trùng tiếng Việt`);
});

test('chuỗi tiếng Việt gốc không trùng nhau giữa các khóa (bộ dịch DOM tra ngược theo chuỗi)', () => {
  const seen = new Map();
  for (const [k, v] of Object.entries(dict.vi)) { assert.ok(!seen.has(v), `${k} trùng ${seen.get(v)}`); seen.set(v, k); }
});

test('mặc định vi khi chưa lưu', () => {
  const i = I18n.create({ dict, storage: memStorage(), doc: fakeDoc() }); i.init();
  assert.equal(i.getCurrentLanguage(), 'vi');
});

test('setCurrentLanguage lưu vào localStorage, init lại đọc được, đặt <html lang>', () => {
  const st = memStorage(), doc = fakeDoc();
  const a = I18n.create({ dict, storage: st, doc }); a.init();
  assert.equal(a.setCurrentLanguage('ja'), true);
  assert.equal(st._m[I18n.STORAGE_KEY], 'ja');
  assert.equal(doc.documentElement.getAttribute('lang'), 'ja');
  const b = I18n.create({ dict, storage: st, doc: fakeDoc() }); b.init();
  assert.equal(b.getCurrentLanguage(), 'ja');
  a.setCurrentLanguage('zh'); assert.equal(doc.documentElement.getAttribute('lang'), 'zh-CN');
});

test('mã không hỗ trợ / giá trị lưu hỏng → bỏ qua, về vi', () => {
  const st = memStorage({ [I18n.STORAGE_KEY]: 'xx' });
  const i = I18n.create({ dict, storage: st, doc: fakeDoc() }); i.init();
  assert.equal(i.getCurrentLanguage(), 'vi');
  assert.equal(i.setCurrentLanguage('xx'), false);
  assert.equal(i.setCurrentLanguage(null), false);
  assert.equal(i.getCurrentLanguage(), 'vi');
});

test('localStorage ném lỗi (chế độ riêng tư): không crash, vẫn đổi được trong phiên', () => {
  const bad = { getItem() { throw new Error('blocked'); }, setItem() { throw new Error('blocked'); } };
  const i = I18n.create({ dict, storage: bad, doc: fakeDoc() });
  assert.doesNotThrow(() => i.init());
  assert.equal(i.getCurrentLanguage(), 'vi');
  assert.equal(i.setCurrentLanguage('fr'), true);
  assert.equal(i.getCurrentLanguage(), 'fr');
});

test('translate: đúng ngôn ngữ; thiếu bản dịch → tiếng Việt; thiếu hẳn → trả khóa', () => {
  const small = { vi: { a: 'Một', b: 'Hai' }, en: { a: 'One' } };
  const i = I18n.create({ dict: small, storage: memStorage(), doc: fakeDoc() }); i.init();
  i.setCurrentLanguage('en');
  assert.equal(i.translate('a'), 'One');
  assert.equal(i.translate('b'), 'Hai');
  assert.equal(i.translate('zzz'), 'zzz');
  assert.equal(i.translate('a', 'vi'), 'Một');
  i.setCurrentLanguage('de'); assert.equal(i.translate('a'), 'Một');
});

test('onChange chỉ gọi khi ngôn ngữ thực sự đổi; listener lỗi không chặn listener khác', () => {
  const i = I18n.create({ dict, storage: memStorage(), doc: fakeDoc() }); i.init();
  const got = [];
  i.onChange(() => { throw new Error('x'); }); i.onChange(c => got.push(c));
  i.setCurrentLanguage('vi'); i.setCurrentLanguage('en'); i.setCurrentLanguage('en'); i.setCurrentLanguage('ko');
  assert.deepEqual(got, ['en', 'ko']);
});

test('keyForSource tra ngược chuỗi tiếng Việt → khóa; chuỗi lạ → null', () => {
  const i = I18n.create({ dict, storage: memStorage(), doc: fakeDoc() }); i.init();
  assert.equal(i.keyForSource('Bản đồ'), 'nav.map');
  assert.equal(i.keyForSource('Cầu Trường Tiền'), null);
});
