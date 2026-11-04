/* Hue Guide — GPS & bản đồ helpers (FE03). FILE MỚI, thuần logic, chưa được trang nào nạp.
 * Không gọi navigator.geolocation và không đổi thuật toán GPS/cooldown của Backend:
 * chỉ phân loại lỗi, kiểm tra tọa độ, tạo link bản đồ ngoài (tham khảo) và chống gọi lặp. */
(function (root, factory) {
  'use strict';
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  else root.HueGpsHelpers = api;
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  // Phạm vi quanh Huế — cùng ngưỡng với validHuePoint trong app.js. Loại luôn 0/0, NaN.
  const HUE_BOUNDS = { latMin: 16.20, latMax: 16.70, lonMin: 107.30, lonMax: 107.90 };
  const MAX_USABLE_ACCURACY_M = 150; // sai số lớn hơn -> khuyên chọn thủ công

  function validHuePoint(lat, lon) {
    lat = Number(lat); lon = Number(lon);
    return Number.isFinite(lat) && Number.isFinite(lon) &&
      lat >= HUE_BOUNDS.latMin && lat <= HUE_BOUNDS.latMax && lon >= HUE_BOUNDS.lonMin && lon <= HUE_BOUNDS.lonMax;
  }

  function distanceM(lat1, lon1, lat2, lon2) {
    const rad = n => n * Math.PI / 180;
    const a = Math.sin(rad(lat2 - lat1) / 2) ** 2 +
      Math.cos(rad(lat1)) * Math.cos(rad(lat2)) * Math.sin(rad(lon2 - lon1) / 2) ** 2;
    return Math.round(2 * 6371000 * Math.asin(Math.min(1, Math.sqrt(a))));
  }

  /** GeolocationPositionError.code -> thông điệp + gợi ý hành động. */
  function classifyGeoError(error) {
    const code = error && error.code;
    if (code === 1) return { kind: 'denied', retryable: false, manualFallback: true,
      message: 'Bạn đã từ chối quyền vị trí. Có thể chọn di tích thủ công hoặc mở quyền trong cài đặt trình duyệt.' };
    if (code === 2) return { kind: 'unavailable', retryable: true, manualFallback: true,
      message: 'Chưa xác định được vị trí. Hãy bật dịch vụ vị trí trên thiết bị hoặc chọn di tích thủ công.' };
    if (code === 3) return { kind: 'timeout', retryable: true, manualFallback: true,
      message: 'GPS phản hồi quá chậm. Hãy ra nơi thoáng hơn rồi thử lại, hoặc chọn di tích thủ công.' };
    return { kind: 'unknown', retryable: true, manualFallback: true,
      message: 'Không lấy được vị trí. Bạn vẫn có thể chọn di tích thủ công.' };
  }

  /** Đánh giá một lần đo GPS. Trả {ok, reason, message}. */
  function assessFix(coords, maxAccuracyM = MAX_USABLE_ACCURACY_M) {
    const lat = Number(coords && coords.latitude), lon = Number(coords && coords.longitude);
    const accuracy = Number(coords && coords.accuracy);
    if (!Number.isFinite(lat) || !Number.isFinite(lon)) return { ok: false, reason: 'invalid', message: 'Tọa độ nhận được không hợp lệ.' };
    if (lat === 0 && lon === 0) return { ok: false, reason: 'null_island', message: 'Thiết bị báo vị trí 0/0, bỏ qua.' };
    if (!validHuePoint(lat, lon)) return { ok: false, reason: 'outside_hue', message: 'Vị trí hiện tại nằm ngoài khu vực Huế. Hãy chọn di tích thủ công.' };
    if (!Number.isFinite(accuracy) || accuracy > maxAccuracyM) return { ok: false, reason: 'low_accuracy', message: 'Sai số GPS quá lớn. Vui lòng chọn di tích thủ công.' };
    return { ok: true, reason: 'ok', message: '' };
  }

  /** Link ngoài, chỉ là tham khảo. Trả '' nếu tọa độ không hợp lệ (nút nên bị vô hiệu). */
  function googleMapsDirectionsUrl(lat, lon, mode = 'walking') {
    if (!validHuePoint(lat, lon)) return '';
    const m = ['walking', 'driving', 'transit', 'bicycling'].includes(mode) ? mode : 'walking';
    return 'https://www.google.com/maps/dir/?api=1&destination=' + encodeURIComponent(Number(lat) + ',' + Number(lon)) + '&travelmode=' + m;
  }
  function osmUrl(lat, lon, zoom = 16) {
    if (!validHuePoint(lat, lon)) return 'https://www.openstreetmap.org/#map=11/16.45/107.57';
    return `https://www.openstreetmap.org/?mlat=${Number(lat)}&mlon=${Number(lon)}#map=${zoom}/${Number(lat)}/${Number(lon)}`;
  }

  /** Di tích trong bán kính, gần nhất trước; bỏ điểm sai tọa độ. Dùng để HIỂN THỊ gợi ý,
   *  không thay thế /location-suggestions của Backend. */
  function nearbyAttractions(position, attractions, radiusM) {
    if (!validHuePoint(position && position.latitude, position && position.longitude)) return [];
    return (attractions || [])
      .filter(a => validHuePoint(a.latitude, a.longitude))
      .map(a => ({ attraction: a, distance_m: distanceM(position.latitude, position.longitude, Number(a.latitude), Number(a.longitude)) }))
      .filter(x => x.distance_m <= radiusM)
      .sort((x, y) => x.distance_m - y.distance_m);
  }

  /** Chống gọi lặp geolocation: tối đa 1 yêu cầu đang chạy; yêu cầu đến trong lúc đó dùng lại kết quả. */
  function createSingleFlight(fn) {
    let inFlight = null;
    return function (...args) {
      if (inFlight) return inFlight;
      inFlight = Promise.resolve().then(() => fn(...args)).finally(() => { inFlight = null; });
      return inFlight;
    };
  }

  return { HUE_BOUNDS, MAX_USABLE_ACCURACY_M, validHuePoint, distanceM, classifyGeoError, assessFix,
    googleMapsDirectionsUrl, osmUrl, nearbyAttractions, createSingleFlight };
});
