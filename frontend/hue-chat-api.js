/* Browser-only visitor chat client. Calls the EXISTING backend through
 * the same-origin development proxy. No API keys are ever sent to the browser.
 * Tokens remain only in memory and disappear when the tab is reloaded. */
(() => {
  'use strict';
  let token = null;
  let sessionPromise = null;
  let generation = 0;

  class ChatApiError extends Error {
    constructor(message, status = 0) {
      super(message);
      this.name = 'ChatApiError';
      this.status = status;
    }
  }

  async function request(path, options = {}) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 29000);
    try {
      const response = await fetch('/api/v1/' + path, {
        credentials: 'same-origin',
        cache: 'no-store',
        ...options,
        signal: controller.signal,
        headers: {
          Accept: 'application/json',
          ...(options.body ? { 'Content-Type': 'application/json; charset=utf-8' } : {}),
          ...(options.headers || {}),
        },
      });
      let payload = null;
      try { payload = await response.json(); } catch {}
      if (!response.ok) {
        throw new ChatApiError(payload?.error?.message || 'Yêu cầu không thành công', response.status);
      }
      if (!payload || typeof payload !== 'object') {
        throw new ChatApiError('Backend trả dữ liệu không hợp lệ');
      }
      return payload;
    } catch (error) {
      if (error.name === 'AbortError') throw new ChatApiError('Yêu cầu hết thời gian chờ');
      throw error;
    } finally {
      clearTimeout(timeout);
    }
  }

  function ensureSession() {
    if (token) return Promise.resolve(token);
    if (!sessionPromise) {
      const startedAt = generation;
      const pending = request('visitor-sessions', {
        method: 'POST',
        body: JSON.stringify({ language_code: 'vi' }),
      }).then(payload => {
        const value = payload?.data?.token;
        if (typeof value !== 'string' || !value) {
          throw new ChatApiError('Không nhận được Visitor Session token');
        }
        if (startedAt !== generation) {
          throw new ChatApiError('Phiên hội thoại đã được làm mới');
        }
        token = value;
        return token;
      });
      sessionPromise = pending;
      pending.finally(() => {
        if (sessionPromise === pending) sessionPromise = null;
      }).catch(() => {});
    }
    return sessionPromise;
  }

  async function ask(question, attractionId = null) {
    const content = String(question || '').trim();
    if (!content || content.length > 1000) {
      throw new ChatApiError('Câu hỏi phải có từ 1 đến 1.000 ký tự');
    }
    const body = { question: content, language: 'vi' };
    if (Number.isSafeInteger(attractionId) && attractionId > 0) {
      body.attraction_id = attractionId;
    }

    async function postWithSession(bearer) {
      const result = await request('chat/messages', {
        method: 'POST',
        headers: { Authorization: 'Bearer ' + bearer },
        body: JSON.stringify(body),
      });
      const data = result.data;
      if (!data || typeof data.answer !== 'string' ||
          !['answered', 'insufficient'].includes(data.response_status)) {
        throw new ChatApiError('Phản hồi Chat API không hợp lệ');
      }
      return {
        answer: data.answer.trim(),
        status: data.response_status,
        citations: data.response_status === 'answered' && Array.isArray(data.citations)
          ? data.citations : [],
      };
    }

    try {
      return await postWithSession(await ensureSession());
    } catch (error) {
      if (error.status !== 401) throw error;
      // A visitor token may have expired; regenerate once, never loop.
      token = null;
      return postWithSession(await ensureSession());
    }
  }

  function reset() {
    generation += 1;
    token = null;
    sessionPromise = null;
  }

  window.HueChatAPI = { ask, reset };
})();
