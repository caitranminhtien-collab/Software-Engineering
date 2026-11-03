/* Hue Guide — Visitor API helpers (FE01/FE02).
 * Script thuần, không framework, không build. Dùng được cả trong trình duyệt
 * (window.HueApi) lẫn Node (require) để kiểm thử mà không cần trình duyệt.
 * Chỉ chứa logic KHÔNG đụng DOM: gọi API có timeout, tải toàn bộ tuyến published
 * qua phân trang, và chuẩn hoá/kiểm tra chi tiết tuyến.
 * Không đổi hợp đồng API: GET /api/v1/routes và GET /api/v1/routes/:id. */
(function (root, factory) {
  'use strict';
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  else root.HueApi = api;
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  const DEFAULT_TIMEOUT_MS = 15000;
  const ROUTE_PAGE_SIZE = 100;   // backend cho phép tối đa 100
  const ROUTE_MAX_PAGES = 100;   // chặn vòng lặp vô hạn nếu API trả total_pages sai

  class ApiError extends Error {
    constructor(message, kind, status) {
      super(message);
      this.name = 'ApiError';
      this.kind = kind;      // 'timeout' | 'network' | 'http' | 'parse' | 'shape'
      this.status = status || 0;
    }
  }

  /** GET JSON có timeout. fetchImpl chỉ để test. */
  async function fetchJson(path, options = {}) {
    const timeoutMs = options.timeoutMs ?? DEFAULT_TIMEOUT_MS;
    const doFetch = options.fetchImpl || (typeof fetch === 'function' ? fetch.bind(globalThis) : null);
    if (!doFetch) throw new ApiError('fetch không khả dụng', 'network');
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    let response;
    try {
      response = await doFetch(path, {
        credentials: 'same-origin',
        headers: { Accept: 'application/json' },
        cache: 'no-store',
        signal: controller.signal
      });
    } catch (error) {
      clearTimeout(timer);
      if (error && error.name === 'AbortError') throw new ApiError('Hết thời gian chờ máy chủ', 'timeout');
      throw new ApiError('Không kết nối được máy chủ', 'network');
    }
    try {
      if (!response.ok) throw new ApiError(`HTTP ${response.status}`, 'http', response.status);
      try {
        return await response.json();
      } catch (error) {
        if (error && error.name === 'AbortError') throw new ApiError('Hết thời gian chờ máy chủ', 'timeout');
        throw new ApiError('Phản hồi không phải JSON hợp lệ', 'parse');
      }
    } finally {
      clearTimeout(timer);
    }
  }

  const validId = value => {
    const id = Number(value);
    return Number.isSafeInteger(id) && id > 0 ? id : null;
  };

  /**
   * Tải TẤT CẢ tuyến published (không chỉ trang đầu). Dừng theo total_pages,
   * bỏ bản ghi không có id hợp lệ, loại trùng id (tránh lặp khi dữ liệu đổi giữa các trang).
   * getJson: (path) => Promise<payload>
   */
  async function loadAllPublishedRoutes(getJson, options = {}) {
    const pageSize = options.pageSize ?? ROUTE_PAGE_SIZE;
    const maxPages = options.maxPages ?? ROUTE_MAX_PAGES;
    const seen = new Set();
    const items = [];
    for (let page = 1; page <= maxPages; page++) {
      const payload = await getJson(`/api/v1/routes?page=${page}&page_size=${pageSize}`);
      if (!payload || !Array.isArray(payload.data)) {
        throw new ApiError('Danh sách tuyến từ API không hợp lệ', 'shape');
      }
      for (const route of payload.data) {
        const id = validId(route && route.id);
        if (!id || seen.has(id)) continue;
        seen.add(id);
        items.push(route);
      }
      const totalPages = Number(payload.pagination && payload.pagination.total_pages != null
        ? payload.pagination.total_pages : 1);
      if (!Number.isInteger(totalPages) || totalPages < 0 || totalPages > maxPages) {
        throw new ApiError('Phân trang tuyến không hợp lệ', 'shape');
      }
      if (page >= totalPages) break;
      if (!payload.data.length) break; // trang rỗng nhưng total_pages lớn: không lặp thêm
    }
    return items;
  }

  const numOrNull = v => (v == null || v === '' ? null : (Number.isFinite(Number(v)) ? Number(v) : null));

  /**
   * Chuẩn hoá chi tiết tuyến: ép kiểu số, sắp theo `order` (= stop_order trong DB),
   * kiểm tra tọa độ bằng validPoint(lat, lon). Ném ApiError('shape') nếu dữ liệu hỏng.
   * Trả thêm `issues` (mảng cảnh báo) — ví dụ tuyến chưa đủ điểm dừng.
   */
  function normalizeRouteDetail(route, expectedId, validPoint) {
    if (!route || Number(route.id) !== expectedId || !Array.isArray(route.stops)) {
      throw new ApiError('Chi tiết tuyến không hợp lệ', 'shape');
    }
    const stops = route.stops.map(stop => ({
      ...stop,
      order: Number(stop.order),
      attraction_id: Number(stop.attraction_id),
      latitude: Number(stop.latitude),
      longitude: Number(stop.longitude),
      visit_minutes: numOrNull(stop.visit_minutes),
      travel_minutes_from_previous: numOrNull(stop.travel_minutes_from_previous)
    }));
    if (stops.some(stop => !Number.isFinite(stop.order))) {
      throw new ApiError('Điểm dừng thiếu thứ tự', 'shape');
    }
    stops.sort((a, b) => a.order - b.order);
    if (!stops.every(stop => validPoint(stop.latitude, stop.longitude))) {
      throw new ApiError('Tuyến chứa tọa độ chưa hợp lệ', 'shape');
    }
    const issues = [];
    if (stops.length === 0) issues.push('empty');
    else if (stops.length === 1) issues.push('single_stop');
    const orders = stops.map(s => s.order);
    if (new Set(orders).size !== orders.length) issues.push('duplicate_order');
    return { ...route, stops, issues };
  }

  return { ApiError, fetchJson, validId, loadAllPublishedRoutes, normalizeRouteDetail,
    DEFAULT_TIMEOUT_MS, ROUTE_PAGE_SIZE, ROUTE_MAX_PAGES };
});
