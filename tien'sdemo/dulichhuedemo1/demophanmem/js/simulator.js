/**
 * Bảng Điều Khiển Giả Lập GPS (GPS Simulation Console)
 * Cho phép kiểm thử toàn diện toàn bộ tính năng Geofence & Audio Tour
 * mà không cần phải có mặt thực tế tại Huế
 */

export class GpsSimulator {
  constructor(geofenceEngine, pois, routes, options = {}) {
    this.geofence = geofenceEngine;
    this.pois = pois;
    this.routes = routes;
    this.options = Object.assign({
      onSimStateChange: () => {}
    }, options);

    this.isTourRunning = false;
    this.activeRoute = routes[0];
    this.currentWaypointIdx = 0;
    this.simulationSpeed = 5; // 5x
    this.intervalId = null;

    this.currentPosition = {
      lat: pois[0].coords[0],
      lng: pois[0].coords[1]
    };
  }

  /**
   * Dịch chuyển tức thời (Teleport) tới một POI
   * @param {string} poiId
   * @param {boolean} inside Nếu true thì rơi vào tâm (trong bán kính), nếu false thì rơi cách 120m (ngoài bán kính)
   */
  teleportToPoi(poiId, inside = true) {
    this.stopTourSimulation();
    const poi = this.pois.find(p => p.id === poiId);
    if (!poi) return;

    let targetLat = poi.coords[0];
    let targetLng = poi.coords[1];

    if (!inside) {
      // Dịch chuyển cách mép bán kính khoảng 120m về phía Bắc
      targetLat += 0.0011;
    }

    this.currentPosition = { lat: targetLat, lng: targetLng };
    this.geofence.setSimulatedPosition(targetLat, targetLng);
    this.options.onSimStateChange({
      isSimulating: true,
      isTourRunning: false,
      currentPosition: this.currentPosition,
      teleportedPoi: poi,
      inside
    });
  }

  /**
   * Bắt đầu mô phỏng tự động di chuyển dọc theo lộ trình
   */
  startTourSimulation(routeId = null, speedMultiplier = this.simulationSpeed) {
    this.stopTourSimulation();
    if (routeId) {
      const found = this.routes.find(r => r.id === routeId);
      if (found) this.activeRoute = found;
    }

    const waypoints = this.activeRoute.itineraryWaypoints;
    if (!waypoints || waypoints.length < 2) return;

    this.isTourRunning = true;
    this.simulationSpeed = speedMultiplier;
    this.currentWaypointIdx = 0;

    // Đặt vị trí ban đầu tại waypoint đầu tiên
    let [currLat, currLng] = waypoints[0];
    this.currentPosition = { lat: currLat, lng: currLng };
    this.geofence.setSimulatedPosition(currLat, currLng);

    let targetIdx = 1;
    let stepRatio = 0;
    const stepIncrement = 0.02 * this.simulationSpeed; // Tốc độ nội suy

    this.intervalId = setInterval(() => {
      if (!this.isTourRunning) return;

      const p1 = waypoints[targetIdx - 1];
      const p2 = waypoints[targetIdx];

      stepRatio += stepIncrement;

      if (stepRatio >= 1) {
        stepRatio = 0;
        targetIdx++;
        if (targetIdx >= waypoints.length) {
          // Kết thúc lộ trình
          this.stopTourSimulation();
          return;
        }
      }

      // Nội suy tuyến tính vị trí giữa p1 và p2
      const nextP1 = waypoints[targetIdx - 1];
      const nextP2 = waypoints[targetIdx];
      const lat = nextP1[0] + (nextP2[0] - nextP1[0]) * stepRatio;
      const lng = nextP1[1] + (nextP2[1] - nextP1[1]) * stepRatio;

      this.currentPosition = { lat, lng };
      this.geofence.setSimulatedPosition(lat, lng);

      this.options.onSimStateChange({
        isSimulating: true,
        isTourRunning: true,
        currentPosition: this.currentPosition,
        progress: (targetIdx / waypoints.length) * 100
      });
    }, 400);

    this.options.onSimStateChange({
      isSimulating: true,
      isTourRunning: true,
      currentPosition: this.currentPosition
    });
  }

  stopTourSimulation() {
    this.isTourRunning = false;
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
    this.options.onSimStateChange({
      isSimulating: true,
      isTourRunning: false,
      currentPosition: this.currentPosition
    });
  }

  setSpeed(speed) {
    this.simulationSpeed = speed;
    if (this.isTourRunning) {
      this.startTourSimulation(this.activeRoute.id, speed);
    }
  }
}
