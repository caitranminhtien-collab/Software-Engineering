/* Real Hue heritage map. Coordinates originate from GET /api/v1/attractions.
 * Leaflet is loaded only when the User opens the map page; if CDN is unavailable,
 * an OpenStreetMap iframe displays the selected monument instead. */
(() => {
  'use strict';
  let map = null;
  let pins = new Map();
  let gpsPin = null;
  let lastPlaces = [];
  let selectedSlug = 'dai-noi';
  let generation = 0;
  let loading = null;

  function escape(value) {
    return String(value ?? '').replace(/[&<>"']/g, c =>
      ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  }
  function validPoint(p) {
    return p && Number.isFinite(p.latitude) && Number.isFinite(p.longitude)
      && p.latitude >= 16.20 && p.latitude <= 16.70
      && p.longitude >= 107.30 && p.longitude <= 107.90;
  }

  function loadLeaflet() {
    if (window.L && window.L.map) return Promise.resolve();
    if (loading) return loading;
    loading = new Promise((resolve, reject) => {
      if (!document.querySelector('link[data-hue-leaflet]')) {
        const css = document.createElement('link');
        css.rel = 'stylesheet';
        css.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css';
        css.dataset.hueLeaflet = '1';
        document.head.appendChild(css);
      }
      let complete = false;
      const timeout = setTimeout(() => finish(new Error('Không tải được thư viện bản đồ')), 12000);
      function finish(error) {
        if (complete) return;
        complete = true;
        clearTimeout(timeout);
        if (error) reject(error);
        else resolve();
      }
      const script = document.createElement('script');
      script.src = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js';
      script.async = true;
      script.onload = () => window.L?.map ? finish() : finish(new Error('Thư viện bản đồ không hợp lệ'));
      script.onerror = () => finish(new Error('Không có kết nối đến thư viện bản đồ'));
      document.head.appendChild(script);
    }).catch(error => { loading = null; throw error; });
    return loading;
  }

  function markerIcon(index, active) {
    return window.L.divIcon({
      className: 'hue-map-div-icon',
      html: `<span class="hue-map-pin ${active ? 'selected' : ''}">${index+1}</span>`,
      iconSize: [30, 40], iconAnchor: [15, 38], popupAnchor: [0, -28]
    });
  }

  function destroy() {
    generation += 1;
    if (map) { map.remove(); map = null; }
    pins = new Map();
    gpsPin = null;
  }

  function showFallback(container, reason) {
    if (!container || !container.isConnected) return;
    const selected = lastPlaces.find(p => p.id === selectedSlug && validPoint(p)) || lastPlaces.find(validPoint);
    if (!selected) {
      container.innerHTML = '<p class="hue-map-loading">Không có tọa độ được đồng bộ từ PostgreSQL.</p>';
      return;
    }
    const lat = selected.latitude, lon = selected.longitude;
    const bbox = [lon-.018, lat-.012, lon+.018, lat+.012].join(',');
    const src = `https://www.openstreetmap.org/export/embed.html?bbox=${encodeURIComponent(bbox)}&layer=mapnik&marker=${lat}%2C${lon}`;
    container.innerHTML = `<iframe class="hue-map-fallback" title="Vị trí ${escape(selected.name)} trên OpenStreetMap" loading="lazy" referrerpolicy="no-referrer" src="${src}"></iframe><p class="hue-map-warning">${escape(reason)} · Bản đồ dự phòng chỉ ghim di tích đang chọn.</p>`;
  }

  async function mount(places, activeSlug, userLocation) {
    destroy();
    const ticket = generation;
    lastPlaces = places.filter(validPoint);
    selectedSlug = activeSlug;
    const container = document.getElementById('hue-real-map');
    if (!container || lastPlaces.length === 0) return;
    container.innerHTML = '<p class="hue-map-loading">Đang tải bản đồ và các marker…</p>';
    try {
      await loadLeaflet();
      if (ticket !== generation || !container.isConnected) return;
      container.textContent = '';
      map = window.L.map(container, { zoomControl: true, scrollWheelZoom: false });
      window.L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener noreferrer">OpenStreetMap contributors</a>',
        maxZoom: 19
      }).addTo(map);
      const bounds = [];
      lastPlaces.forEach((p,i) => {
        const position = [p.latitude, p.longitude];
        bounds.push(position);
        const marker = window.L.marker(position,{icon:markerIcon(i,p.id===selectedSlug)}).addTo(map);
        marker.bindPopup(`<div class="hue-map-popup"><strong>${escape(p.name)}</strong><small>${escape(p.type)}</small><button type="button" data-detail="${escape(p.id)}">Xem di tích →</button></div>`);
        marker.on('click', () => {
          selectedSlug = p.id;
          // Keep the sidebar, popup and selection synchronized.
          const sidebar = document.querySelectorAll('.map-poi');
          sidebar.forEach(node => node.classList.toggle('active', node.dataset.mapPoi===p.id));
          const title = document.getElementById('hue-map-selected-name');
          const subtype = document.getElementById('hue-map-selected-type');
          const detail = document.querySelector('.hue-map-selected [data-detail]');
          const osm = document.getElementById('hue-open-osm');
          if (title) title.textContent=p.name;
          if (subtype) subtype.textContent=p.type+' · Điểm tham khảo';
          if (detail) detail.dataset.detail=p.id;
          if (osm) osm.href=`https://www.openstreetmap.org/?mlat=${p.latitude}&mlon=${p.longitude}#map=15/${p.latitude}/${p.longitude}`;
          for (const [slug,entry] of pins) entry.marker.setIcon(markerIcon(entry.index,slug===p.id));
          // app.js handles route selection when using the sidebar.
          window.dispatchEvent(new CustomEvent('hue-map-select',{detail:{slug:p.id}}));
        });
        pins.set(p.id,{marker,index:i});
      });
      map.fitBounds(bounds, { padding: [35,35], maxZoom: 12 });
      showLocation(userLocation);
      requestAnimationFrame(() => map?.invalidateSize());
    } catch(error) {
      if (ticket !== generation || !container.isConnected) return;
      showFallback(container, 'Không tải được bản đồ tương tác');
    }
  }

  function focus(slug) {
    selectedSlug = slug;
    const selected = pins.get(slug);
    if (!selected || !map) {
      const container = document.getElementById('hue-real-map');
      if (container && container.querySelector('iframe')) showFallback(container,'Đang dùng bản đồ dự phòng');
      return;
    }
    for (const [key, item] of pins) item.marker.setIcon(markerIcon(item.index,key===slug));
    map.flyTo(selected.marker.getLatLng(), 14, {duration:.6});
    selected.marker.openPopup();
  }

  function showLocation(location) {
    if (!map || !location || !Number.isFinite(location.latitude) || !Number.isFinite(location.longitude)) return;
    if (gpsPin) gpsPin.remove();
    gpsPin = window.L.circleMarker([location.latitude,location.longitude],{
      radius:8, color:'#fff',weight:3,fillColor:'#2274bb',fillOpacity:1
    }).addTo(map).bindPopup('Vị trí hiện tại của bạn (không lưu vào máy chủ)');
  }

  window.HueMap = { mount, focus, destroy, showLocation };
})();
