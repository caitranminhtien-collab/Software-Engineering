/**
 * Main Application Orchestrator (App.js)
 * Tuyến Di Sản Cung Điện & Lăng Tẩm Cố Đô Huế (GPS Audio Tour PWA)
 */

import { POI_DATA, LANGUAGES } from "./data/pois.js";
import { ROUTES_DATA } from "./data/routes.js";
import { GeofenceEngine } from "./geofence.js";
import { AudioEngine } from "./audioEngine.js";
import { AiChatbot } from "./aiChatbot.js";
import { AuthPaymentService } from "./authPayment.js";
import { GpsSimulator } from "./simulator.js";

class HueTourApp {
  constructor() {
    this.currentLang = "vi";
    this.map = null;
    this.poiMarkers = new Map();
    this.geofenceCircles = new Map();
    this.userMarker = null;
    this.routePolyline = null;
    this.activeRoute = null;

    // Khởi tạo các services
    this.auth = new AuthPaymentService({
      onAccessStatusChange: (isUnlocked, data) => this.handleAccessStatusChange(isUnlocked, data)
    });

    this.audio = new AudioEngine({
      onStateChange: (state) => this.handleAudioStateChange(state),
      onProgress: (cur, dur) => this.handleAudioProgress(cur, dur),
      onPoiChange: (poi, lang) => this.handleAudioPoiChange(poi, lang)
    });

    this.chatbot = new AiChatbot({
      onMessage: (msg) => this.renderChatMessage(msg),
      onTyping: (isTyping) => this.renderChatTyping(isTyping)
    });

    this.geofence = new GeofenceEngine(POI_DATA, {
      debounceDurationMs: 3000,
      cooldownDurationMs: 300000, // 5 phút
      onLocationUpdate: (data) => this.handleLocationUpdate(data),
      onPoiEnter: (poi) => this.handlePoiEnter(poi),
      onPoiExit: (poi) => this.handlePoiExit(poi),
      onCooldownUpdate: (cds) => this.handleCooldownUpdate(cds)
    });

    this.simulator = new GpsSimulator(this.geofence, POI_DATA, ROUTES_DATA, {
      onSimStateChange: (state) => this.handleSimStateChange(state)
    });

    this.init();
  }

  init() {
    this.initMap();
    this.renderPoiMarkers();
    this.renderPoiCards();
    this.renderRouteCards();
    this.renderSimTeleportButtons();
    this.setupEventListeners();
    this.updateUnlockStatusUI();
    this.registerServiceWorker();

    // Mặc định chọn POI_00 (Đại Nội)
    this.audio.playPoi(POI_DATA[0], this.currentLang, false);
    this.audio.pause(); // Để người dùng chủ động bấm nghe

    // Bắt đầu định vị tại Đại Nội
    this.simulator.teleportToPoi("POI_00", true);
  }

  /* ------------------------------------------------------------------------
     1. LEAFLET MAP INITIALIZATION & RENDERING
     ------------------------------------------------------------------------ */
  initMap() {
    const mapEl = document.getElementById("leaflet-map");
    if (!mapEl || typeof L === "undefined") return;

    // Tọa độ trung tâm: Đại Nội Huế [16.4699, 107.5786]
    this.map = L.map("leaflet-map", {
      center: [16.4699, 107.5786],
      zoom: 14,
      zoomControl: false
    });

    // Bản đồ nền CartoDB Dark Matter hoặc OpenStreetMap
    L.tileLayer("https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png", {
      attribution: '&copy; <a href="https://carto.com/">CARTO</a> &copy; OpenStreetMap',
      maxZoom: 19,
      subdomains: "abcd"
    }).addTo(this.map);

    // Marker đại diện vị trí người dùng
    const userIcon = L.divIcon({
      className: "user-location-marker",
      html: '<div class="user-location-pulse"></div><div class="user-location-dot"></div>',
      iconSize: [24, 24],
      iconAnchor: [12, 12]
    });

    this.userMarker = L.marker([16.4699, 107.5786], { icon: userIcon, zIndexOffset: 1000 }).addTo(this.map);
  }

  renderPoiMarkers() {
    if (!this.map || typeof L === "undefined") return;

    POI_DATA.forEach((poi, index) => {
      // 1. Tạo Geofence Circle với màu hoàng gia
      const circle = L.circle(poi.coords, {
        radius: poi.radiusMeters,
        color: poi.isFree ? "#10B981" : "#D4AF37",
        fillColor: poi.isFree ? "#10B981" : "#D4AF37",
        fillOpacity: 0.15,
        weight: 1.5,
        dashArray: "4, 4"
      }).addTo(this.map);

      this.geofenceCircles.set(poi.id, circle);

      // 2. Tạo Marker Pin phong cách Cung Đình
      const isFree = poi.isFree;
      const markerHtml = `
        <div class="custom-poi-marker">
          <div class="poi-marker-pin ${isFree ? 'free-marker' : ''}">
            <div class="poi-marker-content">${index}</div>
          </div>
        </div>
      `;

      const customIcon = L.divIcon({
        className: "",
        html: markerHtml,
        iconSize: [36, 36],
        iconAnchor: [18, 36]
      });

      const marker = L.marker(poi.coords, { icon: customIcon }).addTo(this.map);

      // Popup thông tin nhanh
      const popupContent = `
        <div class="poi-popup-card">
          <img src="${poi.image}" alt="${poi.name}" class="poi-popup-thumb">
          <div class="poi-popup-header">
            <div class="poi-popup-title">${poi.name}</div>
            <div class="poi-popup-hannom">${poi.hanNom}</div>
          </div>
          <div class="poi-popup-meta">
            <span>📏 Bán kính: ${poi.radiusMeters}m</span>
            <span>📍 ${poi.distanceKm} km</span>
          </div>
          <button class="poi-popup-btn" id="popupPlayBtn_${poi.id}">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><polygon points="5 3 19 12 5 21 5 3"/></svg>
            Nghe Thuyết Minh
          </button>
        </div>
      `;

      marker.bindPopup(popupContent);
      marker.on("popupopen", () => {
        const btn = document.getElementById(`popupPlayBtn_${poi.id}`);
        if (btn) {
          btn.addEventListener("click", () => {
            this.handleRequestPlayPoi(poi);
          });
        }
      });

      this.poiMarkers.set(poi.id, marker);
    });
  }

  /* ------------------------------------------------------------------------
     2. POI & ROUTE LIST RENDERING
     ------------------------------------------------------------------------ */
  renderPoiCards() {
    const grid = document.getElementById("poiCardsGrid");
    if (!grid) return;

    grid.innerHTML = POI_DATA.map((poi, idx) => {
      const isUnlocked = this.auth.canAccessPoi(poi);
      return `
        <div class="poi-card" data-poi-id="${poi.id}">
          <div class="poi-card-image-wrap">
            <img src="${poi.image}" alt="${poi.name}" class="poi-card-image">
            <div class="poi-card-badge">${poi.category}</div>
            <div class="poi-card-dist">${poi.distanceKm === 0 ? "Điểm xuất phát" : `${poi.distanceKm} km`}</div>
          </div>
          <div class="poi-card-body">
            <div class="poi-card-title-row">
              <h3 class="poi-card-title">${poi.name}</h3>
              <span class="poi-card-hannom">${poi.hanNom}</span>
            </div>
            <div class="poi-card-meta">
              <span>Triều đại: ${poi.emperor} (${poi.builtYear})</span>
            </div>
            <div style="font-size:12px; color:var(--text-secondary); line-height:1.4;">
              ${poi.highlights.slice(0, 2).join(" • ")}
            </div>
            <div class="poi-card-footer">
              <span style="font-size:11px; color:${isUnlocked ? '#34D399' : '#F87171'};">
                ${isUnlocked ? '✓ Sẵn sàng phát' : '🔒 Cần mở khóa'}
              </span>
              <button class="play-sample-btn" data-play-poi="${poi.id}">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><polygon points="5 3 19 12 5 21 5 3"/></svg>
                Phát Audio
              </button>
            </div>
          </div>
        </div>
      `;
    }).join("");

    // Bắt sự kiện click vào các thẻ POI
    grid.querySelectorAll(".poi-card").forEach(card => {
      card.addEventListener("click", (e) => {
        const poiId = card.dataset.poiId;
        const poi = POI_DATA.find(p => p.id === poiId);
        if (poi) {
          this.focusPoiOnMap(poi);
          if (e.target.closest("[data-play-poi]")) {
            this.handleRequestPlayPoi(poi);
          }
        }
      });
    });
  }

  renderRouteCards() {
    const list = document.getElementById("routesList");
    if (!list) return;

    list.innerHTML = ROUTES_DATA.map(route => `
      <div class="route-card" data-route-id="${route.id}">
        <div class="route-card-header">
          <h3 class="route-title">${route.title}</h3>
          <span class="route-tag">${route.tag}</span>
        </div>
        <div class="route-meta-pills">
          <span class="route-pill">⏱ ${route.duration}</span>
          <span class="route-pill">🚗 ${route.distance}</span>
          <span class="route-pill">🏛 ${route.poiCount} di tích</span>
        </div>
        <div class="route-desc">${route.description}</div>
        <button class="route-select-btn" data-select-route="${route.id}">
          Bật Tuyến Này Lên Bản Đồ
        </button>
      </div>
    `).join("");

    list.querySelectorAll("[data-select-route]").forEach(btn => {
      btn.addEventListener("click", (e) => {
        const routeId = btn.dataset.selectRoute;
        this.selectRoute(routeId);
      });
    });
  }

  selectRoute(routeId) {
    const route = ROUTES_DATA.find(r => r.id === routeId);
    if (!route || !this.map || typeof L === "undefined") return;

    this.activeRoute = route;

    // Xóa polyline cũ nếu có
    if (this.routePolyline) {
      this.map.removeLayer(this.routePolyline);
    }

    // Vẽ polyline màu hoàng gia
    this.routePolyline = L.polyline(route.itineraryWaypoints, {
      color: route.color || "#D4AF37",
      weight: 4.5,
      opacity: 0.85,
      dashArray: "8, 6"
    }).addTo(this.map);

    // Zoom vừa vặn toàn bộ tuyến
    this.map.fitBounds(this.routePolyline.getBounds(), { padding: [50, 50] });

    // Chuyển về tab bản đồ
    this.switchTab("tab-map");
  }

  renderSimTeleportButtons() {
    const grid = document.getElementById("simTeleportGrid");
    if (!grid) return;

    grid.innerHTML = POI_DATA.map(poi => `
      <button class="sim-poi-btn" data-sim-poi="${poi.id}">
        <span>${poi.name}</span>
        <span style="font-size:10px; color:var(--text-muted);">${poi.radiusMeters}m</span>
      </button>
    `).join("");

    grid.querySelectorAll("[data-sim-poi]").forEach(btn => {
      btn.addEventListener("click", () => {
        const poiId = btn.dataset.simPoi;
        this.simulator.teleportToPoi(poiId, true);
        this.switchTab("tab-map");
      });
    });
  }

  /* ------------------------------------------------------------------------
     3. GEOFENCE & AUDIO ENGINE HANDLERS
     ------------------------------------------------------------------------ */
  handleLocationUpdate(data) {
    const { location, isSimulated, nearestPoi, nearestDistance, distances, cooldowns } = data;

    // 1. Cập nhật vị trí marker người dùng trên bản đồ
    if (this.userMarker) {
      this.userMarker.setLatLng([location.lat, location.lng]);
    }

    // 2. Cập nhật HUD Top Bar
    const dot = document.getElementById("gpsStatusDot");
    const label = document.getElementById("gpsStatusLabel");
    const nearestText = document.getElementById("nearestPoiText");

    if (dot) {
      if (isSimulated) {
        dot.className = "gps-dot simulated";
        label.textContent = "GPS Giả lập (Test)";
      } else {
        dot.className = "gps-dot";
        label.textContent = "GPS Trực tiếp (±" + Math.round(location.accuracy) + "m)";
      }
    }

    if (nearestText && nearestPoi) {
      const distStr = nearestDistance < 1000 
        ? `${Math.round(nearestDistance)} m` 
        : `${(nearestDistance / 1000).toFixed(1)} km`;
      nearestText.textContent = `Cách ${nearestPoi.name}: ${distStr}`;
    }

    // 3. Cập nhật HUD Simulator Console
    const coordEl = document.getElementById("simCoordReadout");
    const distEl = document.getElementById("simDistanceReadout");
    if (coordEl) coordEl.textContent = `${location.lat.toFixed(5)}, ${location.lng.toFixed(5)}`;
    if (distEl && nearestPoi) {
      const isInside = nearestDistance <= nearestPoi.radiusMeters;
      distEl.textContent = `${nearestPoi.name} (${nearestPoi.radiusMeters}m) - Cách ${Math.round(nearestDistance)}m ${isInside ? '🎯 TRONG VÙNG' : 'ngoài vùng'}`;
    }
  }

  /**
   * Kích hoạt tự động khi người dùng tiến vào bán kính Geofence của một POI
   */
  handlePoiEnter(poi) {
    console.log("🎯 GEOFENCE ENTER TRIGGERED:", poi.name);

    // Hiển thị Alert Banner trên bản đồ
    const banner = document.getElementById("geofenceAlertBanner");
    const title = document.getElementById("alertPoiTitle");
    const desc = document.getElementById("alertPoiDesc");
    if (banner && title && desc) {
      title.textContent = `Đã đến: ${poi.name} (${poi.hanNom})`;
      desc.textContent = `Vào bán kính ${poi.radiusMeters}m. Tự động phát thuyết minh...`;
      banner.classList.add("active");
    }

    // Đổi màu vòng tròn Geofence sang trạng thái kích hoạt (xung nhịp vàng rực)
    const circle = this.geofenceCircles.get(poi.id);
    if (circle) {
      circle.setStyle({ color: "#F59E0B", fillColor: "#F59E0B", fillOpacity: 0.35, weight: 3 });
    }

    // Kiểm tra quyền truy cập (POI_00 miễn phí, các POI khác cần mở khóa)
    if (this.auth.canAccessPoi(poi)) {
      this.audio.playPoi(poi, this.currentLang, true);
    } else {
      // Nhắc người dùng mở khóa tuyến
      this.openPaymentModal(poi);
    }

    // Cập nhật Simulator Readout
    const simDebounce = document.getElementById("simDebounceReadout");
    if (simDebounce) {
      simDebounce.textContent = `Xác nhận ENTER thành công: ${poi.name}`;
    }
  }

  handlePoiExit(poi) {
    console.log("🚪 GEOFENCE EXIT TRIGGERED:", poi.name);

    // Tắt Alert Banner
    const banner = document.getElementById("geofenceAlertBanner");
    if (banner) banner.classList.remove("active");

    // Khôi phục kiểu dáng vòng tròn geofence
    const circle = this.geofenceCircles.get(poi.id);
    if (circle) {
      circle.setStyle({
        color: poi.isFree ? "#10B981" : "#D4AF37",
        fillColor: poi.isFree ? "#10B981" : "#D4AF37",
        fillOpacity: 0.15,
        weight: 1.5
      });
    }

    // Cập nhật Simulator Readout
    const simDebounce = document.getElementById("simDebounceReadout");
    if (simDebounce) {
      simDebounce.textContent = `Rời khỏi ${poi.name}. Bắt đầu Cooldown 5 phút.`;
    }
  }

  handleCooldownUpdate(cds) {
    const el = document.getElementById("simCooldownReadout");
    if (!el) return;

    const entries = Object.entries(cds);
    if (entries.length === 0) {
      el.textContent = "Không có POI nào đang cooldown";
    } else {
      el.textContent = entries.map(([id, sec]) => `${id}: còn ${sec}s`).join(" • ");
    }
  }

  handleRequestPlayPoi(poi) {
    if (!this.auth.canAccessPoi(poi)) {
      this.openPaymentModal(poi);
      return;
    }
    this.audio.playPoi(poi, this.currentLang, true);
  }

  /* ------------------------------------------------------------------------
     4. AUDIO PLAYER UI SYNCHRONIZATION
     ------------------------------------------------------------------------ */
  handleAudioStateChange(state) {
    const { isPlaying, isPaused, currentPoi } = state;
    const mini = document.getElementById("miniPlayer");
    const miniIcon = document.getElementById("miniPlayIcon");
    const fullIcon = document.getElementById("fullPlayIcon");

    if (mini) {
      if (isPlaying && !isPaused) {
        mini.classList.add("playing");
      } else {
        mini.classList.remove("playing");
      }
    }

    // Cập nhật icon Play / Pause
    const playSvg = '<polygon points="5 3 19 12 5 21 5 3"/>';
    const pauseSvg = '<rect x="6" y="4" width="4" height="16"/><rect x="14" y="4" width="4" height="16"/>';

    const activeIcon = (isPlaying && !isPaused) ? pauseSvg : playSvg;
    if (miniIcon) miniIcon.innerHTML = activeIcon;
    if (fullIcon) fullIcon.innerHTML = activeIcon;

    // Cập nhật status label
    const statusLabel = document.getElementById("miniPlayerStatusLabel");
    if (statusLabel) {
      if (isPlaying && !isPaused) {
        statusLabel.textContent = "Đang phát bài thuyết minh...";
      } else if (isPaused) {
        statusLabel.textContent = "Tạm dừng";
      } else {
        statusLabel.textContent = "Chạm để mở rộng thuyết minh";
      }
    }
  }

  handleAudioProgress(currentSec, totalSec) {
    const pct = totalSec > 0 ? (currentSec / totalSec) * 100 : 0;
    const fill = document.getElementById("progressBarFill");
    if (fill) fill.style.width = `${pct}%`;

    const curLabel = document.getElementById("currentTimeLabel");
    const durLabel = document.getElementById("durationLabel");
    if (curLabel) curLabel.textContent = this.formatTime(currentSec);
    if (durLabel) durLabel.textContent = this.formatTime(totalSec);
  }

  handleAudioPoiChange(poi, lang) {
    // Cập nhật Mini Player
    const thumb = document.getElementById("miniPlayerThumb");
    const title = document.getElementById("miniPlayerTitle");
    if (thumb) thumb.src = poi.image;
    if (title) title.textContent = `${poi.name} (${poi.hanNom})`;

    // Cập nhật Full Player
    const fullImg = document.getElementById("fullPlayerImg");
    const fullTitle = document.getElementById("fullPlayerTitle");
    const fullSubtitle = document.getElementById("fullPlayerSubtitle");
    const transcript = document.getElementById("transcriptText");

    if (fullImg) fullImg.src = poi.image;
    if (fullTitle) fullTitle.textContent = poi.name;
    if (fullSubtitle) fullSubtitle.textContent = `${poi.officialName} • ${poi.builtYear}`;

    const text = poi.narrations[lang] || poi.narrations["vi"];
    if (transcript) transcript.textContent = text;
  }

  formatTime(sec) {
    const m = Math.floor(sec / 60);
    const s = Math.floor(sec % 60);
    return `${m}:${s < 10 ? '0' : ''}${s}`;
  }

  /* ------------------------------------------------------------------------
     5. RAG AI CHATBOT UI
     ------------------------------------------------------------------------ */
  renderChatMessage(msg) {
    const container = document.getElementById("chatMessagesArea");
    if (!container) return;

    const div = document.createElement("div");
    div.className = `chat-bubble ${msg.role}`;
    div.textContent = msg.text;
    container.appendChild(div);
    container.scrollTop = container.scrollHeight;
  }

  renderChatTyping(isTyping) {
    let typingEl = document.getElementById("chatTypingIndicator");
    const container = document.getElementById("chatMessagesArea");
    if (!container) return;

    if (isTyping) {
      if (!typingEl) {
        typingEl = document.createElement("div");
        typingEl.id = "chatTypingIndicator";
        typingEl.className = "chat-bubble assistant";
        typingEl.style.fontStyle = "italic";
        typingEl.style.color = "var(--color-gold-400)";
        typingEl.textContent = "Thị vệ Cố Đô đang tra cứu sử tịch...";
        container.appendChild(typingEl);
        container.scrollTop = container.scrollHeight;
      }
    } else {
      if (typingEl) typingEl.remove();
    }
  }

  /* ------------------------------------------------------------------------
     6. AUTH & PAYMENT LOGIC
     ------------------------------------------------------------------------ */
  handleAccessStatusChange(isUnlocked, data) {
    this.updateUnlockStatusUI();
    this.renderPoiCards(); // Vẽ lại các thẻ POI với trạng thái mở khóa
  }

  updateUnlockStatusUI() {
    const badge = document.getElementById("unlockBadge");
    const badgeText = document.getElementById("unlockBadgeText");
    if (!badge || !badgeText) return;

    if (this.auth.isUnlocked()) {
      badge.className = "unlock-badge unlocked";
      badgeText.textContent = "Đã mở khóa VIP";
    } else {
      badge.className = "unlock-badge";
      badgeText.textContent = "Mở khóa tuyến";
    }
  }

  openPaymentModal(forPoi = null) {
    const modal = document.getElementById("paymentModal");
    if (modal) {
      modal.classList.add("open");
      const msgBox = document.getElementById("claimMsgBox");
      if (msgBox) {
        if (forPoi) {
          msgBox.style.display = "block";
          msgBox.style.background = "rgba(212,175,55,0.15)";
          msgBox.style.color = "var(--color-gold-300)";
          msgBox.textContent = `Cần kích hoạt vé để nghe thuyết minh ${forPoi.name}. Vui lòng nhập Claim code hoặc quét VNPay!`;
        } else {
          msgBox.style.display = "none";
        }
      }
    }
  }

  closePaymentModal() {
    const modal = document.getElementById("paymentModal");
    if (modal) modal.classList.remove("open");
  }

  /* ------------------------------------------------------------------------
     7. UI INTERACTIONS & EVENT LISTENERS
     ------------------------------------------------------------------------ */
  setupEventListeners() {
    // Tab Navigation
    document.querySelectorAll(".nav-item").forEach(btn => {
      btn.addEventListener("click", () => {
        const tabId = btn.dataset.tab;
        this.switchTab(tabId);
      });
    });

    // Language Dropdown
    const langBtn = document.getElementById("langDropdownBtn");
    const langDrop = document.getElementById("langDropdown");
    if (langBtn && langDrop) {
      langBtn.addEventListener("click", (e) => {
        e.stopPropagation();
        langDrop.classList.toggle("show");
      });

      document.addEventListener("click", () => langDrop.classList.remove("show"));

      langDrop.querySelectorAll(".lang-option").forEach(opt => {
        opt.addEventListener("click", () => {
          const lang = opt.dataset.lang;
          this.switchLanguage(lang);
        });
      });
    }

    // Unlock Status Chip Click
    const unlockBadge = document.getElementById("unlockBadge");
    if (unlockBadge) {
      unlockBadge.addEventListener("click", () => this.openPaymentModal());
    }

    // Payment Modal Controls
    const btnClosePay = document.getElementById("btnClosePayModal");
    if (btnClosePay) btnClosePay.addEventListener("click", () => this.closePaymentModal());

    const tabClaim = document.getElementById("tabPayClaim");
    const tabOnline = document.getElementById("tabPayOnline");
    const contentClaim = document.getElementById("payContentClaim");
    const contentOnline = document.getElementById("payContentOnline");

    if (tabClaim && tabOnline) {
      tabClaim.addEventListener("click", () => {
        tabClaim.classList.add("active");
        tabOnline.classList.remove("active");
        contentClaim.style.display = "flex";
        contentOnline.style.display = "none";
      });

      tabOnline.addEventListener("click", () => {
        tabOnline.classList.add("active");
        tabClaim.classList.remove("active");
        contentOnline.style.display = "flex";
        contentClaim.style.display = "none";
      });
    }

    // Submit Claim Code
    const btnClaim = document.getElementById("btnSubmitClaim");
    const claimInput = document.getElementById("claimCodeInput");
    const claimMsg = document.getElementById("claimMsgBox");

    if (btnClaim && claimInput) {
      btnClaim.addEventListener("click", () => {
        const code = claimInput.value;
        const res = this.auth.claimWithCode(code);
        if (claimMsg) {
          claimMsg.style.display = "block";
          claimMsg.style.background = res.success ? "rgba(16,185,129,0.2)" : "rgba(239,68,68,0.2)";
          claimMsg.style.color = res.success ? "#34D399" : "#F87171";
          claimMsg.textContent = res.message;
        }
        if (res.success) {
          setTimeout(() => this.closePaymentModal(), 1200);
        }
      });
    }

    // Quick fill codes for test
    const quickCode = document.getElementById("quickFillCode");
    const quickVip = document.getElementById("quickFillVip");
    if (quickCode && claimInput) quickCode.addEventListener("click", () => claimInput.value = "HUE2026");
    if (quickVip && claimInput) quickVip.addEventListener("click", () => claimInput.value = "VIPPASS");

    // Simulate VNPay Webhook Success
    const btnWebhook = document.getElementById("btnSimulateWebhook");
    if (btnWebhook) {
      btnWebhook.addEventListener("click", () => {
        this.auth.completeOnlinePayment("standard", "VNPay");
        alert("🎉 Webhook VNPay xác nhận thanh toán 99.000 VNĐ thành công! Đã mở khóa trọn bộ tuyến di sản.");
        this.closePaymentModal();
      });
    }

    // Mini Audio Player Click & Controls
    const miniClickable = document.getElementById("miniPlayerClickable");
    const miniPlayBtn = document.getElementById("miniPlayBtn");
    const fullDrawer = document.getElementById("fullAudioDrawer");
    const btnCloseDrawer = document.getElementById("btnCloseDrawer");
    const btnFullPlay = document.getElementById("btnFullPlay");

    if (miniClickable) miniClickable.addEventListener("click", () => fullDrawer.classList.add("open"));
    if (btnCloseDrawer) btnCloseDrawer.addEventListener("click", () => fullDrawer.classList.remove("open"));

    if (miniPlayBtn) {
      miniPlayBtn.addEventListener("click", (e) => {
        e.stopPropagation();
        this.audio.togglePlay();
      });
    }

    if (btnFullPlay) btnFullPlay.addEventListener("click", () => this.audio.togglePlay());

    // Audio Rewind / Forward / Rate
    const btnRewind = document.getElementById("btnRewind10");
    const btnForward = document.getElementById("btnForward10");
    if (btnRewind) btnRewind.addEventListener("click", () => this.audio.rewind(10));
    if (btnForward) btnForward.addEventListener("click", () => this.audio.forward(10));

    document.querySelectorAll(".rate-btn").forEach(btn => {
      btn.addEventListener("click", () => {
        document.querySelectorAll(".rate-btn").forEach(b => b.classList.remove("active"));
        btn.classList.add("active");
        const rate = parseFloat(btn.dataset.rate);
        this.audio.setRate(rate);
      });
    });

    // Map Action Buttons
    const btnRecenter = document.getElementById("btnRecenter");
    const btnFit = document.getElementById("btnFitBounds");
    const btnRoutes = document.getElementById("btnToggleRoutes");

    if (btnRecenter && this.map) {
      btnRecenter.addEventListener("click", () => {
        if (this.geofence.currentLocation) {
          this.map.flyTo([this.geofence.currentLocation.lat, this.geofence.currentLocation.lng], 16);
        }
      });
    }

    if (btnFit && this.map) {
      btnFit.addEventListener("click", () => {
        const bounds = L.latLngBounds(POI_DATA.map(p => p.coords));
        this.map.fitBounds(bounds, { padding: [40, 40] });
      });
    }

    if (btnRoutes) {
      btnRoutes.addEventListener("click", () => {
        if (!this.activeRoute) {
          this.selectRoute("route_full_day");
        } else {
          if (this.routePolyline) {
            this.map.removeLayer(this.routePolyline);
            this.routePolyline = null;
            this.activeRoute = null;
          }
        }
      });
    }

    // Chat Form & Prompt Chips
    const chatForm = document.getElementById("chatForm");
    const chatInput = document.getElementById("chatInput");
    if (chatForm && chatInput) {
      chatForm.addEventListener("submit", (e) => {
        e.preventDefault();
        const text = chatInput.value;
        if (text) {
          this.chatbot.sendMessage(text);
          chatInput.value = "";
        }
      });
    }

    document.querySelectorAll(".prompt-chip").forEach(chip => {
      chip.addEventListener("click", () => {
        const q = chip.dataset.q;
        if (q) this.chatbot.sendMessage(q);
      });
    });

    // Simulator Speed & Controls
    document.querySelectorAll(".sim-speed-btn[data-speed]").forEach(btn => {
      btn.addEventListener("click", () => {
        document.querySelectorAll(".sim-speed-btn[data-speed]").forEach(b => b.classList.remove("active"));
        btn.classList.add("active");
        const speed = parseInt(btn.dataset.speed, 10);
        this.simulator.setSpeed(speed);
      });
    });

    const btnStartTour = document.getElementById("btnStartTourSim");
    const simSelect = document.getElementById("simRouteSelect");
    if (btnStartTour && simSelect) {
      btnStartTour.addEventListener("click", () => {
        if (!this.simulator.isTourRunning) {
          const rId = simSelect.value;
          this.selectRoute(rId);
          this.simulator.startTourSimulation(rId);
          btnStartTour.textContent = "Dừng đi tour";
          btnStartTour.style.background = "#EF4444";
        } else {
          this.simulator.stopTourSimulation();
          btnStartTour.textContent = "Bắt đầu đi";
          btnStartTour.style.background = "linear-gradient(135deg, var(--color-vermilion), var(--color-vermilion-light))";
        }
      });
    }

    const btnResetCd = document.getElementById("btnResetCooldown");
    if (btnResetCd) {
      btnResetCd.addEventListener("click", () => {
        this.geofence.resetCooldown();
        alert("Đã xóa toàn bộ thời gian Cooldown 5 phút. Bạn có thể kích hoạt lại Geofence ngay lập tức!");
      });
    }

    const btnToggleRealGps = document.getElementById("btnToggleRealGps");
    if (btnToggleRealGps) {
      btnToggleRealGps.addEventListener("click", () => {
        const ok = this.geofence.startLiveTracking();
        if (ok) {
          btnToggleRealGps.textContent = "Đang lấy GPS Thật...";
          btnToggleRealGps.classList.add("active");
        } else {
          alert("Thiết bị không hỗ trợ hoặc bạn chưa cấp quyền Geolocation trong trình duyệt!");
        }
      });
    }

    // Offline Pack Modal
    const offlineBtn = document.getElementById("offlinePackBtn");
    const offlineModal = document.getElementById("offlineModal");
    const btnCloseOffline = document.getElementById("btnCloseOfflineModal");
    const btnStartDownload = document.getElementById("btnStartDownloadOffline");

    if (offlineBtn && offlineModal) {
      offlineBtn.addEventListener("click", () => offlineModal.classList.add("open"));
    }
    if (btnCloseOffline && offlineModal) {
      btnCloseOffline.addEventListener("click", () => offlineModal.classList.remove("open"));
    }

    if (btnStartDownload) {
      btnStartDownload.addEventListener("click", () => {
        this.simulateOfflineDownload();
      });
    }
  }

  simulateOfflineDownload() {
    const fill = document.getElementById("offlineProgressFill");
    const label = document.getElementById("offlineProgressLabel");
    const btn = document.getElementById("btnStartDownloadOffline");
    const status = document.getElementById("offlineStatusText");

    btn.disabled = true;
    btn.textContent = "Đang tải dữ liệu...";

    let progress = 0;
    const timer = setInterval(() => {
      progress += 5;
      if (progress > 100) progress = 100;

      const mb = ((progress / 100) * 28.4).toFixed(1);
      if (fill) fill.style.width = `${progress}%`;
      if (label) label.textContent = `${progress}% / ${mb} MB`;

      if (progress >= 100) {
        clearInterval(timer);
        btn.disabled = false;
        btn.textContent = "✓ Đã Tải Hoàn Tất (Sẵn sàng Offline)";
        if (status) status.textContent = "Offline Ready";
        setTimeout(() => {
          const modal = document.getElementById("offlineModal");
          if (modal) modal.classList.remove("open");
        }, 1200);
      }
    }, 100);
  }

  switchTab(tabId) {
    document.querySelectorAll(".view-tab").forEach(tab => tab.classList.remove("active"));
    document.querySelectorAll(".nav-item").forEach(btn => btn.classList.remove("active"));

    const targetTab = document.getElementById(tabId);
    const targetNav = document.querySelector(`.nav-item[data-tab="${tabId}"]`);

    if (targetTab) targetTab.classList.add("active");
    if (targetNav) targetNav.classList.add("active");

    // Nếu chuyển sang tab Bản đồ, invalidate size để Leaflet render chuẩn
    if (tabId === "tab-map" && this.map) {
      setTimeout(() => this.map.invalidateSize(), 150);
    }
  }

  switchLanguage(langCode) {
    const lang = LANGUAGES.find(l => l.code === langCode);
    if (!lang) return;

    this.currentLang = langCode;
    document.getElementById("currentLangFlag").textContent = lang.flag;
    document.getElementById("currentLangCode").textContent = lang.code.toUpperCase();

    // Cập nhật class active trong dropdown
    document.querySelectorAll(".lang-option").forEach(opt => {
      if (opt.dataset.lang === langCode) {
        opt.classList.add("active");
      } else {
        opt.classList.remove("active");
      }
    });

    // Cập nhật Audio & Chatbot
    this.audio.setLanguage(langCode);
    this.chatbot.setLanguage(langCode);

    if (this.audio.currentPoi) {
      this.handleAudioPoiChange(this.audio.currentPoi, langCode);
    }
  }

  focusPoiOnMap(poi) {
    this.switchTab("tab-map");
    if (this.map) {
      this.map.flyTo(poi.coords, 16);
      const marker = this.poiMarkers.get(poi.id);
      if (marker) marker.openPopup();
    }
  }

  handleSimStateChange(state) {
    const { isTourRunning } = state;
    const btn = document.getElementById("btnStartTourSim");
    if (btn && !isTourRunning) {
      btn.textContent = "Bắt đầu đi";
      btn.style.background = "linear-gradient(135deg, var(--color-vermilion), var(--color-vermilion-light))";
    }
  }

  registerServiceWorker() {
    if ("serviceWorker" in navigator) {
      window.addEventListener("load", () => {
        navigator.serviceWorker.register("./sw.js").catch(err => {
          console.warn("SW Registration note:", err);
        });
      });
    }
  }
}

// Khởi chạy ứng dụng khi DOM đã sẵn sàng
window.addEventListener("DOMContentLoaded", () => {
  window.hueApp = new HueTourApp();
});
