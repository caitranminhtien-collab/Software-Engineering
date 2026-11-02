/* Hue Guide — Thuyết minh/TTS helpers (FE04). FILE MỚI, thuần logic, chưa được trang nào nạp.
 * Chọn nội dung ĐÃ XUẤT BẢN (không bao giờ đọc draft/fallback ngoại ngữ bằng giọng sai),
 * chọn giọng, kiểm tra hỗ trợ speechSynthesis, chia câu dài, phân loại lỗi. */
(function (root, factory) {
  'use strict';
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  else root.HueTtsHelpers = api;
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  // 7 ngôn ngữ giao diện: [locale BCP-47, nhãn, mã API]
  const LOCALES = [
    ['vi-VN', 'Tiếng Việt', 'vi'], ['en-US', 'English', 'en'], ['zh-CN', '中文', 'zh'],
    ['ja-JP', '日本語', 'ja'], ['ko-KR', '한국어', 'ko'], ['fr-FR', 'Français', 'fr'], ['de-DE', 'Deutsch', 'de']
  ];
  const codeOf = locale => (LOCALES.find(l => l[0] === locale) || [])[2] || 'vi';

  /**
   * Quyết định nội dung đọc từ phản hồi /attractions/:id?language=xx.
   * Chỉ trả 'published' khi API xác nhận đúng ngôn ngữ và KHÔNG fallback.
   * Nếu API fallback sang ngôn ngữ khác -> source 'fallback' + cờ canSpeakWithSelectedVoice=false,
   * giao diện phải nêu rõ, không đọc bằng giọng ngoại ngữ. Thiếu nội dung -> 'none'.
   */
  function resolveNarration(detail, requestedCode) {
    const text = detail && typeof detail.description === 'string' ? detail.description.trim() : '';
    if (!detail || !text) return { source: 'none', text: '', language: null, canSpeakWithSelectedVoice: false };
    if (detail.content_language === requestedCode && !detail.fallback_used) {
      return { source: 'published', text, language: requestedCode, canSpeakWithSelectedVoice: true };
    }
    return { source: 'fallback', text, language: detail.content_language || null, requestedLanguage: requestedCode, canSpeakWithSelectedVoice: false };
  }

  function describeNarrationStatus(result, requestedCode) {
    if (result.source === 'published') return 'Nội dung đã xuất bản.';
    if (result.source === 'fallback') return `Chưa có bản ${requestedCode.toUpperCase()}; đang hiển thị bản ${(result.language || 'khác').toUpperCase()} (không đọc bằng giọng ${requestedCode.toUpperCase()}).`;
    return 'Chưa có nội dung cho ngôn ngữ này. Hãy chọn ngôn ngữ khác.';
  }

  const voiceKey = v => [v.lang, v.name, v.voiceURI].map(x => String(x || '')).join('|');

  /** Giọng khớp đúng locale; nếu không có thì khớp theo mã ngôn ngữ gốc. */
  function voicesFor(voices, locale) {
    const all = Array.from(voices || []);
    const exact = all.filter(v => String(v.lang).toLowerCase().replace('_', '-') === locale.toLowerCase());
    if (exact.length) return exact;
    const base = locale.toLowerCase().split('-')[0];
    return all.filter(v => String(v.lang).toLowerCase().replace('_', '-').split('-')[0] === base);
  }
  /** Giọng đã lưu -> giọng mặc định -> giọng đầu tiên -> null (thiết bị không có giọng). */
  function selectVoice(voices, locale, savedKey) {
    const list = voicesFor(voices, locale);
    return list.find(v => voiceKey(v) === savedKey) || list.find(v => v.default) || list[0] || null;
  }

  /** Thiết bị/trình duyệt có hỗ trợ TTS không. win mặc định là window. */
  function ttsSupport(win) {
    const w = win || (typeof window !== 'undefined' ? window : {});
    if (!('speechSynthesis' in w) || typeof w.SpeechSynthesisUtterance === 'undefined') {
      return { supported: false, reason: 'unsupported', message: 'Trình duyệt này chưa hỗ trợ đọc văn bản. Hãy thử Chrome, Edge hoặc Safari mới.' };
    }
    return { supported: true, reason: 'ok', message: '' };
  }

  /** Cắt văn bản dài theo câu (Chrome/Android hay ngắt giữa chừng với đoạn rất dài). */
  function chunkText(text, maxLen = 200) {
    const clean = String(text || '').replace(/\s+/g, ' ').trim();
    if (!clean) return [];
    const sentences = clean.match(/[^.!?。！？]+[.!?。！？]*/g) || [clean];
    const chunks = []; let cur = '';
    const push = () => { if (cur.trim()) chunks.push(cur.trim()); cur = ''; };
    for (const s of sentences) {
      if (s.length > maxLen) { // câu quá dài: cắt theo từ
        push();
        let piece = '';
        for (const word of s.split(' ')) {
          if ((piece + ' ' + word).trim().length > maxLen) { if (piece) chunks.push(piece.trim()); piece = word; }
          else piece = (piece + ' ' + word).trim();
        }
        if (piece) chunks.push(piece);
      } else if ((cur + s).length > maxLen) { push(); cur = s; }
      else cur += s;
    }
    push();
    return chunks;
  }

  /** SpeechSynthesisErrorEvent.error -> hành động. */
  function classifyTtsError(error) {
    const e = String((error && error.error) || error || '');
    if (e === 'interrupted' || e === 'canceled') return { ignore: true, message: '' };
    if (e === 'not-allowed') return { ignore: false, kind: 'autoplay_blocked', message: 'Trình duyệt chặn tự phát âm thanh. Hãy bấm nút Phát để nghe.' };
    if (e === 'voice-unavailable' || e === 'language-unavailable') return { ignore: false, kind: 'no_voice', message: 'Thiết bị chưa có giọng đọc cho ngôn ngữ này. Hãy cài giọng trong cài đặt hệ thống hoặc chọn ngôn ngữ khác.' };
    return { ignore: false, kind: 'error', message: 'Không đọc được nội dung trên trình duyệt này.' };
  }

  return { LOCALES, codeOf, resolveNarration, describeNarrationStatus, voiceKey, voicesFor, selectVoice, ttsSupport, chunkText, classifyTtsError };
});
