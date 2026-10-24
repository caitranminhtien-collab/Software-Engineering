/* Real Hue heritage map. Coordinates originate from GET /api/v1/attractions.
 * Leaflet is loaded only when the User opens the map page; if CDN is unavailable,
 * an OpenStreetMap iframe displays the selected monument instead. */
(() => {
  'use strict';
  let map = null;
  let pins = new Map();
  let gpsPin = null;
  let gpsAccuracy = null;
  let historyLayer=null;
  let queuedHistory=[]; // M3.7 Visitor History
  let latestGpsLocation = null; // M3.6 Visitor GPS map — retain updates during asynchronous Leaflet load.
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
    gpsAccuracy = null;
    historyLayer=null;
  }

  function showFallback(container, reason) {
    if (!container || !container.isConnected) return;
    const selected = lastPlaces.find(p => p.id === selectedSlug && validPoint(p)) || lastPlaces.find(validPoint);
    if (!selected) {
      container.innerHTML = '<p class="hue-map-loading">Chưa có địa điểm để hiển thị trên bản đồ.</p>';
      return;
    }
    const lat = selected.latitude, lon = selected.longitude;
    const bbox = [lon-.018, lat-.012, lon+.018, lat+.012].join(',');
    const src = `https://www.openstreetmap.org/export/embed.html?bbox=${encodeURIComponent(bbox)}&layer=mapnik&marker=${lat}%2C${lon}`;
    container.innerHTML = `<iframe class="hue-map-fallback" title="Vị trí ${escape(selected.name)} trên OpenStreetMap" loading="lazy" referrerpolicy="no-referrer" src="${src}"></iframe><p class="hue-map-warning">${escape(reason)}</p>`;
  }

  async function mount(places, activeSlug, userLocation) {
    destroy();
    latestGpsLocation = userLocation || null;
    const ticket = generation;
    lastPlaces = places.filter(validPoint);
    selectedSlug = activeSlug;
    const container = document.getElementById('hue-real-map');
    if (!container || lastPlaces.length === 0) return;
    container.innerHTML = '<p class="hue-map-loading">Đang tải bản đồ…</p>';
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
          const google = document.getElementById('hue-open-google-maps');
          if (title) title.textContent=p.name;
          if (subtype) subtype.textContent=p.type;
          if (detail) detail.dataset.detail=p.id;
          if (osm) osm.href=`https://www.openstreetmap.org/?mlat=${p.latitude}&mlon=${p.longitude}#map=15/${p.latitude}/${p.longitude}`;
          if(google)google.href='https://www.google.com/maps/dir/?api=1&destination='+encodeURIComponent(p.latitude+','+p.longitude)+'&travelmode=walking';
          for (const [slug,entry] of pins) entry.marker.setIcon(markerIcon(entry.index,slug===p.id));
          // app.js handles route selection when using the sidebar.
          window.dispatchEvent(new CustomEvent('hue-map-select',{detail:{slug:p.id}}));
        });
        pins.set(p.id,{marker,index:i});
      });
      map.fitBounds(bounds, { padding: [35,35], maxZoom: 12 });
      showLocation(latestGpsLocation);
      showHistory(queuedHistory);
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
    // The position is kept in memory only. No storage or network calls here.
    const valid=location && Number.isFinite(Number(location.latitude)) && Number.isFinite(Number(location.longitude))
      && Math.abs(Number(location.latitude))<=90 && Math.abs(Number(location.longitude))<=180;
    latestGpsLocation=valid ? {latitude:Number(location.latitude),longitude:Number(location.longitude),
      mode:location.mode==='simulation'?'simulation':'real',accuracy_m:Number(location.accuracy_m)||null} : null;
    if (!map) return;
    const firstFix = !gpsPin;
    if (gpsPin) {map.removeLayer(gpsPin);gpsPin=null;}
    if (gpsAccuracy) {map.removeLayer(gpsAccuracy);gpsAccuracy=null;}
    if (!latestGpsLocation) return;
    const sim=latestGpsLocation.mode==='simulation';
    const leaflet=window.L;
    const markup=`<span class="hue-visitor-marker ${sim?'hue-visitor-marker-demo':'hue-visitor-marker-real'}" aria-hidden="true"><span class="hue-visitor-marker-core"></span><span class="hue-visitor-marker-caption">${sim?'MÔ PHỎNG':'BẠN ĐANG Ở ĐÂY'}</span></span>`;
    const icon=leaflet.divIcon({className:'hue-visitor-map-icon',html:markup,iconSize:[42,42],iconAnchor:[21,21],popupAnchor:[0,-23]});
    gpsPin=leaflet.marker([latestGpsLocation.latitude,latestGpsLocation.longitude],
      {icon,zIndexOffset:4000}).addTo(map);
    gpsPin.bindPopup(sim?'Vị trí mô phỏng (không phải GPS thật).':'Vị trí GPS ước tính từ thiết bị của bạn.');
    const accuracy=latestGpsLocation.accuracy_m;
    if (!sim && Number.isFinite(accuracy) && accuracy>0 && accuracy<=200 && leaflet.circle) {
      gpsAccuracy=leaflet.circle([latestGpsLocation.latitude,latestGpsLocation.longitude],
        {radius:accuracy,color:'#246ca6',weight:1,opacity:.55,fillColor:'#438ac2',fillOpacity:.09,interactive:false}).addTo(map);
    }
    // First valid real fix should be visible even if the map was showing a different monument.
    if (firstFix && !sim && typeof map.panTo==='function')map.panTo([latestGpsLocation.latitude,latestGpsLocation.longitude],{animate:false});
  }


  // M3.7 Visitor History: private waypoints are drawn from browser storage only.
  function showHistory(points){
    queuedHistory=(Array.isArray(points)?points:[]).filter(p=>p&&validPoint({latitude:Number(p.latitude),longitude:Number(p.longitude)}))
      .slice(-200).map(p=>({latitude:Number(p.latitude),longitude:Number(p.longitude)}));
    if(!map || !window.L)return;
    if(historyLayer){map.removeLayer(historyLayer);historyLayer=null;}
    if(!queuedHistory.length)return;
    const L=window.L;
    historyLayer=L.layerGroup();
    const coords=queuedHistory.map(p=>[p.latitude,p.longitude]);
    if(coords.length>=2)historyLayer.addLayer(L.polyline(coords,{color:'#9c613e',weight:4,opacity:.75}));
    if(L.circleMarker){
      historyLayer.addLayer(L.circleMarker(coords[0],{radius:6,color:'#805034',fillColor:'#fff3d9',fillOpacity:1,weight:2}).bindPopup('Bắt đầu lịch sử đã lưu'));
      if(coords.length>1)historyLayer.addLayer(L.circleMarker(coords[coords.length-1],{radius:7,color:'#805034',fillColor:'#dbaa73',fillOpacity:1,weight:2}).bindPopup('Vị trí cuối cùng đã lưu'));
    }
    historyLayer.addTo(map);
  }
  window.HueMap = { mount, focus, destroy, showLocation, showHistory };
})();
