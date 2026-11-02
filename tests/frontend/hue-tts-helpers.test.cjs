'use strict';
// FE04: kiểm thử helper TTS/đa ngôn ngữ (node --test tests/frontend/hue-tts-helpers.test.cjs).
const test = require('node:test'), assert = require('node:assert/strict');
const t = require('../../frontend/hue-tts-helpers.js');

test('đủ 7 ngôn ngữ, mã API đúng', () => {
  assert.equal(t.LOCALES.length, 7);
  assert.deepEqual(t.LOCALES.map(l => t.codeOf(l[0])), ['vi', 'en', 'zh', 'ja', 'ko', 'fr', 'de']);
  assert.equal(t.codeOf('xx-XX'), 'vi');
});
test('resolveNarration: published đúng ngôn ngữ', () => {
  const r = t.resolveNarration({ description: ' Hello ', content_language: 'en', fallback_used: false }, 'en');
  assert.equal(r.source, 'published'); assert.equal(r.text, 'Hello'); assert.equal(r.canSpeakWithSelectedVoice, true);
});
test('resolveNarration: API fallback -> KHÔNG đọc bằng giọng ngôn ngữ đã chọn', () => {
  const r = t.resolveNarration({ description: 'Xin chào', content_language: 'vi', fallback_used: true }, 'ja');
  assert.equal(r.source, 'fallback'); assert.equal(r.canSpeakWithSelectedVoice, false); assert.equal(r.language, 'vi');
  assert.match(t.describeNarrationStatus(r, 'ja'), /JA.*VI|VI/);
  // fallback_used=false nhưng sai ngôn ngữ cũng không được coi là published
  assert.equal(t.resolveNarration({ description: 'x', content_language: 'vi', fallback_used: false }, 'ja').source, 'fallback');
});
test('resolveNarration: trống/thiếu -> none', () => {
  for (const d of [null, undefined, {}, { description: '   ' }, { description: 5 }]) assert.equal(t.resolveNarration(d, 'en').source, 'none');
  assert.match(t.describeNarrationStatus({ source: 'none' }, 'en'), /Chưa có nội dung/);
});
const V = [
  { name: 'A', lang: 'en-GB', voiceURI: 'a' }, { name: 'B', lang: 'en-US', voiceURI: 'b', default: true },
  { name: 'C', lang: 'en_US', voiceURI: 'c' }, { name: 'D', lang: 'vi-VN', voiceURI: 'd' }
];
test('voicesFor: ưu tiên khớp locale, rồi theo mã gốc; không có -> rỗng', () => {
  assert.deepEqual(t.voicesFor(V, 'en-US').map(v => v.name), ['B', 'C']);
  assert.deepEqual(t.voicesFor(V, 'en-AU').map(v => v.name), ['A', 'B', 'C']);
  assert.deepEqual(t.voicesFor(V, 'ja-JP'), []);
  assert.deepEqual(t.voicesFor(undefined, 'en-US'), []);
});
test('selectVoice: giọng đã lưu > mặc định > đầu tiên > null', () => {
  assert.equal(t.selectVoice(V, 'en-US', t.voiceKey(V[2])).name, 'C');
  assert.equal(t.selectVoice(V, 'en-US', 'không-tồn-tại').name, 'B');
  assert.equal(t.selectVoice(V, 'vi-VN').name, 'D');
  assert.equal(t.selectVoice(V, 'ja-JP'), null);
});
test('ttsSupport', () => {
  assert.equal(t.ttsSupport({}).supported, false);
  assert.equal(t.ttsSupport({ speechSynthesis: {} }).supported, false);
  assert.equal(t.ttsSupport({ speechSynthesis: {}, SpeechSynthesisUtterance: function () {} }).supported, true);
});
test('chunkText: cắt theo câu, không vượt max, không mất chữ', () => {
  const text = 'Đại Nội là kinh thành. Nơi ở của vua! Bạn có biết không? ' + 'từ '.repeat(150) + '.';
  const chunks = t.chunkText(text, 80);
  assert.ok(chunks.every(c => c.length <= 80), 'có đoạn quá dài');
  assert.equal(chunks.join(' ').replace(/\s+/g, ' '), text.replace(/\s+/g, ' ').trim());
  assert.deepEqual(t.chunkText('', 80), []); assert.deepEqual(t.chunkText(null), []);
  assert.deepEqual(t.chunkText('Một câu.', 200), ['Một câu.']);
});
test('classifyTtsError', () => {
  assert.equal(t.classifyTtsError({ error: 'interrupted' }).ignore, true);
  assert.equal(t.classifyTtsError({ error: 'canceled' }).ignore, true);
  assert.equal(t.classifyTtsError({ error: 'not-allowed' }).kind, 'autoplay_blocked');
  assert.equal(t.classifyTtsError({ error: 'language-unavailable' }).kind, 'no_voice');
  assert.equal(t.classifyTtsError({ error: 'synthesis-failed' }).kind, 'error');
  assert.equal(t.classifyTtsError(undefined).ignore, false);
});
