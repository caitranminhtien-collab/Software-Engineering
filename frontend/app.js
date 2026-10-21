const icons={home:'<path d="m3 10 9-7 9 7v10a1 1 0 0 1-1 1h-5v-7H9v7H4a1 1 0 0 1-1-1Z"/>',compass:'<circle cx="12" cy="12" r="9"/><path d="m16 8-3 5-5 3 3-5Z"/>',map:'<path d="m3 5 6-2 6 2 6-2v16l-6 2-6-2-6 2ZM9 3v16m6-14v16"/>',route:'<circle cx="6" cy="5" r="2"/><circle cx="18" cy="19" r="2"/><path d="M8 5h7a4 4 0 0 1 0 8H9a3 3 0 0 0 0 6h7"/>',headphones:'<path d="M4 14v-3a8 8 0 0 1 16 0v3M4 13H2v7h4v-7Zm16 0h2v7h-4v-7Z"/>',chat:'<path d="M21 12a8 8 0 0 1-8 8H5l-3 2 1-6a9 9 0 1 1 18-4Z"/><path d="M7 10h10M7 14h6"/>',heart:'<path d="M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.7l-1.1-1.1a5.5 5.5 0 0 0-7.8 7.8L12 21l8.8-8.6a5.5 5.5 0 0 0 0-7.8Z"/>',settings:'<path d="m9 3-1 3-3 1 1 3-2 2 2 2-1 3 3 1 1 3h6l1-3 3-1-1-3 2-2-2-2 1-3-3-1-1-3Z"/><circle cx="12" cy="12" r="3"/>',arrow:'<path d="M4 12h16m-6-6 6 6-6 6"/>',chevron:'<path d="m9 5 7 7-7 7"/>',search:'<circle cx="10.5" cy="10.5" r="7"/><path d="m16 16 5 5"/>',pin:'<path d="M19 10c0 5-7 12-7 12S5 15 5 10a7 7 0 0 1 14 0Z"/><circle cx="12" cy="10" r="2"/>',play:'<path fill="currentColor" stroke="none" d="m8 4 12 8-12 8Z"/>',pause:'<path d="M8 5v14m8-14v14" stroke-width="4"/>',stop:'<rect x="6" y="6" width="12" height="12" fill="currentColor" stroke="none"/>',close:'<path d="m6 6 12 12M6 18 18 6"/>',check:'<path d="m5 12 4 4L20 5"/>',calendar:'<rect x="3" y="5" width="18" height="16" rx="3"/><path d="M7 3v4m10-4v4M3 11h18"/>',book:'<path d="M12 5C8 2 4 3 2 4v16c3-2 7-2 10 0 3-2 7-2 10 0V4c-3-1-7-2-10 1Zm0 0v15"/>',staff:'<circle cx="9" cy="8" r="4"/><path d="M2 22v-3a7 7 0 0 1 14 0v3m2-16a4 4 0 0 1 0 8m0 3a6 6 0 0 1 4 5"/>',menu:'<path d="M4 6h16M4 12h16M4 18h16"/>',send:'<path d="m22 2-7 20-4-9-9-4Zm0 0L11 13"/>',sun:'<circle cx="12" cy="12" r="4"/><path d="M12 2v2m0 16v2M2 12h2m16 0h2M5 5l1.5 1.5m11 11L19 19M5 19l1.5-1.5m11-11L19 5"/>',download:'<path d="M12 3v12m-5-5 5 5 5-5M4 16v5h16v-5"/>',building:'<path d="m2 9 10-7 10 7H2Zm2 0v11m5-11v11m6-11v11m5-11v11M2 22h20"/>',external:'<path d="M14 3h7v7m0-7-11 11M10 3H3v18h18v-7"/>',trash:'<path d="M3 6h18M9 6V3h6v3M5 6l1 15h12l1-15M10 10v7m4-7v7"/>'};
const icon=n=>`<svg viewBox="0 0 24 24" aria-hidden="true">${icons[n]||icons.compass}</svg>`;
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const norm=s=>String(s).normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[đĐ]/g,'d').toLowerCase();
function read(key,fallback){try{return JSON.parse(localStorage.getItem(key))??fallback}catch{return fallback}}
function write(key,value){try{localStorage.setItem(key,JSON.stringify(value))}catch{toast('Trình duyệt chưa cho phép lưu dữ liệu.')}}
const places=[
{id:'dai-noi',name:'Đại Nội Huế',type:'Cung điện',intro:'Bắt đầu hành trình với không gian kiến trúc cung đình và những câu chuyện về Cố đô.',text:'Chào mừng bạn đến với Đại Nội Huế. Đây là một phần của Quần thể di tích Cố đô Huế. Trong hành trình này, bạn có thể khám phá không gian kiến trúc cung đình, quan sát các công trình và tìm hiểu những câu chuyện lịch sử qua nội dung đã được kiểm duyệt. Hãy chủ động chọn điểm dừng, dành thời gian quan sát và tiếp tục theo cách của riêng mình.',en:'Welcome to Hue Imperial City. Discover the imperial architecture and heritage stories of Hue. Choose an attraction, explore the space at your own pace, and use the narration to accompany your journey.'},
{id:'an-dinh',name:'Cung An Định',type:'Cung điện',intro:'Một điểm dừng trong hành trình khám phá các cung điện của Huế.',text:'Bạn đang khám phá Cung An Định, một địa điểm trong phạm vi thử nghiệm của Hue Guide. Hãy dành thời gian quan sát không gian, đường nét kiến trúc và những chi tiết trang trí. Bản thuyết minh này là nội dung minh họa cho giao diện. Thông tin lịch sử chi tiết cần được đối chiếu với nguồn chính thức trước khi công bố.'},
{id:'duc-duc',name:'Lăng Dục Đức',type:'Lăng tẩm',intro:'Khám phá một điểm đến trong nhóm lăng tẩm thuộc phạm vi dự án.'},
{id:'nam-giao',name:'Đàn Nam Giao',type:'Di tích',intro:'Một điểm dừng bổ sung cho hành trình tìm hiểu không gian di sản Cố đô.'},
{id:'tu-duc',name:'Lăng Tự Đức',type:'Lăng tẩm',intro:'Chậm lại một chút để khám phá không gian di sản và nghe những câu chuyện.'},
{id:'dong-khanh',name:'Lăng Đồng Khánh',type:'Lăng tẩm',intro:'Tiếp nối hành trình khám phá hệ thống lăng tẩm trong phạm vi thử nghiệm.'},
{id:'thieu-tri',name:'Lăng Thiệu Trị',type:'Lăng tẩm',intro:'Một điểm đến dành cho hành trình tìm hiểu các di tích của Huế.'},
{id:'khai-dinh',name:'Lăng Khải Định',type:'Lăng tẩm',intro:'Tìm hiểu di tích qua hình ảnh, nội dung giới thiệu và thuyết minh.'},
{id:'minh-mang',name:'Lăng Minh Mạng',type:'Lăng tẩm',intro:'Lựa chọn một điểm dừng mới trong hành trình di sản của bạn.'},
{id:'gia-long',name:'Lăng Gia Long',type:'Lăng tẩm',intro:'Thêm một điểm dừng trong hành trình khám phá di sản Huế.'}
];
places.forEach(p=>{p.text=p.text||`${p.name} là một địa điểm trong phạm vi thử nghiệm của Hue Guide. Bạn có thể xem thông tin, khám phá điểm đến và nghe bản đọc nội dung. Đây là bản thuyết minh mẫu để trải nghiệm giao diện. Nguồn lịch sử, tọa độ, lối vào và giờ mở cửa cần được xác minh trước khi sử dụng thực tế.`;p.en=p.en||`You are exploring ${p.name}, a destination in the Hue Guide prototype. This is sample narration for testing the interface. Historical content and visitor information require verification before publication.`});
const routes=[{id:'royal',name:'Dấu ấn cung đình',subtitle:'Bắt đầu từ những không gian quen thuộc của Cố đô.',stops:['dai-noi','an-dinh','nam-giao']},{id:'tombs',name:'Hành trình lăng tẩm',subtitle:'Một lựa chọn dành cho người yêu kiến trúc di sản.',stops:['tu-duc','dong-khanh','khai-dinh']},{id:'heritage',name:'Theo dấu di sản',subtitle:'Tự chọn nhịp điệu, nối tiếp những điểm dừng.',stops:['dai-noi','minh-mang','gia-long']}];
const navItems=[['home','home','Tổng quan'],['explore','compass','Khám phá di tích'],['map','map','Bản đồ'],['routes','route','Tuyến tham quan'],['audio','headphones','Thuyết minh'],['chat','chat','Hỏi đáp di sản'],['popular','trend','Tham quan nhiều nhất'],['weather','sun','Thời tiết Huế']];
const state={page:'home',query:'',filter:'Tất cả',recent:read('hue-recent',[]),viewed:read('hue-viewed',read('hue-recent',[])),routeId:'royal',activeRoute:read('hue-active-route',null),mapId:'dai-noi',realMap:false,location:null,trackId:'dai-noi',audioLanguage:read('hue-audio-language','vi-VN'),playing:false,paused:false,progress:0,elapsed:0,utterance:null,chat:[],chatBusy:false,drafts:read('hue-content-drafts',{}),promoIndex:0,promoPaused:false,adminFilter:'Tất cả',adminTab:'dashboard',adminMode:'demo',adminPeriod:7,adminSearch:'',tasks:read('hue-admin-tasks',[])};
const byId=id=>places.find(p=>p.id===id)||places[0];
const $=q=>document.querySelector(q);
const IS_ADMIN=document.body.dataset.area==='admin';
// The ten curated slugs are a presentation whitelist, not a second database.
// Published coordinates and names are loaded from PostgreSQL through the public API.
const attractionApi = { status: 'loading', message: 'Đang tải dữ liệu di tích từ PostgreSQL…', staffStatus: 'loading', staffRows: [] };
const cleanApiText = (value, limit=3000) => String(value ?? '').replace(/[<>&"']/g, '').slice(0,limit);
const validHuePoint = (latitude, longitude) => Number.isFinite(latitude) && Number.isFinite(longitude)
  && latitude >= 16.20 && latitude <= 16.70 && longitude >= 107.30 && longitude <= 107.90;
function apiItems(payload) {
  const items = payload?.data?.items ?? payload?.data;
  if (!Array.isArray(items)) throw new Error('Cấu trúc API không có danh sách di tích');
  return items;
}
function dataNotice() {
  const message = attractionApi.status === 'ready'
    ? `Đã đồng bộ ${places.length} di tích từ PostgreSQL · Tọa độ điểm tham khảo, chưa phải cổng vào hoặc vùng GPS xác minh.`
    : attractionApi.message;
  return `<p class="hue-data-notice" role="status">${esc(message)}</p>`;
}
async function fetchJson(path) {
  const response = await fetch(path, { credentials: 'same-origin', headers: { Accept: 'application/json' }, cache: 'no-store' });
  if (!response.ok) throw new Error(`HTTP ${response.status}`);
  return response.json();
}


const publicRouteApi = {
  status: "loading",
  items: [],
  message: ""
};

async function loadPublishedRoutesFromBackend() {
  try {
    const allRoutes = [];

    for (let page = 1; page <= 100; page++) {
      const payload = await fetchJson(
        `/api/v1/routes?page=${page}&page_size=100`
      );

      if (!Array.isArray(payload.data)) {
        throw new Error("Invalid routes API response");
      }

      allRoutes.push(...payload.data);

      const totalPages = Number(
        payload.pagination?.total_pages ?? 1
      );

      if (
        !Number.isInteger(totalPages) ||
        totalPages < 0 ||
        totalPages > 100
      ) {
        throw new Error("Invalid routes pagination");
      }

      if (page >= totalPages) break;
    }

    publicRouteApi.items = allRoutes;
    publicRouteApi.status = "ready";
    publicRouteApi.message = allRoutes.length
      ? ""
      : "Hiện chưa có tuyến tham quan được xuất bản.";

    console.info(
      "[Routes API] Số tuyến published:",
      allRoutes.length
    );
  } catch (error) {
    publicRouteApi.status = "error";
    publicRouteApi.message =
      "Không thể tải tuyến tham quan từ Backend.";

    console.error("[Routes API]", error);
  }
  finally {
  if (!IS_ADMIN && state.page === "routes") {
    render();
  }
}
}


async function loadAttractionsFromBackend() {
  try {
    const records = [];

    // Lay tat ca trang di tich da xuat ban
    for (let page = 1; page <= 100; page++) {
      const payload = await fetchJson(
        `/api/v1/attractions?language=vi&page=${page}&page_size=100`
      );

      records.push(...apiItems(payload));

      const totalPages = Number(
        payload.pagination?.total_pages ?? 1
      );

      if (!Number.isInteger(totalPages) || totalPages < 1) {
        throw new Error('Phân trang API không hợp lệ');
      }

      if (page >= totalPages) break;
      if (page === 100) {
        throw new Error('Danh sách di tích vượt giới hạn đồng bộ');
      }
    }

    const existing = new Map(places.map(p => [p.id, p]));
    const next = [];
    const seen = new Set();

    for (const item of records) {
      const slug = String(item.slug ?? '').trim();

      if (!slug || seen.has(slug)) continue;

      const dbId = Number(item.id ?? item.attraction_id);
      const latitude = Number(item.latitude);
      const longitude = Number(item.longitude);

      if (!Number.isSafeInteger(dbId) || dbId <= 0) {
        throw new Error(`ID không hợp lệ: ${slug}`);
      }

      if (!validHuePoint(latitude, longitude)) {
        throw new Error(`Tọa độ không hợp lệ: ${slug}`);
      }

      const local = existing.get(slug);
      let detail = null;

      // Di tich moi: doc noi dung tu Backend
      if (!local) {
        try {
          const result = await fetchJson(
            `/api/v1/attractions/${dbId}?language=vi`
          );

          detail = result?.data ?? null;
        } catch (error) {
          console.warn('Không tải được mô tả di tích:', slug, error);
        }
      }

      const name = cleanApiText(
        item.name || detail?.name || local?.name || slug,
        255
      );

      const description = cleanApiText(
        detail?.description || item.description || '',
        3000
      );

      next.push({
        ...local,
        id: slug,
        dbId,
        name,
        type: local?.type || 'Di tích',
        intro: description || local?.intro ||
          'Thông tin di tích đang được cập nhật.',
        text: description || local?.text ||
          'Chưa có nội dung thuyết minh.',
        en: local?.en ||
          'Explore this attraction in Hue with Hue Guide.',
        latitude,
        longitude,
        contentLanguage: cleanApiText(
          item.content_language ?? 'vi',
          10
        )
      });

      seen.add(slug);
    }

    if (!next.length) {
      throw new Error('API chưa trả về di tích đã xuất bản');
    }

    // Giu thu tu 10 di tich cu, them di tich moi phia sau
    const rank = new Map(
      [...existing.keys()].map((slug, i) => [slug, i])
    );

    next.sort((a, b) =>
      (rank.get(a.id) ?? 999999) -
      (rank.get(b.id) ?? 999999)
    );

    places.splice(0, places.length, ...next);

    attractionApi.status = 'ready';
    attractionApi.message = '';

    if (!places.some(p => p.id === state.mapId)) {
      state.mapId = places[0].id;
    }

    if (state.page !== 'chat' && !state.playing) {
      render();
    }
  } catch (error) {
    attractionApi.status = 'error';
    attractionApi.message =
      `Chưa đồng bộ được PostgreSQL (${cleanApiText(error.message, 180)}). ` +
      'Đang hiển thị dữ liệu giao diện mẫu; vị trí GPS không khả dụng.';

    if (state.page !== 'chat' && !state.playing) {
      render();
    }
  }
}

async function loadStaffAttractions() {
  if (!IS_ADMIN) return;
  attractionApi.staffStatus='loading';
  try {
    const rows=apiItems(await fetchJson('/api/v1/staff/attractions'));
    attractionApi.staffRows=rows.map(row => ({...row,
      slug: cleanApiText(row.slug,255),
      status: cleanApiText(row.status,30)
    }));
    attractionApi.staffStatus='ready';
  } catch(error) {
    attractionApi.staffStatus='error';
    attractionApi.message=`Chưa tải được danh sách quản trị (${cleanApiText(error.message,160)}).`;
  }
  if (state.page==='admin') render();
}

const content=$('#content');let timer=null;let lastFocused=null;let audioStarted=0;let toastTimer;
function toast(message){$('#toast').textContent=message;$('#toast').classList.add('show');clearTimeout(toastTimer);toastTimer=setTimeout(()=>$('#toast').classList.remove('show'),3300)}
function navigate(page){closeModal();if(IS_ADMIN){return}if(!IS_ADMIN&&page==='admin'){return}if(location.hash==='#'+page){render()}else location.hash=page;$('.sidebar').classList.remove('open')}
function header(title,sub,kicker,action=''){return `<div class="page-heading"><div><p class="eyebrow">${kicker||'HUE GUIDE · KHÁM PHÁ CỐ ĐÔ'}</p><h1>${title}</h1><p>${sub}</p></div>${action}</div>`}
function wave(){return `<div class="waveform" aria-hidden="true">${Array.from({length:24},(_,i)=>`<i style="--h:${[8,17,11,24,14,26,18,9][i%8]}px;--d:${i*.07}s"></i>`).join('')}</div>`}
function thumb(p,i=0){return p.id==='dai-noi'?`<img src="assets/heritage.png" alt="Tranh minh họa kiến trúc Huế" style="--pos:80% 65%">`:`<div class="abstract-thumb" style="--shift:${(i%4)*15}%">${icon(p.type==='Lăng tẩm'?'building':'compass')}<span>${String(places.indexOf(p)+1).padStart(2,'0')}</span></div>`}
function card(p,i){return `<article class="attraction-card"><div class="attraction-image">${thumb(p,i)}</div><div class="attraction-copy"><small>${p.type.toUpperCase()} · HUẾ</small><h2>${p.name}</h2><p>${esc(p.intro)}</p><div class="card-actions"><button class="button small" data-detail="${p.id}">Khám phá ${icon('arrow')}</button><button class="text-button" data-audio="${p.id}">${icon('headphones')} Nghe</button></div></div></article>`}
const weather={status:'idle',data:null,error:'',updated:0,day:0};
const weatherURL='https://api.open-meteo.com/v1/forecast?latitude=16.4637&longitude=107.5909&current=temperature_2m,relative_humidity_2m,apparent_temperature,is_day,weather_code,wind_speed_10m&daily=weather_code,temperature_2m_max,temperature_2m_min,precipitation_probability_max&timezone=Asia%2FHo_Chi_Minh&forecast_days=7';
function weatherCode(code){if(!Number.isInteger(code))return ['cloud','Chưa rõ trạng thái'];if(code===0)return ['sun','Trời quang'];if(code<=3)return ['cloud',code===1?'Ít mây':'Nhiều mây'];if([45,48].includes(code))return ['cloud','Sương mù'];if(code>=95)return ['storm','Có dông'];if([71,73,75,77,85,86].includes(code))return ['cloud','Có tuyết'];if(code>=51)return ['rain','Có mưa'];return ['cloud','Chưa rõ trạng thái']}
icons.cloud='<path d="M7 19a5 5 0 1 1 1-10 7 7 0 0 1 13 3 4 4 0 0 1-1 7Z"/>';
icons.rain='<path d="M6 15a4 4 0 1 1 1-8 6 6 0 0 1 12 2 3 3 0 0 1 1 6M8 18l-1 3m6-3-1 3m6-3-1 3"/>';
icons.storm='<path d="M6 15a4 4 0 1 1 1-8 6 6 0 0 1 12 2 3 3 0 0 1 1 6m-7-3-4 6h5l-3 5"/>';
const weatherNumber=(v,unit='')=>typeof v==='number'&&Number.isFinite(v)?Math.round(v)+unit:'—';
function validWeather(d){return !!(d&&d.current&&Number.isFinite(d.current.temperature_2m)&&Number.isInteger(d.current.weather_code)&&d.daily&&Array.isArray(d.daily.time)&&d.daily.time.length>=7&&['weather_code','temperature_2m_max','temperature_2m_min','precipitation_probability_max'].every(k=>Array.isArray(d.daily[k])&&d.daily[k].length===d.daily.time.length))}
async function loadWeather(force=false){if(weather.status==='loading'||(!force&&weather.status!=='idle'))return;weather.status='loading';weather.error='';paintWeather();let timeout;try{if(typeof fetch!=='function')throw Error('offline');const controller=new AbortController();timeout=setTimeout(()=>controller.abort(),15000);const response=await fetch(weatherURL,{signal:controller.signal});if(!response.ok)throw Error('http');const data=await response.json();if(!validWeather(data))throw Error('data');weather.data=data;weather.updated=Date.now();weather.status='ready';weather.day=0}catch{weather.status='error';weather.error='Chưa kết nối được dữ liệu thời tiết. Vui lòng kiểm tra mạng và thử lại.'}finally{clearTimeout(timeout);paintWeather()}}
function paintWeather(){if(!['home','weather'].includes(state.page))return;const target=$('#weather-widget');if(target)target.innerHTML=weatherWidget();const compact=$('#weather-compact');if(compact)compact.innerHTML=weatherCompact()}
function weatherCompact(){if(!weather.data)return `<div class="weather-orb">${icon('sun')}</div><strong class="weather-temp">—°</strong><p>${weather.status==='loading'?'Đang tải thời tiết…':'Thời tiết Huế'}</p><button class="text-button" data-page="weather">Xem dự báo ${icon('arrow')}</button>`;const c=weather.data.current,[ic,label]=weatherCode(c.weather_code);return `<div class="section-line"><span>${icon('pin')} Huế, Việt Nam</span>${icon(ic)}</div><strong class="weather-temp">${weatherNumber(c.temperature_2m)}<sup>°C</sup></strong><p>${label} · Cảm giác ${weatherNumber(c.apparent_temperature,'°')}</p><button class="text-button" data-page="weather">Xem dự báo 7 ngày ${icon('arrow')}</button>`}
function weatherWidget(){const loading=weather.status==='loading';const top=`<div class="card-top"><div><p class="eyebrow">HUẾ · GMT+7</p><h2>Dự báo thời tiết</h2></div><button class="button outline small" id="refresh-weather" ${loading?'disabled':''}>${loading?'Đang tải…':'Cập nhật'}</button></div>`;if(!weather.data)return top+`<div class="weather-empty" role="status">${icon(loading?'cloud':'sun')}<h3>${loading?'Đang lấy dự báo cho Huế…':'Chưa có dữ liệu thời tiết'}</h3><p>${weather.error||'Nhiệt độ, khả năng mưa và dự báo 7 ngày sẽ xuất hiện tại đây.'}</p>${loading?'':'<button class="button small" id="retry-weather">Thử kết nối lại</button>'}</div><p class="weather-source">Nguồn: <a href="https://open-meteo.com/" target="_blank" rel="noopener noreferrer">Open-Meteo</a></p>`;const d=weather.data.daily,c=weather.data.current,i=weather.day,[ic,label]=weatherCode(d.weather_code[i]),rain=d.precipitation_probability_max[i];const advice=typeof rain!=='number'?'Kiểm tra dự báo trước khi khởi hành.':rain>=60?'Nên mang ô hoặc áo mưa; linh hoạt lịch tham quan ngoài trời.':rain>=30?'Mang theo ô nhỏ và kiểm tra lại thời tiết trước khi đi.':'Có thể ưu tiên các điểm ngoài trời; mang nước uống khi di chuyển.';return top+`${weather.error?`<p class="weather-warning" role="status">${weather.error} Đang hiển thị dữ liệu lần tải trước.</p>`:''}<div class="forecast-days" aria-label="Chọn ngày xem dự báo">${d.time.slice(0,7).map((date,j)=>`<button class="forecast-day ${i===j?'selected':''}" data-weather-day="${j}" aria-pressed="${i===j}"><span>${j===0?'Hôm nay':new Intl.DateTimeFormat('vi-VN',{weekday:'short'}).format(new Date(date+'T12:00:00+07:00'))}</span><small>${date.slice(8)}/${date.slice(5,7)}</small>${icon(weatherCode(d.weather_code[j])[0])}<strong>${weatherNumber(d.temperature_2m_max[j],'°')}</strong><small>${weatherNumber(d.temperature_2m_min[j],'°')}</small><span class="rain-chance">${weatherNumber(d.precipitation_probability_max[j],'%')}</span></button>`).join('')}</div><div class="forecast-detail"><div>${icon(ic)}<div><strong>${label}</strong><span>${weatherNumber(d.temperature_2m_min[i],'°')} – ${weatherNumber(d.temperature_2m_max[i],'°')} · Mưa ${weatherNumber(rain,'%')}</span></div></div><p>${advice}</p></div><div class="weather-metrics"><span>Độ ẩm hiện tại <b>${weatherNumber(c.relative_humidity_2m,'%')}</b></span><span>Gió hiện tại <b>${weatherNumber(c.wind_speed_10m,' km/h')}</b></span><span>Cảm giác <b>${weatherNumber(c.apparent_temperature,'°C')}</b></span></div><p class="weather-source">Nguồn: <a href="https://open-meteo.com/" target="_blank" rel="noopener noreferrer">Open-Meteo</a> · Tải lúc ${new Intl.DateTimeFormat('vi-VN',{hour:'2-digit',minute:'2-digit',day:'2-digit',month:'2-digit',timeZone:'Asia/Ho_Chi_Minh'}).format(weather.updated)} (giờ Huế). Dự báo có thể thay đổi.</p>`}
function renderWeather(){return `${header('Thời tiết cho hành trình.','Chọn một ngày để xem dự báo và chuẩn bị trước khi khám phá Huế.','DỰ BÁO · HUẾ, VIỆT NAM')}<div class="weather-page"><article class="glass weather-now" id="weather-compact">${weatherCompact()}</article><article class="glass weather-panel" id="weather-widget" aria-live="polite">${weatherWidget()}</article></div>`}
let cloudExitTimer=null,cloudRun=0;
function playCloudTransition(title){const overlay=$('#cloud-transition');if(!overlay||openingActive||window.matchMedia?.('(prefers-reduced-motion: reduce)').matches)return;clearTimeout(cloudExitTimer);const run=++cloudRun;$('#cloud-destination').textContent=title;overlay.classList.remove('cloud-running');overlay.hidden=false;void overlay.offsetWidth;overlay.classList.add('cloud-running');cloudExitTimer=setTimeout(()=>{if(run!==cloudRun)return;overlay.hidden=true;overlay.classList.remove('cloud-running')},1000)}
let openingActive=false,openingClosing=false,openingTimer=null,openingFallback=null,openingExitTimer=null;
function finishOpening(){if(!openingActive||openingClosing)return;openingClosing=true;clearTimeout(openingTimer);clearTimeout(openingFallback);const overlay=$('#opening-screen');overlay?.classList.add('leaving');const complete=()=>{if(overlay)overlay.hidden=true;document.body.classList.remove('opening-visible');const shell=$('.app-shell');if(shell)shell.inert=false;openingActive=false;openingClosing=false;const target=$('#content');target?.focus({preventScroll:true});syncPromoTimer()};openingExitTimer=setTimeout(complete,650)}
function initOpening(){const route=location.hash.replace('#','');if(route&&route!=='home')return;if(window.matchMedia?.('(prefers-reduced-motion: reduce)').matches)return;try{if(sessionStorage.getItem('hue-opening-seen-v1'))return;sessionStorage.setItem('hue-opening-seen-v1','1')}catch{}const overlay=$('#opening-screen'),img=$('#opening-image'),button=$('#skip-opening');if(!overlay||!img||!button)return;openingActive=true;overlay.hidden=false;document.body.classList.add('opening-visible');const shell=$('.app-shell');if(shell)shell.inert=true;button.addEventListener('click',finishOpening);button.focus({preventScroll:true});overlay.addEventListener('keydown',e=>{if(e.key==='Escape'){e.preventDefault();finishOpening()}if(e.key==='Tab'){e.preventDefault();button.focus()}});let started=false;const start=()=>{if(started||openingClosing||!openingActive)return;started=true;overlay.classList.add('ready');openingTimer=setTimeout(finishOpening,3200)};img.addEventListener('load',start,{once:true});img.addEventListener('error',finishOpening,{once:true});if(img.complete){if(img.naturalWidth>0)start();else finishOpening()}openingFallback=setTimeout(finishOpening,6500)}
const promoSlides=[
{tag:'KHÁM PHÁ CỐ ĐÔ',title:'Chạm vào di sản.<br>Cảm nhận Huế.',text:'Bắt đầu hành trình tại những không gian cung đình.',button:'Khám phá di tích',page:'explore',position:'78% 60%',theme:'heritage'},
{tag:'HUẾ QUA TỪNG CÂU CHUYỆN',title:'Lắng nghe Huế.<br>Theo cách của bạn.',text:'Trải nghiệm bản thuyết minh mẫu bằng tiếng Việt và tiếng Anh.',button:'Nghe thuyết minh',page:'audio',position:'42% 65%',theme:'stories'},
{tag:'HÀNH TRÌNH DI SẢN',title:'Một tuyến đường.<br>Nhiều dấu ấn.',text:'Kết nối những điểm dừng trong hành trình khám phá Cố đô.',button:'Chọn tuyến tham quan',page:'routes',position:'95% 70%',theme:'journey'}];
let promoTimer=null;
function renderPromo(){return `<article class="glass promo-carousel" id="promo-carousel" role="region" aria-roledescription="trình chiếu" aria-label="Quảng bá khám phá Huế"><span class="promo-badge">GÓC QUẢNG BÁ</span><button class="promo-pause" id="promo-pause" aria-label="${state.promoPaused?'Tiếp tục tự chuyển slide':'Tạm dừng tự chuyển slide'}" aria-pressed="${state.promoPaused}">${icon(state.promoPaused?'play':'pause')}</button><div class="promo-slides">${promoSlides.map((slide,i)=>`<section class="promo-slide ${slide.theme}" id="promo-slide-${i}" role="group" aria-roledescription="slide" aria-label="${i+1} / ${promoSlides.length}" ${i===state.promoIndex?'':'hidden'}><img src="assets/heritage.png" alt="" style="object-position:${slide.position}" ${i?'loading="lazy"':''}><div class="promo-copy"><span class="eyebrow">${slide.tag}</span><h2>${slide.title}</h2><p>${slide.text}</p><button class="button light small" data-page="${slide.page}">${slide.button} ${icon('arrow')}</button></div></section>`).join('')}</div><div class="promo-controls"><button class="promo-arrow" data-promo-step="-1" aria-label="Slide trước">${icon('chevron')}</button><div class="promo-dots" aria-label="Chọn slide">${promoSlides.map((slide,i)=>`<button id="promo-dot-${i}" data-promo-dot="${i}" aria-label="Xem slide ${i+1}" aria-pressed="${i===state.promoIndex}"></button>`).join('')}</div><span id="promo-counter">${String(state.promoIndex+1).padStart(2,'0')} / 03</span><button class="promo-arrow" data-promo-step="1" aria-label="Slide tiếp theo">${icon('chevron')}</button></div><span class="promo-art-note">Hình minh họa</span></article>`}
function setPromo(index){state.promoIndex=(index+promoSlides.length)%promoSlides.length;if(state.page!=='home')return;promoSlides.forEach((_,i)=>{const slide=$('#promo-slide-'+i),dot=$('#promo-dot-'+i);if(slide)slide.hidden=i!==state.promoIndex;if(dot)dot.setAttribute('aria-pressed',String(i===state.promoIndex))});const counter=$('#promo-counter');if(counter)counter.textContent=String(state.promoIndex+1).padStart(2,'0')+' / 03'}
function syncPromoTimer(){clearInterval(promoTimer);promoTimer=null;if(openingActive||state.page!=='home'||state.promoPaused||window.matchMedia?.('(prefers-reduced-motion: reduce)').matches)return;promoTimer=setInterval(()=>{const area=$('#promo-carousel');if(state.page!=='home'||document.hidden||!area||(area.contains(document.activeElement)&&document.activeElement?.matches?.(':focus-visible')))return;setPromo(state.promoIndex+1)},4000)}
function togglePromo(){state.promoPaused=!state.promoPaused;const b=$('#promo-pause');if(b){b.innerHTML=icon(state.promoPaused?'play':'pause');b.setAttribute('aria-pressed',String(state.promoPaused));b.setAttribute('aria-label',state.promoPaused?'Tiếp tục tự chuyển slide':'Tạm dừng tự chuyển slide')}syncPromoTimer()}
function renderHome(){const date=new Intl.DateTimeFormat('vi-VN',{day:'2-digit',month:'2-digit',year:'numeric',timeZone:'Asia/Ho_Chi_Minh'}).format(new Date());const active=state.activeRoute&&routes.find(r=>r.id===state.activeRoute.id);return `${header('Tổng quan','Một góc nhìn, trọn hành trình khám phá Huế.','HUE GUIDE · KHÔNG GIAN CỦA BẠN',`<div class="date-pill">${icon('calendar')} ${date}</div>`)}<div class="dashboard-grid">${renderPromo()}<article class="glass dash-categories"><div class="card-top"><h2>Khám phá theo loại di tích</h2>${icon('compass')}</div><p class="category-intro">Bạn muốn khám phá điều gì?</p><div class="category-choices">${[['Cung điện','building','Kiến trúc cung đình'],['Lăng tẩm','building','Dấu ấn các triều vua'],['Di tích','pin','Không gian văn hóa']].map(([type,ic,desc])=>`<button class="category-choice" data-explore-type="${type}"><span class="category-icon">${icon(ic)}</span><span><strong>${type}</strong><small>${desc}</small></span><span class="category-count">${places.filter(p=>p.type===type).length}</span>${icon('chevron')}</button>`).join('')}</div><button class="text-button" data-page="explore">Xem tất cả ${places.length} điểm đến ${icon('arrow')}</button></article><article class="glass dash-popular"><div class="card-top"><h2>Được tham quan nhiều nhất</h2>${icon('trend')}</div><p class="sample-label">XẾP HẠNG MINH HỌA</p><div class="popular-preview">${popularPlaces().slice(0,3).map((p,i)=>`<button class="popular-preview-row" data-detail="${p.id}"><span>0${i+1}</span><strong>${p.name}</strong>${icon('chevron')}</button>`).join('')}</div><button class="text-button" data-page="popular">Xem bảng xếp hạng ${icon('arrow')}</button></article><article class="glass weather-now" id="weather-compact">${weatherCompact()}</article><article class="glass weather-panel" id="weather-widget" aria-live="polite">${weatherWidget()}</article><article class="glass dash-route"><div class="card-top"><h2>Hành trình hôm nay</h2>${icon('route')}</div><h3>${active?active.name:'Bạn muốn đi đâu?'}</h3><p>${active?'Tuyến đang theo · bạn tự chuyển điểm dừng':'Chọn một tuyến mẫu để bắt đầu khám phá.'}</p><ol class="dash-stops">${(active||routes[0]).stops.map((id,i)=>`<li><span>${i+1}</span><button class="text-button" data-detail="${id}">${byId(id).name}</button>${active&&i===state.activeRoute.step?'<small>Hiện tại</small>':''}</li>`).join('')}</ol><button class="button small" data-page="routes">${active?'Tiếp tục hành trình':'Chọn tuyến tham quan'} ${icon('arrow')}</button></article><article class="glass dash-listen"><div><span class="eyebrow">GÓC LẮNG NGHE</span><h2>${byId(state.trackId).name}</h2><p>Nghe bản thuyết minh mẫu theo nhịp của bạn.</p></div><button class="icon-button dark" data-play aria-label="Phát hoặc tạm dừng thuyết minh">${icon(state.playing&&!state.paused?'pause':'play')}</button></article><article class="glass dash-shortcuts"><h2>Mọi thứ cho chuyến đi</h2><div><button class="outline-row" data-page="map">${icon('map')}<span>Bản đồ di sản</span>${icon('arrow')}</button><button class="outline-row" data-page="chat">${icon('chat')}<span>Hỏi đáp di sản</span>${icon('arrow')}</button></div></article></div>`}

const popularSamples=[['dai-noi',12840],['khai-dinh',10360],['tu-duc',9180],['minh-mang',8640],['an-dinh',7250],['gia-long',4860],['dong-khanh',3940],['nam-giao',3260],['thieu-tri',2480],['duc-duc',1950]];
icons.trend='<path d="m3 17 6-6 4 4 8-10M15 5h6v6"/>';
function popularPlaces(){return popularSamples.map(([id,visits],i)=>({...byId(id),visits,rank:i+1})).filter(p=>(state.filter==='Tất cả'||p.type===state.filter)&&norm(p.name+' '+p.intro).includes(norm(state.query)))}
function popularCard(p,i){return `<article class="attraction-card popular-card"><div class="attraction-image">${thumb(p,i)}<span class="popular-rank ${p.rank<=3?'top-rank':''}">#${String(p.rank).padStart(2,'0')}</span></div><div class="attraction-copy"><small>${p.type.toUpperCase()} · HUẾ</small><h2>${p.name}</h2><div class="popular-visits">${icon('staff')}<strong>${p.visits.toLocaleString('vi-VN')}</strong><span>lượt tham quan mẫu</span></div><div class="popularity-meter" aria-hidden="true"><i style="width:${p.visits/popularSamples[0][1]*100}%"></i></div><p>${esc(p.intro)}</p><div class="card-actions"><button class="button small" data-detail="${p.id}">Khám phá ${icon('arrow')}</button><button class="text-button" data-audio="${p.id}">${icon('headphones')} Nghe</button></div></div></article>`}
function popularResults(){const list=popularPlaces();return list.length?`<div class="attraction-grid">${list.map(popularCard).join('')}</div>`:'<div class="empty"><h2>Chưa tìm thấy di tích phù hợp</h2><p>Thử từ khóa khác hoặc chọn tất cả loại di tích.</p></div>'}
function renderPopular(){return `${header('Được tham quan nhiều nhất.','Khám phá những điểm đến nổi bật qua bảng xếp hạng tham quan.','HUE GUIDE · ĐIỂM ĐẾN NỔI BẬT',`<span class="subtle-pill">${icon('trend')} Xếp theo lượt tham quan</span>`)}<div class="popular-notice"><span class="sample-label">DỮ LIỆU MINH HỌA</span><p>Thứ hạng và số lượt bên dưới là số liệu mẫu phục vụ trình diễn giao diện. Chưa có dữ liệu lượt tham quan thực tế hoặc thống kê toàn hệ thống.</p></div><div class="filters">${['Tất cả','Cung điện','Lăng tẩm','Di tích'].map(v=>`<button class="filter ${state.filter===v?'active':''}" data-filter="${v}">${v}</button>`).join('')}<input class="local-search" id="local-search" value="${esc(state.query)}" placeholder="Tìm tên di tích…" aria-label="Lọc điểm tham quan"></div><div class="popular-list-header"><span id="popular-count">${popularPlaces().length} điểm đến</span><span>Lượt tham quan giảm dần · Số liệu mẫu</span></div><div id="attraction-results">${popularResults()}</div>`}
function filteredPlaces(){return places.filter(p=>(state.filter==='Tất cả'||p.type===state.filter)&&norm(p.name+' '+p.intro).includes(norm(state.query)))}

function renderExplore(){const list=filteredPlaces();return `${header('Khám phá di tích.','Mỗi điểm đến là một cánh cửa đến với di sản.')}${dataNotice()}<div class="filters">${['Tất cả','Cung điện','Lăng tẩm','Di tích'].map(v=>`<button class="filter ${state.filter===v?'active':''}" data-filter="${v}">${v}</button>`).join('')}<input class="local-search" id="local-search" value="${esc(state.query)}" placeholder="Tìm tên di tích…" aria-label="Lọc di tích"></div><div id="attraction-results">${list.length?`<div class="attraction-grid">${list.map(card).join('')}</div>`:'<div class="empty"><h2>Chưa tìm thấy di tích phù hợp</h2><p>Thử một từ khóa khác hoặc bỏ bộ lọc.</p></div>'}</div>`}

function renderMap(){
  const current=byId(state.mapId);
  const rows=places.map((p,i)=>`<button class="map-poi ${p.id===state.mapId?'active':''}" data-map-poi="${p.id}"><span class="pin-number">${String(i+1).padStart(2,'0')}</span><span><strong>${esc(p.name)}</strong><small>${esc(p.type)}</small></span></button>`).join('');
  const valid=attractionApi.status==='ready';
  const selected=validHuePoint(current.latitude,current.longitude)?current:null;
  const osmHref=selected?`https://www.openstreetmap.org/?mlat=${selected.latitude}&mlon=${selected.longitude}#map=15/${selected.latitude}/${selected.longitude}`:'https://www.openstreetmap.org/#map=11/16.45/107.57';
  return `${header('Một bản đồ, nhiều lựa chọn.','Chọn di tích từ danh sách để xem vị trí thực tế trên OpenStreetMap.','KHÁM PHÁ KHÔNG GIAN DI SẢN',`<button class="button" id="enable-gps">${icon('pin')} ${state.location?'Đã bật định vị':'Bật định vị'}</button>`)}
  ${dataNotice()}
  <div class="map-layout"><aside class="glass map-sidebar"><div class="card-top"><h2>Điểm đến</h2><span class="subtle-pill">${valid?places.length+' di tích':'Dữ liệu mẫu'}</span></div>${rows}</aside>
  <div class="hue-map-column"><div id="hue-real-map" class="hue-real-map" role="region" aria-label="Bản đồ tương tác 10 di tích Huế"><div class="hue-map-loading">${valid?'Đang tải bản đồ OpenStreetMap…':'Cần kết nối backend để hiển thị tọa độ thật.'}</div></div>
  <div class="hue-map-selected glass"><div><h2 id="hue-map-selected-name">${esc(current.name)}</h2><p id="hue-map-selected-type">${esc(current.type)} · Điểm tham khảo</p></div><button class="button small" data-detail="${current.id}">Chi tiết ${icon('arrow')}</button></div>
  <div class="map-switch-row"><a class="text-button" id="hue-open-osm" href="${osmHref}" target="_blank" rel="noopener noreferrer">${icon('map')} Mở vị trí trên OpenStreetMap</a><span class="gps-info">${state.location?'Có vị trí hiện tại · Không lưu lịch sử GPS':'Tọa độ chỉ mang tính tham khảo, không dùng làm chỉ dẫn cổng vào.'}</span></div>
  </div></div>`;
}

function renderRoutes() {
  const heading = header(
    "Chọn một hành trình.",
    "Khám phá những tuyến tham quan đã được xuất bản tại Huế."
  );

  if (publicRouteApi.status === "loading") {
    return `${heading}
      <article class="glass route-detail">
        <h2>Đang tải tuyến tham quan...</h2>
        <p>Hệ thống đang kết nối Backend.</p>
      </article>`;
  }

  if (publicRouteApi.status === "error") {
    return `${heading}
      <article class="glass route-detail">
        <h2>Không thể tải tuyến tham quan</h2>
        <p>${esc(publicRouteApi.message)}</p>
      </article>`;
  }

  if (publicRouteApi.items.length === 0) {
    return `${heading}
      <article class="glass route-detail">
        <p class="eyebrow">TUYẾN THAM QUAN</p>
        <h2>Chưa có tuyến được xuất bản</h2>
        <p>
          Các tuyến tham quan hiện đang được biên tập
          và xác minh trước khi công khai.
        </p>
        <div class="notice">
          Hệ thống chỉ hiển thị tuyến tham quan đã được
          phê duyệt và xuất bản từ PostgreSQL.
        </div>
      </article>`;
  }

  return `${heading}
    <div class="route-page">
      <div class="route-choices">
        ${publicRouteApi.items.map(route => `
          <article class="glass route-choice">
            <span class="tag">
              ${Number(route.estimated_minutes)} phút dự kiến
            </span>
            <h2>${esc(route.name)}</h2>
            <p>${esc(route.description)}</p>
          </article>
        `).join("")}
      </div>

      <article class="glass route-detail">
        <h2>Tuyến tham quan đã xuất bản</h2>
        <p>
          Danh sách được tải trực tiếp từ Backend.
          Chi tiết điểm dừng và chỉ đường ô tô
          sẽ được tích hợp ở bước tiếp theo.
        </p>
      </article>
    </div>`;
}

function renderAudio(){const p=byId(state.trackId);return `${header('Lắng nghe câu chuyện Huế.','Bấm phát để nghe bản đọc thử. Âm thanh luôn do bạn chủ động điều khiển.')}<div class="audio-layout"><section class="audio-feature ${state.playing&&!state.paused?'playing':''}"><div class="section-line"><span>${icon('headphones')} THUYẾT MINH</span><label class="audio-language-label" for="audio-language">Ngôn ngữ thuyết minh<select id="audio-language" aria-label="Ngôn ngữ thuyết minh"><option value="vi-VN" ${state.audioLanguage==='vi-VN'?'selected':''}>Tiếng Việt</option><option value="en-US" ${state.audioLanguage==='en-US'?'selected':''}>English</option></select></label></div><div class="audio-art">${icon('building')}</div><h2>${p.name}</h2><p id="play-status">${state.playing?(state.paused?'Đã tạm dừng':'Đang đọc nội dung'):'Sẵn sàng lắng nghe'}</p><div class="transport"><button id="audio-restart" aria-label="Đọc lại từ đầu">${icon('route')}</button><button class="play-main" data-play aria-label="Phát hoặc tạm dừng">${icon(state.playing&&!state.paused?'pause':'play')}</button><button id="audio-stop" aria-label="Dừng thuyết minh">${icon('stop')}</button></div><div class="progress-track"><span id="audio-progress" style="--progress:${state.progress}%"></span></div><div class="time-row"><span id="audio-elapsed">${formatTime(state.elapsed)}</span><span>Giọng đọc của trình duyệt</span></div></section><div><article class="glass transcript"><div class="card-top"><h2>Nội dung thuyết minh</h2>${icon('book')}</div><p>${state.audioLanguage==='vi-VN'?p.text:p.en}</p><button class="text-button" data-detail="${p.id}">Thông tin di tích ${icon('arrow')}</button><div class="notice">Bản đọc mẫu dùng chức năng chuyển văn bản thành giọng nói của trình duyệt. Giọng đọc phụ thuộc thiết bị. Không phải tệp thuyết minh chính thức.</div></article><div class="audio-library">${places.slice(0,6).map(p=>`<button class="track ${p.id===state.trackId?'active':''}" data-track="${p.id}">${icon('headphones')}<span><strong>${p.name}</strong><small>Bản thuyết minh mẫu</small></span></button>`).join('')}</div></div></div>`}
function renderChat(){return `${header('Bạn hỏi, di sản trả lời.','Hỏi đáp bằng Gemini dựa trên tài liệu Knowledge đã được phê duyệt.')}<div class="chat-layout"><aside class="glass chat-sidebar"><h2>Bắt đầu một câu chuyện</h2>${['Đại Nội Huế có gì đặc biệt?','Lăng Tự Đức có lịch sử như thế nào?','Đàn Nam Giao có ý nghĩa gì?','Hãy giới thiệu Cung An Định'].map(v=>`<button class="chat-topic" data-question="${esc(v)}">${esc(v)}</button>`).join('')}<button class="text-button" id="clear-chat">${icon('trash')} Hội thoại mới</button><div class="notice">Chatbot kết nối Gemini/RAG thật. Khi chưa có tài liệu Knowledge được phê duyệt cho 10 di tích mới, chatbot sẽ báo không đủ thông tin. Nguồn chỉ xuất hiện khi có câu trả lời được hỗ trợ.</div></aside><article class="glass chat-panel"><div class="chat-header"><div class="avatar">${icon('compass')}</div><div><strong>Trợ lý di sản Huế</strong><small>Gemini / Knowledge đã phê duyệt · Trích dẫn nguồn khi có</small></div></div><div class="messages" id="messages" aria-live="polite">${chatMessages()}</div><form class="chat-form" id="chat-form"><input id="chat-input" placeholder="Bạn muốn tìm hiểu điều gì về Huế?" aria-label="Câu hỏi về di sản" maxlength="1000" required autocomplete="off" ${state.chatBusy?'disabled':''}><button class="icon-button dark" aria-label="Gửi câu hỏi" ${state.chatBusy?'disabled':''}>${icon('send')}</button></form></article></div>`}
function chatMessages(){if(!state.chat.length&&!state.chatBusy)return `<div class="chat-welcome"><div class="audio-art">${icon('book')}</div><h2>Mỗi câu hỏi mở ra<br>một câu chuyện.</h2><p>Hãy hỏi về di tích tại Huế. Trợ lý chỉ trả lời khi có tài liệu được phê duyệt hỗ trợ.</p></div>`;return state.chat.map(m=>`<div class="message ${m.role==='user'?'user':''}">${esc(m.text)}${m.source?`<span class="source">${icon('book')} ${esc(m.source)}</span>`:''}</div>`).join('')+(state.chatBusy?'<div class="message" role="status">Đang tra cứu tài liệu và hỏi Gemini…</div>':'')}

function renderAdminContent(){
  if(IS_ADMIN && window.HueAdminCRUD) return window.HueAdminCRUD.renderContent({state,places,attractionApi,esc,norm,icon});
  const filters=[['Tất cả','Tất cả'],['published','Đã xuất bản'],['draft','Bản nháp'],['in_review','Chờ duyệt'],['archived','Đã lưu trữ']];
  const names=new Map(places.map(p=>[p.id,p]));
  const rows=attractionApi.staffRows.filter(row=>
    (state.adminFilter==='Tất cả'||row.status===state.adminFilter) &&
    norm((names.get(row.slug)?.name || row.slug)+' '+row.slug).includes(norm(state.adminSearch))
  );
  const notice=attractionApi.staffStatus==='ready'
    ? `Đang hiển thị ${attractionApi.staffRows.length} bản ghi từ Staff API và PostgreSQL. Biên tập nội dung thật sẽ tích hợp sau.`
    : attractionApi.staffStatus==='loading'?'Đang đọc Staff API từ PostgreSQL…':attractionApi.message;
  return `<div class="filters">${filters.map(([key,label])=>`<button class="filter ${state.adminFilter===key?'active':''}" data-admin-filter="${key}">${label}</button>`).join('')}<button class="button outline small" id="refresh-admin-attractions">Làm mới</button></div>
  <section class="glass table-wrap"><table><thead><tr><th>DI TÍCH</th><th>SLUG</th><th>TRẠNG THÁI</th><th>GPS THAM KHẢO</th><th>CHI TIẾT</th></tr></thead>
  <tbody>${rows.map(row=>{
    const p=names.get(row.slug);const latitude=Number(row.latitude),longitude=Number(row.longitude);
    return `<tr><td>${esc(p?.name || row.slug)}</td><td>${esc(row.slug)}</td><td><span class="status">${esc(filters.find(([key])=>key===row.status)?.[1]||row.status)}</span></td><td>${Number.isFinite(latitude)&&Number.isFinite(longitude)?latitude.toFixed(5)+', '+longitude.toFixed(5):'—'}</td><td>${p?`<button class="text-button" data-detail="${esc(p.id)}">Xem chi tiết ${icon('arrow')}</button>`:'—'}</td></tr>`;
  }).join('')}</tbody></table>${rows.length?'':`<div class="empty">${attractionApi.staffStatus==='ready'?'Không có di tích phù hợp bộ lọc.':'Chưa tải được danh sách Staff API.'}</div>`}</section>
  <div class="notice" role="status">${esc(notice)}</div>`;
}
const adminTabs=[['dashboard','home','Dashboard'],['content','book','Quản lý nội dung'],['reports','compass','Báo cáo thống kê'],['tasks','calendar','Công việc']];
const adminEvents=read('hue-analytics-events',[]);
function trackEvent(type,id='',lang=''){adminEvents.push({type,id,lang,time:Date.now()});if(adminEvents.length>3000)adminEvents.splice(0,adminEvents.length-3000);write('hue-analytics-events',adminEvents)}
function adminData(){const demo=state.adminMode==='demo',days=state.adminPeriod;const dates=Array.from({length:days},(_,i)=>{const d=new Date();d.setDate(d.getDate()-days+i+1);return d.toLocaleDateString('en-CA',{timeZone:'Asia/Ho_Chi_Minh'})});const events=adminEvents.filter(e=>dates.includes(new Date(e.time).toLocaleDateString('en-CA',{timeZone:'Asia/Ho_Chi_Minh'})));const series=dates.map((d,i)=>demo?([42,67,54,91,76,103,128][i%7]+Math.floor(i/7)*8):events.filter(e=>e.type==='view'&&new Date(e.time).toLocaleDateString('en-CA',{timeZone:'Asia/Ho_Chi_Minh'})===d).length);const rankings=places.map((p,i)=>({name:p.name,value:demo?Math.max(12,360-i*34)*(days===30?4:1):events.filter(e=>e.type==='detail'&&e.id===p.id).length})).sort((a,b)=>b.value-a.value);const vi=demo?(days===7?284:1136):events.filter(e=>e.type==='audio'&&e.lang==='vi-VN').length;const en=demo?(days===7?116:464):events.filter(e=>e.type==='audio'&&e.lang==='en-US').length;return {dates,series,rankings,views:series.reduce((a,b)=>a+b,0),listens:vi+en,vi,en,starts:demo?(days===7?86:344):events.filter(e=>e.type==='route').length}}
function adminChart(data){const max=Math.max(1,...data.series),pts=data.series.map((n,i)=>`${20+i*560/(data.series.length-1)},${155-n/max*125}`).join(' ');return `<svg class="admin-line-chart" viewBox="0 0 600 185" role="img" aria-label="Lượt xem từng ngày: ${data.series.join(', ')}"><defs><linearGradient id="chart-fill" x1="0" y1="0" x2="0" y2="1"><stop stop-color="#ad7d42" stop-opacity=".35"/><stop offset="1" stop-color="#ad7d42" stop-opacity="0"/></linearGradient></defs>${[30,72,114,155].map(y=>`<path d="M20 ${y}H580" stroke="#a17b4430"/>`).join('')}<polygon points="20,155 ${pts} 580,155" fill="url(#chart-fill)" stroke="none"/><polyline points="${pts}" stroke="#916334" stroke-width="3" fill="none"/><text x="20" y="180" fill="#896b48" stroke="none" font-size="10">${data.dates[0].slice(5)}</text><text x="545" y="180" fill="#896b48" stroke="none" font-size="10">${data.dates.at(-1).slice(5)}</text></svg>`}
function adminRanking(data){const max=Math.max(1,...data.rankings.map(x=>x.value));return `<article class="admin-card"><div class="card-top"><h2>Di tích được quan tâm</h2><span>Lượt mở thông tin</span></div>${data.rankings.slice(0,5).map((p,i)=>`<div class="admin-rank"><span>0${i+1}</span><div><strong>${p.name}</strong><div class="admin-bar"><i style="width:${p.value/max*100}%"></i></div></div><b>${p.value.toLocaleString('vi-VN')}</b></div>`).join('')}</article>`}
function adminLanguages(data){const total=data.vi+data.en;return `<article class="admin-card"><div class="card-top"><h2>Ngôn ngữ thuyết minh</h2>${icon('headphones')}</div><div class="language-donut" style="--split:${total?data.vi/total*100:0}%"><div><strong>${total}</strong><small>lượt nghe</small></div></div><div class="language-legend"><span><i></i>Tiếng Việt <b>${total?Math.round(data.vi/total*100):0}%</b></span><span><i></i>English <b>${total?Math.round(data.en/total*100):0}%</b></span></div></article>`}
function adminTaskList(limit=100){const tasks=state.tasks.slice().sort((a,b)=>a.date.localeCompare(b.date)).slice(0,limit);return tasks.length?tasks.map(t=>`<div class="admin-task ${t.done?'done':''}"><button data-task-toggle="${esc(t.id)}" aria-label="${t.done?'Mở lại':'Hoàn thành'} công việc" aria-pressed="${t.done}">${icon(t.done?'check':'calendar')}</button><div><strong>${esc(t.title)}</strong><small>${esc(t.date.split('-').reverse().join('/'))} · ${t.done?'Đã hoàn thành':'Cần thực hiện'}</small></div><button class="text-button" data-task-delete="${esc(t.id)}" aria-label="Xóa công việc">${icon('trash')}</button></div>`).join(''):'<div class="admin-no-tasks">Chưa có công việc.<br>Thêm lịch biên tập đầu tiên của bạn.</div>'}
function adminTaskForm(){openModal(`<p class="eyebrow">LỊCH BIÊN TẬP</p><h2>Thêm công việc</h2><form id="admin-task-form"><label for="task-title">Tên công việc</label><input name="title" id="task-title" required maxlength="100" placeholder="Ví dụ: Kiểm tra nội dung Đại Nội"><label for="task-date">Ngày thực hiện</label><input type="date" id="task-date" name="date" required value="${new Date().toLocaleDateString('en-CA',{timeZone:'Asia/Ho_Chi_Minh'})}"><div class="modal-actions"><button class="button" type="submit">Lưu công việc</button></div></form>`)}
function renderAdmin(){const d=adminData(),demo=state.adminMode==='demo';const controls=`<div class="admin-controls"><label>Nguồn dữ liệu<select id="admin-mode"><option value="demo" ${demo?'selected':''}>Minh họa</option><option value="local" ${!demo?'selected':''}>Thiết bị này</option></select></label><label>Khoảng thời gian<select id="admin-period"><option value="7" ${state.adminPeriod===7?'selected':''}>7 ngày qua</option><option value="30" ${state.adminPeriod===30?'selected':''}>30 ngày qua</option></select></label><button class="button small" id="admin-export">${icon('download')} Xuất CSV</button></div>`;const top=`${header(state.adminTab==='dashboard'?'Xin chào, quản trị viên.':adminTabs.find(t=>t[0]===state.adminTab)[2],'Theo dõi hoạt động và chăm chút từng câu chuyện di sản.','HUE GUIDE / ADMIN',controls)}<div class="admin-data-note"><span class="admin-mode-badge">${demo?'DỮ LIỆU MINH HỌA':'DỮ LIỆU THIẾT BỊ NÀY'}</span><span>${demo?'Số liệu mẫu để trình diễn thiết kế, không phải thống kê người dùng thực tế.':'Chỉ ghi nhận hoạt động trên trình duyệt này từ khi tính năng được thêm; không đại diện toàn hệ thống.'}</span></div>`;
if(state.adminTab==='content')return top+`<input id="admin-search" class="admin-search" value="${esc(state.adminSearch)}" placeholder="Tìm di tích rồi nhấn Enter…" aria-label="Tìm nội dung quản trị">`+renderAdminContent();
if(state.adminTab==='reports')return top+`<div class="admin-report-grid"><article class="admin-card"><div class="card-top"><h2>Lượt xem theo ngày</h2><span>${state.adminPeriod} ngày qua</span></div><strong class="admin-number">${d.views.toLocaleString('vi-VN')}</strong>${adminChart(d)}</article>${adminLanguages(d)}${adminRanking(d)}<article class="admin-card"><h2>Phạm vi dữ liệu</h2><div class="report-facts"><p><span>Di tích trong thư viện</span><b>${places.length}</b></p><p><span>Lượt bắt đầu tuyến</span><b>${d.starts}</b></p><p><span>Bản nháp trên thiết bị</span><b>${Object.values(state.drafts).filter(x=>x.status==='Bản nháp').length}</b></p><p><span>Nội dung chờ duyệt</span><b>${Object.values(state.drafts).filter(x=>x.status==='Chờ duyệt').length}</b></p></div><p class="admin-muted">Bản nháp và công việc luôn lấy từ thiết bị này. Nút Xuất CSV sử dụng nguồn và khoảng thời gian đang chọn.</p></article></div>`;
if(state.adminTab==='tasks')return top+`<article class="admin-card admin-tasks-full"><div class="card-top"><h2>Công việc trên thiết bị này · ${state.tasks.filter(t=>!t.done).length} chưa hoàn thành</h2><button class="button small" id="add-admin-task">+ Thêm công việc</button></div>${adminTaskList()}</article>`;
return top+`<div class="admin-dashboard-grid"><article class="admin-card admin-visits"><div class="card-top"><h2>${icon('staff')} Lượt xem trang</h2><button class="text-button" data-admin-tab="reports">Chi tiết ${icon('arrow')}</button></div><strong class="admin-number">${d.views.toLocaleString('vi-VN')}</strong><p class="admin-muted">Tổng ${state.adminPeriod} ngày qua</p>${adminChart(d)}</article><article class="admin-spotlight"><div><span class="eyebrow">HUE HERITAGE INTELLIGENCE</span><h2>Di sản kết nối.<br>Trải nghiệm lan tỏa.</h2><p>Một không gian quản lý cho những câu chuyện của Huế.</p></div><div class="admin-ribbon" aria-hidden="true"><i></i><i></i><i></i><i></i><i></i></div><button class="button small" data-admin-tab="content">Quản lý nội dung ${icon('arrow')}</button></article><article class="admin-card admin-agenda"><div class="card-top"><h2>${icon('calendar')} Lịch biên tập</h2></div><div class="admin-today"><strong>${new Date().getDate()}</strong><span>Tháng ${new Date().getMonth()+1}<br>${new Date().getFullYear()}</span></div>${adminTaskList(2)}<button class="button small" id="add-admin-task">+ Thêm công việc</button></article><article class="admin-card admin-kpi"><h2>${icon('headphones')} Lượt nghe thuyết minh</h2><strong class="admin-number">${d.listens.toLocaleString('vi-VN')}</strong><p class="admin-muted">${state.adminPeriod} ngày qua · VI / EN</p><button class="text-button" data-admin-tab="reports">Xem phân bố ${icon('arrow')}</button></article><article class="admin-card admin-kpi"><h2>${icon('route')} Lượt bắt đầu tuyến</h2><strong class="admin-number">${d.starts}</strong><p class="admin-muted">${routes.length} tuyến mẫu trong thư viện</p><button class="text-button" data-admin-tab="reports">Xem chi tiết ${icon('arrow')}</button></article><article class="admin-card admin-heatmap"><div class="card-top"><h2>Nhịp khám phá</h2><span>Lượt xem / ngày</span></div><div class="heatmap-grid">${d.series.map((n,i)=>`<div style="--intensity:${n?Math.max(.2,n/Math.max(1,...d.series)):0}" title="${d.dates[i]}: ${n} lượt xem"><b>${n}</b><small>${d.dates[i].slice(-2)}</small></div>`).join('')}</div><p class="admin-muted">${d.dates[0]} — ${d.dates.at(-1)} · ${demo?'Số liệu mẫu':'Hoạt động trên thiết bị'}</p></article><article class="admin-card admin-kpi"><h2>${icon('book')} Thư viện di sản</h2><strong class="admin-number">${places.length}</strong><p class="admin-muted">${Object.keys(state.drafts).length} bản chỉnh sửa cục bộ</p><button class="text-button" data-admin-tab="content">Biên tập ${icon('arrow')}</button></article><article class="admin-card admin-kpi"><h2>${icon('check')} Chờ duyệt nội dung</h2><strong class="admin-number">${Object.values(state.drafts).filter(x=>x.status==='Chờ duyệt').length}</strong><p class="admin-muted">Trạng thái trên thiết bị này</p><button class="text-button" data-admin-review>Xem danh sách ${icon('arrow')}</button></article><div class="admin-ranking-wrap">${adminRanking(d)}</div></div><p class="admin-muted admin-footnote">Khu vực Admin yêu cầu phiên Staff backend. Thống kê, chỉnh sửa nội dung và công việc trong giao diện mẫu vẫn dùng dữ liệu minh họa hoặc dữ liệu thiết bị, chưa ghi vào PostgreSQL.</p>`}
function exportAdmin(){const d=adminData(),rows=[['Nguồn',state.adminMode==='demo'?'Dữ liệu minh họa':'Thiết bị này'],['Khoảng thời gian',state.adminPeriod+' ngày'],['Ngày','Lượt xem'],...d.dates.map((date,i)=>[date,d.series[i]]),[],['Di tích','Lượt mở thông tin'],...d.rankings.map(p=>[p.name,p.value]),[],['Ngôn ngữ','Lượt nghe'],['Tiếng Việt',d.vi],['English',d.en],['Lượt bắt đầu tuyến',d.starts]];const csv='\uFEFF'+rows.map(r=>r.map(x=>'"'+String(x).replace(/"/g,'""')+'"').join(',')).join('\r\n');const url=URL.createObjectURL(new Blob([csv],{type:'text/csv;charset=utf-8;'}));const a=document.createElement('a');a.href=url;a.download='hue-guide-thong-ke-'+state.adminMode+'.csv';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);toast('Đã xuất báo cáo CSV.')}
function render(){
  // Each entry point owns its route space: User never renders Admin.
  if (!IS_ADMIN && location.hash === '#admin') {
    location.hash = 'home';
    return;
  }
  const allowed = IS_ADMIN ? ['admin'] : navItems.map(item => item[0]);
  const requested = location.hash.replace('#', '') || (IS_ADMIN ? 'admin' : 'home');
  const page = requested === 'settings' ? 'audio' : requested === 'favorites' ? 'popular' : requested;
  state.page = allowed.includes(page) ? page : (IS_ADMIN ? 'admin' : 'home');
  if (IS_ADMIN && location.hash !== '#admin') history.replaceState(null, '', '#admin');
  $('#nav').innerHTML = IS_ADMIN
    ? adminTabs.map(([id, ic, label]) => `<button class="nav-button ${state.adminTab === id ? 'active' : ''}" data-admin-tab="${id}">${icon(ic)}<span class="nav-label">${label}</span></button>`).join('')
    : navItems.map(([id, ic, label]) => `<button class="nav-button ${state.page === id ? 'active' : ''}" data-page="${id}" ${state.page === id ? 'aria-current="page"' : ''} title="${label}">${icon(ic)}<span class="nav-label">${label}</span></button>`).join('');
  const staffLink = $('#staff-link');
  if (staffLink && IS_ADMIN) {
    staffLink.innerHTML = icon('staff') + '<span class="nav-label">Đăng xuất</span>';
    staffLink.classList.add('active');
  }
  $('#breadcrumb').textContent = IS_ADMIN ? 'Quản trị di sản' : (navItems.find(x => x[0] === state.page)?.[2] || 'Tổng quan');
  document.body.classList.toggle('admin-mode', IS_ADMIN);
  const pages = {home:renderHome,weather:renderWeather,explore:renderExplore,popular:renderPopular,map:renderMap,routes:renderRoutes,audio:renderAudio,chat:renderChat,admin:renderAdmin};
  window.HueMap?.destroy();
  content.innerHTML = pages[state.page]();
  if (state.page === 'map' && attractionApi.status === 'ready') {
    window.HueMap?.mount(places, state.mapId, state.location);
  }
  document.title = (IS_ADMIN ? 'Quản trị di sản' : $('#breadcrumb').textContent) + ' — Hue Guide';
  updateDock(); syncPromoTimer();
  if (state.page === 'chat') scrollChat();
  if (['home','weather'].includes(state.page)) loadWeather();
}

function detail(id){trackEvent('detail',id);const p=byId(id);if(!state.viewed.includes(id)){state.viewed.push(id);write('hue-viewed',state.viewed)}state.recent=[id,...state.recent.filter(x=>x!==id)].slice(0,5);write('hue-recent',state.recent);openModal(`<div class="modal-hero">${id==='dai-noi'?`<img src="assets/heritage.png" alt="Tranh minh họa kiến trúc Huế">`:`<div class="abstract-thumb">${icon('building')}<span>${p.name}</span></div>`}</div><p class="eyebrow">${p.type.toUpperCase()} · PHẠM VI THỬ NGHIỆM</p><h2>${p.name}</h2><p>${p.intro}</p><p>${p.text}</p><div class="modal-actions"><button class="button" data-audio="${id}">${icon('headphones')} Nghe thuyết minh</button><button class="button outline" data-show-map="${id}">${icon('map')} Xem bản đồ</button></div><p class="source-info">Nguồn nội dung: bộ dữ liệu minh họa theo phạm vi PRD Hue Tourism Guide. Tên gọi chính thức, lịch sử chi tiết, tọa độ, giờ mở cửa và quyền sử dụng tư liệu cần được xác minh.</p>`)}
function openModal(html){lastFocused=document.activeElement;$('#modal').innerHTML=`<section class="modal" role="dialog" aria-modal="true" aria-label="Thông tin di tích"><button class="icon-button modal-close" id="close-modal" aria-label="Đóng">${icon('close')}</button>${html}</section>`;$('#modal').hidden=false;document.body.style.overflow='hidden';$('#close-modal').focus()}
function closeModal(){if($('#modal').hidden)return;$('#modal').hidden=true;document.body.style.overflow='';lastFocused?.focus?.()}
function edit(id){const p=byId(id),d=state.drafts[id]||{};openModal(`<p class="eyebrow">BIÊN TẬP NỘI DUNG · MÔ PHỎNG</p><h2>${p.name}</h2><form id="edit-form" data-id="${id}"><label for="edit-name">Tên di tích</label><input id="edit-name" name="name" value="${esc(d.name||p.name)}" maxlength="100" required><label for="edit-description">Nội dung giới thiệu</label><textarea id="edit-description" name="description" maxlength="4000" required>${esc(d.description||p.text)}</textarea><label for="edit-source">Nguồn tham khảo</label><input id="edit-source" name="source" value="${esc(d.source||'')}" placeholder="Tên tài liệu hoặc nguồn cần kiểm chứng" maxlength="300"><div class="modal-actions"><button class="button" type="submit" name="action" value="draft">Lưu bản nháp</button><button class="button outline" type="submit" name="action" value="review">Gửi duyệt</button></div><div class="notice">Gửi duyệt yêu cầu có nguồn tham khảo. Đây là trạng thái mô phỏng, không xuất bản nội dung ra máy chủ.</div></form>`)}
function formatTime(s){return Math.floor(s/60).toString().padStart(2,'0')+':'+Math.floor(s%60).toString().padStart(2,'0')}
function stopAudio(update=true){speechSynthesisSafe()?.cancel();clearInterval(timer);state.playing=false;state.paused=false;state.progress=0;state.elapsed=0;state.utterance=null;if(update){if(['audio','home'].includes(state.page))render();else updateDock()}}
function speechSynthesisSafe(){return 'speechSynthesis'in window?window.speechSynthesis:null}
function selectTrack(id){stopAudio(false);state.trackId=id;if(state.page==='audio')render();else navigate('audio')}
function playAudio(){const synth=speechSynthesisSafe();if(!synth){toast('Trình duyệt này chưa hỗ trợ đọc văn bản. Bạn vẫn có thể đọc nội dung.');return}if(state.playing){if(state.paused){synth.resume();state.paused=false;audioStarted=Date.now()-state.elapsed*1000}else{synth.pause();state.paused=true}if(['home','audio'].includes(state.page))render();else updateDock();return}const p=byId(state.trackId);const u=new SpeechSynthesisUtterance(state.audioLanguage==='vi-VN'?p.text:p.en);u.lang=state.audioLanguage;u.rate=.9;const voices=synth.getVoices();const voice=voices.find(v=>v.lang.toLowerCase().startsWith(state.audioLanguage.slice(0,2)));if(voice)u.voice=voice;else toast('Giọng đọc phụ thuộc ngôn ngữ có sẵn trên thiết bị.');u.onboundary=e=>{state.progress=Math.min(100,(e.charIndex/u.text.length)*100);const bar=$('#audio-progress');if(bar)bar.style.setProperty('--progress',state.progress+'%')};u.onend=()=>{clearInterval(timer);state.playing=false;state.paused=false;state.progress=100;if(['home','audio'].includes(state.page))render();else updateDock()};u.onerror=e=>{if(['canceled','interrupted'].includes(e.error))return;stopAudio();toast('Chưa phát được âm thanh. Thử trình duyệt khác hoặc đọc văn bản.')};trackEvent('audio',p.id,state.audioLanguage);state.utterance=u;state.playing=true;state.paused=false;audioStarted=Date.now();synth.speak(u);timer=setInterval(()=>{if(!state.paused){state.elapsed=(Date.now()-audioStarted)/1000;if($('#audio-elapsed'))$('#audio-elapsed').textContent=formatTime(state.elapsed)}},500);if(['home','audio'].includes(state.page))render();else updateDock()}
function updateDock(){const dock=$('#audio-dock');dock.hidden=!state.playing||['home','audio'].includes(state.page);if(!dock.hidden)dock.innerHTML=`<div><strong>${byId(state.trackId).name}</strong><small>${state.paused?'Đã tạm dừng':'Đang đọc nội dung mẫu'}</small></div><button data-play aria-label="Phát hoặc tạm dừng">${icon(state.paused?'play':'pause')}</button><button data-page="audio" aria-label="Mở trình phát">${icon('external')}</button><button id="dock-stop" aria-label="Dừng">${icon('close')}</button>`}
function scrollChat(){requestAnimationFrame(()=>{const m=$('#messages');if(m)m.scrollTop=m.scrollHeight})}
let chatResetVersion=0;
async function sendQuestion(question){
  const q=String(question || '').trim();
  if(!q || state.chatBusy)return;
  if(q.length>1000){toast('Vui lòng giới hạn câu hỏi trong 1.000 ký tự.');return}
  const version=chatResetVersion;
  state.chat.push({role:'user',text:q});
  state.chatBusy=true;
  if(state.page!=='chat')navigate('chat');else render();
  try {
    const normalized=norm(q);
    const place=places.find(p=>p.dbId && (normalized.includes(norm(p.name)) || normalized.includes(norm(p.name).replace(/^lang /,''))));
    const reply=await window.HueChatAPI.ask(q,place?.dbId ?? null);
    if(version!==chatResetVersion)return;
    const sources=reply.status==='answered'
      ? [...new Set(reply.citations.map(c=>String(c?.title||'').trim()).filter(Boolean))].slice(0,3)
      : [];
    state.chat.push({role:'assistant',text:reply.answer,source:sources.length?'Nguồn: '+sources.join(' · '):''});
  } catch(error) {
    if(version!==chatResetVersion)return;
    const status=Number(error?.status||0);
    const text=status===503 ? 'Trợ lý AI đang tạm thời không khả dụng. Vui lòng thử lại sau.'
      : status===429 ? 'Bạn gửi quá nhiều yêu cầu. Vui lòng chờ rồi thử lại.'
      : status===400 ? 'Câu hỏi chưa hợp lệ. Vui lòng nhập lại.'
      : 'Chưa kết nối được dịch vụ Chat. Hãy kiểm tra backend rồi thử lại.';
    state.chat.push({role:'assistant',text,source:''});
  } finally {
    if(version===chatResetVersion){state.chatBusy=false;if(state.page==='chat')render()}
  }
}
function enableGPS(){if(!navigator.geolocation){toast('Thiết bị không hỗ trợ định vị. Bạn có thể chọn di tích thủ công.');return}const button=$('#enable-gps');if(button){button.disabled=true;button.textContent='Đang xin vị trí…'}navigator.geolocation.getCurrentPosition(p=>{state.location={latitude:p.coords.latitude,longitude:p.coords.longitude};if(state.page==='map'){window.HueMap?.showLocation(state.location);render()}toast('Đã nhận vị trí. Không lưu lịch sử GPS.')},()=>{if(state.page==='map')render();toast('Chưa nhận được vị trí. Bạn vẫn có thể chọn địa điểm thủ công.')},{enableHighAccuracy:true,timeout:10000,maximumAge:30000})}
document.addEventListener('click',e=>{const b=e.target.closest('button,a');if(!b){if(e.target===$('#modal'))closeModal();return}if(b.dataset.exploreType){state.query='';state.filter=b.dataset.exploreType;navigate('explore')}else if(b.dataset.promoStep){setPromo(state.promoIndex+Number(b.dataset.promoStep));syncPromoTimer()}else if(b.dataset.promoDot!==undefined){setPromo(Number(b.dataset.promoDot));syncPromoTimer()}else if(b.id==='promo-pause'){togglePromo()}else if(b.dataset.adminTab){const previous=state.adminTab;state.adminTab=b.dataset.adminTab;render();if(previous!==state.adminTab)playCloudTransition(adminTabs.find(t=>t[0]===state.adminTab)?.[2]||'Admin');$('.sidebar').classList.remove('open')}else if(b.hasAttribute('data-admin-review')){state.adminTab='content';state.adminFilter='in_review';render()}else if(b.id==='refresh-admin-attractions'){loadStaffAttractions()}else if(b.id==='add-admin-task'){adminTaskForm()}else if(b.id==='admin-export'){exportAdmin()}else if(b.dataset.taskToggle){const t=state.tasks.find(t=>t.id===b.dataset.taskToggle);if(t)t.done=!t.done;write('hue-admin-tasks',state.tasks);render()}else if(b.dataset.taskDelete){state.tasks=state.tasks.filter(t=>t.id!==b.dataset.taskDelete);write('hue-admin-tasks',state.tasks);render()}else if(b.dataset.weatherDay!==undefined){weather.day=Number(b.dataset.weatherDay);paintWeather()}else if(b.id==='refresh-weather'||b.id==='retry-weather'){loadWeather(true)}else if(b.dataset.page){state.query='';state.filter='Tất cả';navigate(b.dataset.page)}else if(b.dataset.detail)detail(b.dataset.detail);else if(b.dataset.audio){selectTrack(b.dataset.audio);closeModal()}else if(b.dataset.track)selectTrack(b.dataset.track);else if(b.hasAttribute('data-play'))playAudio();else if(b.dataset.filter){state.filter=b.dataset.filter;render()}else if(b.dataset.adminFilter){state.adminFilter=b.dataset.adminFilter;render()}else if(b.dataset.mapPoi){state.mapId=b.dataset.mapPoi;window.HueMap?.focus(state.mapId);document.querySelectorAll('.map-poi').forEach(node=>node.classList.toggle('active',node.dataset.mapPoi===state.mapId));const current=byId(state.mapId);const title=$('#hue-map-selected-name'),subtitle=$('#hue-map-selected-type'),details=$('.hue-map-selected [data-detail]'),osm=$('#hue-open-osm');if(title)title.textContent=current.name;if(subtitle)subtitle.textContent=current.type+' · Điểm tham khảo';if(details)details.dataset.detail=current.id;if(osm&&validHuePoint(current.latitude,current.longitude))osm.href=`https://www.openstreetmap.org/?mlat=${current.latitude}&mlon=${current.longitude}#map=15/${current.latitude}/${current.longitude}`}else if(b.dataset.showMap){state.mapId=b.dataset.showMap;navigate('map')}else if(b.dataset.route){state.routeId=b.dataset.route;navigate('routes')}else if(b.dataset.selectRoute){state.routeId=b.dataset.selectRoute;render()}else if(b.dataset.question)sendQuestion(b.dataset.question);else if(b.dataset.edit)edit(b.dataset.edit);else if(b.id==='close-modal')closeModal();else if(b.id==='menu-toggle')$('.sidebar').classList.toggle('open');else if(b.id==='enable-gps')enableGPS();else if(b.id==='toggle-real-map'){state.realMap=!state.realMap;render()}else if(b.id==='start-route'){trackEvent('route',b.dataset.id);state.activeRoute={id:b.dataset.id,step:0};write('hue-active-route',state.activeRoute);render();toast('Đã bắt đầu tuyến. Bạn tự chuyển điểm dừng khi sẵn sàng.')}else if(b.id==='next-stop'){const r=routes.find(r=>r.id===state.activeRoute.id);if(state.activeRoute.step<r.stops.length-1){state.activeRoute.step++;toast('Điểm tiếp theo: '+byId(r.stops[state.activeRoute.step]).name)}else{state.activeRoute=null;toast('Bạn đã hoàn thành hành trình mẫu!')}write('hue-active-route',state.activeRoute);render()}else if(b.id==='audio-stop'||b.id==='dock-stop')stopAudio();else if(b.id==='audio-restart'){stopAudio(false);playAudio()}else if(b.id==='clear-chat'){chatResetVersion++;window.HueChatAPI.reset();state.chat=[];state.chatBusy=false;render()}});
window.addEventListener('hue-map-select', e=>{if(e.detail && places.some(p=>p.id===e.detail.slug))state.mapId=e.detail.slug});
document.addEventListener('input',e=>{if(e.target.id==='local-search'){state.query=e.target.value;if(state.page==='popular'){$('#attraction-results').innerHTML=popularResults();$('#popular-count').textContent=popularPlaces().length+' điểm đến';return}const list=filteredPlaces();$('#attraction-results').innerHTML=list.length?`<div class="attraction-grid">${list.map(card).join('')}</div>`:'<div class="empty"><h2>Chưa tìm thấy di tích phù hợp</h2><p>Thử từ khóa khác hoặc bỏ bộ lọc.</p></div>'}});
document.addEventListener('change',e=>{if(e.target.id==='admin-mode'){state.adminMode=e.target.value;render()}else if(e.target.id==='admin-period'){state.adminPeriod=Number(e.target.value);render()}else if(e.target.id==='audio-language'){stopAudio(false);state.audioLanguage=e.target.value;write('hue-audio-language',state.audioLanguage);render()}});
document.addEventListener('keydown',e=>{if(e.target.closest?.('#promo-carousel')&&['ArrowLeft','ArrowRight'].includes(e.key)){e.preventDefault();setPromo(state.promoIndex+(e.key==='ArrowRight'?1:-1));syncPromoTimer()}if(e.key==='Escape'){closeModal();$('.sidebar').classList.remove('open')}if(e.target.id==='admin-search'&&e.key==='Enter'){state.adminSearch=e.target.value;render()}if(e.target.id==='global-search'&&e.key==='Enter'&&state.page==='admin'){state.adminSearch=e.target.value.trim();state.adminTab='content';render();return}if(e.target.id==='global-search'&&e.key==='Enter'){state.query=e.target.value.trim();state.filter='Tất cả';navigate('explore')}if(!$('#modal').hidden&&e.key==='Tab'){const items=$('#modal').querySelectorAll('button,input,textarea,a,select');const first=items[0],last=items[items.length-1];if(e.shiftKey&&document.activeElement===first){e.preventDefault();last.focus()}else if(!e.shiftKey&&document.activeElement===last){e.preventDefault();first.focus()}}});
document.addEventListener('submit',e=>{if(e.target.id==='admin-task-form'){e.preventDefault();const f=new FormData(e.target),title=String(f.get('title')||'').trim(),date=String(f.get('date')||'');if(!title||!/^\d{4}-\d{2}-\d{2}$/.test(date))return;state.tasks.push({id:String(Date.now())+Math.random().toString(36).slice(2,7),title,date,done:false});write('hue-admin-tasks',state.tasks);closeModal();render();toast('Đã lưu công việc trên thiết bị.')}else if(e.target.id==='chat-form'){e.preventDefault();const input=$('#chat-input');sendQuestion(input.value)}else if(e.target.id==='edit-form'){e.preventDefault();const id=e.target.dataset.id;const f=new FormData(e.target),source=String(f.get('source')).trim(),review=e.submitter?.value==='review';if(review&&!source){toast('Vui lòng bổ sung nguồn tham khảo trước khi gửi duyệt.');$('#edit-source').focus();return}state.drafts[id]={name:String(f.get('name')).trim(),description:String(f.get('description')).trim(),source,status:review?'Chờ duyệt':'Bản nháp'};if(!state.drafts[id].name||!state.drafts[id].description){toast('Tên và nội dung không được để trống.');return}write('hue-content-drafts',state.drafts);closeModal();render();toast(review?'Đã chuyển sang chờ duyệt trên bản mô phỏng':'Đã lưu bản nháp trên thiết bị')}});
window.addEventListener('hashchange',()=>{const previous=state.page;if(openingActive)finishOpening();if(!IS_ADMIN&&location.hash!=='#admin')trackEvent('view',location.hash.slice(1)||'home');render();if(previous!==state.page)playCloudTransition($('#breadcrumb').textContent);window.scrollTo({top:0,behavior:'instant'});$('#content').focus({preventScroll:true})});window.addEventListener('pagehide',()=>{clearTimeout(cloudExitTimer);const cloud=$('#cloud-transition');if(cloud)cloud.hidden=true;clearInterval(promoTimer);speechSynthesisSafe()?.cancel()});
if(!IS_ADMIN)initOpening();if(!IS_ADMIN&&location.hash!=='#admin')trackEvent('view',location.hash.slice(1)||'home');$('#menu-toggle').innerHTML=icon('menu');$('#search-icon').innerHTML=icon('search');if($('#top-popular'))$('#top-popular').innerHTML=icon('trend');render();loadAttractionsFromBackend();if (!IS_ADMIN) {
  loadPublishedRoutesFromBackend();
};if(IS_ADMIN)loadStaffAttractions();
