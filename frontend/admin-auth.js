/* Staff entry point: the dashboard is not initialized until the backend
 * confirms a Redis-backed staff session. Frontend controls are not a
 * substitute for server-side authentication, CSRF checks, or RBAC. */
(() => {
  'use strict';
  const api = '/api/v1/staff/auth';
  const loginScreen = document.getElementById('staff-login-screen');
  const loginForm = document.getElementById('staff-login-form');
  const errorBox = document.getElementById('staff-login-error');
  const submit = document.getElementById('staff-login-submit');
  const shell = document.getElementById('staff-app');
  let appLoaded = false;
  let staff = null;

  // Avoid duplicate JSON parsing on empty or malformed responses.
  async function request(path, options = {}) {
    const response = await fetch(api + path, {
      credentials: 'same-origin',
      cache: 'no-store',
      ...options,
      headers: { Accept: 'application/json', ...(options.headers || {}) },
    });
    let payload = null;
    try { payload = await response.json(); } catch {}
    if (!response.ok) {
      const err = new Error(payload?.error?.message || `HTTP ${response.status}`);
      err.status = response.status;
      throw err;
    }
    return payload;
  }

  function showLogin(message = '') {
    shell.hidden = true;
    loginScreen.hidden = false;
    errorBox.textContent = message;
    submit.disabled = false;
    submit.textContent = 'Đăng nhập  →';
    document.title = 'Đăng nhập quản trị — Hue Guide';
  }

  function openDashboard(user) {
    staff = user || {};
    loginScreen.hidden = true;
    shell.hidden = false;
    document.getElementById('staff-name').textContent = staff.name || staff.full_name || staff.email || 'Nhân viên';
    if (!location.hash || location.hash !== '#admin') {
      history.replaceState(null, '', '#admin');
    }
    if (!appLoaded) {
      appLoaded = true;
      const script = document.createElement('script');
      script.src = 'app.js';
      script.onerror = () => {
        appLoaded = false;
        showLogin('Không thể tải giao diện quản trị. Hãy tải lại trang.');
      };
      document.body.appendChild(script);
    }
  }

  async function boot() {
    loginScreen.hidden = false;
    errorBox.textContent = 'Đang kiểm tra phiên đăng nhập…';
    try {
      const payload = await request('/me');
      openDashboard(payload?.data);
    } catch (err) {
      showLogin(err.status === 401 ? '' : 'Chưa kết nối được backend. Hãy chạy backend tại cổng 3000 và mở website bằng CHAY-WEB.bat.');
    }
  }

  loginForm.addEventListener('submit', async (event) => {
    event.preventDefault();
    errorBox.textContent = '';
    submit.disabled = true;
    submit.textContent = 'Đang đăng nhập…';
    const email = loginForm.elements.email.value.trim();
    const password = loginForm.elements.password.value;
    try {
      const payload = await request('/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });
      loginForm.reset();
      openDashboard(payload?.data);
    } catch (err) {
      const message = err.status === 401
        ? 'Email hoặc mật khẩu không chính xác.'
        : err.status === 429
          ? 'Bạn đã thử đăng nhập quá nhiều lần. Vui lòng chờ rồi thử lại.'
          : err.status === 400
            ? 'Thông tin đăng nhập không hợp lệ.'
            : 'Không đăng nhập được. Vui lòng kiểm tra kết nối backend.';
      showLogin(message);
    } finally {
      // Don't retain the password in JavaScript state after a login attempt.
      loginForm.elements.password.value = '';
    }
  });

  document.addEventListener('click', async (event) => {
    if (!event.target.closest('#staff-link') || shell.hidden) return;
    event.preventDefault();
    const button = document.getElementById('staff-link');
    button.disabled = true;
    try {
      const payload = await request('/csrf');
      const csrfToken = payload?.data?.csrf_token;
      if (!csrfToken) throw new Error('Missing CSRF token');
      await request('/logout', {
        method: 'POST',
        headers: { 'x-csrf-token': csrfToken },
      });
      // Clear the in-memory demo dashboard and reinitialize on next login.
      window.location.replace('admin.html');
    } catch (err) {
      button.disabled = false;
      alert('Chưa thể đăng xuất an toàn. Vui lòng thử lại hoặc đóng trình duyệt và liên hệ quản trị viên.');
    }
  });

  // UI guard for an expired session. Server must independently enforce RBAC.
  window.addEventListener('focus', async () => {
    if (shell.hidden || !staff) return;
    try { await request('/me'); }
    catch (err) { if (err.status === 401) window.location.replace('admin.html'); }
  });

  boot();
})();
