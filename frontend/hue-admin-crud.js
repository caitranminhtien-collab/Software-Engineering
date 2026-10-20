/* Hue Guide / Staff attractions: server-backed draft editor and workflow.
 * Backend owns authentication, CSRF, authorization and publication rules.
 * Never persist admin edits in localStorage or assume published data is editable.
 */
(() => {
  'use strict';

  const API = '/api/v1';
  const sourceByAttraction = new Map();
  const statusLabels = {
    draft: 'Bản nháp', in_review: 'Chờ duyệt', published: 'Đã xuất bản', archived: 'Đã lưu trữ',
  };
  let busy = false;
  let lastUi = null;

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
  async function request(path, { method = 'GET', data } = {}) {
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
      ...(data !== undefined ? { body: JSON.stringify(data) } : {}),
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
    const box = document.getElementById('hue-admin-form-feedback');
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
    const readonlyNote = editing && !canWrite
      ? `<div class="notice">Bản ghi đang ở trạng thái <b>${esc(status)}</b>. Backend hiện không cho sửa trực tiếp di tích đã xuất bản hoặc đang chờ duyệt. Không có API xóa di tích.</div>`
      : editing ? `<div class="notice">Chỉ sửa được bản nháp. Khi xuất bản, nội dung cần được duyệt lại theo quy trình Backend.</div>`
        : `<div class="notice">Di tích mới được tạo ở trạng thái <b>draft</b>. Chưa xuất hiện trên trang khách cho đến khi hoàn tất quy trình duyệt/xuất bản.</div>`;
    return `<p class="eyebrow">QUẢN LÝ DI TÍCH · POSTGRESQL</p>
      <h2>${editing ? 'Chi tiết di tích #' + idFrom(row) : 'Thêm di tích mới'}</h2>
      <p>${editing ? `Trạng thái: ${esc(status)} · ${esc(row.slug)}` : 'Tạo một bản nháp mới trong Backend Hue Tourism Guide.'}</p>
      <form id="hue-admin-real-form" style="max-height:65vh;overflow-y:auto;padding-right:8px" data-mode="${editing?'edit':'create'}" data-attraction-id="${editing?idFrom(row):''}">
        ${formControls(row, editing)}
        <div class="modal-actions">${canWrite?`<button class="button" type="submit">${editing?'Lưu bản nháp':'Tạo di tích mới'}</button>`:''}<button class="button outline" type="button" data-hue-admin-close>Đóng</button></div>
        <p id="hue-admin-form-feedback" role="status" hidden></p>
        ${readonlyNote}
      </form>`;
  }

  function renderContent(ui) {
    lastUi = ui;
    const { state, places, attractionApi } = ui;
    const filters = [['Tất cả','Tất cả'],['published','Đã xuất bản'],['draft','Bản nháp'],['in_review','Chờ duyệt'],['archived','Đã lưu trữ']];
    const names = new Map(places.map(p => [p.id, p]));
    const rows = attractionApi.staffRows.filter(row =>
      (state.adminFilter === 'Tất cả' || row.status === state.adminFilter) &&
      (str(names.get(row.slug)?.name || row.slug) + ' ' + row.slug).normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().includes(
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
      return `${open} ${submit} ${review} ${publish}`;
    };
    return `<div class="filters">${filters.map(([key,label])=>`<button class="filter ${state.adminFilter===key?'active':''}" data-admin-filter="${key}">${label}</button>`).join('')}
      <button class="button outline small" id="refresh-admin-attractions">Làm mới</button>
      <button class="button small" data-hue-admin-new>+ Thêm di tích</button></div>
      <section class="glass table-wrap"><table><thead><tr><th>DI TÍCH</th><th>SLUG</th><th>TRẠNG THÁI</th><th>GPS THAM KHẢO</th><th>THAO TÁC</th></tr></thead>
      <tbody>${rows.map(row => {
        const p = names.get(row.slug);
        const lat = number(row.latitude),lon = number(row.longitude);
        return `<tr><td>${esc(p?.name || row.slug)}</td><td>${esc(row.slug)}</td><td><span class="status">${esc(statusLabels[row.status] || row.status)}</span></td>
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
  async function workflow(action, id, resource='attractions') {
    id = requireId(id);
    if (!['submit','approve','reject','publish'].includes(action)) fail('Thao tác workflow không hợp lệ.');
    if (!['attractions','localizations'].includes(resource)) fail('Loại tài nguyên không hợp lệ.');
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
    refresh();
  }
  async function guarded(task) {
    if (busy) return;
    busy = true;
    try { await task(); }
    catch(error) { notice(error.message || 'Không thực hiện được thao tác.', true); }
    finally { busy = false; }
  }
  document.addEventListener('click', event => {
    const control = event.target.closest('button[data-hue-admin-new],button[data-hue-admin-open],button[data-hue-admin-action],button[data-hue-admin-close]');
    if (!control) return;
    event.preventDefault();
    event.stopImmediatePropagation();
    if (control.hasAttribute('data-hue-admin-close')) { window.closeModal(); return; }
    if (control.hasAttribute('data-hue-admin-new')) {
      window.openModal(modalBody({}, false));
      return;
    }
    if (control.hasAttribute('data-hue-admin-open')) {
      guarded(() => openRow(control.dataset.hueAdminOpen));
      return;
    }
    if (control.hasAttribute('data-hue-admin-action')) {
      guarded(() => workflow(control.dataset.hueAdminAction,control.dataset.hueAdminId));
    }
  }, true);
  document.addEventListener('submit', event => {
    if (event.target?.id !== 'hue-admin-real-form') return;
    event.preventDefault();
    event.stopImmediatePropagation();
    guarded(() => save(event.target));
  }, true);
  window.HueAdminCRUD = { renderContent };
})();
