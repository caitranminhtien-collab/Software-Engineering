/* Hue Guide / Staff attractions: server-backed draft editor and workflow.

 * Backend owns authentication, CSRF, authorization and publication rules.

 * Never persist admin edits in localStorage or assume published data is editable.

 */

(() => {

  'use strict';



  const API = '/api/v1';

  const MAX_IMAGE_BYTES = 8 * 1024 * 1024; // Must match default Backend MEDIA_MAX_IMAGE_BYTES.
  const MAX_AUDIO_BYTES = 25 * 1024 * 1024; // Default Backend MEDIA_MAX_AUDIO_BYTES.

  function isAllowedMediaUrl(value) {
    try {
      const parsed = new URL(value, window.location.href);
      return parsed.protocol === 'https:' ||
        (parsed.protocol === 'http:' && ['localhost', '127.0.0.1'].includes(parsed.hostname));
    } catch { return false; }
  }


  const sourceByAttraction = new Map();

  const statusLabels = {

    draft: 'Bản nháp', in_review: 'Chờ duyệt', published: 'Đã xuất bản', archived: 'Đã lưu trữ',

  };

  let busy = false;

  let lastUi = null;

  let staffRole = null;



  function str(value) { return String(value ?? ''); }

  function text(value) { return str(value).trim(); }

  function idFrom(row) { return Number(row?.id ?? row?.attraction_id); }

  function fail(message) { throw new Error(message); }

  function esc(value) {

    return str(value).replace(/[&<>"']/g, ch => ({

      '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;'

    }[ch]));

  }

  function number(value) {

    const n = Number(value);

    return Number.isFinite(n) ? n : null;

  }

  function localizationsFrom(detail) {

    const direct = detail?.localizations ?? detail?.attraction_localizations ?? [];

    const list = Array.isArray(direct) ? direct : Object.values(direct ?? {});

    return list.find(item => item?.language_code === 'vi' || item?.language === 'vi') ?? null;

  }

  function safeSources(input) {

    if (Array.isArray(input)) return input.map(x => typeof x === 'string' ? x : JSON.stringify(x)).join('\n');

    if (typeof input === 'string') {

      try {

        const decoded = JSON.parse(input);

        return safeSources(decoded);

      } catch { return input; }

    }

    return '';

  }

  function requireId(value) {

    const n = Number(value);

    if (!Number.isInteger(n) || n <= 0) fail('ID không hợp lệ.');

    return n;

  }

  async function request(path, { method = 'GET', data, formData } = {}) {

    if (data !== undefined && formData !== undefined) fail('Không thể gửi JSON và file trong cùng một yêu cầu.');

    const mutating = !['GET', 'HEAD'].includes(method);

    const headers = { Accept: 'application/json' };

    if (mutating) {

      // Every write request uses the session's current token. Never save CSRF in storage.

      const csrfResponse = await fetch(API + '/staff/auth/csrf', {

        credentials: 'same-origin', cache: 'no-store', headers: { Accept: 'application/json' },

      });

      if (!csrfResponse.ok) {

        fail(csrfResponse.status === 401

          ? 'Phiên Admin đã hết hạn. Hãy đăng nhập lại.'

          : 'Không lấy được CSRF token từ Backend.');

      }

      const csrfPayload = await csrfResponse.json();

      const csrfToken = csrfPayload?.data?.csrf_token;

      if (!csrfToken) fail('Backend không trả CSRF token.');

      headers['x-csrf-token'] = csrfToken;

      if (data !== undefined) headers['Content-Type'] = 'application/json';

    }

    const response = await fetch(API + path, {

      method, credentials: 'same-origin', cache: 'no-store', headers,

      ...(formData !== undefined ? { body: formData }

        : data !== undefined ? { body: JSON.stringify(data) } : {}),

    });

    let payload = null;

    try { payload = await response.json(); } catch { /* handle empty/non-JSON errors */ }

    if (!response.ok) {

      const details = Array.isArray(payload?.error?.details)

        ? payload.error.details.join('; ') : '';

      const label = payload?.error?.message || `HTTP ${response.status}`;

      const error = new Error(`${label}${details ? ': ' + details : ''}`);

      error.status = response.status;

      error.code = payload?.error?.code || '';

      throw error;

    }

    return payload?.data;

  }

  function notice(message, isError = false) {

    const box = document.getElementById('hue-admin-media-feedback')

      || document.getElementById('hue-admin-form-feedback');

    if (box) {

      box.textContent = message;

      box.style.color = isError ? '#9d3e35' : '';

      box.hidden = false;

    } else if (isError) {

      window.alert(message);

    } else {

      window.toast?.(message);

    }

  }

  function refresh() {

    // Keep the existing data-fetch/render path in app.js (no new duplicate state).

    const button = document.getElementById('refresh-admin-attractions');

    button?.click();

  }

  function formControls(row = {}, editing = false) {

    const canWrite = !editing || row.status === 'draft';

    const disabled = canWrite ? '' : ' disabled';

    const numeric = (value, defaultValue) => Number.isFinite(Number(value)) ? Number(value) : defaultValue;

    const source = sourceByAttraction.get(idFrom(row)) ?? localizationsFrom(row);

    const name = source?.name || '';

    const description = source?.description || '';

    const sourceReferences = safeSources(source?.source_references ?? source?.sourceReferences);

    return `<div class="hue-admin-form-fields">

      <label for="hue-admin-slug">Slug</label>

      <input id="hue-admin-slug" name="slug" maxlength="255" pattern="[a-z0-9]+(-[a-z0-9]+)*" value="${esc(row.slug || '')}" required${disabled}>

      <label for="hue-admin-area">Mã khu vực</label>

      <input id="hue-admin-area" name="area_code" maxlength="100" value="${esc(row.area_code || 'HUE')}" required${disabled}>

      <div class="hue-admin-form-coordinates" style="display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:12px">

        <label>Vĩ độ (latitude)<input name="latitude" type="number" min="-90" max="90" step="any" value="${esc(numeric(row.latitude,16.46))}" required${disabled}></label>

        <label>Kinh độ (longitude)<input name="longitude" type="number" min="-180" max="180" step="any" value="${esc(numeric(row.longitude,107.59))}" required${disabled}></label>

      </div>

      <label for="hue-admin-radius">Bán kính kích hoạt GPS (m) — cần kiểm tra thực địa</label>

      <input id="hue-admin-radius" name="trigger_radius_m" type="number" min="1" step="1" value="${esc(numeric(row.trigger_radius_m,25))}" required${disabled}>

      <p class="eyebrow" style="margin-top:16px">NỘI DUNG TIẾNG VIỆT</p>

      ${editing && canWrite ? `<label style="display:flex;align-items:center;gap:8px"><input type="checkbox" name="update_localization" value="yes"> Cập nhật nội dung tiếng Việt (nếu chọn, phải nhập đủ tên và mô tả)</label>` : ''}

      <label for="hue-admin-name">Tên hiển thị</label>

      <input id="hue-admin-name" name="name" maxlength="255" value="${esc(name)}" ${editing?'':'required'}${disabled}>

      <label for="hue-admin-desc">Mô tả di tích</label>

      <textarea id="hue-admin-desc" name="description" rows="4" ${editing?'':'required'}${disabled}>${esc(description)}</textarea>

      <label for="hue-admin-sources">Nguồn tham khảo (mỗi dòng một nguồn)</label>

      <textarea id="hue-admin-sources" name="sources" rows="2" placeholder="https://..."${disabled}>${esc(sourceReferences)}</textarea>

    </div>`;

  }

  function modalBody(row, editing = false) {

    const status = statusLabels[row?.status] || row?.status || 'Bản nháp';

    const canWrite = !editing || row.status === 'draft';

    const localization = editing

      ? (sourceByAttraction.get(idFrom(row)) ?? localizationsFrom(row))

      : null;

    const localizationId = Number(localization?.id ?? localization?.localization_id);

    const localizationStatus = localization?.status

      ? (statusLabels[localization.status] || localization.status)

      : 'Chưa có nội dung tiếng Việt';



    // Localization co workflow rieng voi Attraction.

    const localizationButtons =

      editing && Number.isInteger(localizationId) && localizationId > 0

        ? localization?.status === 'draft'

          ? `<button type="button" class="button"

               data-hue-admin-action="submit"

               data-hue-admin-resource="localizations"

               data-hue-admin-id="${localizationId}">

               Gửi duyệt nội dung tiếng Việt

             </button>`

          : localization?.status === 'in_review'

            ? `<button type="button" class="button outline"

                 data-hue-admin-action="reject"

                 data-hue-admin-resource="localizations"

                 data-hue-admin-id="${localizationId}">

                 Từ chối nội dung tiếng Việt

               </button>

               <button type="button" class="button"

                 data-hue-admin-action="publish"

                 data-hue-admin-resource="localizations"

                 data-hue-admin-id="${localizationId}">

                 Xuất bản nội dung tiếng Việt

               </button>`

            : ''

        : '';



    const readonlyNote = editing && !canWrite

      ? `<div class="notice">Bản ghi đang ở trạng thái <b>${esc(status)}</b>. Backend hiện không cho sửa trực tiếp di tích đã xuất bản hoặc đang chờ duyệt. Không có API xóa di tích.</div>`

      : editing ? `<div class="notice">Chỉ sửa được bản nháp. Khi xuất bản, nội dung cần được duyệt lại theo quy trình Backend.</div>`

        : `<div class="notice">Di tích mới được tạo ở trạng thái <b>draft</b>. Chưa xuất hiện trên trang khách cho đến khi hoàn tất quy trình duyệt/xuất bản.</div>`;

    return `<p class="eyebrow">QUẢN LÝ DI TÍCH · POSTGRESQL</p>

      <h2>${editing ? 'Chi tiết di tích #' + idFrom(row) : 'Thêm di tích mới'}</h2>

      <p>${editing ? `Trạng thái: ${esc(status)} · ${esc(row.slug)}` : 'Tạo một bản nháp mới trong Backend Hue Tourism Guide.'}</p>

      ${editing ? `

        <div class="notice">

          <strong>Nội dung tiếng Việt:</strong> ${esc(localizationStatus)}

          ${Number.isInteger(localizationId) && localizationId > 0 ? ` · Localization #${localizationId}` : ''}

        </div>` : ''}

      ${localizationButtons ? `<div class="modal-actions">${localizationButtons}</div>` : ''}

      ${editing ? `<div class="modal-actions" style="margin:14px 0">

        <button class="button outline" type="button" data-hue-admin-open-media="${idFrom(row)}">

          🖼 Ảnh & audio di tích

        </button>
        <button class="button outline" type="button" data-hue-i18n-open="${idFrom(row)}">🌐 Dịch & quản lý 7 ngôn ngữ</button>

      </div>` : ''}

      <form id="hue-admin-real-form" style="max-height:65vh;overflow-y:auto;padding-right:8px" data-mode="${editing?'edit':'create'}" data-attraction-id="${editing?idFrom(row):''}">

        ${formControls(row, editing)}

        <div class="modal-actions">${canWrite?`<button class="button" type="submit">${editing?'Lưu bản nháp':'Tạo di tích mới'}</button>`:''}<button class="button outline" type="button" data-hue-admin-close>Đóng</button></div>

        <p id="hue-admin-form-feedback" role="status" hidden></p>

        ${readonlyNote}

      </form>`;

  }



  // Separate modal avoids nesting multipart upload forms in the attraction form.

  // Server determines staff permissions; buttons are only visual helpers.

  function mediaModalBody(row, items, role, feedback = '') {

    const id = requireId(idFrom(row));

    const canUpload = ['admin', 'editor'].includes(role);

    const canReview = ['admin', 'reviewer'].includes(role);

    const publishedImages = items.filter(item => item.media_type === 'image' && item.status === 'published');
    const publishedAudios = items.filter(item => item.media_type === 'audio' && item.status === 'published');

    const cards = items.map(media => {

      const mediaId = requireId(media.id ?? media.media_id);

      const status = media.status || 'draft';

      const url = str(media.file_url).trim();

      const safeUrl = isAllowedMediaUrl(url) ? url : '';

      const preview = media.media_type === 'image'

        ? safeUrl ? `<img src="${esc(safeUrl)}" alt="Ảnh #${mediaId}" loading="lazy"

                        style="width:100%;height:125px;object-fit:cover;border-radius:9px;background:#ddd">`

                  : '<div class="notice">Đường dẫn ảnh không hợp lệ</div>'

        : safeUrl ? `<audio controls preload="none" src="${esc(safeUrl)}" style="width:100%"></audio>`

                  : '<div class="notice">Không có bản nghe thử</div>';

      const actions = [];

      if (status === 'draft' && role === 'editor') {

        actions.push(`<button type="button" class="button outline small" data-hue-admin-action="submit"

          data-hue-admin-resource="media" data-hue-admin-id="${mediaId}">Gửi duyệt</button>`);

      }

      if (status === 'draft' && role === 'admin') {

        actions.push(`<button type="button" class="button small" data-hue-admin-autopublish="${mediaId}">Xuất bản ngay</button>`);

      }

      if (status === 'in_review' && canReview) {

        actions.push(`<button type="button" class="button small" data-hue-admin-action="publish"

          data-hue-admin-resource="media" data-hue-admin-id="${mediaId}">Xuất bản</button>`);

        actions.push(`<button type="button" class="button outline small" data-hue-admin-action="reject"

          data-hue-admin-resource="media" data-hue-admin-id="${mediaId}">Từ chối</button>`);

      }

      return `<article style="border:1px solid rgba(127,127,127,.35);border-radius:12px;padding:12px;min-width:0;display:grid;gap:8px">

        ${preview}

        <div><strong>Media #${mediaId}</strong> · <span class="status">${esc(statusLabels[status] || status)}</span></div>

        <div class="admin-muted">Thứ tự: ${esc(media.display_order)} · ${media.media_type === 'audio' ? `Audio (${esc(media.language_code || '—')}, ${esc(media.duration_seconds)} giây)` : 'Ảnh'}</div>

        ${media.caption ? `<div>${esc(media.caption)}</div>` : ''}

        <div class="admin-muted">Nguồn: ${esc(media.credit || '—')}</div>

        <div class="admin-muted" title="Cần đối chiếu giấy phép thực tế">Quyền sử dụng: ${esc(media.rights_reference || '—')}</div>

        ${actions.length ? `<div style="display:flex;gap:7px;flex-wrap:wrap">${actions.join('')}</div>` : ''}

      </article>`;

    }).join('');

    const uploader = canUpload ? `

      <h3 style="margin:10px 0 0">Tải ảnh mới</h3>

      <div class="notice" style="margin:8px 0">

        ${role === 'admin' ? '<b>Admin: upload và tự xuất bản.</b>' : '<b>Editor: upload ở trạng thái draft và gửi duyệt.</b>'}

        Chỉ sử dụng ảnh có quyền sử dụng hợp lệ. “Pinterest” hay “Free” không phải giấy phép.

      </div>

      <form id="hue-admin-media-form" data-attraction-id="${id}" style="display:grid;gap:10px">

        <label for="hue-admin-media-file">Ảnh (JPG, PNG, WebP, GIF · tối đa 8 MB)</label>

        <input id="hue-admin-media-file" name="file" type="file"

          accept=".jpg,.jpeg,.png,.webp,.gif,image/jpeg,image/png,image/webp,image/gif" required>

        <p id="hue-admin-media-selection" class="admin-muted" aria-live="polite">Chưa chọn ảnh.</p>

        <label for="hue-admin-media-caption">Chú thích (không bắt buộc)</label>

        <input id="hue-admin-media-caption" name="caption" maxlength="1000">

        <label for="hue-admin-media-credit">Nguồn ảnh / tác giả *</label>

        <input id="hue-admin-media-credit" name="credit" maxlength="1000" required>

        <label for="hue-admin-media-rights">Căn cứ quyền sử dụng ảnh *</label>

        <textarea id="hue-admin-media-rights" name="rights_reference" rows="2" maxlength="2000" required

          placeholder="Giấy phép, URL nguồn hoặc văn bản cho phép"></textarea>

        <label for="hue-admin-media-order">Thứ tự hiển thị</label>

        <input id="hue-admin-media-order" name="display_order" type="number" min="1" max="100000" step="1"

          value="${esc(items.reduce((max,item) => Math.max(max, Number(item.display_order) || 0), 0) + 1)}" required>

        <button class="button" type="submit" id="hue-admin-media-submit">${role === 'admin' ? 'Tải ảnh & xuất bản ngay' : 'Tải ảnh bản nháp'}</button>

      </form>
      <p class="admin-muted">Thuyết minh tự động sẽ đọc bản dịch đã xuất bản; không cần tải tệp MP3/WAV.</p>
` : `<div class="notice">Vai trò ${esc(role)} có quyền xem media nhưng không có quyền upload.</div>`;

    return `<div id="hue-admin-media-panel" data-attraction-id="${id}" style="max-height:73vh;overflow-y:auto;padding-right:8px;display:grid;gap:12px">

      <p class="eyebrow">THƯ VIỆN ẢNH & THUYẾT MINH · POSTGRESQL</p>

      <h2>Media di tích #${id}</h2>

      <p>${esc(row.slug || '')} · ${items.length} media · ${publishedImages.length} ảnh và ${publishedAudios.length} audio công khai.

        Trang User hiển thị tối đa 5 ảnh đã xuất bản theo thứ tự.</p>

      <p id="hue-admin-media-feedback" role="status" aria-live="polite" ${feedback ? '' : 'hidden'}>${esc(feedback)}</p>

      <div class="modal-actions" style="margin:0">

        <button class="button outline" type="button" data-hue-admin-open-media="${id}">↻ Làm mới media</button>

        <button class="button outline" type="button" data-hue-admin-open="${id}">Quay về di tích</button>

      </div>

      <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(185px,1fr));gap:12px">

        ${items.length ? cards : '<div class="notice">Di tích này chưa có media nào.</div>'}

      </div>

      ${uploader}

    </div>`;

  }



  async function openMediaUpload(attractionId, feedback = '') {

    const id = requireId(attractionId);

    const row = lastUi?.attractionApi?.staffRows.find(r => idFrom(r) === id);

    if (!row) fail('Không tìm thấy di tích trong danh sách Staff API.');

    const [staff, items] = await Promise.all([

      request('/staff/auth/me'),

      request(`/staff/attractions/${id}/media`),

    ]);

    staffRole = staff?.role;

    if (!['admin', 'reviewer', 'editor'].includes(staffRole)) {

      fail('Không xác định được vai trò nhân viên. Vui lòng đăng nhập lại.');

    }

    if (!Array.isArray(items)) fail('Backend không trả danh sách media hợp lệ.');

    window.openModal(mediaModalBody(row, items, staffRole, feedback));

  }



  async function uploadImage(form) {

    const attractionId = requireId(form.dataset.attractionId);

    const fields = new FormData(form);

    const file = fields.get('file');

    if (!(file instanceof File) || file.size === 0) fail('Vui lòng chọn một ảnh hợp lệ.');

    if (file.size > MAX_IMAGE_BYTES) fail('Ảnh vượt quá giới hạn 8 MB.');

    // File signatures and actual size are also checked independently by the Backend.

    const types = new Set(['image/jpeg','image/png','image/webp','image/gif','application/octet-stream','']);

    if (!types.has((file.type || '').toLowerCase())) fail('Chỉ chấp nhận JPG, PNG, WebP hoặc GIF.');

    const credit = text(fields.get('credit'));

    const rights = text(fields.get('rights_reference'));

    if (!credit || !rights) fail('Phải nhập nguồn ảnh và căn cứ quyền sử dụng.');

    const displayOrder = Number(fields.get('display_order'));

    if (!Number.isInteger(displayOrder) || displayOrder <= 0) fail('Thứ tự hiển thị phải là số nguyên dương.');



    const payload = new FormData();

    payload.append('file', file);

    payload.append('media_type', 'image');

    payload.append('caption', text(fields.get('caption')));

    payload.append('credit', credit);

    payload.append('rights_reference', rights);

    payload.append('display_order', String(displayOrder));

    // Do NOT set Content-Type manually; the browser must generate multipart boundary.

    const button = form.querySelector('button[type="submit"]');

    if (button) { button.disabled = true; button.textContent = 'Đang tải ảnh…'; }

    try {

      const media = await request(`/staff/attractions/${attractionId}/media`, {

        method: 'POST', formData: payload

      });

      const mediaId = requireId(media?.id ?? media?.media_id);

      const feedback = document.getElementById('hue-admin-media-feedback');

      // An uploaded image is already saved as draft. Avoid accidental duplicate uploads

      // if the subsequent publish request fails (e.g. insufficient staff privileges).

      form.elements.file.value = '';

      const selected = document.getElementById('hue-admin-media-selection');

      if (selected) selected.textContent = 'Chưa chọn ảnh.';

      if (staffRole === 'editor') {

        await openMediaUpload(attractionId, `Ảnh #${mediaId} đã lưu ở trạng thái draft. Hãy gửi duyệt để Reviewer/Admin xuất bản.`);

        return;

      }

      if (staffRole !== 'admin') fail('Tài khoản không được phép tự xuất bản.');

      try {

        if (button) button.textContent = `Đang xuất bản ảnh #${mediaId}…`;

        // Backend still enforces staff roles, CSRF, readiness and audit fields.

        // Admin may move a new media from draft -> in_review -> published

        // without a separate manual review click.

        await request(`/staff/media/${mediaId}/submit`, { method: 'POST' });

        const published = await request(`/staff/media/${mediaId}/publish`, { method: 'POST' });

        if (published?.status !== 'published') {

          fail(`Backend chưa xác nhận trạng thái published cho ảnh #${mediaId}.`);

        }

      } catch (error) {

        fail(`Ảnh #${mediaId} đã được lưu, nhưng CHƯA tự xuất bản: ${error.message} ` +

          '(cần tài khoản Admin và thông tin quyền sử dụng hợp lệ). ' +

          'KHÔNG tải lại cùng ảnh để tránh tạo bản ghi trùng.');

      }

      await openMediaUpload(attractionId, `Ảnh #${mediaId} đã xuất bản thành công. Trang User sẽ nhận ảnh khi tải lại.`);

    } finally {

      if (button && button.isConnected) {

        button.disabled = false;

        button.textContent = 'Tải ảnh & xuất bản ngay';

      }

    }

  }



  // Read the duration from the actual selected MP3/WAV. Do not upload until positive seconds.
  async function detectAudioDuration(file) {
    if (!file || typeof URL.createObjectURL !== 'function') return null;
    const objectUrl = URL.createObjectURL(file);
    try {
      return await new Promise(resolve => {
        const audio = document.createElement('audio');
        let settled = false;
        const done = value => {
          if (settled) return;
          settled = true;
          clearTimeout(timeout);
          audio.removeAttribute('src');
          audio.load();
          resolve(value);
        };
        const timeout = setTimeout(() => done(null), 10000);
        audio.preload = 'metadata';
        audio.addEventListener('loadedmetadata', () =>
          done(Number.isFinite(audio.duration) && audio.duration > 0 ? Math.ceil(audio.duration) : null), {once:true});
        audio.addEventListener('error', () => done(null), {once:true});
        audio.src = objectUrl;
        audio.load();
      });
    } finally {
      URL.revokeObjectURL(objectUrl);
    }
  }

  async function uploadAudio(form) {
    const attractionId = requireId(form.dataset.attractionId);
    const fields = new FormData(form);
    const file = fields.get('file');
    if (!(file instanceof File) || file.size === 0) fail('Vui lòng chọn file MP3 hoặc WAV.');
    if (file.size > MAX_AUDIO_BYTES) fail('Audio vượt quá giới hạn 25 MB.');
    if (!/\.(mp3|wav)$/i.test(file.name)) fail('Chỉ nhận file MP3 hoặc WAV.');
    const allowed = new Set(['audio/mpeg','audio/mp3','audio/wav','audio/x-wav','audio/wave','application/octet-stream','']);
    if (!allowed.has((file.type || '').toLowerCase())) fail('MIME type audio không hợp lệ.');
    const language = text(fields.get('language_code'));
    if (!['vi','en'].includes(language)) fail('Chọn ngôn ngữ vi hoặc en.');
    const duration = Number(fields.get('duration_seconds'));
    if (!Number.isInteger(duration) || duration <= 0) fail('Thời lượng audio phải là số nguyên dương (giây).');
    const credit = text(fields.get('credit'));
    const rights = text(fields.get('rights_reference'));
    if (!credit || !rights) fail('Phải nhập tác giả và căn cứ quyền sử dụng âm thanh.');
    const displayOrder = Number(fields.get('display_order'));
    if (!Number.isInteger(displayOrder) || displayOrder <= 0) fail('Thứ tự phải là số nguyên dương.');

    const payload = new FormData();
    payload.append('file', file);
    payload.append('media_type', 'audio');
    payload.append('language_code', language);
    payload.append('duration_seconds', String(duration));
    payload.append('caption', text(fields.get('caption')));
    payload.append('credit', credit);
    payload.append('rights_reference', rights);
    payload.append('display_order', String(displayOrder));

    const button = form.querySelector('button[type="submit"]');
    if (button) { button.disabled = true; button.textContent = 'Đang tải audio…'; }
    try {
      const media = await request(`/staff/attractions/${attractionId}/media`, {method:'POST', formData:payload});
      const mediaId = requireId(media?.id ?? media?.media_id);
      form.elements.file.value = '';
      if (staffRole === 'editor') {
        await openMediaUpload(attractionId, `Audio #${mediaId} đã lưu bản nháp; gửi duyệt để xuất bản.`);
        return;
      }
      if (staffRole !== 'admin') fail('Tài khoản không được tự xuất bản audio.');
      try {
        if (button) button.textContent = `Đang xuất bản Audio #${mediaId}…`;
        await request(`/staff/media/${mediaId}/submit`, {method:'POST'});
        const published = await request(`/staff/media/${mediaId}/publish`, {method:'POST'});
        if (published?.status !== 'published') fail(`Backend chưa xác nhận xuất bản Audio #${mediaId}.`);
      } catch (error) {
        fail(`Audio #${mediaId} ĐÃ ĐƯỢC LƯU nhưng chưa xuất bản: ${error.message}. Không tải lại để tránh trùng bản ghi.`);
      }
      await openMediaUpload(attractionId, `Audio #${mediaId} đã xuất bản. User sẽ nghe được sau khi làm mới trang.`);
    } finally {
      if (button?.isConnected) { button.disabled = false; button.textContent = 'Tải audio & xuất bản ngay'; }
    }
  }

  const translationLanguages = [
    ['en','🇬🇧 English'], ['zh','🇨🇳 Tiếng Trung'], ['ja','🇯🇵 Tiếng Nhật'],
    ['ko','🇰🇷 Tiếng Hàn'], ['fr','🇫🇷 Tiếng Pháp'], ['de','🇩🇪 Tiếng Đức'],
  ];
  const localizationCache = new Map();
  const vietnameseSourceCache = new Map();
  const sourceEditorVisible = new Set();

  // Every localization must cite actual source documents before publication.
  // Never invent references merely to pass the Backend readiness check.
  function hasTranslationSources(item) {
    return Array.isArray(item?.source_references) &&
      item.source_references.some(value => typeof value === 'string'
        ? value.trim().length > 0
        : value !== null && typeof value === 'object' && Object.keys(value).length > 0);
  }

  function translationSourceLines(value) {
    return (Array.isArray(value) ? value : []).map(item =>
      typeof item === 'string' ? item : JSON.stringify(item)
    ).join('\n');
  }

  function parseTranslationSources(value) {
    const refs = [...new Set(String(value ?? '').split(/\r?\n/).map(text).filter(Boolean))];
    if (!refs.length) fail('Hãy nhập ít nhất một nguồn tham khảo thực tế (đường dẫn hoặc tài liệu lịch sử).');
    if (refs.some(x => x.length > 2000)) fail('Một dòng nguồn tham khảo quá dài (tối đa 2000 ký tự).');
    return refs;
  }

  function vietnameseSourcePanel(id, role) {
    const source = vietnameseSourceCache.get(id);
    if (!source) return `<div class="notice">Chưa tìm thấy nội dung gốc tiếng Việt trong Backend.</div>`;
    const status = source.status;
    const canEdit = ['admin', 'editor'].includes(role) && ['draft', 'published'].includes(status);
    const canReview = ['admin', 'reviewer'].includes(role);
    const hasRefs = hasTranslationSources(source);
    const workflowActions = [];
    if (status === 'draft' && ['admin','editor'].includes(role)) {
      workflowActions.push(`<button type="button" class="button" data-hue-i18n-vi-workflow="submit">Gửi duyệt nội dung gốc</button>`);
    }
    if (status === 'in_review' && canReview) {
      workflowActions.push(`<button type="button" class="button" data-hue-i18n-vi-workflow="publish">Xuất bản tiếng Việt</button>`);
      workflowActions.push(`<button type="button" class="button outline" data-hue-i18n-vi-workflow="reject">Từ chối để sửa</button>`);
    }
    return `<section style="padding:14px;border:1px solid #d6b88c;border-radius:12px;display:grid;gap:10px;background:#fff8eb">
      <h3 style="margin:0">✏️ Sửa nội dung gốc tiếng Việt</h3>
      <div class="notice">Trạng thái: <strong>${esc(statusLabels[status] || status)}</strong> · Bản #${Number(source.id)}. Nội dung gốc này được Gemini sử dụng để dịch sang 6 ngôn ngữ.</div>
      ${status === 'published' ? '<div class="notice" style="color:#9b3628">⚠ Lưu chỉnh sửa sẽ chuyển bản tiếng Việt từ published về draft; di tích có thể tạm ẩn trên User cho đến khi gửi duyệt và xuất bản lại. Các bản dịch đã tạo không tự thay đổi.</div>' : ''}
      ${status === 'in_review' ? '<div class="notice">Bản đang chờ duyệt không được sửa. Reviewer/Admin cần từ chối trước để chuyển về draft.</div>' : ''}
      ${status === 'archived' ? '<div class="notice">Bản lưu trữ chưa hỗ trợ chỉnh sửa.</div>' : ''}
      <form id="hue-i18n-vietnamese-form" data-attraction-id="${id}" style="display:grid;gap:10px">
        <label>Tên hiển thị tiếng Việt<input name="name" maxlength="255" required value="${esc(source.name)}" ${canEdit?'':'readonly'}></label>
        <label>Mô tả di tích / lời thuyết minh tiếng Việt<textarea name="description" rows="10" required ${canEdit?'':'readonly'}>${esc(source.description)}</textarea></label>
        <label>Nguồn lịch sử đã kiểm chứng (mỗi dòng một nguồn)<textarea name="source_references" rows="3" required ${canEdit?'':'readonly'}>${esc(translationSourceLines(source.source_references))}</textarea></label>
        ${!hasRefs ? '<small style="color:#ab382a">⚠ Chưa có nguồn tham khảo, cần bổ sung trước khi xuất bản.</small>' : ''}
        ${canEdit ? '<button class="button" type="submit">Lưu nội dung tiếng Việt</button>' : ''}
      </form>
      ${workflowActions.length ? `<div class="modal-actions">${workflowActions.join('')}</div>` : ''}
      <small class="admin-muted">Sau khi tiếng Việt được xuất bản lại, dùng nút “Dịch lại bằng AI” đối với các bản dịch cũ. Nội dung mới phải được kiểm tra trước khi xuất bản.</small>
    </section>`;
  }

  function translationModalHtml(id, list, role, selected, feedback) {
    const rows = translationLanguages.map(([code, label]) => {
      const item = list[code];
      const status = item?.status || 'Chưa tạo';
      const missingSources = item && !hasTranslationSources(item);
      let buttons = `<button type="button" class="button outline small" data-hue-i18n-view="${code}">Xem${item ? ' / sửa' : ''}</button>`;
      if (!item && ['admin','editor'].includes(role)) {
        buttons += ` <button type="button" class="button small" data-hue-i18n-generate="${code}">Dịch bằng AI</button>`;
      }
      if (item && (['draft','published'].includes(item.status) && ['admin','editor'].includes(role) ||
                    item.status === 'in_review' && role === 'admin') &&
          vietnameseSourceCache.get(id)?.status === 'published') {
        buttons += ` <button type="button" class="button outline small" data-hue-i18n-regenerate="${code}">Dịch lại bằng AI</button>`;
      }
      if (item?.status === 'draft' && ['admin','editor'].includes(role)) {
        buttons += ` <button type="button" class="button small" data-hue-i18n-workflow="submit" data-hue-i18n-lang="${code}">Gửi duyệt</button>`;
      }
      if (item?.status === 'in_review' && ['admin','reviewer'].includes(role)) {
        buttons += ` <button type="button" class="button small" data-hue-i18n-workflow="publish" data-hue-i18n-lang="${code}">Xuất bản</button>`;
        buttons += ` <button type="button" class="button outline small" data-hue-i18n-workflow="reject" data-hue-i18n-lang="${code}">Từ chối</button>`;
      }
      return `<div style="padding:11px;border:1px solid #ccc;border-radius:10px;display:grid;gap:6px">
        <strong>${esc(label)}</strong><small>${esc(statusLabels[status] || status)}${item ? ' · #' + Number(item.id) : ''}</small>
        ${missingSources ? '<small style="color:#ab382a;font-weight:700">⚠ Thiếu nguồn tham khảo — chưa thể xuất bản</small>' : ''}
        <div style="display:flex;flex-wrap:wrap;gap:5px">${buttons}</div></div>`;
    }).join('');
    const current = list[selected];
    const canEdit = current?.status === 'draft' && ['admin','editor'].includes(role);
    const editor = current ? `<section style="border-top:1px solid #bbb;padding-top:12px">
      <h3>${esc(translationLanguages.find(x=>x[0]===selected)?.[1] || selected)} · ${esc(statusLabels[current.status] || current.status)}</h3>
      <form id="hue-i18n-edit-form" data-language="${esc(selected)}" data-attraction-id="${id}" style="display:grid;gap:8px">
        <label>Tên đã dịch<input name="name" required maxlength="255" value="${esc(current.name)}" ${canEdit?'':'readonly'}></label>
        <label>Mô tả đã dịch<textarea name="description" rows="8" required ${canEdit?'':'readonly'}>${esc(current.description)}</textarea></label>
        <label>Nguồn tham khảo lịch sử (mỗi dòng một nguồn)
          <textarea name="source_references" rows="3" placeholder="URL tài liệu gốc hoặc tên tài liệu, tác giả, năm xuất bản" ${canEdit?'':'readonly'}>${esc(translationSourceLines(current.source_references))}</textarea>
        </label>
        ${!hasTranslationSources(current) ? `<div class="notice" style="color:#9b3628">Bản dịch thiếu nguồn tham khảo. ${current.status==='in_review'?'Dùng “Từ chối” để đưa về draft rồi bổ sung nguồn, hoặc dùng nút sửa hàng loạt bên dưới.':''}</div>` : ''}
        <div class="admin-muted">Chỉ nhập nguồn có thể kiểm chứng. Bản dịch được AI tạo nhưng nguồn lịch sử phải do người quản trị xác minh trước khi xuất bản.</div>
        ${canEdit ? '<button class="button" type="submit">Lưu nội dung & nguồn tham khảo</button>' : ''}
      </form>
    </section>` : '<div class="notice">Chưa tạo bản dịch cho ngôn ngữ này.</div>';
    return `<div id="hue-i18n-panel" data-attraction-id="${id}" style="max-height:75vh;overflow-y:auto;display:grid;gap:14px;padding-right:7px">
      <p class="eyebrow">THUYẾT MINH · 7 NGÔN NGỮ</p><h2>Bản dịch di tích #${id}</h2>
      <div class="notice">Tiếng Việt là bản gốc đã xuất bản. Bản dịch Gemini được lưu dưới dạng <strong>draft</strong> để kiểm tra trước khi đưa lên User.</div>
      <p id="hue-admin-media-feedback" role="status" ${feedback?'':'hidden'}>${esc(feedback || '')}</p>
      <div class="modal-actions">
        <button type="button" class="button outline" data-hue-i18n-edit-source>${sourceEditorVisible.has(id) ? 'Ẩn sửa nội dung gốc' : '✏️ Sửa nội dung gốc'}</button>
        ${['admin','editor'].includes(role) ? `<button type="button" class="button" data-hue-i18n-generate-all>Tạo các bản dịch còn thiếu</button>` : ''}
        <button type="button" class="button outline" data-hue-i18n-open="${id}">↻ Làm mới</button>
        <button type="button" class="button outline" data-hue-admin-open="${id}">Quay về di tích</button>
      </div>
      ${sourceEditorVisible.has(id) ? vietnameseSourcePanel(id, role) : ''}
      ${role === 'admin' && Object.values(list).some(item => item && ['draft','in_review'].includes(item.status) && !hasTranslationSources(item)) ? `
        <section style="padding:12px;border:1px solid #d8b98d;border-radius:12px;display:grid;gap:8px;background:#fff7e9">
          <strong>⚠ Sửa lỗi thiếu nguồn tham khảo cho bản dịch</strong>
          <span class="admin-muted">Nhập nguồn lịch sử đã kiểm chứng, mỗi dòng một nguồn. Hệ thống chỉ sửa các bản dịch còn thiếu nguồn, không dịch lại và không thay đổi nội dung.</span>
          <textarea id="hue-i18n-bulk-sources" rows="3" placeholder="https://... hoặc tên tài liệu, tác giả, năm xuất bản"></textarea>
          <button type="button" class="button" data-hue-i18n-repair-all>Bổ sung nguồn cho các bản dịch bị thiếu</button>
          <small class="admin-muted">Bản đang chờ duyệt: đưa về draft → lưu nguồn → gửi duyệt lại. Bản đang draft: chỉ lưu nguồn. Không tự xuất bản.</small>
        </section>` : ''}
      <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(210px,1fr));gap:10px">${rows}</div>
      ${editor}
    </div>`;
  }

  async function openTranslations(attractionId, chosen = 'en', feedback = '') {
    const id = requireId(attractionId);
    const staff = await request('/staff/auth/me');
    const role = staff?.role;
    if (!['admin','reviewer','editor'].includes(role)) fail('Không xác định được quyền Staff.');
    const [pairs, original] = await Promise.all([
      Promise.all(translationLanguages.map(async ([code]) => {
        try {return [code, await request(`/staff/attractions/${id}/localizations/${code}`)];}
        catch (error) {if (error.status === 404) return [code, null]; throw error;}
      })),
      request(`/staff/attractions/${id}/localizations/vi`).catch(error => {
        if (error.status === 404) return null;
        throw error;
      })
    ]);
    const list = Object.fromEntries(pairs);
    vietnameseSourceCache.set(id, original);
    localizationCache.set(id, list);
    staffRole = role;
    window.openModal(translationModalHtml(id, list, role, chosen, feedback));
  }

  async function saveVietnameseSource(form) {
    const id = requireId(form.dataset.attractionId);
    const source = vietnameseSourceCache.get(id);
    if (!source || !['draft', 'published'].includes(source.status)) fail('Bản tiếng Việt chưa ở trạng thái có thể sửa.');
    const values = new FormData(form);
    const name = text(values.get('name'));
    const description = text(values.get('description'));
    if (!name || name.length > 255 || !description) fail('Tên và mô tả tiếng Việt phải được nhập đầy đủ.');
    const rawSources = str(values.get('source_references'));
    const source_references = rawSources.trim() === translationSourceLines(source.source_references).trim() &&
      hasTranslationSources(source) ? source.source_references : parseTranslationSources(rawSources);
    if (name === source.name && description === source.description &&
        JSON.stringify(source_references) === JSON.stringify(source.source_references)) {
      fail('Nội dung chưa thay đổi.');
    }
    if (source.status === 'published' && !window.confirm(
      'Lưu sửa đổi sẽ chuyển nội dung tiếng Việt đã xuất bản về draft. ' +
      'Trong thời gian chờ xuất bản lại, di tích có thể tạm ẩn khỏi trang User. ' +
      'Các bản dịch hiện tại sẽ KHÔNG tự thay đổi. Tiếp tục?'
    )) return;
    const updated = await request(`/staff/attractions/${id}/localizations/vi`, {
      method: 'PUT', data: {name, description, source_references}
    });
    if (updated?.status !== 'draft') fail('Backend chưa xác nhận lưu bản nháp tiếng Việt.');
    sourceByAttraction.set(id, updated);
    await openTranslations(id, 'en',
      'Đã lưu bản mô tả tiếng Việt mới. Hãy Gửi duyệt → Xuất bản tiếng Việt trước khi dịch lại các ngôn ngữ.');
  }

  async function workflowVietnameseSource(id, action) {
    id = requireId(id);
    const source = vietnameseSourceCache.get(id);
    if (!source) fail('Chưa có nội dung gốc tiếng Việt.');
    if (['submit','publish'].includes(action) && !hasTranslationSources(source)) {
      fail('Phải bổ sung nguồn tham khảo tiếng Việt đã kiểm chứng trước khi xuất bản.');
    }
    const labels = {submit:'gửi duyệt',publish:'xuất bản',reject:'từ chối'};
    if (!Object.hasOwn(labels, action)) fail('Thao tác không hợp lệ.');
    if (!window.confirm(`Bạn muốn ${labels[action]} nội dung tiếng Việt #${source.id}?`)) return;
    await request(`/staff/localizations/${requireId(source.id)}/${action === 'reject' ? 'review' : action}`, {
      method:'POST', ...(action === 'reject' ? {data:{decision:'reject'}} : {})
    });
    await openTranslations(id, 'en', `Đã ${labels[action]} bản gốc tiếng Việt.`);
  }

  async function regenerateTranslation(id, code) {
    id = requireId(id);
    const current = localizationCache.get(id)?.[code];
    if (!translationLanguages.some(([lang]) => lang === code) || !current) fail('Chưa có bản dịch để dịch lại.');
    if (!['draft','published','in_review'].includes(current.status)) fail('Không thể dịch lại trạng thái này.');
    if (current.status === 'in_review' && staffRole !== 'admin') fail('Cần Reviewer/Admin từ chối bản đang chờ duyệt trước.');
    if (vietnameseSourceCache.get(id)?.status !== 'published') fail('Xuất bản nội dung gốc tiếng Việt mới trước khi dịch lại.');
    const impact = current.status === 'published'
      ? 'Bản dịch công khai sẽ chuyển về draft và tạm không hiển thị cho User đến khi xuất bản lại.'
      : current.status === 'in_review'
      ? 'Admin sẽ chuyển bản đang chờ duyệt về draft, sau đó tạo lại bản dịch AI.'
      : 'Bản nháp hiện có sẽ bị thay bằng bản dịch AI mới.';
    if (!window.confirm(`Dịch lại ${code} theo nội dung tiếng Việt hiện tại? ${impact} Bạn vẫn phải kiểm tra rồi xuất bản thủ công.`)) return;
    if (current.status === 'in_review') {
      await request(`/staff/localizations/${requireId(current.id)}/review`, {
        method:'POST', data:{decision:'reject'}
      });
    }
    const result = await request(`/staff/attractions/${id}/localizations/${code}/regenerate`, {method:'POST'});
    if (result?.status !== 'draft') fail('Backend chưa xác nhận bản dịch nháp mới.');
    await openTranslations(id, code, `Đã dịch lại ${code} theo bản gốc tiếng Việt mới. Hãy kiểm tra lịch sử, thuật ngữ và nguồn trước khi xuất bản.`);
  }

  async function generateTranslation(id, language) {
    if (!translationLanguages.some(([code]) => code === language)) fail('Ngôn ngữ không hợp lệ.');
    const draft = await request(`/staff/attractions/${id}/localizations/${language}/generate`, {method:'POST'});
    if (!draft || draft.status !== 'draft') fail('Backend chưa xác nhận lưu bản dịch nháp.');
    return draft;
  }

  async function generateMissingTranslations(id) {
    id = requireId(id);
    let completed = 0;
    const failures = [];
    const existing = localizationCache.get(id) || {};
    for (const [code, label] of translationLanguages) {
      if (existing[code]) continue;
      const feedback = document.getElementById('hue-admin-media-feedback');
      if (feedback) {feedback.hidden=false;feedback.textContent=`Đang dịch ${label}…`}
      try {await generateTranslation(id, code); completed++;}
      catch(error) {failures.push(`${label}: ${error.message}`);}
    }
    await openTranslations(id, 'en', `Đã tạo ${completed} bản nháp. ${failures.length ? 'Có lỗi: ' + failures.join(' | ') : 'Hãy kiểm tra nội dung trước khi duyệt.'}`);
  }

  async function saveTranslation(form) {
    const id = requireId(form.dataset.attractionId);
    const language = form.dataset.language;
    const current = localizationCache.get(id)?.[language];
    if (!current || current.status !== 'draft') fail('Chỉ chỉnh sửa bản dịch nháp.');
    const values = new FormData(form);
    const name = text(values.get('name'));
    const description = text(values.get('description'));
    if (!name || !description) fail('Tên và mô tả không được trống.');
    const rawSources = String(values.get('source_references') ?? '');
    // Preserve structured citations (objects) if the editor has not changed the field.
    const source_references = rawSources.trim() === translationSourceLines(current.source_references).trim() &&
      hasTranslationSources(current)
      ? current.source_references
      : parseTranslationSources(rawSources);
    await request(`/staff/attractions/${id}/localizations/${language}`, {
      method:'PUT',data:{name,description,source_references}
    });
    await openTranslations(id, language, `Đã lưu bản dịch ${language}.`);
  }

  async function workflowTranslation(id, language, action) {
    const loc = localizationCache.get(id)?.[language];
    if (!loc) fail('Không tìm thấy bản dịch.');
    if (['submit','publish'].includes(action) && !hasTranslationSources(loc)) {
      fail('Bản dịch thiếu nguồn tham khảo. Hãy bổ sung nguồn đã kiểm chứng trước khi gửi duyệt hoặc xuất bản.');
    }
    if (!window.confirm(`Bạn có chắc muốn ${action === 'publish' ? 'xuất bản' : action === 'reject' ? 'từ chối' : 'gửi duyệt'} bản dịch ${language}? Đã kiểm tra thuật ngữ và nguồn lịch sử chưa?`)) return;
    await request(`/staff/localizations/${requireId(loc.id)}/${action === 'reject'?'review':action}`, {
      method:'POST', ...(action === 'reject' ? {data:{decision:'reject'}} : {})
    });
    await openTranslations(id, language, `Thao tác ${action} với ${language} thành công.`);
  }

  // Repair legacy AI translations generated when the original Vietnamese
  // localization did not yet have source_references. Never fabricate sources.
  async function repairTranslationSources(id) {
    id = requireId(id);
    const formValue = document.getElementById('hue-i18n-bulk-sources')?.value;
    const source_references = parseTranslationSources(formValue);
    const list = localizationCache.get(id) || {};
    const targets = translationLanguages
      .map(([code,label]) => ({code,label,loc:list[code]}))
      .filter(({loc}) => loc && ['draft','in_review'].includes(loc.status) && !hasTranslationSources(loc));
    if (!targets.length) fail('Không còn bản dịch nháp/chờ duyệt nào thiếu nguồn.');
    if (!window.confirm(`Bổ sung ${source_references.length} nguồn thực tế cho ${targets.length} bản dịch? Bản đang chờ duyệt sẽ được đưa về draft để cập nhật rồi gửi duyệt lại. Không tự xuất bản.`)) return;
    const errors = [];
    let completed = 0;
    for (const {code,label,loc} of targets) {
      const feedback = document.getElementById('hue-admin-media-feedback');
      if (feedback) {feedback.hidden = false; feedback.textContent = `Đang bổ sung nguồn ${label} (${completed + errors.length + 1}/${targets.length})…`;}
      try {
        if (loc.status === 'in_review') {
          await request(`/staff/localizations/${requireId(loc.id)}/review`, {
            method:'POST',data:{decision:'reject'}
          });
        }
        await request(`/staff/attractions/${id}/localizations/${code}`, {
          method:'PUT', data:{name:loc.name,description:loc.description,source_references}
        });
        if (loc.status === 'in_review') {
          await request(`/staff/localizations/${requireId(loc.id)}/submit`, {method:'POST'});
        }
        completed++;
      } catch (error) {
        errors.push(`${label}: ${error.message}`);
      }
    }
    await openTranslations(id, 'en', `Đã bổ sung nguồn cho ${completed}/${targets.length} bản dịch. ${errors.length ? 'Cần xử lý: ' + errors.join(' | ') : 'Kiểm tra nội dung và nguồn trước khi xuất bản.'}`);
  }

  function renderContent(ui) {

    lastUi = ui;

    const { state, places, attractionApi } = ui;

    const filters = [['Tất cả','Tất cả'],['published','Đã xuất bản'],['draft','Bản nháp'],['in_review','Chờ duyệt'],['archived','Đã lưu trữ']];

    const names = new Map(places.map(p => [p.id, p]));

    const rowName = row => sourceByAttraction.get(idFrom(row))?.name || names.get(row.slug)?.name || row.slug;

    const rows = attractionApi.staffRows.filter(row =>

      (state.adminFilter === 'Tất cả' || row.status === state.adminFilter) &&

      (str(rowName(row)) + ' ' + row.slug).normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().includes(

        str(state.adminSearch).normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase())

    );

    const message = attractionApi.staffStatus === 'ready'

      ? `Đã tải ${attractionApi.staffRows.length} bản ghi từ PostgreSQL. Bản nháp có thể chỉnh sửa; dữ liệu đã xuất bản chỉ được xem.`

      : attractionApi.staffStatus === 'loading' ? 'Đang tải Staff API…' : attractionApi.message;

    const buttons = row => {

      const id = idFrom(row);

      const open = `<button class="text-button" data-hue-admin-open="${id}">${row.status==='draft'?'Sửa bản nháp':'Xem'} ${ui.icon('arrow')}</button>`;

      const submit = row.status==='draft' ? `<button class="text-button" data-hue-admin-action="submit" data-hue-admin-id="${id}">Gửi duyệt</button>` : '';

      // Backend /review (approve) only validates an in_review attraction;

      // it does not set approved_by. Publication sets approved_by + published_at.

      // Showing "Publish" only when approved_by exists creates a dead-end UI.

      const review = row.status==='in_review'

        ? `<button class="text-button" data-hue-admin-action="reject" data-hue-admin-id="${id}">Từ chối</button>` : '';

      const publish = row.status==='in_review'

        ? `<button class="text-button" data-hue-admin-action="publish" data-hue-admin-id="${id}" title="Yêu cầu nội dung tiếng Việt đã xuất bản">Xuất bản</button>` : '';

      const gallery = `<button class="text-button" data-hue-admin-open-media="${id}">🖼 Ảnh / audio</button>`;
      const translations = `<button class="text-button" data-hue-i18n-open="${id}">🌐 Bản dịch</button>`;

      return `${open} ${gallery} ${translations} ${submit} ${review} ${publish}`;

    };

    return `<div class="filters">${filters.map(([key,label])=>`<button class="filter ${state.adminFilter===key?'active':''}" data-admin-filter="${key}">${label}</button>`).join('')}

      <button class="button outline small" id="refresh-admin-attractions">Làm mới</button>

      <button class="button small" data-hue-admin-new>+ Thêm di tích</button></div>

      <section class="glass table-wrap"><table><thead><tr><th>DI TÍCH</th><th>SLUG</th><th>TRẠNG THÁI</th><th>GPS THAM KHẢO</th><th>THAO TÁC</th></tr></thead>

      <tbody>${rows.map(row => {

        const displayName = rowName(row);

        const lat = number(row.latitude),lon = number(row.longitude);

        return `<tr><td>${esc(displayName)}</td><td>${esc(row.slug)}</td><td><span class="status">${esc(statusLabels[row.status] || row.status)}</span></td>

        <td>${lat!==null&&lon!==null?lat.toFixed(5)+', '+lon.toFixed(5):'—'}</td><td>${buttons(row)}</td></tr>`;

      }).join('')}</tbody></table>${rows.length?'':`<div class="empty">${attractionApi.staffStatus==='ready'?'Không có di tích phù hợp.':'Chưa tải được dữ liệu Staff API.'}</div>`}</section>

      <div class="notice" role="status">${esc(message)} Không có chức năng xóa vì Backend chưa cung cấp DELETE API. Thống kê Dashboard vẫn là dữ liệu mô phỏng.</div>`;

  }



  async function openRow(attractionId) {

    const id = requireId(attractionId);

    let row = lastUi?.attractionApi?.staffRows.find(r => idFrom(r) === id);

    if (!row) fail('Không tìm thấy di tích trong danh sách.');

    const detail = await request(`/staff/attractions/${id}`);

    row = { ...row, ...(detail && typeof detail === 'object' ? detail : {}) };



    try {

      const localization = await request(`/staff/attractions/${id}/localizations/vi`);

      if (localization && typeof localization === 'object') {

        sourceByAttraction.set(id, localization);

      }

    } catch (error) {

      // Attraction moi co the chua co localization, nhung loi khac phai thong bao.

      if (error.status !== 404) throw error;

      sourceByAttraction.delete(id);

      if (row.status === 'published') {

        console.warn('Di tích đã xuất bản nhưng không tìm thấy bản địa hóa tiếng Việt:', id);

      }

    }



    window.openModal(modalBody(row, true));

  }

  function collectData(form) {

    const values = new FormData(form);

    const slug = text(values.get('slug')).toLowerCase();

    const areaCode = text(values.get('area_code'));

    const latitude = number(values.get('latitude'));

    const longitude = number(values.get('longitude'));

    const triggerRadius = number(values.get('trigger_radius_m'));

    if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug)) fail('Slug chỉ được dùng chữ thường, số và dấu gạch ngang.');

    if (!areaCode || areaCode.length > 100) fail('Mã khu vực không hợp lệ.');

    if (latitude===null || latitude<-90 || latitude>90 || longitude===null || longitude<-180 || longitude>180) fail('Tọa độ không hợp lệ.');

    if (!Number.isInteger(triggerRadius) || triggerRadius<=0) fail('Bán kính GPS phải là số nguyên dương.');

    return {

      details: {slug,area_code:areaCode,latitude,longitude,trigger_radius_m:triggerRadius},

      name: text(values.get('name')),

      description: text(values.get('description')),

      sources: str(values.get('sources')).split('\n').map(s=>s.trim()).filter(Boolean).slice(0,30),

      updateLocalization: values.has('update_localization')

    };

  }

  async function save(form) {

    const mode = form.dataset.mode;

    const editing = mode === 'edit';

    let createdId = null;

    try {

      const values = collectData(form);

      let attractionId = editing ? requireId(form.dataset.attractionId) : null;

      if (editing) {

        const row = lastUi?.attractionApi?.staffRows.find(r => idFrom(r)===attractionId);

        if (!row || row.status !== 'draft') fail('Chỉ được sửa di tích bản nháp.');

        await request(`/staff/attractions/${attractionId}`, {method:'PATCH', data:values.details});

      } else {

        if (!values.name || !values.description) fail('Vui lòng nhập tên và mô tả tiếng Việt.');

        const created = await request('/staff/attractions', {method:'POST',data:values.details});

        attractionId = requireId(idFrom(created));

        createdId = attractionId;

      }

      if (!editing || values.updateLocalization) {

        if (!values.name || !values.description) fail('Phải nhập đủ tên và mô tả nếu cập nhật nội dung.');

        const localized = await request(`/staff/attractions/${attractionId}/localizations/vi`, {

          method:'PUT',data:{name:values.name,description:values.description,source_references:values.sources}

        });

        if (localized && typeof localized === 'object') sourceByAttraction.set(attractionId,{...localized, ...{

          name:values.name, description:values.description,source_references:values.sources

        }});

      }

      window.closeModal();

      refresh();

      window.toast?.(editing ? 'Đã lưu bản nháp vào PostgreSQL.' : `Đã tạo bản nháp #${attractionId} và nội dung tiếng Việt.`);

    } catch(error) {

      const partial = createdId ? `Đã tạo bản nháp #${createdId}, nhưng lưu nội dung chưa hoàn tất. ` : '';

      notice(partial + (error.message || 'Không lưu được dữ liệu.'), true);

      if (createdId) refresh();

    }

  }

  async function publishExistingMedia(mediaId) {

    const id = requireId(mediaId);

    if (!window.confirm(`Xuất bản Media #${id}? Chỉ thực hiện khi đã xác minh quyền sử dụng hình ảnh hoặc âm thanh.`)) return;

    await request(`/staff/media/${id}/submit`, { method: 'POST' });

    const published = await request(`/staff/media/${id}/publish`, { method: 'POST' });

    if (published?.status !== 'published') fail(`Media #${id} chưa được xuất bản.`);

    const attractionId = requireId(document.getElementById('hue-admin-media-panel')?.dataset.attractionId);

    await openMediaUpload(attractionId, `Media #${id} đã được xuất bản.`);

  }



  async function workflow(action, id, resource='attractions') {

    id = requireId(id);

    if (!['submit','approve','reject','publish'].includes(action)) fail('Thao tác workflow không hợp lệ.');

    if (!['attractions','localizations','media'].includes(resource)) fail('Loại tài nguyên không hợp lệ.');

    const messages = {

      submit:'Gửi bản nháp vào quy trình duyệt?',

      approve:'Phê duyệt tài nguyên này? Hãy đảm bảo nội dung và nguồn đã được kiểm chứng.',

      reject:'TỪ CHỐI tài nguyên này và đưa lại quy trình xử lý?',

      publish:'Xuất bản tài nguyên này cho khách du lịch? Nội dung tiếng Việt phải được xuất bản trước.'

    };

    if (!window.confirm(messages[action])) return;

    const pathAction = ['approve','reject'].includes(action) ? 'review' : action;

    const data = ['approve','reject'].includes(action) ? {decision:action} : undefined;

    await request(`/staff/${resource}/${id}/${pathAction}`,{method:'POST',data});

    window.toast?.({submit:'Đã gửi duyệt.',approve:'Đã phê duyệt.',reject:'Đã từ chối.',publish:'Đã xuất bản.'}[action]);



    if (resource === 'localizations') {

      // Dong modal va xoa cache de lan mo sau lay trang thai moi tu Backend.

      const form = document.getElementById('hue-admin-real-form');

      const attractionId = Number(form?.dataset.attractionId);

      if (Number.isInteger(attractionId) && attractionId > 0) {

        sourceByAttraction.delete(attractionId);

      }

      window.closeModal();

    }

    if (resource === 'media') {

      const attractionId = Number(document.getElementById('hue-admin-media-panel')?.dataset.attractionId);

      if (Number.isInteger(attractionId) && attractionId > 0) {

        await openMediaUpload(attractionId, `Đã ${action === 'publish' ? 'xuất bản' : action === 'reject' ? 'từ chối' : 'gửi duyệt'} Media #${id}.`);

      }

    } else {

      refresh();

    }

  }

  async function guarded(task) {

    if (busy) return;

    busy = true;

    try { await task(); }

    catch(error) { notice(error.message || 'Không thực hiện được thao tác.', true); }

    finally { busy = false; }

  }

  document.addEventListener('click', event => {
    const button = event.target.closest('button[data-hue-i18n-open],button[data-hue-i18n-view],button[data-hue-i18n-generate],button[data-hue-i18n-regenerate],button[data-hue-i18n-edit-source],button[data-hue-i18n-vi-workflow],button[data-hue-i18n-generate-all],button[data-hue-i18n-repair-all],button[data-hue-i18n-workflow]');
    if (!button) return;
    event.preventDefault(); event.stopImmediatePropagation();
    if (button.hasAttribute('data-hue-i18n-open')) {
      guarded(() => openTranslations(button.dataset.hueI18nOpen)); return;
    }
    const panel = document.getElementById('hue-i18n-panel');
    if (!panel) return;
    const id = requireId(panel.dataset.attractionId);
    if (button.hasAttribute('data-hue-i18n-edit-source')) {
      if (sourceEditorVisible.has(id)) sourceEditorVisible.delete(id);
      else sourceEditorVisible.add(id);
      guarded(() => openTranslations(id));
    } else if (button.hasAttribute('data-hue-i18n-vi-workflow')) {
      guarded(() => workflowVietnameseSource(id, button.dataset.hueI18nViWorkflow));
    } else if (button.hasAttribute('data-hue-i18n-regenerate')) {
      guarded(() => regenerateTranslation(id, button.dataset.hueI18nRegenerate));
    } else if (button.hasAttribute('data-hue-i18n-view')) {
      guarded(() => openTranslations(id, button.dataset.hueI18nView));
    } else if (button.hasAttribute('data-hue-i18n-generate')) {
      guarded(async () => {
        const code = button.dataset.hueI18nGenerate;
        await generateTranslation(id, code);
        await openTranslations(id, code, `Đã tạo bản dịch ${code}. Hãy đọc và chỉnh sửa trước khi duyệt.`);
      });
    } else if (button.hasAttribute('data-hue-i18n-generate-all')) {
      guarded(() => generateMissingTranslations(id));
    } else if (button.hasAttribute('data-hue-i18n-repair-all')) {
      guarded(() => repairTranslationSources(id));
    } else if (button.hasAttribute('data-hue-i18n-workflow')) {
      guarded(() => workflowTranslation(id, button.dataset.hueI18nLang, button.dataset.hueI18nWorkflow));
    }
  }, true);

  document.addEventListener('submit', event => {
    if (event.target?.id !== 'hue-i18n-vietnamese-form') return;
    event.preventDefault(); event.stopImmediatePropagation();
    guarded(() => saveVietnameseSource(event.target));
  }, true);

  document.addEventListener('submit', event => {
    if (event.target?.id !== 'hue-i18n-edit-form') return;
    event.preventDefault(); event.stopImmediatePropagation();
    guarded(() => saveTranslation(event.target));
  }, true);

  document.addEventListener('click', event => {

    const control = event.target.closest('button[data-hue-admin-new],button[data-hue-admin-open],button[data-hue-admin-open-media],button[data-hue-admin-autopublish],button[data-hue-admin-action],button[data-hue-admin-close]');

    if (!control) return;

    event.preventDefault();

    event.stopImmediatePropagation();

    if (control.hasAttribute('data-hue-admin-close')) { window.closeModal(); return; }

    if (control.hasAttribute('data-hue-admin-new')) {

      window.openModal(modalBody({}, false));

      return;

    }

    if (control.hasAttribute('data-hue-admin-open-media')) {

      guarded(() => openMediaUpload(control.dataset.hueAdminOpenMedia));

      return;

    }

    if (control.hasAttribute('data-hue-admin-autopublish')) {

      guarded(() => publishExistingMedia(control.dataset.hueAdminAutopublish));

      return;

    }

    if (control.hasAttribute('data-hue-admin-open')) {

      guarded(() => openRow(control.dataset.hueAdminOpen));

      return;

    }

    if (control.hasAttribute('data-hue-admin-action')) {

      guarded(() => workflow(

        control.dataset.hueAdminAction,

        control.dataset.hueAdminId,

        control.dataset.hueAdminResource || 'attractions'

      ));

    }

  }, true);

  document.addEventListener('change', event => {
    if (event.target?.id !== 'hue-admin-audio-file') return;
    const file = event.target.files?.[0];
    const label = document.getElementById('hue-admin-audio-selection');
    const duration = document.getElementById('hue-admin-audio-duration');
    if (duration) duration.value = '';
    if (label) label.textContent = file ? `Đã chọn: ${file.name} (${(file.size / 1048576).toFixed(2)} MB), đang đọc thời lượng…` : 'Chưa chọn audio.';
    if (!file) return;
    detectAudioDuration(file).then(seconds => {
      // Ignore a stale result after the user changes files or closes the modal.
      const currentFile = document.getElementById('hue-admin-audio-file')?.files?.[0];
      if (currentFile !== file) return;
      if (seconds && duration) duration.value = String(seconds);
      if (label) label.textContent = seconds ? `${file.name} · ${seconds} giây` : `${file.name} · Không đọc được thời lượng; hãy nhập giây thủ công.`;
    }).catch(() => {
      if (label) label.textContent = 'Không đọc được thời lượng; hãy nhập giây thủ công.';
    });
  }, true);

  document.addEventListener('change', event => {

    if (event.target?.id !== 'hue-admin-media-file') return;

    const selected = document.getElementById('hue-admin-media-selection');

    if (!selected) return;

    const file = event.target.files?.[0];

    selected.textContent = file

      ? `Đã chọn: ${file.name} (${(file.size / (1024*1024)).toFixed(2)} MB)`

      : 'Chưa chọn ảnh.';

  }, true);

  document.addEventListener('submit', event => {
    if (event.target?.id !== 'hue-admin-audio-form') return;
    event.preventDefault();
    event.stopImmediatePropagation();
    guarded(() => uploadAudio(event.target));
  }, true);

  document.addEventListener('submit', event => {

    if (event.target?.id !== 'hue-admin-media-form') return;

    event.preventDefault();

    event.stopImmediatePropagation();

    guarded(() => uploadImage(event.target));

  }, true);

  document.addEventListener('submit', event => {

    if (event.target?.id !== 'hue-admin-real-form') return;

    event.preventDefault();

    event.stopImmediatePropagation();

    guarded(() => save(event.target));

  }, true);

  window.HueAdminCRUD = { renderContent };

})();
