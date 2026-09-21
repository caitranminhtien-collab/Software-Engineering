/**
 * Geofence Engine & GPS Tracker
 * Đáp ứng các quy định Section 6.2 PRD:
 * - Thuật toán Haversine đo khoảng cách chuẩn
 * - Throttle cập nhật vị trí
 * - Debounce 3 giây khi vào bán kính
 * - Cooldown 5 phút khi rời POI
 */

export class GeofenceEngine {
  constructor(pois, options = {}) {
    this.pois = pois;
    this.options = Object.assign({
      debounceDurationMs: 3000,   // 3s debounce xác nhận ENTER
      cooldownDurationMs: 300000, // 5 phút cooldown (300.000 ms)
      onLocationUpdate: () => {},
      onPoiEnter: () => {},
      onPoiExit: () => {},
      onCooldownUpdate: () => {}
    }, options);

    this.currentLocation = null;
    this.watchId = null;
    this.isSimulated = false;

    // Quản lý trạng thái Geofence
    this.activePoi = null;            // POI hiện đang ở trong bán kính
    this.potentialPoi = null;         // POI đang debounce xác nhận
    this.potentialEnterTimestamp = 0; // Thời điểm bắt đầu chạm bán kính
    this.cooldownMap = new Map();     // poiId -> expirationTimestamp

    // Khoảng cách tới từng POI được tính toán lại mỗi chu kỳ
    this.poiDistances = new Map();
  }

  /**
   * Tính khoảng cách giữa hai tọa độ WGS84 theo công thức Haversine (trả về mét)
   */
  static haversineDistance(lat1, lon1, lat2, lon2) {
    const R = 6371000; // Bán kính Trái Đất (mét)
    const toRad = (angle) => (angle * Math.PI) / 180;

    const dLat = toRad(lat2 - lat1);
    const dLon = toRad(lon2 - lon1);
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) *
      Math.sin(dLon / 2) * Math.sin(dLon / 2);

    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  }

  /**
   * Khởi động lấy tọa độ thực từ GPS trình duyệt
   */
  startLiveTracking() {
    this.isSimulated = false;
    if (!navigator.geolocation) {
      console.warn("Trình duyệt không hỗ trợ Geolocation API");
      return false;
    }

    if (this.watchId !== null) {
      navigator.geolocation.clearWatch(this.watchId);
    }

    let lastTime = 0;
    const throttleMs = 4000; // Throttle ~4-5s tiết kiệm pin

    this.watchId = navigator.geolocation.watchPosition(
      (position) => {
        const now = Date.now();
        if (now - lastTime < throttleMs) return;
        lastTime = now;

        const { latitude, longitude, accuracy } = position.coords;
        this.updatePosition(latitude, longitude, accuracy || 10);
      },
      (error) => {
        console.warn("Lỗi đọc GPS:", error.message);
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 3000
      }
    );

    return true;
  }

  stopTracking() {
    if (this.watchId !== null) {
      navigator.geolocation.clearWatch(this.watchId);
      this.watchId = null;
    }
  }

  /**
   * Đặt vị trí giả lập (cho mục đích test/demo)
   */
  setSimulatedPosition(lat, lng) {
    this.isSimulated = true;
    this.updatePosition(lat, lng, 5);
  }

  /**
   * Xử lý khi có tọa độ mới (Dù là GPS thật hay GPS giả lập)
   */
  updatePosition(lat, lng, accuracy = 10) {
    this.currentLocation = { lat, lng, accuracy, timestamp: Date.now() };

    // 1. Tính toán khoảng cách tới tất cả 10 POI
    let nearestPoi = null;
    let minDistance = Infinity;

    for (const poi of this.pois) {
      const dist = GeofenceEngine.haversineDistance(lat, lng, poi.coords[0], poi.coords[1]);
      this.poiDistances.set(poi.id, dist);

      if (dist < minDistance) {
        minDistance = dist;
        nearestPoi = poi;
      }
    }

    // 2. Kiểm tra Geofence với POI gần nhất
    this.evaluateGeofence(lat, lng);

    // 3. Bắn event cập nhật vị trí
    this.options.onLocationUpdate({
      location: this.currentLocation,
      isSimulated: this.isSimulated,
      nearestPoi,
      nearestDistance: minDistance,
      distances: this.poiDistances,
      cooldowns: this.getCooldownStatuses()
    });
  }

  /**
   * Đánh giá xem người dùng đang trong bán kính POI nào
   */
  evaluateGeofence(lat, lng) {
    const now = Date.now();
    let insidePoi = null;

    for (const poi of this.pois) {
      const dist = this.poiDistances.get(poi.id) || Infinity;
      if (dist <= poi.radiusMeters) {
        insidePoi = poi;
        break; // Giả sử không có hai bán kính lăng tẩm nào giao thoa gần nhau
      }
    }

    // Nếu đang ở trong vùng của 1 POI
    if (insidePoi) {
      // Kiểm tra xem POI có đang bị Cooldown không
      const cdExpiry = this.cooldownMap.get(insidePoi.id) || 0;
      const isCooldown = now < cdExpiry;

      if (isCooldown) {
        // Đang trong thời gian nghỉ 5 phút, không kích hoạt lại
        return;
      }

      // Nếu đây là POI mới và khác activePoi hiện tại
      if (this.activePoi?.id !== insidePoi.id) {
        if (this.potentialPoi?.id === insidePoi.id) {
          // Kiểm tra xem đã đủ thời gian debounce 3 giây chưa
          if (now - this.potentialEnterTimestamp >= this.options.debounceDurationMs) {
            this.activePoi = insidePoi;
            this.potentialPoi = null;
            this.options.onPoiEnter(this.activePoi);
          }
        } else {
          // Bắt đầu đếm debounce 3s
          this.potentialPoi = insidePoi;
          this.potentialEnterTimestamp = now;
        }
      }
    } else {
      // Ra khỏi bán kính
      this.potentialPoi = null;
      if (this.activePoi) {
        const exitingPoi = this.activePoi;
        this.activePoi = null;
        
        // Đặt Cooldown 5 phút (300.000 ms) cho POI vừa rời khỏi
        this.cooldownMap.set(exitingPoi.id, now + this.options.cooldownDurationMs);
        this.options.onPoiExit(exitingPoi);
        this.options.onCooldownUpdate(this.getCooldownStatuses());
      }
    }
  }

  /**
   * Lấy danh sách thời gian còn lại của các POI đang cooldown
   */
  getCooldownStatuses() {
    const now = Date.now();
    const result = {};
    for (const [poiId, expiry] of this.cooldownMap.entries()) {
      if (now < expiry) {
        result[poiId] = Math.ceil((expiry - now) / 1000); // Số giây còn lại
      } else {
        this.cooldownMap.delete(poiId);
      }
    }
    return result;
  }

  /**
   * Reset cooldown cho một hoặc tất cả POI (tiện lợi cho việc test)
   */
  resetCooldown(poiId = null) {
    if (poiId) {
      this.cooldownMap.delete(poiId);
    } else {
      this.cooldownMap.clear();
    }
    this.options.onCooldownUpdate(this.getCooldownStatuses());
  }

  getDistanceTo(poiId) {
    return this.poiDistances.get(poiId) || null;
  }
}
