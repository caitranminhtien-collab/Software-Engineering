// M3.9 Visitor Clean UI - presentation only. No Admin, auth, database or GPS behavior edits.
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
const navItems=[['home','home','Tổng quan'],['explore','compass','Khám phá di tích'],['map','map','Bản đồ'],['routes','route','Tuyến tham quan'],['audio','headphones','Thuyết minh'],['chat','chat','Hỏi đáp di sản'],['popular','trend','Điểm đến nổi bật'],['weather','sun','Thời tiết Huế']];
const state={page:'home',query:'',filter:'Tất cả',recent:read('hue-recent',[]),viewed:read('hue-viewed',read('hue-recent',[])),routeId:'royal',activeRoute:read('hue-active-route',null),mapId:'dai-noi',realMap:false,location:null,trackId:'dai-noi',audioLanguage:read('hue-audio-language','vi-VN'),playing:false,paused:false,progress:0,elapsed:0,utterance:null,chat:[],chatBusy:false,drafts:read('hue-content-drafts',{}),promoIndex:0,promoPaused:false,adminFilter:'Tất cả',adminTab:'dashboard',adminMode:'server',adminPeriod:7,adminSearch:'',staffRouteFilter:'all',tasks:read('hue-admin-tasks',[])};
// Localized speech uses only published localization text from the Public API.
const narrationLocales = [
  ['vi-VN', '🇻🇳 Tiếng Việt', 'vi'],
  ['en-US', '🇬🇧 English', 'en'],
  ['zh-CN', '🇨🇳 中文', 'zh'],
  ['ja-JP', '🇯🇵 日本語', 'ja'],
  ['ko-KR', '🇰🇷 한국어', 'ko'],
  ['fr-FR', '🇫🇷 Français', 'fr'],
  ['de-DE', '🇩🇪 Deutsch', 'de'],
];
function narrationLanguage(locale = state.audioLanguage) {
  return narrationLocales.find(([name]) => name === locale)?.[2] || 'vi';
}
function publishedNarration(p, locale = state.audioLanguage) {
  const code = narrationLanguage(locale);
  if (code === 'vi') return p?.dbId ? p?.localizedNarrations?.vi || null : null;
  return p?.localizedNarrations?.[code] || null;
}
async function ensureNarration(p, locale = state.audioLanguage) {
  const code = narrationLanguage(locale);
  if (code === 'vi' || !p?.dbId) return;
  p.narrationRequests ||= {};
  p.localizedNarrations ||= {};
  if (p.narrationRequests[code] || p.localizedNarrations[code]) return;
  p.narrationRequests[code] = 'loading';
  try {
    const payload = await fetchJson(`/api/v1/attractions/${p.dbId}?language=${encodeURIComponent(code)}`);
    const detail = payload?.data;
    // If the API falls back to Vietnamese, do NOT read it with a foreign voice.
    if (detail && detail.content_language === code && !detail.fallback_used && detail.description) {
      p.localizedNarrations[code] = {name:detail.name || p.name, description:detail.description};
      p.narrationRequests[code] = 'ready';
    } else {
      p.narrationRequests[code] = 'unavailable';
    }
  } catch (error) {
    console.warn('[Narration] Không tải được bản dịch:', code, error);
    p.narrationRequests[code] = 'error';
  } finally {
    if (!IS_ADMIN && state.page === 'audio' && state.trackId === p.id && narrationLanguage() === code) render();
  }
}
if (!narrationLocales.some(([locale]) => locale === state.audioLanguage)) state.audioLanguage = 'vi-VN';
const byId=id=>places.find(p=>p.id===id)||places[0];
const $=q=>document.querySelector(q);
const IS_ADMIN=document.body.dataset.area==='admin';
// The ten curated slugs are a presentation whitelist, not a second database.
// Published coordinates and names are loaded from PostgreSQL through the public API.
const attractionApi = { status: 'loading', message: 'Đang tải các điểm tham quan…', staffStatus: 'loading', staffRows: [] };
// GPS coordinates stay in memory; geolocation is opt-in. Local-only simulation never calls GPS Backend.
const nearbyGps = {status:'idle', items:[], message:'', requestId:0};
const cleanApiText = (value, limit=3000) => String(value ?? '').replace(/[<>&"']/g, '').slice(0,limit);
const validHuePoint = (latitude, longitude) => Number.isFinite(latitude) && Number.isFinite(longitude)
  && latitude >= 16.20 && latitude <= 16.70 && longitude >= 107.30 && longitude <= 107.90;
// Published attraction media is read ONLY from the public details API.
// Draft and in-review uploads must never appear on the visitor website.
function publishedImageMedia(items) {
  if (!Array.isArray(items)) return [];
  return items.filter(item => {
    if (!item || item.type !== 'image' || typeof item.url !== 'string') return false;
    try {
      const parsed = new URL(item.url, window.location.href);
      return parsed.protocol === 'https:' ||
        (parsed.protocol === 'http:' && ['localhost', '127.0.0.1'].includes(parsed.hostname));
    } catch { return false; }
  }).sort((a, b) => Number(a.display_order ?? 1) - Number(b.display_order ?? 1));
}

// Audio comes from the SAME visitor detail response as published images.
// Public API filters unpublished files; the client only filters by type/language and safe URL.
function publishedAudioMedia(items) {
  if (!Array.isArray(items)) return [];
  return items.filter(item => {
    if (!item || item.type !== 'audio' || !Number.isSafeInteger(Number(item.id)) || Number(item.id) <= 0) return false;
    if (!['vi','en'].includes(item.language)) return false;
    if (typeof item.url !== 'string') return false;
    try {
      const url = new URL(item.url, window.location.href);
      return url.protocol === 'https:' ||
        (url.protocol === 'http:' && ['localhost','127.0.0.1'].includes(url.hostname));
    } catch { return false; }
  }).sort((a,b) => (Number(a.display_order ?? 1) - Number(b.display_order ?? 1)) || Number(a.id) - Number(b.id));
}

function audioForAttraction(p, language = state.audioLanguage) {
  const code = language.startsWith('en') ? 'en' : 'vi';
  return (p?.publishedAudios || []).find(m => m.language === code) || null;
}

// Vietnamese public detail includes Vietnamese audio; English audio is fetched lazily
// when selected, because the Backend filters by requested language.
async function ensureEnglishAudio(p) {
  if (!p?.dbId || p.englishAudioChecked || p.englishAudioPending) return;
  p.englishAudioPending = true;
  try {
    const detail = await fetchJson(`/api/v1/attractions/${p.dbId}?language=en`);
    const english = publishedAudioMedia(detail?.data?.media);
    const combined = new Map((p.publishedAudios || []).map(m => [Number(m.id), m]));
    english.forEach(m => combined.set(Number(m.id), m));
    p.publishedAudios = [...combined.values()].sort((a,b) => Number(a.display_order || 1)-Number(b.display_order || 1));
    p.englishAudioChecked = true;
  } catch (error) {
    console.warn('[Audio] Chưa tải được bản English:', p.name, error);
    p.englishAudioChecked = true; // Avoid a fetch/render retry loop when the API is offline.
  } finally {
    p.englishAudioPending = false;
    if (!IS_ADMIN && state.page === 'audio' && state.trackId === p.id && state.audioLanguage === 'en-US') render();
  }
}

function realAudioControl(media, label) {
  if (!media) return '';
  return `<div class="hue-real-audio-panel">
    <strong>${esc(media.caption || label)}</strong>
    <audio data-hue-real-audio="${Number(media.id)}" data-media-duration="${Number(media.duration_seconds) || 0}"
      controls preload="metadata" src="${esc(media.url)}" style="display:block;width:100%;margin:12px 0">
      Trình duyệt không hỗ trợ phát tệp âm thanh.
    </audio>
    <small>${media.language === 'en' ? 'Tiếng Anh' : 'Tiếng Việt'}${media.credit ? ' · Nguồn: '+esc(media.credit) : ''}</small>
  </div>`;
}

function mediaImage(p, extra = '') {
  const item = Array.isArray(p.publishedImages) ? p.publishedImages[0] : null;
  if (!item) return '';
  const alt = item.caption || `Ảnh di tích ${p.name}`;
  return `<img class="hue-published-photo" src="${esc(item.url)}" alt="${esc(alt)}" loading="lazy" decoding="async" ${extra}>`;
}

// Use only real, backend-published image records. Five is a UI gallery limit,
// not a requirement to invent five images if only one was uploaded.
function heritagePhotos(p) {
  return Array.isArray(p?.publishedImages) ? p.publishedImages.slice(0, 5) : [];
}

const heritageGalleryState = {slug: null, index: 0};

function heritagePhotoAlt(photo, p, index) {
  return photo.caption || `Ảnh ${index + 1} của ${p.name}`;
}

function heritageGalleryFrame(photo, p, index) {
  return `<img class="hue-gallery-photo hue-published-photo" src="${esc(photo.url)}"
    alt="${esc(heritagePhotoAlt(photo, p, index))}" loading="eager" decoding="async">`;
}

function heritageGalleryContent(p) {
  const photos = heritagePhotos(p);
  if (!photos.length) return `<div class="hue-gallery-empty" role="status">
    ${icon('building')}<strong>Chưa có ảnh</strong>
  </div>`;
  const first = photos[0];
  return `<section class="hue-gallery" aria-label="Thư viện ảnh ${esc(p.name)}">
    <div class="hue-gallery-main" id="hue-gallery-main">
      ${heritageGalleryFrame(first, p, 0)}
      <span id="hue-gallery-counter" class="hue-gallery-counter">1 / ${photos.length}</span>
      ${photos.length > 1 ? `<div class="hue-gallery-nav">
        <button type="button" data-hue-gallery-move="-1" aria-label="Ảnh trước">&#8249;</button>
        <button type="button" data-hue-gallery-move="1" aria-label="Ảnh tiếp theo">&#8250;</button>
      </div>` : ''}
    </div>
    ${photos.length > 1 ? `<div class="hue-gallery-thumbs" aria-label="Chọn ảnh">
      ${photos.map((photo,i)=>`<button type="button" data-hue-gallery-index="${i}"
        class="hue-gallery-thumb ${i===0?'active':''}" aria-pressed="${i===0}"
        aria-label="Xem ảnh ${i+1}: ${esc(heritagePhotoAlt(photo,p,i))}">
        <img class="hue-published-photo" src="${esc(photo.url)}" alt="" loading="lazy">
      </button>`).join('')}
    </div>` : ''}
    <div class="hue-gallery-caption" aria-live="polite">
      <span id="hue-gallery-description">${esc(first.caption || `Ảnh di tích ${p.name}`)}</span>
      <small id="hue-gallery-credit">${[first.credit&&'Nguồn: '+first.credit,first.rights_reference].filter(Boolean).map(esc).join(' · ')}</small>
    </div>
  </section>`;
}

function selectHeritagePhoto(nextIndex) {
  const p = places.find(item => item.id === heritageGalleryState.slug);
  const photos = heritagePhotos(p);
  if (!photos.length) return;
  const idx = (nextIndex % photos.length + photos.length) % photos.length;
  heritageGalleryState.index = idx;
  const photo = photos[idx];
  const main = document.querySelector('#modal #hue-gallery-main');
  const image = main?.querySelector('.hue-gallery-photo');
  if (!image) return;
  image.dataset.hueImageFailed = '';
  image.style.visibility = '';
  main?.querySelector('.hue-photo-error')?.remove();
  image.src = photo.url;
  image.alt = heritagePhotoAlt(photo, p, idx);
  const counter = document.getElementById('hue-gallery-counter');
  if (counter) counter.textContent = `${idx+1} / ${photos.length}`;
  const description = document.getElementById('hue-gallery-description');
  if (description) description.textContent = photo.caption || `Ảnh di tích ${p.name}`;
  const credit = document.getElementById('hue-gallery-credit');
  if (credit) credit.textContent = [photo.credit&&'Nguồn: '+photo.credit,photo.rights_reference].filter(Boolean).join(' · ');
  document.querySelectorAll('#modal [data-hue-gallery-index]').forEach(button => {
    const selected = Number(button.dataset.hueGalleryIndex) === idx;
    button.classList.toggle('active', selected);
    button.setAttribute('aria-pressed', String(selected));
  });
}

// Scope new styles to the explorer only. Do not overwrite the user's theme.css.
function injectHeritageExplorerStyles() {
  if (document.getElementById('hue-heritage-gallery-styles')) return;
  const styles = document.createElement('style');
  styles.id = 'hue-heritage-gallery-styles';
  styles.textContent = `
    .hue-explorer-grid {display:grid; grid-template-columns:repeat(auto-fill,minmax(255px,1fr));gap:20px}
    .hue-explorer-card {background:#fff8ea;border:1px solid #e6d3b6;border-radius:22px;overflow:hidden;box-shadow:0 8px 28px #72512c12;transition:transform .2s,box-shadow .2s}
    .hue-explorer-card:hover {transform:translateY(-3px);box-shadow:0 13px 32px #72512c22}
    .hue-explorer-cover {position:relative;height:202px;overflow:hidden;background:#eedfc6}
    .hue-explorer-cover .hue-published-photo {display:block;width:100%;height:100%;object-fit:cover;filter:none!important;transform:none!important;transition:transform .35s}
    .hue-explorer-card:hover .hue-explorer-cover .hue-published-photo {transform:scale(1.045)!important}
    .hue-explorer-cover .hue-explorer-placeholder {height:100%;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:8px;text-align:center;color:#805f3d;background:radial-gradient(circle at 70% 15%,#fff5e1,#e6cfac 75%)}
    .hue-explorer-placeholder svg {width:42px!important;height:42px!important;opacity:.8}
    .hue-explorer-placeholder span {font-size:12px;font-weight:600}
    .hue-photo-count {position:absolute;bottom:12px;right:12px;padding:6px 12px;background:#fff8e9ef;border:1px solid #ffffff80;border-radius:999px;font-size:11px;font-weight:700;color:#67452b}
    .hue-explorer-copy {padding:18px;display:flex;flex-direction:column;gap:10px}
    .hue-explorer-type {font-size:11px;letter-spacing:.06em;color:#86623d;font-weight:700}
    .hue-explorer-copy h2 {font-size:21px;line-height:1.28;margin:0;font-weight:650;color:#4f3422}
    .hue-explorer-copy p {color:#7b614a;font-size:13px;line-height:1.6;margin:0;display:-webkit-box;-webkit-box-orient:vertical;-webkit-line-clamp:3;overflow:hidden;min-height:3.8em}
    .hue-explorer-actions {display:flex;gap:9px;align-items:center;flex-wrap:wrap;margin-top:auto;padding-top:4px}
    .hue-explorer-actions .button {min-width:118px;justify-content:center}
    .hue-explorer-actions .text-button {color:#705034;font-size:12px}
    .modal.hue-heritage-modal {max-width:840px;background:#fff8ec;border-color:#e5cca4}
    .hue-heritage-modal .hue-gallery {margin:0 0 18px}
    .hue-heritage-modal .hue-gallery-main {position:relative;height:330px;overflow:hidden;border-radius:18px;background:#ead8b6}
    .hue-heritage-modal .hue-gallery-photo {width:100%;height:100%;display:block;object-fit:cover;object-position:center;filter:none!important}
    .hue-photo-error {position:absolute;inset:0;display:flex;align-items:center;justify-content:center;text-align:center;padding:40px;background:#eedbc0;color:#765234;font-size:14px}
    .hue-gallery-counter {position:absolute;left:14px;top:14px;background:#3d2d22c9;color:white;padding:7px 12px;border-radius:999px;font-size:12px;font-weight:700}
    .hue-gallery-nav {position:absolute;inset:0;display:flex;align-items:center;justify-content:space-between;padding:0 12px;pointer-events:none}
    .hue-gallery-nav button {pointer-events:auto;background:#fff8ede8;border:1px solid #fff5;border-radius:50%;width:38px;height:38px;font-size:29px;line-height:1;color:#634328;cursor:pointer}
    .hue-gallery-thumbs {display:grid;grid-template-columns:repeat(5,minmax(0,1fr));gap:9px;margin-top:10px}
    .hue-gallery-thumb {padding:0;border:3px solid transparent;border-radius:11px;overflow:hidden;background:#ead7b9;cursor:pointer;aspect-ratio:4/3;opacity:.75}
    .hue-gallery-thumb.active {border-color:#956b3e;opacity:1;box-shadow:0 0 0 1px #fff inset}
    .hue-gallery-thumb img {display:block;width:100%;height:100%;object-fit:cover;filter:none!important}
    .hue-gallery-caption {display:flex;align-items:flex-start;justify-content:space-between;gap:10px;flex-wrap:wrap;padding:10px 2px 0;color:#694b30;font-size:13px}
    .hue-gallery-caption small {color:#80674e;font-size:11px}
    .hue-gallery-empty {min-height:240px;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:8px;background:#f0dfc3;color:#785734;border-radius:16px;text-align:center;padding:20px}
    .hue-gallery-empty svg {width:40px!important;height:40px!important}
    .hue-gallery-empty span {font-size:12px}
    .hue-real-audio-panel {margin:16px 0;padding:14px;border-radius:14px;background:#f3e4cb;border:1px solid #dbc5a2;display:grid;gap:5px}
    .hue-real-audio-panel strong {font-size:14px;color:#594129}
    .hue-real-audio-panel small {color:#76583d;line-height:1.5}
    .hue-detail-intro {font-size:14px!important;color:#694b30!important}
    .hue-detail-map {border:1px solid #e4d0b1;border-radius:16px;padding:14px;margin-top:20px;background:#fff3df}
    .hue-detail-map h3 {font-size:17px;color:#5c4129;margin:0 0 7px}
    .hue-detail-map p {margin:0 0 12px}
    .hue-detail-map iframe {width:100%;height:200px;border:0;border-radius:11px;display:block;background:#ead5af}
    .hue-detail-map .hue-map-caption {font-size:11px;color:#7e6145;margin-top:8px}
    .hue-heritage-modal .modal-actions {position:relative;gap:10px}
    .hue-heritage-modal .source-info {font-size:11px}
    @media(max-width:640px){
      .hue-explorer-grid {grid-template-columns:repeat(auto-fit,minmax(205px,1fr));gap:14px}
      .hue-explorer-cover {height:178px}
      .hue-heritage-modal .hue-gallery-main {height:228px}
      .hue-gallery-thumbs {gap:5px}
      .hue-gallery-thumb {border-width:2px}
      .hue-gallery-caption {display:block}
      .hue-detail-map iframe {height:170px}
    }
    @media(prefers-reduced-motion:reduce){.hue-explorer-card,.hue-explorer-cover .hue-published-photo {transition:none!important}}
  `;
  document.head.appendChild(styles);
}

// A failed image URL should not leave a broken-image icon on a heritage card.
// This often indicates an unavailable localhost:3000 media server.
document.addEventListener('error', event => {
  const image = event.target;
  if (!(image instanceof HTMLImageElement) || !image.matches('.hue-published-photo')) return;
  if (image.dataset.hueImageFailed === '1') return;
  image.dataset.hueImageFailed = '1';
  console.warn('[Published media] Không mở được ảnh:', image.currentSrc || image.src);
  const parent = image.parentElement;
  if (!parent) return;
  if (image.classList.contains('hue-gallery-photo')) {
    image.style.visibility = 'hidden';
    parent.querySelector('.hue-photo-error')?.remove();
    const errorMessage = document.createElement('p');
    errorMessage.className = 'hue-photo-error';
    errorMessage.textContent = 'Không tải được ảnh từ Media Backend. Kiểm tra URL ảnh và Backend đang chạy.';
    parent.appendChild(errorMessage);
  } else if (parent.classList.contains('hue-explorer-cover')) {
    image.replaceWith(Object.assign(document.createElement('div'), {
      className: 'hue-explorer-placeholder',
      textContent: 'Chưa tải được ảnh · Kiểm tra Backend'
    }));
  } else {
    image.style.visibility = 'hidden';
  }
}, true);

function apiItems(payload) {
  const items = payload?.data?.items ?? payload?.data;
  if (!Array.isArray(items)) throw new Error('Cấu trúc API không có danh sách di tích');
  return items;
}
function dataNotice() {
  if (attractionApi.status === 'ready') return '';
  return `<p class="hue-data-notice" role="status">${esc(attractionApi.message)}</p>`;
}
async function fetchJson(path) {
  const response = await fetch(path, { credentials: 'same-origin', headers: { Accept: 'application/json' }, cache: 'no-store' });
  if (!response.ok) throw new Error(`HTTP ${response.status}`);
  return response.json();
}


const publicRouteApi = {
  status: 'loading',
  items: [],
  message: '',
  selectedId: null,
  detailStatus: 'idle',
  detail: null,
  detailMessage: ''
};

function validPublicRouteId(value) {
  const id = Number(value);
  return Number.isSafeInteger(id) && id > 0 ? id : null;
}

async function loadPublishedRoutesFromBackend() {
  try {
    const allRoutes = [];
    for (let page = 1; page <= 100; page++) {
      const payload = await fetchJson(`/api/v1/routes?page=${page}&page_size=100`);
      if (!Array.isArray(payload?.data)) throw new Error('Danh sách tuyến từ API không hợp lệ');
      allRoutes.push(...payload.data);
      const totalPages = Number(payload.pagination?.total_pages ?? 1);
      if (!Number.isInteger(totalPages) || totalPages < 0 || totalPages > 100) {
        throw new Error('Phân trang tuyến không hợp lệ');
      }
      if (page >= totalPages) break;
    }
    publicRouteApi.items = allRoutes.filter(route => validPublicRouteId(route.id));
    publicRouteApi.status = 'ready';
    publicRouteApi.message = allRoutes.length ? '' : 'Chưa có tuyến được xuất bản.';
    console.info('[Routes API] Số tuyến published:', publicRouteApi.items.length);
    if (publicRouteApi.items.length) {
      const found = publicRouteApi.items.some(route => Number(route.id) === publicRouteApi.selectedId);
      await selectPublishedRoute(found ? publicRouteApi.selectedId : publicRouteApi.items[0].id);
    } else {
      publicRouteApi.selectedId = null;
      publicRouteApi.detail = null;
      publicRouteApi.detailStatus = 'idle';
    }
  } catch (error) {
    publicRouteApi.status = 'error';
    publicRouteApi.message = 'Chưa tải được tuyến tham quan. Vui lòng thử lại.';
    console.error('[Routes API]', error);
  } finally {
    if (!IS_ADMIN && ['routes', 'home'].includes(state.page)) render();
  }
}

let publicRouteDetailRequest = 0;
async function selectPublishedRoute(value) {
  const routeId = validPublicRouteId(value);
  if (!routeId || !publicRouteApi.items.some(route => Number(route.id) === routeId)) return;
  const requestId = ++publicRouteDetailRequest;
  publicRouteApi.selectedId = routeId;
  publicRouteApi.detail = null;
  publicRouteApi.detailStatus = 'loading';
  publicRouteApi.detailMessage = '';
  if (!IS_ADMIN && state.page === 'routes') render();
  try {
    const payload = await fetchJson(`/api/v1/routes/${routeId}`);
    const route = payload?.data;
    if (!route || Number(route.id) !== routeId || !Array.isArray(route.stops)) {
      throw new Error('Chi tiết tuyến không hợp lệ');
    }
    const stops = route.stops.map(stop => ({
      ...stop,
      order: Number(stop.order),
      attraction_id: Number(stop.attraction_id),
      latitude: Number(stop.latitude),
      longitude: Number(stop.longitude),
      visit_minutes: stop.visit_minutes == null ? null : Number(stop.visit_minutes),
      travel_minutes_from_previous: stop.travel_minutes_from_previous == null
        ? null : Number(stop.travel_minutes_from_previous)
    })).sort((a,b) => a.order - b.order);
    if (!stops.every(stop => validHuePoint(stop.latitude, stop.longitude))) {
      throw new Error('Tuyến chứa tọa độ chưa hợp lệ');
    }
    if (requestId !== publicRouteDetailRequest) return;
    publicRouteApi.detail = {...route, stops};
    publicRouteApi.detailStatus = 'ready';
  } catch (error) {
    if (requestId !== publicRouteDetailRequest) return;
    publicRouteApi.detail = null;
    publicRouteApi.detailStatus = 'error';
    publicRouteApi.detailMessage = 'Chưa tải được chi tiết điểm dừng. Hãy thử lại.';
    console.error('[Route Detail API]', error);
  } finally {
    if (requestId === publicRouteDetailRequest && !IS_ADMIN && state.page === 'routes') render();
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

      let detail = null;

      // Always fetch the public detail for every attraction: list responses
      // do not include media; an existing attraction may receive new published images.
      try {
        const result = await fetchJson(
          `/api/v1/attractions/${dbId}?language=vi`
        );
        detail = result?.data ?? null;
      } catch (error) {
        console.warn('Không tải được chi tiết/media công khai:', slug, error);
      }

      const name = cleanApiText(
        item.name || detail?.name || slug,
        255
      );

      const description = cleanApiText(
        detail?.description || item.description || '',
        3000
      );

      next.push({
        id: slug,
        dbId,
        name,
        type: cleanApiText(item.category || detail?.category || 'Di tích', 80),
        intro: description || 'Nội dung giới thiệu đang được cập nhật.',
        text: description || 'Chưa có nội dung thuyết minh công khai.',
        localizedNarrations: {vi: {name, description: description || 'Chưa có nội dung thuyết minh.'}},
        narrationRequests: {},
        en: 'Explore a published Hue heritage attraction.',
        // Only backend-published images returned by the visitor API.
        publishedImages: publishedImageMedia(detail?.media),
        publishedAudios: publishedAudioMedia(detail?.media),
        englishAudioChecked: false,
        englishAudioPending: false,
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

    // M3.7 Visitor Real Data: deterministic order from actual published records.
    next.sort((a,b) => a.name.localeCompare(b.name, 'vi'));

    places.splice(0, places.length, ...next);
    if (!places.some(p => p.id === state.trackId)) state.trackId=places[0].id;
    if (narrationLanguage() !== 'vi') {
      const selected = places.find(p => p.id === state.trackId);
      if (selected) ensureNarration(selected);
    }

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
      'Không thể tải danh sách di tích. Vui lòng thử lại.';

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
function thumb(p,i=0) {
  const published = mediaImage(p);
  if (published) return published;
  return `<div class="hue-explorer-placeholder" role="img" aria-label="${esc(p.name)} chưa có ảnh">
    ${icon('building')}<span>Chưa có ảnh</span>
  </div>`;
}
function card(p,i) {
  const photoCount = heritagePhotos(p).length;
  return `<article class="hue-explorer-card">
    <div class="hue-explorer-cover">
      ${thumb(p,i)}
      
    </div>
    <div class="hue-explorer-copy">
      <span class="hue-explorer-type">${esc(p.type.toUpperCase())} · HUẾ</span>
      <h2>${esc(p.name)}</h2>
      <p>${esc(p.intro)}</p>
      <div class="hue-explorer-actions">
        <button class="button small" data-detail="${esc(p.id)}">Khám phá ${icon('arrow')}</button>
        <button class="text-button" data-audio="${esc(p.id)}">${icon('headphones')} Nghe</button>
      </div>
    </div>
  </article>`;
}
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
{tag:'HUẾ QUA TỪNG CÂU CHUYỆN',title:'Lắng nghe Huế.<br>Theo cách của bạn.',text:'Lắng nghe câu chuyện di sản qua những ngôn ngữ khác nhau.',button:'Nghe thuyết minh',page:'audio',position:'42% 65%',theme:'stories'},
{tag:'HÀNH TRÌNH DI SẢN',title:'Một tuyến đường.<br>Nhiều dấu ấn.',text:'Kết nối những điểm dừng trong hành trình khám phá Cố đô.',button:'Chọn tuyến tham quan',page:'routes',position:'95% 70%',theme:'journey'}];
let promoTimer=null;
// M3.7 Home Hero: public names, images and descriptions only.
function renderPromo(){
 const p=places.find(p=>p.dbId&&p.publishedImages?.length)||places.find(p=>p.dbId);
 if(!p)return '';
 return `<article class="glass promo-carousel hue-real-hero" id="promo-carousel" aria-label="Di tích Huế">
  <div class="promo-slide heritage">
  ${p.publishedImages?.[0]?.url?`<img class="hue-published-photo" src="${esc(p.publishedImages[0].url)}" alt="${esc(p.name)}">`:'<div class="hue-promo-no-photo" role="img" aria-label="Di tích chưa có ảnh"></div>'}
  <div class="promo-copy"><span class="eyebrow">KHÁM PHÁ DI TÍCH HUẾ</span><h2>${esc(p.name)}</h2><p>${esc(p.intro)}</p>
  <button type="button" class="button light small" data-detail="${esc(p.id)}">Khám phá di tích ${icon('arrow')}</button></div></div></article>`;
}

function setPromo(index){state.promoIndex=(index+promoSlides.length)%promoSlides.length;if(state.page!=='home')return;promoSlides.forEach((_,i)=>{const slide=$('#promo-slide-'+i),dot=$('#promo-dot-'+i);if(slide)slide.hidden=i!==state.promoIndex;if(dot)dot.setAttribute('aria-pressed',String(i===state.promoIndex))});const counter=$('#promo-counter');if(counter)counter.textContent=String(state.promoIndex+1).padStart(2,'0')+' / 03'}
function syncPromoTimer(){clearInterval(promoTimer);promoTimer=null;if(openingActive||state.page!=='home'||state.promoPaused||!$('#promo-dot-0')||window.matchMedia?.('(prefers-reduced-motion: reduce)').matches)return;promoTimer=setInterval(()=>{const area=$('#promo-carousel');if(state.page!=='home'||document.hidden||!area||(area.contains(document.activeElement)&&document.activeElement?.matches?.(':focus-visible')))return;setPromo(state.promoIndex+1)},4000)}
function togglePromo(){state.promoPaused=!state.promoPaused;const b=$('#promo-pause');if(b){b.innerHTML=icon(state.promoPaused?'play':'pause');b.setAttribute('aria-pressed',String(state.promoPaused));b.setAttribute('aria-label',state.promoPaused?'Tiếp tục tự chuyển slide':'Tạm dừng tự chuyển slide')}syncPromoTimer()}
function renderHome(){const date=new Intl.DateTimeFormat('vi-VN',{day:'2-digit',month:'2-digit',year:'numeric',timeZone:'Asia/Ho_Chi_Minh'}).format(new Date());const active=state.activeRoute&&routes.find(r=>r.id===state.activeRoute.id);return `${header('Tổng quan','Một góc nhìn, trọn hành trình khám phá Huế.','HUE GUIDE · KHÔNG GIAN CỦA BẠN',`<div class="date-pill">${icon('calendar')} ${date}</div>`)}<div class="dashboard-grid">${renderPromo()}<article class="glass dash-categories"><div class="card-top"><h2>Khám phá theo loại di tích</h2>${icon('compass')}</div><p class="category-intro">Bạn muốn khám phá điều gì?</p><div class="category-choices">${[...new Set(places.map(p=>p.type))].map(type=>[type,'pin','Di tích đã xuất bản']).map(([type,ic,desc])=>`<button class="category-choice" data-explore-type="${type}"><span class="category-icon">${icon(ic)}</span><span><strong>${type}</strong><small>${desc}</small></span><span class="category-count">${places.filter(p=>p.type===type).length}</span>${icon('chevron')}</button>`).join('')}</div><button class="text-button" data-page="explore">Xem tất cả ${places.length} điểm đến ${icon('arrow')}</button></article><article class="glass dash-popular"><div class="card-top"><h2>Điểm đến nổi bật</h2>${icon('trend')}</div><p class="sample-label">DI TÍCH ĐÃ XUẤT BẢN</p><div class="popular-preview">${popularPlaces().slice(0,3).map((p,i)=>`<button class="popular-preview-row" data-detail="${p.id}"><span>${icon('pin')}</span><strong>${p.name}</strong>${icon('chevron')}</button>`).join('')}</div><button class="text-button" data-page="popular">Xem các điểm đến ${icon('arrow')}</button></article><article class="glass weather-now" id="weather-compact">${weatherCompact()}</article><article class="glass weather-panel" id="weather-widget" aria-live="polite">${weatherWidget()}</article>${renderHomeRoutePreview()}<article class="glass dash-listen"><div><span class="eyebrow">GÓC LẮNG NGHE</span><h2>${byId(state.trackId).name}</h2><p>Nghe nội dung thuyết minh đã xuất bản.</p></div><button class="icon-button dark" data-play aria-label="Phát hoặc tạm dừng thuyết minh">${icon(state.playing&&!state.paused?'pause':'play')}</button></article><article class="glass dash-shortcuts"><h2>Mọi thứ cho chuyến đi</h2><div><button class="outline-row" data-page="map">${icon('map')}<span>Bản đồ di sản</span>${icon('arrow')}</button><button class="outline-row" data-page="chat">${icon('chat')}<span>Hỏi đáp di sản</span>${icon('arrow')}</button></div></article></div>`}

// M3.7 Visitor Real Data — no invented visit counts.
icons.trend='<path d="m3 17 6-6 4 4 8-10M15 5h6v6"/>';
function popularPlaces(){return places.filter(p=>p.dbId && (state.filter==='Tất cả'||p.type===state.filter)&&norm(p.name+' '+p.intro).includes(norm(state.query)));}
function popularCard(p,i){return `<article class="attraction-card popular-card"><div class="attraction-image">${thumb(p,i)}</div>
  <div class="attraction-copy"><small>DI TÍCH ĐÃ XUẤT BẢN · HUẾ</small><h2>${esc(p.name)}</h2><p>${esc(p.intro)}</p>
  <div class="card-actions"><button class="button small" data-detail="${esc(p.id)}">Khám phá ${icon('arrow')}</button>
  <button class="text-button" data-show-map="${esc(p.id)}">${icon('map')} Bản đồ</button></div></div></article>`;}
function popularResults(){const list=popularPlaces();return list.length?`<div class="attraction-grid">${list.map(popularCard).join('')}</div>`:'<div class="empty"><h2>Không có điểm phù hợp</h2><p>Vui lòng đổi bộ lọc.</p></div>';}
function renderPopular(){return `${header('Điểm đến nổi bật.','Danh sách các di tích có thông tin đã xuất bản.','HUE GUIDE · ĐIỂM ĐẾN CÔNG KHAI')}
  <p class="hue-data-notice">Dữ liệu đồng bộ từ PostgreSQL. Không hiển thị lượt tham quan khi chưa có số liệu thống kê công khai.</p>
  <div class="filters">${['Tất cả','Cung điện','Lăng tẩm','Di tích'].map(v=>`<button class="filter ${state.filter===v?'active':''}" data-filter="${v}">${v}</button>`).join('')}
  <input class="local-search" id="local-search" value="${esc(state.query)}" placeholder="Tìm di tích…" aria-label="Lọc di tích"></div>
  <div class="popular-list-header"><span id="popular-count">${popularPlaces().length} điểm đến</span><span>Di tích đã xuất bản</span></div>
  <div id="attraction-results">${popularResults()}</div>`;}

function filteredPlaces(){return places.filter(p=>(state.filter==='Tất cả'||p.type===state.filter)&&norm(p.name+' '+p.intro).includes(norm(state.query)))}

function renderExplore(){const list=filteredPlaces();return `${header('Khám phá di tích.','Xem hình ảnh, nghe thuyết minh và khám phá các di tích Huế.')}${dataNotice()}<div class="filters">${['Tất cả','Cung điện','Lăng tẩm','Di tích'].map(v=>`<button class="filter ${state.filter===v?'active':''}" data-filter="${v}">${v}</button>`).join('')}<input class="local-search" id="local-search" value="${esc(state.query)}" placeholder="Tìm tên di tích…" aria-label="Lọc di tích"></div><div id="attraction-results">${list.length?`<div class="hue-explorer-grid">${list.map(card).join('')}</div>`:'<div class="empty"><h2>Chưa tìm thấy di tích phù hợp</h2><p>Thử một từ khóa khác hoặc bỏ bộ lọc.</p></div>'}</div>`}

// M3.7: destination only; Google Maps chooses current position after the visitor clicks.
function hueGoogleMapsDirections(p){
 const lat=Number(p?.latitude),lon=Number(p?.longitude);
 return p?.dbId&&validHuePoint(lat,lon)?'https://www.google.com/maps/dir/?api=1&destination='+encodeURIComponent(lat+','+lon)+'&travelmode=walking':'';
}
function renderMap(){
  const current=byId(state.mapId);
  const rows=places.map((p,i)=>`<button class="map-poi ${p.id===state.mapId?'active':''}" data-map-poi="${p.id}"><span class="pin-number">${String(i+1).padStart(2,'0')}</span><span><strong>${esc(p.name)}</strong><small>${esc(p.type)}</small></span></button>`).join('');
  const valid=attractionApi.status==='ready';
  const selected=validHuePoint(current.latitude,current.longitude)?current:null;
  const googleHref=selected?hueGoogleMapsDirections(selected):'';
  const osmHref=selected?`https://www.openstreetmap.org/?mlat=${selected.latitude}&mlon=${selected.longitude}#map=15/${selected.latitude}/${selected.longitude}`:'https://www.openstreetmap.org/#map=11/16.45/107.57';
  return `${header('Một bản đồ, nhiều lựa chọn.','Chọn di tích, xem vị trí trên bản đồ và nghe những câu chuyện khi bạn đến gần.','KHÁM PHÁ KHÔNG GIAN DI SẢN',`<span class="subtle-pill">GPS · Tự thuyết minh</span>`)}
  ${dataNotice()}
  <div class="map-layout"><aside class="glass map-sidebar"><div class="card-top"><h2>Điểm đến</h2><span class="subtle-pill">${valid?places.length+' di tích':'Dữ liệu mẫu'}</span></div>${rows}</aside>
  <div class="hue-map-column"><div id="hue-real-map" class="hue-real-map" role="region" aria-label="Bản đồ tương tác di tích Huế"><div class="hue-map-loading">${valid?'Đang tải bản đồ OpenStreetMap…':'Đang tải vị trí các điểm tham quan…'}</div></div>
  <div id="hue-gps-controls">${hueGpsControlsHtml()}</div>
  <div id="hue-gps-results">${renderNearbyGpsPanel()}</div>
  <div class="hue-map-selected glass"><div><h2 id="hue-map-selected-name">${esc(current.name)}</h2><p id="hue-map-selected-type">${esc(current.type)} · Điểm tham khảo</p></div><button class="button small" data-detail="${current.id}">Chi tiết ${icon('arrow')}</button></div>
  <div class="map-switch-row"><a class="text-button" id="hue-open-osm" href="${osmHref}" target="_blank" rel="noopener noreferrer">${icon('map')} OpenStreetMap</a>
  <a class="button small" id="hue-open-google-maps" href="${esc(googleHref)}" target="_blank" rel="noopener noreferrer" ${googleHref?'':'aria-disabled="true" tabindex="-1"'}>${icon('external')} Chỉ đường Google Maps</a><span class="gps-info">${hueGpsTour.mode==='simulation'?'Đang dùng vị trí mô phỏng':state.location?'GPS thật · Chỉ lưu lịch sử nếu bạn bật':'Tọa độ di tích là điểm tham khảo, không phải cổng vào.'}</span></div>
  </div></div>`;
}

// Coordinates are public route-stop data from PostgreSQL, NOT sample markers.
function publicRouteDirectionsUrl(stops) {
  if (!stops.length) return 'https://www.google.com/maps';
  const point = stop => `${stop.latitude},${stop.longitude}`;
  const params = new URLSearchParams({
    api: '1', origin: point(stops[0]), destination: point(stops.at(-1)), travelmode: 'driving'
  });
  if (stops.length > 2) params.set('waypoints', stops.slice(1,-1).map(point).join('|'));
  return 'https://www.google.com/maps/dir/?' + params.toString();
}

function renderHomeRoutePreview() {
  const activeId = validPublicRouteId(state.activeRoute?.id);
  const active = publicRouteApi.items.find(route => Number(route.id) === activeId);
  const route = active || publicRouteApi.items[0];
  if (!route) return `<article class="glass dash-route"><div class="card-top"><h2>Hành trình hôm nay</h2>${icon('route')}</div>
    <h3>Chưa có tuyến tham quan công khai</h3><p>Hãy khám phá di tích hoặc quay lại khi có tuyến mới.</p>
    <button class="button small" data-page="routes">Xem tuyến tham quan ${icon('arrow')}</button></article>`;
  return `<article class="glass dash-route"><div class="card-top"><h2>Hành trình hôm nay</h2>${icon('route')}</div>
    <h3>${esc(route.name)}</h3><p>${active?'Tuyến bạn đã bắt đầu':'Tuyến tham quan đã xuất bản từ Backend'}</p>
    <p>${esc(route.description)}</p>
    <button class="button small" data-page="routes">${active?'Tiếp tục hành trình':'Xem tuyến và điểm dừng'} ${icon('arrow')}</button></article>`;
}

// The existing Leaflet map page owns #hue-real-map; this dedicated map owns #public-route-map.
const huePublicRouteMap = (() => {
  let map = null;
  let markers = [];
  let currentStops = [];
  let generation = 0;
  let leafletPromise = null;
  let routeAbort = null;
  let userPositionMarker = null;
  let routeBounds = null;
  const geometryCache = new Map();

  function currentStep(routeId, count) {
    if (!count || validPublicRouteId(state.activeRoute?.id) !== Number(routeId)) return -1;
    return Math.min(count - 1, Math.max(0, Number(state.activeRoute.step) || 0));
  }

  function destroy() {
    generation += 1;
    if (routeAbort) {routeAbort.abort(); routeAbort = null;}
    if (map) {map.remove(); map = null;}
    markers = [];
    currentStops = [];
    userPositionMarker = null;
    routeBounds = null;
  }
  async function ensureLeaflet() {
    if (window.L?.map) return;
    if (leafletPromise) return leafletPromise;
    leafletPromise = new Promise((resolve,reject) => {
      if (!document.querySelector('link[data-hue-leaflet]')) {
        const link = document.createElement('link');
        link.rel = 'stylesheet';
        link.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css';
        link.dataset.hueLeaflet = '1';
        document.head.appendChild(link);
      }
      const script = document.createElement('script');
      script.src = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js';
      script.async = true;
      const timeout = setTimeout(() => reject(new Error('Timeout Leaflet')), 12000);
      script.onload = () => {clearTimeout(timeout); window.L?.map ? resolve() : reject(new Error('Leaflet chưa sẵn sàng'));};
      script.onerror = () => {clearTimeout(timeout); reject(new Error('Không tải được Leaflet'));};
      document.head.appendChild(script);
    }).catch(error => {leafletPromise = null; throw error;});
    return leafletPromise;
  }
  function info(message) {
    const node = document.querySelector('#public-route-map-notice');
    if (node) node.textContent = message;
  }
  // Leaflet canvas renderer avoids the app's global `svg {width:20px;height:20px}`
  // rule, which otherwise clips the road polyline to a tiny SVG viewport.
  function drawRoad(L, coordinates, fallback=false) {
    const renderer = L.canvas({padding:0.5});
    if (!fallback) {
      L.polyline(coordinates, {renderer, color:'#fff9e9',weight:12,opacity:0.99,
        lineCap:'round',lineJoin:'round',interactive:false}).addTo(map);
    }
    L.polyline(coordinates, {renderer, color:fallback?'#765332':'#bc5528',
      weight:fallback?5:7,opacity:0.99,interactive:false,
      lineCap:'round',lineJoin:'round', ...(fallback?{dashArray:'9 9'}:{})}).addTo(map);
  }
  function showCurrentStep(routeId, stops) {
    const index = currentStep(routeId, stops.length);
    if (index < 0 || !map || !markers[index]) return;
    // Selecting the next stop means selecting an itinerary step, not tracking GPS.
    const stop = stops[index];
    map.setView([stop.latitude,stop.longitude], 14, {animate:false});
    markers[index].openPopup();
  }
  async function mount(stops, selectedRouteId) {
    const run = generation;
    const target = document.querySelector('#public-route-map');
    if (!target || stops.length === 0) return;
    currentStops = stops;
    try {
      await ensureLeaflet();
      if (generation !== run || !target.isConnected) return;
      const L = window.L;
      const selectedStep = currentStep(selectedRouteId, stops.length);
      target.textContent = '';
      map = L.map(target, {scrollWheelZoom:false});
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',{
        maxZoom:19, attribution:'&copy; OpenStreetMap contributors'
      }).addTo(map);
      markers = stops.map((stop,index) => {
        const isCurrent = selectedStep === index;
        const isPast = selectedStep > index;
        const icon = L.divIcon({
          className:'hue-route-pin-container',
          html:`<span class="hue-route-pin ${isCurrent?'is-current':isPast?'is-passed':''}">${index+1}</span>`,
          iconSize:[38,38], iconAnchor:[19,19], popupAnchor:[0,-19]
        });
        const marker = L.marker([stop.latitude,stop.longitude], {
          icon, zIndexOffset:isCurrent?1000:0
        }).addTo(map);
        marker.bindPopup(`<strong>${index+1}. ${esc(stop.attraction_name || stop.attraction_slug || 'Điểm dừng')}</strong>` +
          (isCurrent?'<p>Điểm đang chọn trong hành trình (không phải vị trí GPS).</p>':''));
        return marker;
      });
      const bounds = L.latLngBounds(stops.map(stop => [stop.latitude,stop.longitude]));
      routeBounds = bounds;
      map.fitBounds(bounds, {padding:[35,35], maxZoom:15});
      if (stops.length < 2) {
        info('Bản đồ đang hiển thị vị trí điểm dừng.');
        showCurrentStep(selectedRouteId,stops);
        return;
      }
      const key = `${selectedRouteId}:${stops.map(s=>`${s.longitude},${s.latitude}`).join(';')}`;
      let driving = geometryCache.get(key);
      try {
        if (!driving) {
          info('Đang lấy đường ô tô từ dịch vụ OSRM…');
          const controller = new AbortController();
          routeAbort = controller;
          const timeout = setTimeout(() => controller.abort(), 15000);
          try {
            const coordinates = stops.map(s => `${s.longitude},${s.latitude}`).join(';');
            const response = await fetch(`https://router.project-osrm.org/route/v1/driving/${coordinates}?overview=full&geometries=geojson`, {signal:controller.signal});
            if (!response.ok) throw new Error(`OSRM HTTP ${response.status}`);
            const data = await response.json();
            const first = data.routes?.[0];
            if (data.code !== 'Ok' || first?.geometry?.type !== 'LineString' ||
                !Array.isArray(first.geometry.coordinates) || first.geometry.coordinates.length < 2) {
              throw new Error('OSRM không tìm được tuyến đường hợp lệ');
            }
            driving = {coordinates:first.geometry.coordinates,
              distance:Number(first.distance),duration:Number(first.duration)};
            geometryCache.set(key, driving);
          } finally {
            clearTimeout(timeout);
            if (routeAbort === controller) routeAbort = null;
          }
        }
        if (generation !== run || !map) return;
        const latLngs = driving.coordinates.map(pair=>[Number(pair[1]),Number(pair[0])]);
        if (!latLngs.every(p=>Number.isFinite(p[0])&&Number.isFinite(p[1]))) throw Error('Tọa độ OSRM không hợp lệ');
        drawRoad(L,latLngs);
        routeBounds = L.latLngBounds(latLngs);
        map.fitBounds(routeBounds, {padding:[35,35],maxZoom:15});
        const km=Number.isFinite(driving.distance)?(driving.distance/1000).toFixed(1):'?';
        const mins=Number.isFinite(driving.duration)?Math.round(driving.duration/60):'?';
        info(`Đường màu cam: ô tô OSRM ước tính ${km} km · khoảng ${mins} phút (chưa tính tham quan, giao thông).`);
      } catch (error) {
        if (generation !== run || !map) return;
        console.warn('[Public Route OSRM]',error);
        // Distinguish the straight-line fallback from a drivable route.
        drawRoad(L,stops.map(stop=>[stop.latitude,stop.longitude]),true);
        info('Đường nét đứt chỉ nối các điểm dừng, KHÔNG phải đường ô tô. Chọn “Mở chỉ đường ô tô” để xem lộ trình thực tế.');
      }
      showCurrentStep(selectedRouteId,stops);
    } catch (error) {
      if (generation !== run) return;
      console.warn('[Public Route Map]', error);
      if (!map && target.isConnected) {
        target.innerHTML = '<div class="public-route-map-fallback">Chưa tải được bản đồ tương tác. Dùng nút “Mở chỉ đường ô tô” ở phía trên.</div>';
      }
      info('Chưa tải được bản đồ. Bạn vẫn có thể mở Google Maps để xem đường đi.');
    }
  }
  function focus(index) {
    const stop = currentStops[index];
    if (!stop || !map || !markers[index]) return;
    map.setView([stop.latitude,stop.longitude],15,{animate:false});
    markers[index].openPopup();
  }
  function fitAll() {
    if (!map || !routeBounds) return;
    map.fitBounds(routeBounds,{padding:[35,35],maxZoom:15});
  }
  function showLocation(coords) {
    const latitude=Number(coords.latitude),longitude=Number(coords.longitude);
    if (!map || !Number.isFinite(latitude) || !Number.isFinite(longitude) ||
        Math.abs(latitude)>90 || Math.abs(longitude)>180) return false;
    const L=window.L;
    if (userPositionMarker) map.removeLayer(userPositionMarker);
    userPositionMarker=L.marker([latitude,longitude],{
      icon:L.divIcon({className:'hue-route-gps-container',
        html:'<span class="hue-route-gps-point" title="Vị trí thiết bị">●</span>',
        iconSize:[30,30],iconAnchor:[15,15],popupAnchor:[0,-13]}),
      zIndexOffset:2000
    }).addTo(map);
    userPositionMarker.bindPopup('Vị trí thiết bị (ước tính theo GPS/trình duyệt), khác với điểm dừng trong hành trình.').openPopup();
    map.setView([latitude,longitude],14,{animate:false});
    return true;
  }
  return {mount,destroy,focus,fitAll,showLocation};
})();

function locatePublicRouteUser() {
  if (!navigator.geolocation) {toast('Trình duyệt không hỗ trợ GPS.');return;}
  const button=document.querySelector('#public-route-locate-me');
  if(button){button.disabled=true;button.textContent='Đang lấy vị trí…';}
  navigator.geolocation.getCurrentPosition(position=>{
    if(button?.isConnected){button.disabled=false;button.textContent='Vị trí của tôi (GPS)';}
    if(!huePublicRouteMap.showLocation(position.coords)){
      toast('Bản đồ chưa sẵn sàng. Bạn thử lại nhé.');return;
    }
    toast('Đã hiển thị vị trí thiết bị ước tính. Không lưu lịch sử GPS.');
  },()=>{
    if(button?.isConnected){button.disabled=false;button.textContent='Vị trí của tôi (GPS)';}
    toast('Không lấy được vị trí. Hãy cho phép định vị trong trình duyệt nếu muốn sử dụng.');
  },{enableHighAccuracy:true,timeout:12000,maximumAge:15000});
}

function injectPublicRouteStyles() {
  if (document.querySelector('#hue-public-route-css')) return;
  const style = document.createElement('style');
  style.id = 'hue-public-route-css';
  style.textContent = `
    .route-choice {cursor:pointer;display:block;color:inherit;font:inherit;background:transparent;border:1px solid #d6b88e;border-radius:24px}
    .route-choice:hover, .route-choice:focus-visible,.route-choice.active {background:#fff6e7;border-color:#9d7448;outline-offset:2px}
    .route-choice h2 {font-size:17px;font-weight:700;color:#503923}
    .route-choice p {font-size:12px;line-height:1.6;color:#765a40}
    .route-detail {padding:26px;min-width:0}
    .route-detail > p {font-size:13px;line-height:1.7;color:#74583c}
    .route-journey-actions {display:flex;gap:10px;align-items:center;flex-wrap:wrap;margin:18px 0}
    .route-journey-stops {padding-left:0;list-style:none;margin:18px 0}
    .route-journey-stops li {display:grid;grid-template-columns:36px minmax(0,1fr);gap:12px;padding:14px 0;border-bottom:1px solid #d9c6a9}
    .route-journey-stops .step-number {background:#e6d4b8;width:33px;height:33px;border-radius:50%;display:grid;place-items:center;color:#64472c;font-weight:bold}
    .route-journey-stops li.current .step-number {background:#6d4b30;color:#fff}
    .route-journey-stops strong {display:block;color:#4a3422;font-size:14px;margin-bottom:6px}
    .route-journey-stops small {display:block;color:#806345;font-size:12px;line-height:1.6}
    .route-journey-stops button {margin-top:6px}
    .route-journey-meta {display:flex;gap:10px;flex-wrap:wrap;margin:12px 0}
    .route-journey-meta span {border:1px solid #dec7a9;padding:7px 11px;border-radius:30px;color:#694a2c;font-size:12px}
    #public-route-map {height:350px;width:100%;border-radius:17px;border:1px solid #d9bd93;overflow:hidden;background:#e8dfcf;margin-top:15px}
    #public-route-map-notice {color:#6c5238;font-size:12px;line-height:1.7;margin:12px 0}
    .public-route-map-fallback {display:grid;place-items:center;text-align:center;padding:30px;height:100%;font-size:13px;color:#6b513a}
    .route-journey-actions a.button {text-decoration:none;display:inline-flex;align-items:center;justify-content:center}
    .route-progress-notice {margin-top:12px;color:#695037;font-size:13px}
    .route-map-guide {display:flex;gap:8px;flex-wrap:wrap;align-items:center;margin:14px 0 5px;font-size:12px;color:#674931}
    .route-map-guide strong {background:#f0d9b4;border:1px solid #c9995e;border-radius:14px;padding:7px 11px}
    .route-map-guide small {font-size:11px;color:#7a6148}
    .route-map-tools {display:flex;gap:8px;flex-wrap:wrap;margin:9px 0}
    /* Never apply global 20px SVG icon dimensions to Leaflet route geometry. */
    #public-route-map .leaflet-overlay-pane svg {width:auto;height:auto;max-width:none;max-height:none}
    #public-route-map .hue-route-pin-container,#public-route-map .hue-route-gps-container {border:0;background:transparent}
    #public-route-map .hue-route-pin {box-sizing:border-box;display:grid;place-items:center;width:38px;height:38px;
      border-radius:50%;border:3px solid #fff9ed;background:#8b7454;color:#fff;font-size:16px;font-weight:800;
      box-shadow:0 3px 10px #321b17a0}
    #public-route-map .hue-route-pin.is-passed {background:#867f70}
    #public-route-map .hue-route-pin.is-current {background:#b65327;border-color:#fff;
      outline:4px solid #f1c26e;box-shadow:0 0 0 7px #fff5e7bb,0 4px 15px #321b17a0}
    #public-route-map .hue-route-gps-point {display:grid;place-items:center;width:30px;height:30px;
      border-radius:50%;border:4px solid white;background:#2777cf;color:#2777cf;box-shadow:0 2px 12px #164f9a90}

    @media (max-width:900px){.route-page{grid-template-columns:1fr}.route-detail{padding:18px}#public-route-map{height:290px}}
  `;
  document.head.appendChild(style);
}

function renderRoutes() {
  const heading = header('Chọn một hành trình.', 'Khám phá những hành trình tại Huế.');
  if (publicRouteApi.status === 'loading') return `${heading}<article class="glass route-detail"><h2>Đang tải tuyến tham quan…</h2></article>`;
  if (publicRouteApi.status === 'error') return `${heading}<article class="glass route-detail"><h2>Không thể tải tuyến tham quan</h2><p>${esc(publicRouteApi.message)}</p><button class="button small" id="retry-public-routes">Thử lại</button></article>`;
  if (!publicRouteApi.items.length) return `${heading}<article class="glass route-detail"><h2>Chưa có tuyến tham quan</h2><p>Hãy quay lại để khám phá những hành trình mới.</p></article>`;
  const selectedId = publicRouteApi.selectedId;
  const route = publicRouteApi.detailStatus === 'ready' ? publicRouteApi.detail : null;
  const isActive = route && validPublicRouteId(state.activeRoute?.id) === Number(route.id);
  const index = isActive ? Math.min(route.stops.length - 1, Math.max(0,Number(state.activeRoute.step)||0)) : -1;
  const listHtml = publicRouteApi.items.map(item => `
    <button type="button" class="glass route-choice ${Number(item.id) === selectedId ? 'active' : ''}"
      data-public-route-select="${Number(item.id)}" aria-pressed="${Number(item.id) === selectedId}">
      <span class="tag">${Number.isFinite(Number(item.estimated_minutes)) ? Number(item.estimated_minutes)+' phút dự kiến' : 'Đang cập nhật thời gian'}</span>
      <h2>${esc(item.name)}</h2><p>${esc(item.description)}</p>
      <small>Chọn để xem điểm dừng ${icon('arrow')}</small>
    </button>`).join('');
  let details = '';
  if (publicRouteApi.detailStatus === 'loading') {
    details = '<h2>Đang tải chi tiết tuyến…</h2><p>Đang lấy điểm dừng từ PostgreSQL.</p>';
  } else if (publicRouteApi.detailStatus === 'error') {
    details = `<h2>Không tải được chi tiết tuyến</h2><p>${esc(publicRouteApi.detailMessage)}</p><button class="button small" data-public-route-retry="${selectedId}">Thử lại</button>`;
  } else if (route) {
    const stops = route.stops;
    const directionsHref = publicRouteDirectionsUrl(stops);
    const startedText = isActive && stops[index] ? `Điểm đang chọn ${index+1}/${stops.length}: ${esc(stops[index].attraction_name || stops[index].attraction_slug)} (theo hành trình, không phải GPS)` : '';
    details = `
      <h2>${esc(route.name)}</h2>
      <p>${esc(route.description)}</p>
      <div class="route-journey-meta"><span>${stops.length} điểm dừng</span>
      <span>${Number(route.estimated_minutes) || 0} phút dự kiến</span><span>Phương tiện: ô tô</span></div>
      <div class="route-journey-actions">
        ${!stops.length ? '' : isActive ? `
          <button class="button small" id="next-public-stop">${index === stops.length-1 ? 'Hoàn thành hành trình' : 'Điểm tiếp theo'} ${icon('arrow')}</button>
          <button class="button outline small" id="end-public-route">Kết thúc</button>` : `
          <button class="button small" id="start-public-route">${icon('route')} Bắt đầu hành trình</button>`}
        ${stops.length > 1 ? `<a class="button outline small" href="${esc(directionsHref)}" target="_blank" rel="noopener noreferrer">Mở chỉ đường ô tô ${icon('external')}</a>` : ''}
      </div>
      ${startedText ? `<p class="route-progress-notice" role="status">${startedText}</p>` : ''}
      <h3>Điểm dừng (${stops.length})</h3>
      <ol class="route-journey-stops">${stops.map((stop,i) => `
        <li class="${index===i?'current':''}"><span class="step-number">${i+1}</span><div>
          <strong>${esc(stop.attraction_name || stop.attraction_slug || 'Di tích')}</strong>
          <small>Tham quan: ${stop.visit_minutes == null ? 'Chưa xác định' : stop.visit_minutes+' phút'}
          ${i===0 ? ' · Điểm xuất phát' : ` · Di chuyển từ điểm trước: ${stop.travel_minutes_from_previous == null ? 'Chưa xác định' : stop.travel_minutes_from_previous+' phút (lịch trình)'}`}</small>
          <button type="button" class="text-button" data-public-stop-focus="${i}">Xem trên bản đồ ${icon('pin')}</button>
          <a class="text-button" href="https://www.openstreetmap.org/?mlat=${stop.latitude}&mlon=${stop.longitude}#map=16/${stop.latitude}/${stop.longitude}" target="_blank" rel="noopener noreferrer">Mở vị trí ${icon('external')}</a>
        </div></li>`).join('')}</ol>
      <h3>Bản đồ và đường đi</h3>
      <div class="route-map-guide" role="status">
        ${isActive && stops[index] ? `<strong>Điểm hiện tại trên hành trình: ${index+1}. ${esc(stops[index].attraction_name || stops[index].attraction_slug)}</strong>` : '<strong>Chưa bắt đầu hành trình</strong>'}
        <small>Ghim màu cam = điểm đang chọn · ghim xanh = vị trí thiết bị (khi cho phép GPS).</small>
      </div>
      <div class="route-map-tools">
        <button class="button outline small" id="public-route-fit-all">${icon('map')} Xem toàn tuyến</button>
        ${isActive ? `<button class="button outline small" id="public-route-focus-current">Xem điểm đang chọn ${icon('pin')}</button>` : ''}
        <button class="button outline small" id="public-route-locate-me">${icon('pin')} Vị trí của tôi (GPS)</button>
      </div>
      ${stops.length ? '<div id="public-route-map" role="region" aria-label="Bản đồ các điểm dừng của tuyến">Đang tải bản đồ…</div>' : '<p>Chưa có điểm dừng để hiển thị.</p>'}
      ${stops.length ? '<p id="public-route-map-notice">Tọa độ tham khảo; cần kiểm tra cổng vào và điều kiện đường đi thực tế.</p>' : ''}
      <div class="notice">Thời gian tham quan do Ban quản trị cung cấp. Đường ô tô OSRM chỉ là ước tính; hãy kiểm tra lối vào, đường cấm và giao thông trước khi đi.</div>`;
  } else details = '<h2>Chọn một tuyến để xem chi tiết</h2>';
  return `${heading}<div class="route-page"><div class="route-choices">${listHtml}</div>
    <article class="glass route-detail">${details}</article></div>`;
}

function renderAudio() {
  const p = byId(state.trackId);
  const code = narrationLanguage();
  if (code !== 'vi') ensureNarration(p);
  const narration = publishedNarration(p);
  const pending = p.narrationRequests?.[code] === 'loading';
  const status = narration ? 'Nội dung đã xuất bản · Đọc tự động bằng giọng của thiết bị.' :
    pending ? 'Đang chuẩn bị nội dung…' :
    p.narrationRequests?.[code] === 'error' ? 'Không tải được bản dịch. Hãy tải lại trang để thử lại.' :
    'Chưa có nội dung cho ngôn ngữ này. Hãy chọn ngôn ngữ khác.';
  const controls = `<p id="play-status">${esc(status)}</p>
    <div class="transport">
      <button id="audio-restart" ${narration?'':'disabled'} aria-label="Đọc lại từ đầu">${icon('route')}</button>
      <button class="play-main" data-play ${narration?'':'disabled'} aria-label="Phát hoặc tạm dừng">${icon(state.playing&&!state.paused?'pause':'play')}</button>
      <button id="audio-stop" aria-label="Dừng thuyết minh">${icon('stop')}</button>
    </div>
    <div class="progress-track"><span id="audio-progress" style="--progress:${state.progress}%"></span></div>
    <div class="time-row"><span id="audio-elapsed">${formatTime(state.elapsed)}</span><span>Text-to-Speech · không cần MP3</span></div>`;
  return `${header('Lắng nghe câu chuyện Huế.','Lắng nghe câu chuyện về các di tích Huế.')}
    <div class="audio-layout"><section class="audio-feature ${state.playing&&!state.paused?'playing':''}">
      <div class="section-line"><span>${icon('headphones')} THUYẾT MINH</span>
        <label class="audio-language-label" for="audio-language">Ngôn ngữ thuyết minh
          <select id="audio-language" aria-label="Ngôn ngữ thuyết minh">
            ${narrationLocales.map(([locale,label])=>`<option value="${locale}" ${state.audioLanguage===locale?'selected':''}>${label}</option>`).join('')}
          </select></label></div>
      ${hueTtsControlsHtml()}
      <div class="audio-art">${icon('building')}</div>
      <h2>${esc(narration?.name || p.name)}</h2>${controls}</section>
      <div><article class="glass transcript"><div class="card-top"><h2>Nội dung thuyết minh</h2>${icon('book')}</div>
        <p>${esc(narration?.description || status)}</p>
        <button class="text-button" data-detail="${esc(p.id)}">Thông tin di tích ${icon('arrow')}</button>
        <div class="notice">Giọng đọc phụ thuộc các giọng đã cài trên trình duyệt/hệ điều hành; nội dung ngoại ngữ phải được Admin dịch, kiểm tra và xuất bản trước.</div>
      </article>
      <div class="audio-library">${places.slice(0,10).map(item=>`<button class="track ${item.id===state.trackId?'active':''}" data-track="${esc(item.id)}">${icon('headphones')}<span><strong>${esc(item.name)}</strong><small>Thuyết minh bằng văn bản đã xuất bản</small></span></button>`).join('')}</div></div></div>`;
}
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
// M2.1: Staff routes are loaded from the authenticated backend; never from sample routes.
const staffRouteApi = { status: 'idle', items: [], error: '', requestId: 0 };
const staffRouteStatuses = {
  draft: 'Bản nháp',
  in_review: 'Chờ duyệt',
  published: 'Đã xuất bản',
  archived: 'Đã lưu trữ'
};

function staffRouteStatus(status) {
  return staffRouteStatuses[status] || String(status || 'Không rõ');
}

// The route is only eligible for review after every selected stop has valid
// timing data. The Backend independently validates review and publication.
function staffRouteReviewTimingReady(route, stops) {
  const estimated = Number(route?.estimated_minutes);
  if (!Number.isSafeInteger(estimated) || estimated <= 0 || !Array.isArray(stops) || !stops.length) return false;
  let total = 0;
  const ids = new Set();
  for (let i = 0; i < stops.length; i++) {
    const stop = stops[i];
    const id = Number(stop.attraction_id);
    const visit = Number(stop.visit_minutes);
    if (!Number.isSafeInteger(id) || id <= 0 || ids.has(id) ||
        stop.visit_minutes == null || !Number.isSafeInteger(visit) || visit <= 0) return false;
    ids.add(id);
    total += visit;
    if (i === 0) {
      if (stop.travel_minutes_from_previous != null) return false;
    } else {
      const travel = Number(stop.travel_minutes_from_previous);
      if (stop.travel_minutes_from_previous == null || !Number.isSafeInteger(travel) || travel < 0) return false;
      total += travel;
    }
  }
  return total <= estimated;
}

// Approval records verified_at but keeps the route in_review; publication is
// a separate, explicit decision and never happens automatically.
function renderStaffRouteWorkflowActions(route, stops) {
  const id = Number(route.id);
  const complete = staffRouteReviewTimingReady(route, stops);
  const action = (value, label, primary=false, disabled=false) =>
    `<button type="button" class="button ${primary ? '' : 'outline'} small" data-staff-route-workflow="${value}" data-route-id="${id}" ${disabled ? 'disabled' : ''}>${label}</button>`;
  let buttons = '';
  let guide = '';
  if (route.status === 'draft') {
    buttons = action('submit', 'Gửi duyệt', true, !complete);
    guide = complete
      ? 'Sau khi gửi duyệt, Editor không thể sửa tuyến đến khi được trả về bản nháp.'
      : 'Chưa thể gửi duyệt: cần có điểm dừng, thời gian tham quan/di chuyển hợp lệ và tổng thời gian không vượt lịch trình.';
  } else if (route.status === 'in_review' && !route.verified_at) {
    buttons = action('approve', 'Phê duyệt / ghi nhận xác minh', true) +
      action('reject', 'Trả về bản nháp');
    guide = 'Phê duyệt sẽ ghi nhận xác minh tuyến. Chỉ phê duyệt sau khi kiểm tra điểm dừng, lối vào và thời gian dự kiến; cần quyền Reviewer hoặc Admin.';
  } else if (route.status === 'in_review' && route.verified_at) {
    buttons = action('publish', 'Xuất bản lên User', true) +
      action('reject', 'Trả về bản nháp');
    guide = 'Tuyến đã có ghi nhận xác minh. Xuất bản là thao tác riêng và chỉ được thực hiện khi tất cả điều kiện Backend đều đạt.';
  } else if (route.status === 'published') {
    guide = 'Tuyến đã được xuất bản. Chỉnh sửa sẽ đưa tuyến về bản nháp để duyệt lại.';
  } else {
    guide = 'Trạng thái này chưa hỗ trợ thao tác duyệt hoặc xuất bản từ giao diện.';
  }
  return `<div class="notice" role="status">${esc(guide)}</div>
    ${buttons ? `<div class="modal-actions" style="display:flex;gap:8px;flex-wrap:wrap">${buttons}</div>` : ''}
    <p id="staff-route-workflow-message" role="alert" class="admin-muted" aria-live="polite"></p>`;
}

async function loadStaffRoutesFromBackend() {
  if (!IS_ADMIN) return;
  const currentRequest = ++staffRouteApi.requestId;
  staffRouteApi.status = 'loading';
  staffRouteApi.error = '';
  if (state.page === 'admin' && state.adminTab === 'routes') render();
  try {
    const payload = await fetchJson('/api/v1/staff/routes');
    if (!Array.isArray(payload?.data)) {
      throw new Error('Danh sách tuyến từ Staff API không đúng định dạng');
    }
    if (currentRequest !== staffRouteApi.requestId) return;
    staffRouteApi.items = payload.data.filter(route =>
      Number.isSafeInteger(Number(route.id)) && Number(route.id) > 0
    );
    staffRouteApi.status = 'ready';
  } catch (error) {
    if (currentRequest !== staffRouteApi.requestId) return;
    staffRouteApi.status = 'error';
    staffRouteApi.error = 'Không tải được danh sách tuyến. Kiểm tra Backend và phiên đăng nhập Staff.';
    console.error('[Staff Routes]', error);
  } finally {
    if (currentRequest === staffRouteApi.requestId &&
        state.page === 'admin' && state.adminTab === 'routes') render();
  }
}

function renderAdminRoutes() {
  const title = header(
    'Quản lý tuyến tham quan',
    'Danh sách và nội dung tuyến lấy trực tiếp từ Staff API và PostgreSQL.',
    'HUE GUIDE / ADMIN'
  );
  const actions = `<div class="filters">
    <button class="button small" id="staff-route-create">${icon('route')} Thêm tuyến mới</button>
    <button class="button outline small" id="staff-route-refresh" ${staffRouteApi.status === 'loading' ? 'disabled' : ''}>Làm mới</button>
    <label for="staff-route-filter">Trạng thái</label>
    <select id="staff-route-filter" aria-label="Lọc trạng thái tuyến">
      ${[['all','Tất cả'], ['draft','Bản nháp'], ['in_review','Chờ duyệt'], ['published','Đã xuất bản'], ['archived','Đã lưu trữ']]
        .map(([value,label])=>`<option value="${value}" ${state.staffRouteFilter === value ? 'selected' : ''}>${label}</option>`).join('')}
    </select>
  </div>`;
  if (staffRouteApi.status === 'idle' || staffRouteApi.status === 'loading') {
    return `${title}${actions}<article class="admin-card" role="status"><h2>Đang tải tuyến tham quan…</h2><p>Đang đọc dữ liệu quản lý từ Backend.</p></article>`;
  }
  if (staffRouteApi.status === 'error') {
    return `${title}${actions}<article class="admin-card" role="alert"><h2>Chưa tải được danh sách tuyến</h2><p>${esc(staffRouteApi.error)}</p></article>`;
  }
  const rows = staffRouteApi.items.filter(route =>
    state.staffRouteFilter === 'all' || route.status === state.staffRouteFilter
  );
  const count = staffRouteApi.items.length;
  return `${title}${actions}
    <article class="admin-card">
      <div class="card-top"><h2>Tuyến trong PostgreSQL</h2><span>${count} tuyến · ${rows.length} đang hiển thị</span></div>
      <p class="admin-muted">Gồm cả bản nháp và tuyến chờ duyệt. Chỉ tuyến đã xuất bản mới hiển thị trên trang User.</p>
      <div class="table-wrap"><table>
        <thead><tr><th>ID</th><th>Tuyến tham quan</th><th>Thời gian dự kiến</th><th>Trạng thái</th><th>Thao tác</th></tr></thead>
        <tbody>${rows.map(route => {
          const id = Number(route.id);
          const minutes = Number(route.estimated_minutes);
          const editable = route.status === 'draft' || route.status === 'published';
          return `<tr>
            <td>#${id}</td>
            <td><strong>${esc(route.name_vi || route.slug)}</strong><div class="admin-muted">${esc(route.slug)}</div></td>
            <td>${Number.isSafeInteger(minutes) && minutes > 0 ? minutes + ' phút' : 'Chưa có'}</td>
            <td><span class="status">${esc(staffRouteStatus(route.status))}</span>${route.status === 'in_review' && route.verified_at ? '<div class="admin-muted">Đã ghi nhận xác minh</div>' : ''}</td>
            <td><button class="text-button" data-staff-route-detail="${id}">Chi tiết ${icon('arrow')}</button>
            ${editable ? `<button class="text-button" data-staff-route-edit="${id}">Sửa</button>` : ''}</td>
          </tr>`;
        }).join('')}</tbody>
      </table></div>
      ${rows.length ? '' : '<div class="empty"><p>Không có tuyến nào phù hợp bộ lọc.</p></div>'}
    </article>
    <div class="notice" role="status">Danh sách và trạng thái lấy từ Staff API. Thêm/sửa chỉ ghi qua API có xác thực và CSRF. Điểm dừng được chọn từ di tích đã xuất bản trong PostgreSQL. Gửi duyệt / phê duyệt / xuất bản được xử lý tại Chi tiết tuyến; lưu trữ sẽ tích hợp ở bước sau.</div>`;
}

// Only published attractions are offered as new route stops. Names and IDs
// are read from PostgreSQL via the public API, never from the demo array.
const staffRouteStopCatalog = { items: [], ready: false };
let staffRouteFormOriginal = null;

async function loadStaffRouteStopCatalog() {
  if (staffRouteStopCatalog.ready) return staffRouteStopCatalog.items;
  const all = [];
  for (let page = 1; page <= 100; page++) {
    const payload = await fetchJson(`/api/v1/attractions?language=vi&page=${page}&page_size=100`);
    if (!Array.isArray(payload?.data)) throw new Error('Danh sách di tích công khai không hợp lệ');
    all.push(...payload.data);
    const totalPages = Number(payload.pagination?.total_pages ?? 1);
    if (!Number.isInteger(totalPages) || totalPages < 0 || totalPages > 100) {
      throw new Error('Phân trang danh sách di tích không hợp lệ');
    }
    if (page >= totalPages) break;
  }
  const seen = new Set();
  const items = all.map(item => ({
    id: Number(item.id ?? item.attraction_id),
    name: cleanApiText(item.name || item.slug || '', 255),
    slug: cleanApiText(item.slug || '', 255)
  })).filter(item => {
    if (!Number.isSafeInteger(item.id) || item.id <= 0 || !item.name || seen.has(item.id)) return false;
    seen.add(item.id);
    return true;
  });
  items.sort((a,b) => a.name.localeCompare(b.name, 'vi'));
  staffRouteStopCatalog.items = items;
  staffRouteStopCatalog.ready = true;
  return items;
}

function staffRouteStopEditorRow(stop, index, total) {
  const id = Number(stop.attraction_id) || 0;
  const known = staffRouteStopCatalog.items.some(item => item.id === id);
  const options = `<option value="">-- Chọn di tích --</option>` +
    (!known && id ? `<option value="${id}" selected>Di tích #${id} (chưa xuất bản / không khả dụng)</option>` : '') +
    staffRouteStopCatalog.items.map(item =>
      `<option value="${item.id}" ${item.id === id ? 'selected' : ''}>${esc(item.name)} (#${item.id})</option>`
    ).join('');
  const visit = stop.visit_minutes == null ? '' : String(stop.visit_minutes);
  const travel = index === 0 ? '' : (stop.travel_minutes_from_previous == null ? '' : String(stop.travel_minutes_from_previous));
  return `<div class="staff-route-stop-row" data-stop-index="${index}" style="border:1px solid #d7bc94;border-radius:14px;padding:12px;margin:12px 0;background:#fff8ec">
    <div style="display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:8px">
      <strong>Điểm dừng ${index+1}</strong>
      <div style="display:flex;gap:7px;flex-wrap:wrap">
        <button class="button outline small" type="button" data-staff-stop-up="${index}" ${index===0?'disabled':''} aria-label="Chuyển điểm dừng ${index+1} lên">↑</button>
        <button class="button outline small" type="button" data-staff-stop-down="${index}" ${index===total-1?'disabled':''} aria-label="Chuyển điểm dừng ${index+1} xuống">↓</button>
        <button class="button outline small" type="button" data-staff-stop-remove="${index}" ${total===1?'disabled':''}>Bỏ</button>
      </div>
    </div>
    <label>Di tích</label>
    <select data-route-attraction required style="width:100%;padding:12px;border:1px solid #ceb08f;border-radius:12px;background:#fff8e9;color:#553b23">${options}</select>
    <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(175px,1fr));gap:10px">
      <div><label>Tham quan (phút)</label><input data-route-visit type="number" min="1" step="1" required value="${esc(visit)}" placeholder="Ví dụ: 60"></div>
      <div><label>Di chuyển từ điểm trước (phút)</label><input data-route-travel type="number" min="0" step="1" ${index===0?'disabled':'required'} value="${esc(travel)}" placeholder="${index===0?'Điểm khởi đầu':'Nhập phút di chuyển'}"></div>
    </div>
  </div>`;
}

function staffRouteRawStops(form) {
  return [...form.querySelectorAll('.staff-route-stop-row')].map((row, index) => ({
    attraction_id: row.querySelector('[data-route-attraction]')?.value || '',
    visit_minutes: row.querySelector('[data-route-visit]')?.value ?? '',
    travel_minutes_from_previous: index === 0 ? null : (row.querySelector('[data-route-travel]')?.value ?? '')
  }));
}

function renderStaffRouteStopRows(form, stops) {
  const target = form.querySelector('#staff-route-stops');
  if (!target) return;
  target.innerHTML = stops.map((stop,index) => staffRouteStopEditorRow(stop,index,stops.length)).join('');
  const counter = form.querySelector('#staff-route-stop-count');
  if (counter) counter.textContent = `${stops.length} điểm dừng đã chọn`;
  refreshStaffRouteStopSummary(form);
}

function refreshStaffRouteStopSummary(form) {
  const node = form.querySelector('#staff-route-time-summary');
  if (!node) return;
  const rows = staffRouteRawStops(form);
  const visit = rows.reduce((sum,stop) => sum + (Number(stop.visit_minutes) || 0),0);
  const travel = rows.slice(1).reduce((sum,stop) => sum + (Number(stop.travel_minutes_from_previous) || 0),0);
  const estimate = Number(form.querySelector('[name="estimated_minutes"]')?.value || 0);
  const used = visit + travel;
  node.textContent = `Dự kiến tại điểm dừng: ${visit} phút · Di chuyển: ${travel} phút · Tổng: ${used} / ${estimate || '—'} phút${estimate && used > estimate ? ' (vượt thời gian tuyến)' : ''}.`;
}

function validatedStaffRouteStops(form, estimatedMinutes) {
  const raw = staffRouteRawStops(form);
  if (!raw.length) throw new Error('Tuyến cần ít nhất một điểm dừng.');
  const seen = new Set();
  const available = new Set(staffRouteStopCatalog.items.map(item => item.id));
  const stops = raw.map((stop,i) => {
    const attractionId = Number(stop.attraction_id);
    if (!Number.isSafeInteger(attractionId) || attractionId <= 0 || !available.has(attractionId)) {
      throw new Error(`Điểm dừng ${i+1}: hãy chọn di tích đã xuất bản từ danh sách.`);
    }
    if (seen.has(attractionId)) throw new Error(`Di tích ở điểm dừng ${i+1} đã được chọn trước đó.`);
    seen.add(attractionId);
    const visit = Number(stop.visit_minutes);
    if (!stop.visit_minutes || !Number.isSafeInteger(visit) || visit <= 0) {
      throw new Error(`Điểm dừng ${i+1}: thời gian tham quan phải lớn hơn 0.`);
    }
    let travel = null;
    if (i > 0) {
      travel = Number(stop.travel_minutes_from_previous);
      if (stop.travel_minutes_from_previous === '' || !Number.isSafeInteger(travel) || travel < 0) {
        throw new Error(`Điểm dừng ${i+1}: nhập phút di chuyển (có thể bằng 0).`);
      }
    }
    return { attraction_id: attractionId, stop_order: i+1, visit_minutes: visit, travel_minutes_from_previous: travel };
  });
  const used = stops.reduce((sum,stop) => sum + stop.visit_minutes + (stop.travel_minutes_from_previous || 0),0);
  if (used > estimatedMinutes) throw new Error(`Tổng điểm dừng ${used} phút lớn hơn thời gian tuyến ${estimatedMinutes} phút.`);
  return stops;
}

function staffRouteStopsEqual(a,b) {
  return JSON.stringify(a || []) === JSON.stringify(b || []);
}

async function showStaffRouteForm(route = null) {
  const editing = !!route;
  const id = editing ? Number(route.id) : null;
  if (editing && (!Number.isSafeInteger(id) || id <= 0)) return;
  openModal('<h2>Đang tải danh sách di tích…</h2><p>Chỉ các địa điểm đã xuất bản mới có thể chọn cho tuyến.</p>');
  try {
    const [catalog, detailPayload] = await Promise.all([
      loadStaffRouteStopCatalog(),
      editing ? fetchJson(`/api/v1/staff/routes/${id}`) : Promise.resolve(null)
    ]);
    if (!catalog.length) throw new Error('Chưa có di tích đã xuất bản để chọn làm điểm dừng.');
    const detail = editing ? detailPayload?.data : null;
    if (editing && (!detail?.route || !Array.isArray(detail.stops))) throw new Error('Chi tiết tuyến không hợp lệ.');
    const current = editing ? detail.route : null;
    const stops = editing ? [...detail.stops].sort((a,b) => a.stop_order - b.stop_order) :
      [{ attraction_id: '', visit_minutes: '', travel_minutes_from_previous: null }];
    staffRouteFormOriginal = {
      id,
      info: current && { name_vi: current.name_vi, description_vi: current.description_vi, estimated_minutes: Number(current.estimated_minutes) },
      stops: editing ? stops.map((stop,i) => ({ attraction_id:Number(stop.attraction_id),stop_order:i+1,visit_minutes:stop.visit_minutes == null ? null : Number(stop.visit_minutes),travel_minutes_from_previous:i===0?null:(stop.travel_minutes_from_previous == null ? null : Number(stop.travel_minutes_from_previous)) })) : []
    };
    openModal(`<p class="eyebrow">ADMIN · ${editing ? 'CHỈNH SỬA TUYẾN' : 'TẠO TUYẾN'}</p>
      <h2>${editing ? 'Sửa tuyến và điểm dừng' : 'Thêm tuyến tham quan'}</h2>
      <p class="admin-muted">${editing ? 'Khi chỉnh sửa, tuyến được đưa về bản nháp để duyệt lại.' : 'Tạo bản nháp và lưu điểm dừng vào PostgreSQL. Chưa công khai trên User.'}</p>
      <form id="staff-route-form" ${editing ? `data-route-id="${id}"` : ''}>
        ${editing ? `<p><strong>Mã tuyến:</strong> ${esc(current.slug)}</p>` : `
          <label for="staff-route-slug">Mã tuyến (slug)</label>
          <input id="staff-route-slug" name="slug" pattern="[a-z0-9]+(-[a-z0-9]+)*" maxlength="100" required placeholder="vi-du-tuyen-hue">`}
        <label for="staff-route-name">Tên tuyến tiếng Việt</label>
        <input id="staff-route-name" name="name_vi" maxlength="255" required value="${esc(current?.name_vi || '')}">
        <label for="staff-route-description">Mô tả tuyến</label>
        <textarea id="staff-route-description" name="description_vi" maxlength="3000" required>${esc(current?.description_vi || '')}</textarea>
        ${editing ? '' : `<label for="staff-route-area">Mã khu vực</label>
          <input id="staff-route-area" name="area_code" maxlength="100" value="HUE_ROUTE" required>`}
        <label for="staff-route-time">Thời gian dự kiến toàn tuyến (phút)</label>
        <input id="staff-route-time" name="estimated_minutes" type="number" min="1" step="1" value="${editing ? esc(current.estimated_minutes) : '120'}" required>
        <h3>Chọn di tích và thứ tự điểm dừng</h3>
        <p class="admin-muted">${catalog.length} di tích đã xuất bản. Dùng ↑ ↓ để thay đổi hành trình; điểm đầu tiên không có thời gian di chuyển từ điểm trước.</p>
        <div id="staff-route-stops"></div>
        <p class="admin-muted" id="staff-route-stop-count"></p>
        <button class="button outline small" type="button" id="staff-route-add-stop">+ Thêm điểm dừng</button>
        <p class="admin-muted" id="staff-route-time-summary" role="status"></p>
        <div class="modal-actions"><button class="button" type="submit">${editing ? 'Lưu tuyến và điểm dừng' : 'Tạo tuyến và lưu điểm dừng'}</button></div>
        <p class="admin-muted" id="staff-route-form-status" role="status"></p>
      </form>`);
    const form = $('#staff-route-form');
    if (form) renderStaffRouteStopRows(form, stops);
  } catch (error) {
    console.error('[Staff Route Form]',error);
    openModal(`<h2>Không tải được danh sách địa điểm</h2><p>${esc(error?.message || 'Lỗi kết nối')}</p>
      <p>Kiểm tra Backend, phiên Staff và thử lại.</p>`);
  }
}

async function showStaffRouteDetail(routeId) {
  const id = Number(routeId);
  if (!Number.isSafeInteger(id) || id <= 0) return;
  try {
    const payload = await fetchJson(`/api/v1/staff/routes/${id}`);
    const detail = payload?.data;
    if (!detail?.route || !Array.isArray(detail.stops)) {
      throw new Error('Chi tiết tuyến không đúng định dạng');
    }
    const route = detail.route;
    const stops = [...detail.stops].sort((a,b) => Number(a.stop_order) - Number(b.stop_order));
    openModal(`<p class="eyebrow">QUẢN LÝ TUYẾN · #${id}</p>
      <h2>${esc(route.name_vi || route.slug)}</h2>
      <p>${esc(route.description_vi)}</p>
      <p><strong>Trạng thái:</strong> ${esc(staffRouteStatus(route.status))}</p>
      <p><strong>Thời gian dự kiến:</strong> ${esc(route.estimated_minutes)} phút · <strong>Phiên bản:</strong> ${esc(route.content_version)}</p>
      <p><strong>Xác minh:</strong> ${route.verified_at ? 'Đã ghi nhận xác minh' : 'Chưa xác minh'}</p>
      <h3>Điểm dừng (${stops.length})</h3>
      <ol>${stops.map(stop => {
        const aid = Number(stop.attraction_id);
        const p = places.find(place => Number(place.dbId) === aid);
        return `<li><strong>${esc(p?.name || `Di tích ID ${aid}`)}</strong>
          <span class="admin-muted"> · Tham quan: ${stop.visit_minutes == null ? 'Chưa có' : esc(stop.visit_minutes) + ' phút'}
          · Di chuyển từ điểm trước: ${stop.travel_minutes_from_previous == null ? '—' : esc(stop.travel_minutes_from_previous) + ' phút'}</span></li>`;
      }).join('')}</ol>
      ${['draft','published'].includes(route.status) ? `<div class="modal-actions"><button class="button outline small" data-staff-route-edit="${id}">Sửa thông tin và điểm dừng</button></div>` : ''}
      <h3>Quy trình duyệt tuyến</h3>
      ${renderStaffRouteWorkflowActions(route, stops)}`);
  } catch (error) {
    console.error('[Staff Route Detail]', error);
    toast('Không thể lấy chi tiết tuyến. Kiểm tra phiên Staff và Backend.');
  }
}

let staffRouteWorkflowBusy = false;
const staffRouteWorkflowConfig = {
  submit: { endpoint: 'submit', body: {}, label: 'Đã gửi duyệt', confirm: 'Gửi tuyến này để Reviewer/Admin kiểm tra? Sau khi gửi, tuyến sẽ ở trạng thái Chờ duyệt.' },
  approve: { endpoint: 'review', body: {decision:'approve'}, label: 'Đã ghi nhận phê duyệt / xác minh', confirm: 'Bạn đã kiểm tra thông tin di tích, thứ tự, lối vào thực tế và thời gian di chuyển chưa? Phê duyệt sẽ ghi nhận verified_at; tuyến chưa công khai cho đến khi bấm Xuất bản.' },
  reject: { endpoint: 'review', body: {decision:'reject'}, label: 'Đã trả tuyến về bản nháp', confirm: 'Trả tuyến về bản nháp để chỉnh sửa lại? Kết quả xác minh cũ (nếu có) sẽ bị hủy.' },
  publish: { endpoint: 'publish', body: {}, label: 'Đã xuất bản tuyến', confirm: 'Xuất bản tuyến này cho tất cả khách tham quan? Chỉ tiếp tục nếu đã xác minh dữ liệu thực tế và điểm dừng được phép công khai.' }
};

async function runStaffRouteWorkflow(routeId, action) {
  if (!IS_ADMIN || staffRouteWorkflowBusy || !Object.hasOwn(staffRouteWorkflowConfig, action)) return;
  const id = Number(routeId);
  if (!Number.isSafeInteger(id) || id <= 0) return;
  const config = staffRouteWorkflowConfig[action];
  const message = document.querySelector('#staff-route-workflow-message');
  if (message) message.textContent = 'Đang kiểm tra trạng thái mới nhất của tuyến…';
  staffRouteWorkflowBusy = true;
  const controls = [...document.querySelectorAll('[data-staff-route-workflow]')];
  controls.forEach(button => button.disabled = true);
  try {
    // Reload the detail immediately before any write; the modal may be stale.
    const detail = (await fetchJson(`/api/v1/staff/routes/${id}`))?.data;
    const route = detail?.route;
    const stops = detail?.stops;
    if (!route || !Array.isArray(stops)) throw new Error('Không đọc được trạng thái tuyến hiện tại.');
    const canRun = action === 'submit' ? route.status === 'draft' && staffRouteReviewTimingReady(route, stops)
      : action === 'approve' ? route.status === 'in_review' && !route.verified_at && staffRouteReviewTimingReady(route, stops)
      : action === 'reject' ? route.status === 'in_review'
      : route.status === 'in_review' && !!route.verified_at && staffRouteReviewTimingReady(route, stops);
    if (!canRun) throw new Error('Tuyến đã đổi trạng thái hoặc chưa đủ dữ liệu thời gian. Hãy làm mới chi tiết và kiểm tra lại.');
    if (!window.confirm(config.confirm)) {
      if (message) message.textContent = '';
      return;
    }
    if (message) message.textContent = 'Đang thực hiện thao tác với Backend…';
    await staffRouteWrite(`/api/v1/staff/routes/${id}/${config.endpoint}`, 'POST', config.body);
    closeModal();
    toast(`${config.label} #${id}.`);
    await loadStaffRoutesFromBackend();
  } catch (error) {
    console.error('[Staff Route Workflow]', error);
    if (message?.isConnected) message.textContent = `Thao tác chưa thành công: ${String(error?.message || 'Lỗi kết nối')}. Nếu API trả 403, tài khoản không có quyền Reviewer/Admin.`;
    else toast('Không thực hiện được thao tác. Kiểm tra Console và trạng thái tuyến.');
  } finally {
    staffRouteWorkflowBusy = false;
    controls.forEach(button => { if (button.isConnected) button.disabled = false; });
  }
}

async function staffRouteWrite(path, method, body) {
  const csrfPayload = await fetchJson('/api/v1/staff/auth/csrf');
  const csrfToken = csrfPayload?.data?.csrf_token;
  if (typeof csrfToken !== 'string' || !csrfToken) throw new Error('Không lấy được CSRF token. Hãy đăng nhập lại Staff.');
  const response = await fetch(path, {
    method, credentials: 'same-origin',
    headers: { 'Content-Type':'application/json','Accept':'application/json','x-csrf-token':csrfToken },
    body: JSON.stringify(body)
  });
  const payload = await response.json().catch(() => null);
  if (!response.ok) throw new Error(payload?.error?.message || `HTTP ${response.status}`);
  return payload;
}

async function saveStaffRouteForm(form) {
  const statusNode = form.querySelector('#staff-route-form-status');
  const button = form.querySelector('button[type="submit"]');
  let id = form.dataset.routeId ? Number(form.dataset.routeId) : null;
  let editing = id !== null;
  if (editing && (!Number.isSafeInteger(id) || id <= 0)) return;
  const data = new FormData(form);
  const info = {
    name_vi: String(data.get('name_vi') || '').trim(),
    description_vi: String(data.get('description_vi') || '').trim(),
    estimated_minutes: Number(data.get('estimated_minutes'))
  };
  const slug = String(data.get('slug') || '').trim();
  const areaCode = String(data.get('area_code') || '').trim();
  if (!info.name_vi || !info.description_vi || !Number.isSafeInteger(info.estimated_minutes) || info.estimated_minutes <= 0) {
    if(statusNode) statusNode.textContent='Hãy kiểm tra tên, mô tả và thời gian dự kiến.';
    return;
  }
  if (!editing && (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug) || !areaCode)) {
    if(statusNode) statusNode.textContent='Mã tuyến không hợp lệ hoặc chưa có mã khu vực.';
    return;
  }
  let stops;
  try { stops = validatedStaffRouteStops(form,info.estimated_minutes); }
  catch(error) { if(statusNode)statusNode.textContent=String(error.message); return; }
  const previous = staffRouteFormOriginal;
  const infoChanged = !editing || !previous?.info ||
    previous.info.name_vi !== info.name_vi ||
    previous.info.description_vi !== info.description_vi ||
    previous.info.estimated_minutes !== info.estimated_minutes;
  const stopsChanged = !editing || !staffRouteStopsEqual(stops,previous?.stops);
  if (!infoChanged && !stopsChanged) { if(statusNode)statusNode.textContent='Không có thay đổi nào cần lưu.';return; }
  if(button) button.disabled=true;
  try {
    if (!editing) {
      if(statusNode) statusNode.textContent='Đang tạo bản nháp trong PostgreSQL…';
      const payload = await staffRouteWrite('/api/v1/staff/routes','POST',{...info,slug,area_code:areaCode});
      id = Number(payload?.data?.id);
      if (!Number.isSafeInteger(id) || id <= 0) throw new Error('Backend đã phản hồi nhưng chưa xác định được ID tuyến. Kiểm tra danh sách trước khi thử lại.');
      form.dataset.routeId=String(id);
      editing=true;
      staffRouteFormOriginal={id,info:{...info},stops:[]};
      const slugInput=form.querySelector('[name="slug"]');if(slugInput)slugInput.readOnly=true;
      const areaInput=form.querySelector('[name="area_code"]');if(areaInput)areaInput.readOnly=true;
    } else if(infoChanged) {
      if(statusNode) statusNode.textContent='Đang cập nhật thông tin tuyến…';
      await staffRouteWrite(`/api/v1/staff/routes/${id}`,'PATCH',info);
      staffRouteFormOriginal={id,info:{...info},stops:previous?.stops || []};
    }
    if(stopsChanged) {
      if(statusNode) statusNode.textContent=`Đã lưu thông tin tuyến #${id}. Đang lưu ${stops.length} điểm dừng…`;
      await staffRouteWrite(`/api/v1/staff/routes/${id}/stops`,'PUT',{stops});
      staffRouteFormOriginal={id,info:{...info},stops:stops.map(stop=>({...stop}))};
    }
    closeModal();
    toast(`Đã lưu tuyến #${id} và ${stops.length} điểm dừng vào PostgreSQL.`);
    await loadStaffRoutesFromBackend();
  } catch(error) {
    console.error('[Staff Route Save]',error);
    if(statusNode) statusNode.textContent=`Chưa lưu xong: ${String(error?.message || 'Lỗi kết nối')}. Nếu tuyến đã được tạo, bấm lưu lại để thử ghi điểm dừng mà không tạo tuyến trùng.`;
  } finally {
    if(button && button.isConnected)button.disabled=false;
  }
}

const adminTabs=[['dashboard','home','Dashboard'],['content','book','Quản lý nội dung'],['routes','route','Quản lý tuyến tham quan'],['reports','compass','Báo cáo thống kê'],['tasks','calendar','Công việc']];
const adminEvents=read('hue-analytics-events',[]);
function trackEvent(type,id='',lang=''){adminEvents.push({type,id,lang,time:Date.now()});if(adminEvents.length>3000)adminEvents.splice(0,adminEvents.length-3000);write('hue-analytics-events',adminEvents)}
// M2.6 - Send real visitor analytics to Backend
async function sendVisitorAnalyticsEvent(payload) {
  if (IS_ADMIN) return false;

  try {
    // Reuse the existing visitor session
    const postEvent = async (token) => fetch('/api/v1/visitor-events', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify(payload)
    });
    let token = await audioVisitorToken();
    let response = await postEvent(token);
    // A 24-hour Visitor Session may expire while a page is left open.
    // Renew only on 401, retry once, and do not interfere with the UI.
    if (response.status === 401) {
      visitorAudioTokenPromise = null;
      token = await audioVisitorToken();
      response = await postEvent(token);
    }
    if (!response.ok) throw new Error(`HTTP ${response.status}`);

    console.info(
      '[Visitor Analytics] Recorded:',
      payload.event_type
    );

    return true;
  } catch (error) {
    console.warn(
      '[Visitor Analytics] Event not recorded:',
      error
    );

    return false;
  }
}
// M3.2: Approximate active browsers; only count visible public tabs.
const huePresence = {id: null, busy: false};
function hueBrowserPresenceId() {
  if (huePresence.id) return huePresence.id;
  const key = 'hue-presence-browser-v1';
  try {
    const old = localStorage.getItem(key);
    if (old && /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(old)) {
      huePresence.id = old;
      return old;
    }
  } catch {}
  // Do not reuse Visitor/Staff credentials as an identifier.
  let id = null;
  if (globalThis.crypto?.randomUUID) id = crypto.randomUUID();
  else if (globalThis.crypto?.getRandomValues) {
    const bytes = crypto.getRandomValues(new Uint8Array(16));
    bytes[6] = (bytes[6] & 15) | 64;
    bytes[8] = (bytes[8] & 63) | 128;
    id = [...bytes].map((n,i)=>n.toString(16).padStart(2,'0') + ([3,5,7,9].includes(i)?'-':'')).join('');
  }
  if (!id) return null;
  huePresence.id = id;
  try { localStorage.setItem(key,id); } catch {}
  return id;
}
async function huePresenceHeartbeat() {
  if (IS_ADMIN || document.hidden || huePresence.busy) return;
  const browserId = hueBrowserPresenceId();
  if (!browserId) return;
  huePresence.busy = true;
  try {
    const beat = async token => fetch('/api/v1/visitor-presence/heartbeat', {
      method:'POST', cache:'no-store',
      headers:{'Content-Type':'application/json', Authorization:`Bearer ${token}`},
      body:JSON.stringify({browser_id:browserId})
    });
    let token = await audioVisitorToken();
    let response = await beat(token);
    if (response.status === 401) {
      visitorAudioTokenPromise = null;
      token = await audioVisitorToken();
      response = await beat(token);
    }
    if (!response.ok) console.warn('[Visitor Presence] heartbeat HTTP', response.status);
  } catch (error) { console.warn('[Visitor Presence] not recorded:', error); }
  finally { huePresence.busy = false; }
}

const hueLiveVisitors = {count:null,status:'loading'};
async function hueRefreshLiveVisitors() {
  if (!IS_ADMIN || document.hidden) return;
  try {
    const response = await fetch('/api/v1/staff/visitor-presence', {
      cache:'no-store', credentials:'same-origin', headers:{Accept:'application/json'}
    });
    if (!response.ok) throw new Error('HTTP '+response.status);
    const payload = await response.json();
    if (!Number.isSafeInteger(payload?.data?.active_visitors) || payload.data.active_visitors < 0) throw new Error('Invalid response');
    hueLiveVisitors.count = payload.data.active_visitors;
    hueLiveVisitors.status = 'ready';
  } catch(error) {
    hueLiveVisitors.count = null;
    hueLiveVisitors.status = 'error';
  }
  const number = document.getElementById('hue-live-visitor-count');
  const status = document.getElementById('hue-live-visitor-status');
  if (number) number.textContent = hueLiveVisitors.status === 'ready' ? hueLiveVisitors.count.toLocaleString('vi-VN') : '—';
  if (status) status.textContent = hueLiveVisitors.status === 'ready'
    ? 'Trình duyệt hoạt động trong 75 giây qua · tự cập nhật 10 giây'
    : 'Chưa thể tải dữ liệu trực tuyến';
}

// Analytics from authenticated Staff-only backend. Never expose SQL/report data via Visitor APIs.
const staffAnalytics = {status:'idle',days:0,data:null,error:''};
let staffAnalyticsRequest = 0;
async function loadStaffAnalytics(force=false) {
  if (!IS_ADMIN || state.adminMode !== 'server') return;
  const days = state.adminPeriod;
  if (!force && staffAnalytics.status === 'ready' && staffAnalytics.days === days) return;
  const requestId = ++staffAnalyticsRequest;
  staffAnalytics.status = 'loading';
  staffAnalytics.days = days;
  staffAnalytics.error = '';
  if (state.page === 'admin') render();
  try {
    const response = await fetch(`/api/v1/staff/analytics?days=${days}`, {
      credentials:'same-origin', cache:'no-store', headers:{Accept:'application/json'}
    });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const payload = await response.json();
    const data = payload?.data;
    if (!data || !Array.isArray(data.dates) || !Array.isArray(data.series) ||
        data.dates.length !== days || data.series.length !== days || !Array.isArray(data.rankings)) {
      throw new Error('Dữ liệu thống kê không hợp lệ');
    }
    if (requestId !== staffAnalyticsRequest) return;
    staffAnalytics.data = data;
    staffAnalytics.status = 'ready';
    console.info('[Staff Analytics] PostgreSQL:', days, 'days');
  } catch(error) {
    if (requestId !== staffAnalyticsRequest) return;
    staffAnalytics.status = 'error';
    staffAnalytics.data = null;
    staffAnalytics.error = String(error.message || error);
    console.warn('[Staff Analytics] Không tải được báo cáo:', error);
  } finally {
    if (requestId === staffAnalyticsRequest && state.page === 'admin') render();
  }
}
function emptyAdminData(days) {
  const dates=Array.from({length:days},(_,i)=>{
    const d=new Date();d.setDate(d.getDate()-(days-i-1));
    return d.toLocaleDateString('en-CA',{timeZone:'Asia/Ho_Chi_Minh'});
  });
  return {dates,series:dates.map(()=>0),rankings:[],views:0,listens:0,
    vi:0,en:0,starts:0,languages:{vi:0,en:0,zh:0,ja:0,ko:0,fr:0,de:0}};
}
function adminData() {
  if (state.adminMode === 'server') {
    return staffAnalytics.status === 'ready' && staffAnalytics.days === state.adminPeriod
      ? staffAnalytics.data : emptyAdminData(state.adminPeriod);
  }
  return localOrDemoAdminData();
}
function localOrDemoAdminData(){const demo=state.adminMode==='demo',days=state.adminPeriod;const dates=Array.from({length:days},(_,i)=>{const d=new Date();d.setDate(d.getDate()-days+i+1);return d.toLocaleDateString('en-CA',{timeZone:'Asia/Ho_Chi_Minh'})});const events=adminEvents.filter(e=>dates.includes(new Date(e.time).toLocaleDateString('en-CA',{timeZone:'Asia/Ho_Chi_Minh'})));const series=dates.map((d,i)=>demo?([42,67,54,91,76,103,128][i%7]+Math.floor(i/7)*8):events.filter(e=>e.type==='view'&&new Date(e.time).toLocaleDateString('en-CA',{timeZone:'Asia/Ho_Chi_Minh'})===d).length);const rankings=places.map((p,i)=>({name:p.name,value:demo?Math.max(12,360-i*34)*(days===30?4:1):events.filter(e=>e.type==='detail'&&e.id===p.id).length})).sort((a,b)=>b.value-a.value);const vi=demo?(days===7?284:1136):events.filter(e=>e.type==='audio'&&e.lang==='vi-VN').length;const en=demo?(days===7?116:464):events.filter(e=>e.type==='audio'&&e.lang==='en-US').length;return {dates,series,rankings,views:series.reduce((a,b)=>a+b,0),listens:vi+en,vi,en,starts:demo?(days===7?86:344):events.filter(e=>e.type==='route').length}}
function adminChart(data){const max=Math.max(1,...data.series),pts=data.series.map((n,i)=>`${20+i*560/(data.series.length-1)},${155-n/max*125}`).join(' ');return `<svg class="admin-line-chart" viewBox="0 0 600 185" role="img" aria-label="Lượt xem từng ngày: ${data.series.join(', ')}"><defs><linearGradient id="chart-fill" x1="0" y1="0" x2="0" y2="1"><stop stop-color="#ad7d42" stop-opacity=".35"/><stop offset="1" stop-color="#ad7d42" stop-opacity="0"/></linearGradient></defs>${[30,72,114,155].map(y=>`<path d="M20 ${y}H580" stroke="#a17b4430"/>`).join('')}<polygon points="20,155 ${pts} 580,155" fill="url(#chart-fill)" stroke="none"/><polyline points="${pts}" stroke="#916334" stroke-width="3" fill="none"/><text x="20" y="180" fill="#896b48" stroke="none" font-size="10">${data.dates[0].slice(5)}</text><text x="545" y="180" fill="#896b48" stroke="none" font-size="10">${data.dates.at(-1).slice(5)}</text></svg>`}
function adminRanking(data){const max=Math.max(1,...data.rankings.map(x=>x.value));return `<article class="admin-card"><div class="card-top"><h2>Di tích được quan tâm</h2><span>Lượt mở thông tin</span></div>${data.rankings.slice(0,5).map((p,i)=>`<div class="admin-rank"><span>0${i+1}</span><div><strong>${esc(p.name)}</strong><div class="admin-bar"><i style="width:${p.value/max*100}%"></i></div></div><b>${p.value.toLocaleString('vi-VN')}</b></div>`).join('')}</article>`}
function adminLanguages(data){
  const codes=['vi','en','zh','ja','ko','fr','de'];
  const titles={vi:'Tiếng Việt',en:'English',zh:'中文',ja:'日本語',ko:'한국어',fr:'Français',de:'Deutsch'};
  const counts=Object.fromEntries(codes.map(code=>[code,Math.max(0,Number(data.languages?.[code] ?? (code==='vi'?data.vi:code==='en'?data.en:0))||0)]));
  const total=codes.reduce((sum,code)=>sum+counts[code],0);
  const percent=code=>total?Math.round(counts[code]/total*100):0;
  return `<article class="admin-card"><div class="card-top"><h2>Ngôn ngữ thuyết minh TTS</h2>${icon('headphones')}</div>
    <div class="language-donut" style="--split:${total?counts.vi/total*100:0}%"><div><strong>${total.toLocaleString('vi-VN')}</strong><small>lượt bắt đầu</small></div></div>
    <div class="language-legend" style="display:grid;grid-template-columns:1fr;gap:8px">${codes.map(code=>`<span style="display:flex;justify-content:space-between;align-items:center;gap:12px"><span>${esc(titles[code])}</span><b>${counts[code].toLocaleString('vi-VN')} · ${percent(code)}%</b></span>`).join('')}</div>
  </article>`;
}
function adminTaskList(limit=100){const tasks=state.tasks.slice().sort((a,b)=>a.date.localeCompare(b.date)).slice(0,limit);return tasks.length?tasks.map(t=>`<div class="admin-task ${t.done?'done':''}"><button data-task-toggle="${esc(t.id)}" aria-label="${t.done?'Mở lại':'Hoàn thành'} công việc" aria-pressed="${t.done}">${icon(t.done?'check':'calendar')}</button><div><strong>${esc(t.title)}</strong><small>${esc(t.date.split('-').reverse().join('/'))} · ${t.done?'Đã hoàn thành':'Cần thực hiện'}</small></div><button class="text-button" data-task-delete="${esc(t.id)}" aria-label="Xóa công việc">${icon('trash')}</button></div>`).join(''):'<div class="admin-no-tasks">Chưa có công việc.<br>Thêm lịch biên tập đầu tiên của bạn.</div>'}
function adminTaskForm(){openModal(`<p class="eyebrow">LỊCH BIÊN TẬP</p><h2>Thêm công việc</h2><form id="admin-task-form"><label for="task-title">Tên công việc</label><input name="title" id="task-title" required maxlength="100" placeholder="Ví dụ: Kiểm tra nội dung Đại Nội"><label for="task-date">Ngày thực hiện</label><input type="date" id="task-date" name="date" required value="${new Date().toLocaleDateString('en-CA',{timeZone:'Asia/Ho_Chi_Minh'})}"><div class="modal-actions"><button class="button" type="submit">Lưu công việc</button></div></form>`)}
function renderAdmin(){
  if(state.adminTab==='routes')return renderAdminRoutes();
  const d=adminData(),numberOrDash=(value)=>state.adminMode==='server'&&staffAnalytics.status!=='ready'?'—':Number(value).toLocaleString('vi-VN'),demo=state.adminMode==='demo',server=state.adminMode==='server';
  const controls=`<div class="admin-controls"><label>Nguồn dữ liệu<select id="admin-mode">
    <option value="server" ${server?'selected':''}>Dữ liệu thực tế</option>
    <option value="demo" ${demo?'selected':''}>Minh họa</option>
    <option value="local" ${state.adminMode==='local'?'selected':''}>Thiết bị này</option>
    </select></label><label>Khoảng thời gian<select id="admin-period"><option value="7" ${state.adminPeriod===7?'selected':''}>7 ngày qua</option><option value="30" ${state.adminPeriod===30?'selected':''}>30 ngày qua</option></select></label>
    ${server?`<button class="button small outline" id="admin-refresh-analytics">Tải lại</button>`:''}
    <button class="button small" id="admin-export" ${server&&staffAnalytics.status!=='ready'?'disabled':''}>${icon('download')} Xuất CSV</button></div>`;
  const top=`${header(state.adminTab==='dashboard'?'Xin chào, quản trị viên.':adminTabs.find(t=>t[0]===state.adminTab)[2],
    'Theo dõi hoạt động và chăm chút từng câu chuyện di sản.','HUE GUIDE / ADMIN',controls)}`;
if(state.adminTab==='content')return top+`<input id="admin-search" class="admin-search" value="${esc(state.adminSearch)}" placeholder="Tìm di tích rồi nhấn Enter…" aria-label="Tìm nội dung quản trị">`+renderAdminContent();
if(state.adminTab==='reports')return top+`<div class="admin-report-grid"><article class="admin-card"><div class="card-top"><h2>Lượt mở di tích theo ngày</h2><span>${state.adminPeriod} ngày qua</span></div><strong class="admin-number">${numberOrDash(d.views)}</strong>${adminChart(d)}</article>${adminLanguages(d)}${adminRanking(d)}<article class="admin-card"><h2>Phạm vi dữ liệu</h2><div class="report-facts"><p><span>Di tích trong thư viện</span><b>${places.length}</b></p><p><span>Lượt bắt đầu tuyến</span><b>${numberOrDash(d.starts)}</b></p><p><span>Bản nháp trên thiết bị</span><b>${Object.values(state.drafts).filter(x=>x.status==='Bản nháp').length}</b></p><p><span>Nội dung chờ duyệt</span><b>${Object.values(state.drafts).filter(x=>x.status==='Chờ duyệt').length}</b></p></div></article></div>`;
if(state.adminTab==='tasks')return top+`<article class="admin-card admin-tasks-full"><div class="card-top"><h2>Công việc trên thiết bị này · ${state.tasks.filter(t=>!t.done).length} chưa hoàn thành</h2><button class="button small" id="add-admin-task">+ Thêm công việc</button></div>${adminTaskList()}</article>`;
return top+`<div class="admin-dashboard-grid"><article class="admin-card admin-visits"><div class="card-top"><h2>${icon('staff')} Lượt mở di tích</h2><button class="text-button" data-admin-tab="reports">Chi tiết ${icon('arrow')}</button></div><strong class="admin-number">${numberOrDash(d.views)}</strong><p class="admin-muted">Tổng ${state.adminPeriod} ngày qua</p>${adminChart(d)}</article><article class="admin-spotlight"><div><span class="eyebrow">HUE HERITAGE INTELLIGENCE</span><h2>Di sản kết nối.<br>Trải nghiệm lan tỏa.</h2><p>Một không gian quản lý cho những câu chuyện của Huế.</p></div><div class="admin-ribbon" aria-hidden="true"><i></i><i></i><i></i><i></i><i></i></div><button class="button small" data-admin-tab="content">Quản lý nội dung ${icon('arrow')}</button></article><article class="admin-card admin-agenda"><div class="card-top"><h2>${icon('calendar')} Lịch biên tập</h2></div><div class="admin-today"><strong>${new Date().getDate()}</strong><span>Tháng ${new Date().getMonth()+1}<br>${new Date().getFullYear()}</span></div>${adminTaskList(2)}<button class="button small" id="add-admin-task">+ Thêm công việc</button></article><article class="admin-card admin-kpi"><h2>${icon('staff')} Khách đang truy cập</h2><strong class="admin-number" id="hue-live-visitor-count">${hueLiveVisitors.status==='ready'?hueLiveVisitors.count.toLocaleString('vi-VN'):'—'}</strong><p class="admin-muted" id="hue-live-visitor-status">${hueLiveVisitors.status==='ready'?'Trình duyệt hoạt động trong 75 giây qua · tự cập nhật 10 giây':'Đang lấy số liệu trực tuyến…'}</p></article><article class="admin-card admin-kpi"><h2>${icon('headphones')} Lượt nghe thuyết minh</h2><strong class="admin-number">${numberOrDash(d.listens)}</strong><p class="admin-muted">${state.adminPeriod} ngày qua · 7 ngôn ngữ TTS</p><button class="text-button" data-admin-tab="reports">Xem phân bố ${icon('arrow')}</button></article><article class="admin-card admin-kpi"><h2>${icon('route')} Lượt bắt đầu tuyến</h2><strong class="admin-number">${numberOrDash(d.starts)}</strong><p class="admin-muted">${server?'Lượt bắt đầu các tuyến published':routes.length+' tuyến mẫu trong thư viện'}</p><button class="text-button" data-admin-tab="reports">Xem chi tiết ${icon('arrow')}</button></article><article class="admin-card admin-heatmap"><div class="card-top"><h2>Nhịp khám phá</h2><span>Lượt mở di tích / ngày</span></div><div class="heatmap-grid">${d.series.map((n,i)=>`<div style="--intensity:${n?Math.max(.2,n/Math.max(1,...d.series)):0}" title="${d.dates[i]}: ${n} lượt xem"><b>${n}</b><small>${d.dates[i].slice(-2)}</small></div>`).join('')}</div><p class="admin-muted">${d.dates[0]} — ${d.dates.at(-1)}</p></article><article class="admin-card admin-kpi"><h2>${icon('book')} Thư viện di sản</h2><strong class="admin-number">${places.length}</strong><p class="admin-muted">${Object.keys(state.drafts).length} bản chỉnh sửa cục bộ</p><button class="text-button" data-admin-tab="content">Biên tập ${icon('arrow')}</button></article><article class="admin-card admin-kpi"><h2>${icon('check')} Chờ duyệt nội dung</h2><strong class="admin-number">${Object.values(state.drafts).filter(x=>x.status==='Chờ duyệt').length}</strong><p class="admin-muted">Trạng thái trên thiết bị này</p><button class="text-button" data-admin-review>Xem danh sách ${icon('arrow')}</button></article><div class="admin-ranking-wrap">${adminRanking(d)}</div></div>`}
function exportAdmin(){
  if(state.adminMode==='server' && (staffAnalytics.status!=='ready'||staffAnalytics.days!==state.adminPeriod)) {
    toast('Chưa tải được dữ liệu PostgreSQL để xuất CSV.');return;
  }
  const d=adminData();
  const labels={vi:'Tiếng Việt',en:'English',zh:'中文',ja:'日本語',ko:'한국어',fr:'Français',de:'Deutsch'};
  const rows=[['Nguồn',state.adminMode==='server'?'PostgreSQL':state.adminMode==='demo'?'Minh họa':'Thiết bị này'],
    ['Khoảng thời gian',state.adminPeriod+' ngày'],['Ngày','Lượt mở di tích'],
    ...d.dates.map((date,i)=>[date,d.series[i]]),[],['Di tích','Lượt mở thông tin'],
    ...d.rankings.map(p=>[p.name,p.value]),[],['Ngôn ngữ TTS','Lượt bắt đầu'],
    ...Object.entries(labels).map(([code,label])=>[label,d.languages?.[code]??(code==='vi'?d.vi:code==='en'?d.en:0)]),
    ['Lượt bắt đầu tuyến',d.starts]];
  const csv='\uFEFF'+rows.map(r=>r.map(x=>'"'+String(x).replace(/"/g,'""')+'"').join(',')).join('\r\n');
  const url=URL.createObjectURL(new Blob([csv],{type:'text/csv;charset=utf-8;'}));
  const a=document.createElement('a');a.href=url;
  a.download='hue-guide-thong-ke-'+state.adminMode+'.csv';a.click();
  setTimeout(()=>URL.revokeObjectURL(url),1000);toast('Đã xuất báo cáo CSV.');
}
// M3.7 Visitor Real Data — no prototype fallback when public API is offline.
function huePublishedStatusPanel(){const failed=attractionApi.status==='error';return `${header('Di tích Huế','Khám phá di tích và danh thắng Huế.')}
  <article class="glass hue-data-state" role="status"><h2>${failed?'Không tải được dữ liệu di tích':'Đang tải di tích…'}</h2>
  <p>${esc(attractionApi.message)}</p>${failed?'<button type="button" class="button small" id="hue-attractions-retry">Thử tải lại</button>':''}</article>`;}
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
  huePublicRouteMap.destroy();
  const visitorNeedsAttractions=!IS_ADMIN && ['home','explore','popular','map','audio'].includes(state.page);
  content.innerHTML=visitorNeedsAttractions && attractionApi.status!=='ready'?huePublishedStatusPanel():pages[state.page]();
  if (state.page === 'map' && attractionApi.status === 'ready') {
    window.HueMap?.mount(places, state.mapId, state.location);
    window.HueMap?.showHistory(hueGpsHistory.points);
  }
  if (state.page === 'routes' && publicRouteApi.detailStatus === 'ready' && publicRouteApi.detail?.stops?.length) {
    huePublicRouteMap.mount(publicRouteApi.detail.stops, publicRouteApi.detail.id);
  }
  document.title = (IS_ADMIN ? 'Quản trị di sản' : $('#breadcrumb').textContent) + ' — Hue Guide';
  updateDock(); syncPromoTimer();
  if (state.page === 'chat') scrollChat();
  if (['home','weather'].includes(state.page)) loadWeather();
}

function detail(id) {
  const p = places.find(item => item.id === id);
  if (!p) { toast('Không tìm thấy di tích được chọn.'); return; }
  trackEvent('detail', id);
  if (!state.viewed.includes(id)) { state.viewed.push(id); write('hue-viewed', state.viewed); }
  state.recent = [id, ...state.recent.filter(x => x !== id)].slice(0, 5);
  write('hue-recent', state.recent);
  heritageGalleryState.slug = id;
  heritageGalleryState.index = 0;

  // File uploads are optional; narrated text is the primary experience.
  const validLocation = validHuePoint(p.latitude, p.longitude);
  const lat = Number(p.latitude), lon = Number(p.longitude);
  const mapEmbed = validLocation ? (()=>{
    const bbox = [lon-.008, lat-.006, lon+.008, lat+.006].join(',');
    return `<iframe title="Bản đồ vị trí ${esc(p.name)}" loading="lazy" referrerpolicy="no-referrer"
      src="https://www.openstreetmap.org/export/embed.html?bbox=${encodeURIComponent(bbox)}&layer=mapnik&marker=${lat}%2C${lon}"></iframe>`;
  })() : `<p>Địa điểm chưa có tọa độ công khai hợp lệ.</p>`;

  openModal(`<div class="hue-heritage-detail">
    <p class="eyebrow">KHÁM PHÁ DI SẢN · ${esc(p.type.toUpperCase())}</p>
    <h2>${esc(p.name)}</h2>
    <p class="hue-detail-intro">${esc(p.intro)}</p>
    ${heritageGalleryContent(p)}
    <p>${esc(p.text)}</p>
    <div class="notice">Chọn “Nghe thuyết minh” để chọn 1 trong 7 ngôn ngữ và nghe nội dung đã xuất bản bằng giọng đọc tự động.</div>
    <div class="modal-actions">
      <button class="button" data-audio="${esc(id)}">${icon('headphones')} Nghe thuyết minh · 7 ngôn ngữ</button>
      <button class="button outline" data-show-map="${esc(id)}">${icon('map')} Mở bản đồ di tích</button>
    </div>
    <div class="hue-detail-map">
      <h3>${icon('map')} Vị trí di tích</h3>
      <p>Vị trí trên bản đồ là tọa độ tham khảo, không đảm bảo đúng cổng vào.</p>
      ${mapEmbed}
      <div class="hue-map-caption">Bản đồ tham quan Huế · OpenStreetMap</div>
    </div>
    <p class="source-info">Giọng đọc từ trình duyệt và nội dung đã xuất bản trên Backend. Nội dung lịch sử và lối vào cần được đối chiếu với nguồn có thẩm quyền.</p>
  </div>`);
  document.querySelector('#modal .modal')?.classList.add('hue-heritage-modal');
  // Record an actual detail opening, not a demo slug or a homepage render.
  const attractionId = Number(p.dbId);
  if (!IS_ADMIN && Number.isSafeInteger(attractionId) && attractionId > 0) {
    void sendVisitorAnalyticsEvent({event_type:'attraction_view', attraction_id:attractionId});
  }
}

function openModal(html){lastFocused=document.activeElement;$('#modal').innerHTML=`<section class="modal" role="dialog" aria-modal="true" aria-label="Thông tin di tích"><button class="icon-button modal-close" id="close-modal" aria-label="Đóng">${icon('close')}</button>${html}</section>`;$('#modal').hidden=false;document.body.style.overflow='hidden';$('#close-modal').focus()}
function closeModal(){if($('#modal').hidden)return;$('#modal').querySelectorAll('audio[data-hue-real-audio]').forEach(a=>a.pause());$('#modal').hidden=true;document.body.style.overflow='';lastFocused?.focus?.()}
function edit(id){const p=byId(id),d=state.drafts[id]||{};openModal(`<p class="eyebrow">BIÊN TẬP NỘI DUNG · MÔ PHỎNG</p><h2>${p.name}</h2><form id="edit-form" data-id="${id}"><label for="edit-name">Tên di tích</label><input id="edit-name" name="name" value="${esc(d.name||p.name)}" maxlength="100" required><label for="edit-description">Nội dung giới thiệu</label><textarea id="edit-description" name="description" maxlength="4000" required>${esc(d.description||p.text)}</textarea><label for="edit-source">Nguồn tham khảo</label><input id="edit-source" name="source" value="${esc(d.source||'')}" placeholder="Tên tài liệu hoặc nguồn cần kiểm chứng" maxlength="300"><div class="modal-actions"><button class="button" type="submit" name="action" value="draft">Lưu bản nháp</button><button class="button outline" type="submit" name="action" value="review">Gửi duyệt</button></div><div class="notice">Gửi duyệt yêu cầu có nguồn tham khảo. Đây là trạng thái mô phỏng, không xuất bản nội dung ra máy chủ.</div></form>`)}
function formatTime(s){return Math.floor(s/60).toString().padStart(2,'0')+':'+Math.floor(s%60).toString().padStart(2,'0')}
function stopAudio(update=true){document.querySelectorAll('audio[data-hue-real-audio]').forEach(a=>a.pause());speechSynthesisSafe()?.cancel();clearInterval(timer);hueGpsTour.autoSpeaking=false;state.playing=false;state.paused=false;state.progress=0;state.elapsed=0;state.utterance=null;if(update){if(['audio','home'].includes(state.page))render();else updateDock()}}
function speechSynthesisSafe(){return 'speechSynthesis'in window?window.speechSynthesis:null}
// M4.0 Browser TTS Voice, Rate & GPS Opt-In
// On-device preferences only. GPS and automatic narration remain separately opt-in.
const hueTtsPrefs={
  rate:[0.8,0.9,1,1.1,1.2,1.3].includes(Number(read('hue-tts-rate-v1',0.9)))?Number(read('hue-tts-rate-v1',0.9)):0.9,
  voiceByLocale:read('hue-tts-voice-map-v1',{}),
  autoGps:false
};
if(!hueTtsPrefs.voiceByLocale || typeof hueTtsPrefs.voiceByLocale!=='object' || Array.isArray(hueTtsPrefs.voiceByLocale))hueTtsPrefs.voiceByLocale={};
function hueTtsVoiceKey(v){return [v.lang,v.name,v.voiceURI].map(x=>String(x||'')).join('|')}
function hueTtsVoices(){
  const synth=speechSynthesisSafe();
  const locale=state.audioLanguage.toLowerCase(),base=narrationLanguage();
  const all=synth?Array.from(synth.getVoices()):[];
  const exact=all.filter(v=>String(v.lang).toLowerCase()===locale);
  return exact.length?exact:all.filter(v=>String(v.lang).toLowerCase().split('-')[0]===base);
}
function hueTtsSelectedVoice(){
  const voices=hueTtsVoices();
  return voices.find(v=>hueTtsVoiceKey(v)===hueTtsPrefs.voiceByLocale[state.audioLanguage])||
    voices.find(v=>v.default)||voices[0]||null;
}
function hueTtsVoiceSelectHtml(){
  const voices=hueTtsVoices(),selected=hueTtsSelectedVoice();
  return `<select id="audio-voice" aria-label="Chọn giọng đọc" ${voices.length?'':'disabled'}>
    ${voices.length?voices.map(v=>`<option value="${esc(hueTtsVoiceKey(v))}" ${v===selected?'selected':''}>${esc(v.name)} (${esc(v.lang)})</option>`).join(''):'<option>Thiết bị chưa có giọng phù hợp</option>'}
  </select>`;
}
function hueTtsAutoGpsHtml(){return `<label class="hue-tts-check"><input type="checkbox" id="hue-tts-auto-gps" ${hueTtsPrefs.autoGps?'checked':''}><span>Tự thuyết minh khi đến gần di tích</span></label>`}
function hueTtsControlsHtml(){
 return `<div class="hue-tts-settings" aria-label="Tùy chỉnh giọng thuyết minh">
   <label class="hue-tts-field"><span>Giọng đọc</span>${hueTtsVoiceSelectHtml()}</label>
   <label class="hue-tts-field"><span>Tốc độ</span><select id="audio-speed" aria-label="Tốc độ giọng đọc">
     ${[0.8,0.9,1,1.1,1.2,1.3].map(n=>`<option value="${n}" ${n===hueTtsPrefs.rate?'selected':''}>${n.toFixed(1)}×</option>`).join('')}
   </select></label>
   <button class="button outline small" type="button" id="hue-tts-preview">Nghe thử giọng</button>
   ${hueTtsAutoGpsHtml()}
 </div>`;
}
function hueTtsRefreshVoices(){
  const select=document.getElementById('audio-voice');
  if(select) select.outerHTML=hueTtsVoiceSelectHtml();
}
function hueTtsPreview(){
  const synth=speechSynthesisSafe(),p=byId(state.trackId),n=publishedNarration(p),v=hueTtsSelectedVoice();
  if(!synth||typeof SpeechSynthesisUtterance==='undefined'||!v){toast('Thiết bị chưa có giọng đọc phù hợp.');return}
  if(!n?.description){toast('Di tích này chưa có nội dung thuyết minh cho ngôn ngữ đã chọn.');return}
  stopAudio(false); // do not record a sample as an actual narrated visit
  const u=new SpeechSynthesisUtterance(n.description.slice(0,180));
  u.voice=v;u.lang=state.audioLanguage;u.rate=hueTtsPrefs.rate;
  u.onerror=e=>{if(!['interrupted','canceled'].includes(e.error))toast('Không nghe thử được trên trình duyệt này.');};
  synth.speak(u);
}
function hueTtsRestartIfPlaying(){
  if(!state.playing)return;
  stopAudio(false);playAudio(); // browser TTS does not change voice/speed mid-sentence
}
function hueTtsChange(e){
  if(IS_ADMIN)return;
  const el=e.target;
  if(el?.id==='audio-voice'){
    const chosen=hueTtsVoices().find(v=>hueTtsVoiceKey(v)===el.value);
    if(!chosen)return;
    hueTtsPrefs.voiceByLocale[state.audioLanguage]=hueTtsVoiceKey(chosen);
    write('hue-tts-voice-map-v1',hueTtsPrefs.voiceByLocale);
    hueTtsRestartIfPlaying();
  } else if(el?.id==='audio-speed'){
    const next=Number(el.value);
    if(![0.8,0.9,1,1.1,1.2,1.3].includes(next))return;
    hueTtsPrefs.rate=next;write('hue-tts-rate-v1',next);hueTtsRestartIfPlaying();
  } else if(el?.id==='hue-tts-auto-gps'){
    hueTtsPrefs.autoGps=Boolean(el.checked);
    if(!hueTtsPrefs.autoGps&&hueGpsTour.autoSpeaking)stopAudio(false);
    hueGpsTour.lastVisited=null;hueGpsTour.lastVisitAt=0;hueGpsTour.lastRequest=0;
    if(hueTtsPrefs.autoGps&&hueGpsTour.mode==='simulation'&&hueGpsTour.testNear){
      const p=places.find(x=>x.id===hueGpsTour.testSlug&&x.dbId);
      if(p)hueGpsListenTo(p,true);
    }
    if(state.page==='map')hueRefreshGpsUi();else if(state.page==='audio')render();
  }
}
if(!IS_ADMIN){
  document.addEventListener('change',hueTtsChange,true);
  document.addEventListener('click',e=>{if(e.target.closest?.('#hue-tts-preview'))hueTtsPreview()},true);
  const synth=speechSynthesisSafe();
  synth?.addEventListener?.('voiceschanged',hueTtsRefreshVoices);
}


function selectTrack(id) {
  stopAudio(false);
  state.trackId=id;
  const p=byId(id);
  if (narrationLanguage() !== 'vi') ensureNarration(p);
  if(state.page==='audio') render(); else navigate('audio');
}
function playAudio() {
  const synth = speechSynthesisSafe();
  if (!synth || typeof SpeechSynthesisUtterance === 'undefined') {
    toast('Trình duyệt không hỗ trợ Text-to-Speech. Bạn vẫn có thể đọc nội dung.'); return;
  }
  if (state.playing) {
    if (state.paused) {synth.resume();state.paused=false;audioStarted=Date.now()-state.elapsed*1000;}
    else {synth.pause();state.paused=true;}
    if(['home','audio'].includes(state.page))render();else updateDock();
    return;
  }
  const p=byId(state.trackId);
  const narration=publishedNarration(p);
  if (!narration?.description) {
    if(narrationLanguage() !== 'vi') ensureNarration(p);
    toast('Chưa có nội dung cho ngôn ngữ này.');
    if(state.page!=='audio')navigate('audio');
    return;
  }
  const language=narrationLanguage();
  const selected=hueTtsSelectedVoice();
  if (!selected) {
    toast('Thiết bị chưa có giọng đọc cho ngôn ngữ này. Hãy cài thêm giọng hệ thống hoặc thử trình duyệt khác.');
    return;
  }
  const u=new SpeechSynthesisUtterance(narration.description);
  u.lang=state.audioLanguage;u.voice=selected;u.rate=hueTtsPrefs.rate;
  // SpeechSynthesisUtterance.start fires only when speech actually begins.
  // Capture the ID/language now; changing controls later cannot alter this event.
  const spokenAttractionId = Number(p.dbId);
  const spokenLanguage = language;
  const simulatedSpeech = hueGpsTour.simulationSpeech === true;
  let ttsEventRecorded = false;
  u.onstart = () => {
    if (ttsEventRecorded || state.utterance !== u) return;
    ttsEventRecorded = true;
    if (!simulatedSpeech && Number.isSafeInteger(spokenAttractionId) && spokenAttractionId > 0) {
      void sendVisitorAnalyticsEvent({
        event_type:'tts_started',
        attraction_id:spokenAttractionId,
        language_code:spokenLanguage
      });
    }
  };
  u.onboundary=e=>{state.progress=Math.min(100,(e.charIndex/Math.max(1,u.text.length))*100);const bar=$('#audio-progress');if(bar)bar.style.setProperty('--progress',state.progress+'%');};
  u.onend=()=>{clearInterval(timer);hueGpsTour.autoSpeaking=false;state.playing=false;state.paused=false;state.progress=100;if(['home','audio'].includes(state.page))render();else updateDock();};
  u.onerror=e=>{if(['canceled','interrupted'].includes(e.error))return;stopAudio();toast(e.error==='not-allowed'?'Trình duyệt chặn tự phát. Hãy bấm Nghe để bắt đầu.':'Chưa phát được giọng đọc.');};
  if (!simulatedSpeech) trackEvent('audio',p.id,state.audioLanguage);
  synth.cancel(); // replace a previous voice preview instead of queuing behind it
  state.utterance=u;state.playing=true;state.paused=false;audioStarted=Date.now();synth.speak(u);
  timer=setInterval(()=>{if(!state.paused){state.elapsed=(Date.now()-audioStarted)/1000;if($('#audio-elapsed'))$('#audio-elapsed').textContent=formatTime(state.elapsed);}},500);
  if(['home','audio'].includes(state.page))render();else updateDock();
}
function updateDock(){const dock=$('#audio-dock');dock.hidden=!state.playing||['home','audio'].includes(state.page);if(!dock.hidden)dock.innerHTML=`<div><strong>${byId(state.trackId).name}</strong><small>${state.paused?'Đã tạm dừng':'Đang thuyết minh'}</small></div><button data-play aria-label="Phát hoặc tạm dừng">${icon(state.paused?'play':'pause')}</button><button data-page="audio" aria-label="Mở trình phát">${icon('external')}</button><button id="dock-stop" aria-label="Dừng">${icon('close')}</button>`}
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
      : 'Chưa kết nối được trợ lý. Vui lòng thử lại sau.';
    state.chat.push({role:'assistant',text,source:''});
  } finally {
    if(version===chatResetVersion){state.chatBusy=false;if(state.page==='chat')render()}
  }
}
// M3.5 — Opt-in live geolocation + local-only simulated visit testing.
// Simulator never calls /location-suggestions and never records TTS analytics.
const hueGpsDemoAvailable = ['localhost', '127.0.0.1'].includes(location.hostname);
const hueGpsTour = {
  mode: 'off', watchId: null, watchGeneration: 0, lastRequest: 0,
  busy: false, lastVisited: null, lastVisitAt: 0,
  testSlug: '', testNear: false, simulationSpeech: false,
  status: 'Bật GPS để theo dõi vị trí khi trang đang mở.'
};

// M3.7 Visitor GPS History: explicitly opted-in, browser-only, 7-day/200-point limit.
const HUE_HISTORY_KEY='hue-real-gps-history-v1';
function hueHistorySanitize(rows){
 const now=Date.now();
 return (Array.isArray(rows)?rows:[]).filter(p=>{
  return p && validHuePoint(Number(p.latitude),Number(p.longitude)) &&
    Number.isFinite(Number(p.time)) && Number(p.time)<=now+60000 && now-Number(p.time)<=7*86400000 &&
    now-Number(p.time)>=0 && Number(p.accuracy)>=0 && Number(p.accuracy)<=100;
 }).slice(-200).map(p=>({latitude:Number(p.latitude),longitude:Number(p.longitude),
   time:Number(p.time),accuracy:Number(p.accuracy)}));
}
function hueHistoryLoad(){try{return hueHistorySanitize(JSON.parse(localStorage.getItem(HUE_HISTORY_KEY)||'[]'))}catch{return []}}
const hueGpsHistory={saving:false,points:hueHistoryLoad()};
function hueHistorySave(){
 try{localStorage.setItem(HUE_HISTORY_KEY,JSON.stringify(hueGpsHistory.points));return true}
 catch{hueGpsHistory.saving=false;toast('Không thể lưu lịch sử GPS trên thiết bị.');return false}
}
function hueHistoryRecord(position){
 if(!hueGpsHistory.saving || hueGpsTour.mode!=='real')return;
 const latitude=Number(position?.coords?.latitude),longitude=Number(position?.coords?.longitude);
 const accuracy=Number(position?.coords?.accuracy),time=Date.now();
 if(!validHuePoint(latitude,longitude)||!Number.isFinite(accuracy)||accuracy>100||accuracy<0)return;
 const last=hueGpsHistory.points.at(-1);
 if(last && (time-last.time<20000 || hueGpsDistanceM(last.latitude,last.longitude,latitude,longitude)<15))return;
 hueGpsHistory.points=hueHistorySanitize([...hueGpsHistory.points,{latitude,longitude,accuracy,time}]);
 if(hueHistorySave())window.HueMap?.showHistory(hueGpsHistory.points);
}
function hueHistoryToggle(){if(hueGpsTour.mode!=='real'&&!hueGpsHistory.saving){toast('Bật GPS thật trước khi lưu lịch sử.');return;}hueGpsHistory.saving=!hueGpsHistory.saving;hueRefreshGpsUi()}
function hueHistoryClear(){
 if(!window.confirm('Xóa toàn bộ lịch sử GPS đã lưu trên trình duyệt này?'))return;
 hueGpsHistory.points=[];hueHistorySave();window.HueMap?.showHistory([]);hueRefreshGpsUi();
}
function hueHistoryPanel(){
 const rows=hueGpsHistory.points.slice(-8).reverse();
 return `<section class="hue-history-panel" aria-label="Lịch sử GPS thực">
  <div class="hue-history-heading"><div><h3>Lịch sử hành trình</h3>
  <p>Chỉ lưu GPS thật trên trình duyệt này, tối đa 200 điểm trong 7 ngày. Không gửi lên máy chủ, không lưu GPS ảo.</p></div>
  <span class="hue-history-count">${hueGpsHistory.points.length} điểm</span></div>
  <div class="hue-history-actions"><button class="button ${hueGpsHistory.saving?'outline':''} small" type="button" id="hue-history-toggle"
  aria-pressed="${hueGpsHistory.saving}">${hueGpsHistory.saving?'Dừng lưu lịch sử':'Bật lưu lịch sử GPS thật'}</button>
  <button class="button outline small" id="hue-history-clear" type="button" ${hueGpsHistory.points.length?'':'disabled'}>Xóa lịch sử</button></div>
  ${rows.length?`<ol class="hue-history-list">${rows.map(p=>`<li><span>${new Intl.DateTimeFormat('vi-VN',{day:'2-digit',month:'2-digit',hour:'2-digit',minute:'2-digit'}).format(new Date(p.time))}
   · Sai số ${Math.round(p.accuracy)} m</span><a rel="noopener noreferrer" target="_blank" href="https://www.google.com/maps/search/?api=1&amp;query=${encodeURIComponent(p.latitude+','+p.longitude)}">Xem vị trí ↗</a></li>`).join('')}</ol>`:'<p class="hue-history-empty">Chưa có vị trí GPS thật nào được lưu.</p>'}
 </section>`;
}
// M3.6 Visitor GPS UI — visitor wording, visually distinct GPS and simulation modes.
function hueGpsControlsHtml() {
  const running=hueGpsTour.mode==='real';
  const sim=hueGpsTour.mode==='simulation';
  const siteOptions=places.filter(p=>p.dbId&&validHuePoint(p.latitude,p.longitude))
    .map(p=>`<option value="${esc(p.id)}" ${hueGpsTour.testSlug===p.id?'selected':''}>${esc(p.name)}</option>`).join('');
  return `<section class="hue-location-panel" aria-label="Trợ lý thuyết minh theo vị trí">
    <div class="hue-location-header"><div><span class="hue-location-eyebrow">ĐỒNG HÀNH KHÁM PHÁ HUẾ</span><h2>Thuyết minh theo bước chân</h2><p>Bật vị trí để lắng nghe câu chuyện khi đến gần di tích.</p></div>
      <span class="hue-location-state ${sim?'is-demo':running?'is-real':'is-off'}">${sim?'● Đang mô phỏng':running?'● GPS đang bật':'○ GPS chưa bật'}</span></div>
    <div class="hue-location-actions">
      ${running?'<button type="button" class="button outline" id="hue-gps-stop">Tắt định vị</button>':'<button type="button" class="button" id="enable-gps">Bật GPS</button>'}
      <span class="hue-location-privacy">Bạn quyết định khi nào bật GPS và lưu lịch sử trên thiết bị.</span></div>
    ${hueTtsAutoGpsHtml()}
    <div class="hue-location-message" role="status" id="hue-gps-mode-status">${esc(hueGpsTour.status)}</div>
    ${hueHistoryPanel()}
    ${hueGpsDemoAvailable ? `<div class="hue-simulation-studio">
      <div class="hue-simulation-heading"><div><span class="hue-location-eyebrow">TRẢI NGHIỆM THỬ</span><h3>Chọn di tích để mô phỏng</h3><p>Khám phá tính năng ngay tại nhà, không cần đến Huế.</p></div><span class="hue-simulation-label">Vị trí ảo</span></div>
      <label class="hue-simulation-select-label" for="hue-gps-sim-site">Điểm tham quan</label>
      <div class="hue-simulation-select-wrap"><select id="hue-gps-sim-site" aria-label="Di tích mô phỏng">${siteOptions||'<option value="">Chưa có di tích để chọn</option>'}</select></div>
      <div class="hue-simulation-actions"><button type="button" class="button small" id="hue-gps-sim-arrive" ${siteOptions?'':'disabled'}>Đến gần di tích</button>
      <button type="button" class="button outline small" id="hue-gps-sim-leave" ${sim?'':'disabled'}>Đi ra xa</button>
      ${sim?'<button type="button" class="text-button" id="hue-gps-stop">Kết thúc mô phỏng</button>':''}</div>
      <p class="hue-simulation-help">Chấm màu hổ phách trên bản đồ là vị trí giả lập. Không dùng GPS của thiết bị.</p>
      </div>` : ''}
    </section>`;
}

function hueRefreshGpsUi() {
  if (state.page !== 'map') return;
  const controls = document.getElementById('hue-gps-controls');
  if (controls) controls.innerHTML = hueGpsControlsHtml();
  const suggestions = document.getElementById('hue-gps-results');
  if (suggestions) suggestions.innerHTML = renderNearbyGpsPanel();
}
function hueGpsResetSuggestions() {
  nearbyGps.requestId += 1;
  nearbyGps.status = 'idle'; nearbyGps.items = []; nearbyGps.message = '';
}
function hueGpsClearTracking() {
  hueGpsTour.watchGeneration += 1;
  if (hueGpsTour.watchId !== null && navigator.geolocation) {
    navigator.geolocation.clearWatch(hueGpsTour.watchId);
  }
  hueGpsTour.watchId = null;
  hueGpsTour.busy = false;
}
function hueStopGps(show=true) {
  hueGpsClearTracking();
  hueGpsTour.mode = 'off'; hueGpsHistory.saving=false; hueGpsTour.testNear = false;
  hueGpsTour.lastVisited = null; hueGpsTour.lastVisitAt = 0;
  hueGpsTour.simulationSpeech = false;
  hueGpsTour.status = 'Đã tắt GPS và chế độ mô phỏng.';
  state.location = null;
  window.HueMap?.showLocation(null);
  hueGpsResetSuggestions();
  if (show && state.page === 'map') render();
}
function hueGpsDistanceM(lat1, lon1, lat2, lon2) {
  const rad = n => n * Math.PI / 180;
  const a = Math.sin(rad(lat2-lat1)/2)**2 +
    Math.cos(rad(lat1)) * Math.cos(rad(lat2)) * Math.sin(rad(lon2-lon1)/2)**2;
  return Math.round(2 * 6371000 * Math.asin(Math.min(1, Math.sqrt(a))));
}
function hueGpsUpdateMapLocation(point) {
  if (!validHuePoint(Number(point.latitude), Number(point.longitude))) return;
  // M3.6: Only transient marker state; preserve existing real/virtual GPS separation.
  const accuracy=Number(point.accuracy_m);
  state.location={latitude:Number(point.latitude),longitude:Number(point.longitude),
    mode:hueGpsTour.mode==='simulation'?'simulation':'real',
    accuracy_m:Number.isFinite(accuracy)&&accuracy>0?accuracy:null};
  if(state.page==='map')window.HueMap?.showLocation(state.location);
}

function hueGpsListenTo(p, simulated=false, manual=false) {
  if (!p?.dbId) return;
  if (!hueTtsPrefs.autoGps && !manual) {
    hueGpsTour.status=`Đã đến ${p.name}. Bấm “Nghe ngay” để nghe thuyết minh.`;
    hueRefreshGpsUi();
    return;
  }
  const locale = narrationLanguage();
  if (locale !== 'vi') {
    // No synthesized translated text: only published localization is allowed.
    if (!publishedNarration(p)) {
      void ensureNarration(p);
      hueGpsTour.status = 'Đang chuẩn bị thuyết minh. Bạn có thể bấm Nghe khi sẵn sàng.';
      hueRefreshGpsUi();
      return;
    }
  }
  if (!publishedNarration(p)?.description) {
    hueGpsTour.status = `${p.name} chưa có nội dung thuyết minh để phát.`;
    hueRefreshGpsUi();
    return;
  }
  // Do not interrupt a visitor's manually playing narration.
  if (state.playing && !hueGpsTour.autoSpeaking) {
    hueGpsTour.status = `Đã đến ${p.name}. Bạn đang nghe bản khác; bấm “Nghe ngay” để chuyển.`;
    hueRefreshGpsUi();
    return;
  }
  stopAudio(false);
  state.trackId = p.id;
  hueGpsTour.simulationSpeech = simulated;
  try { playAudio(); }
  finally { hueGpsTour.simulationSpeech = false; }
  hueGpsTour.autoSpeaking = Boolean(state.playing);
  hueGpsTour.status = state.playing
    ? `Đang thuyết minh ${p.name}${simulated?' (định vị ảo)':''}.`
    : `Đã đến ${p.name}. Nếu máy không tự phát, hãy bấm “Nghe ngay”.`;
  hueRefreshGpsUi();
}
function hueGpsManualListen(slug) {
  const p = places.find(x => x.id === slug && x.dbId);
  if (!p) return;
  // Manual click may override an earlier narration.
  stopAudio(false);
  hueGpsTour.autoSpeaking = true;
  hueGpsListenTo(p, hueGpsTour.mode === 'simulation', true);
}
function renderNearbyGpsPanel() {
  if (nearbyGps.status === 'idle') return '';
  let body = '';
  if (nearbyGps.status === 'loading') body = '<p>Đang tìm di tích gần bạn…</p>';
  else if (nearbyGps.status === 'error') body = `<p role="status">${esc(nearbyGps.message)}</p>`;
  else if (!nearbyGps.items.length) body = `<p role="status">${esc(nearbyGps.message || 'Chưa có điểm trong phạm vi. Bạn vẫn có thể chọn di tích thủ công.')}</p>`;
  else body = nearbyGps.items.map(item => {
    const p = places.find(x => x.dbId === Number(item.attraction_id));
    if (!p) return '';
    const distance = Number(item.distance_m);
    return `<div style="display:flex;gap:6px;align-items:center;flex-wrap:wrap">
      <b>${esc(p.name)}${Number.isFinite(distance)?` · ${Math.round(distance)} m`:''}</b>
      <button class="button outline small" data-hue-gps-listen="${esc(p.id)}">Nghe ngay ${icon('headphones')}</button>
      <button class="text-button" data-detail="${esc(p.id)}">Xem chi tiết</button>
    </div>`;
  }).join('');
  return `<section class="glass hue-gps-suggestions" aria-live="polite" style="padding:16px;margin:12px 0">
    <div class="card-top"><h2>Di tích gần bạn</h2>${icon('pin')}</div>
    <div style="display:grid;gap:8px">${body}</div>
    <small>${hueGpsTour.mode==='simulation'?'KẾT QUẢ MÔ PHỎNG — không phải GPS thật.':'Gợi ý các di tích gần vị trí hiện tại của bạn.'}</small>
  </section>`;
}
async function requestNearbyGpsSuggestions(position) {
  const requestId = ++nearbyGps.requestId;
  nearbyGps.status = 'loading'; nearbyGps.items=[]; nearbyGps.message='';
  hueRefreshGpsUi();
  try {
    const token = await audioVisitorToken();
    const response = await fetch('/api/v1/location-suggestions', {
      method:'POST', cache:'no-store',
      headers:{'Content-Type':'application/json', Authorization:`Bearer ${token}`},
      body:JSON.stringify({
        latitude:position.coords.latitude, longitude:position.coords.longitude,
        accuracy_m:position.coords.accuracy,
        sampled_at:new Date(position.timestamp).toISOString()
      })
    });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const payload = await response.json();
    if (!Array.isArray(payload?.data)) throw new Error('GPS API response không hợp lệ');
    if (requestId !== nearbyGps.requestId || hueGpsTour.mode !== 'real') return;
    nearbyGps.status='ready';
    nearbyGps.items=payload.data.filter(item =>
      places.some(p => p.dbId === Number(item.attraction_id)));
    nearbyGps.message=payload?.meta?.manual_selection_recommended
      ? 'Sai số GPS quá lớn. Vui lòng chọn di tích thủ công.'
      : 'Chưa có điểm mới trong bán kính, hoặc điểm đã được gợi ý gần đây.';
    if (nearbyGps.items.length && !document.hidden) {
      const item=nearbyGps.items[0];
      const p=places.find(x => x.dbId===Number(item.attraction_id));
      const now=Date.now();
      if (p && hueTtsPrefs.autoGps && !(hueGpsTour.lastVisited===p.id && now-hueGpsTour.lastVisitAt<300000)) {
        hueGpsTour.lastVisited=p.id; hueGpsTour.lastVisitAt=now;
        state.mapId=p.id;
        window.HueMap?.focus(p.id);
        hueGpsListenTo(p,false);
      }
    }
  } catch(err) {
    if (requestId !== nearbyGps.requestId || hueGpsTour.mode !== 'real') return;
    nearbyGps.status='error'; nearbyGps.items=[];
    nearbyGps.message='Không kết nối được API gợi ý GPS. Bạn vẫn có thể chọn di tích thủ công.';
    console.warn('[Auto GPS]',err);
  } finally {
    if (requestId===nearbyGps.requestId) hueRefreshGpsUi();
  }
}
function hueGpsOnPosition(position, generation) {
  if (hueGpsTour.mode !== 'real' || generation !== hueGpsTour.watchGeneration || document.hidden) return;
  const lat=Number(position.coords.latitude), lon=Number(position.coords.longitude);
  const accuracy=Number(position.coords.accuracy);
  if (!Number.isFinite(lat) || !Number.isFinite(lon) || !Number.isFinite(accuracy)) return;
  if (!validHuePoint(lat,lon)) {
    hueGpsResetSuggestions();
    hueGpsTour.status='Bạn đang ngoài khu vực thử nghiệm Huế. Dùng chọn di tích thủ công hoặc định vị ảo trên localhost.';
    hueRefreshGpsUi();
    return;
  }
  hueGpsUpdateMapLocation({latitude:lat,longitude:lon,accuracy_m:accuracy});
  hueHistoryRecord(position);
  if (accuracy > 50) {
    nearbyGps.requestId += 1;
    nearbyGps.status='ready'; nearbyGps.items=[];
    nearbyGps.message=`GPS sai số khoảng ${Math.round(accuracy)} m (cần không quá 50 m). Chọn di tích thủ công.`;
    hueGpsTour.status='Đã nhận vị trí, đang chờ tín hiệu GPS chính xác hơn.';
    hueRefreshGpsUi();
    return;
  }
  hueGpsTour.status=`Đang theo dõi GPS thật (sai số khoảng ${Math.round(accuracy)} m).`;
  const now=Date.now();
  if (now-hueGpsTour.lastRequest < 12000 || hueGpsTour.busy) return;
  hueGpsTour.lastRequest=now; hueGpsTour.busy=true;
  Promise.resolve(requestNearbyGpsSuggestions(position)).finally(()=>{hueGpsTour.busy=false;});
}
function enableGPS() {
  if (hueGpsTour.mode === 'real') {hueStopGps();return;}
  if (!navigator.geolocation || !window.isSecureContext) {
    toast('GPS cần HTTPS hoặc localhost và quyền định vị. Bạn vẫn có thể chọn di tích thủ công.');
    return;
  }
  hueGpsClearTracking(); hueGpsResetSuggestions();
  state.location=null; hueGpsTour.autoSpeaking=false;
  hueGpsTour.mode='real'; hueGpsTour.lastRequest=0;
  hueGpsTour.lastVisited=null; hueGpsTour.lastVisitAt=0;
  hueGpsTour.status='Đang xin quyền định vị…';
  const generation=hueGpsTour.watchGeneration;
  try {
    hueGpsTour.watchId=navigator.geolocation.watchPosition(
      position => hueGpsOnPosition(position,generation),
      error => {
        if (generation!==hueGpsTour.watchGeneration || hueGpsTour.mode!=='real') return;
        hueGpsTour.status=error.code===1
          ? 'Bạn đã từ chối quyền vị trí. Có thể chọn di tích thủ công hoặc mở quyền trong cài đặt trình duyệt.'
          : 'Chưa nhận được tín hiệu GPS. Hãy kiểm tra dịch vụ vị trí trên thiết bị.';
        if (error.code===1) {
          const reason=hueGpsTour.status;
          hueStopGps(false);
          hueGpsTour.status=reason;
        }
        hueRefreshGpsUi();
      }, {enableHighAccuracy:true,timeout:15000,maximumAge:5000}
    );
  } catch(err) {
    hueStopGps(false);
    toast('Không bật được định vị trên thiết bị.');
  }
  hueRefreshGpsUi();
}
function hueSimulateArrival() {
  if (!hueGpsDemoAvailable) return;
  const slug=document.getElementById('hue-gps-sim-site')?.value || hueGpsTour.testSlug;
  const p=places.find(x=>x.id===slug && x.dbId && validHuePoint(x.latitude,x.longitude));
  if (!p) {toast('Chưa có di tích để lựa chọn.');return;}
  const sameArrival=hueGpsTour.mode==='simulation' && hueGpsTour.testNear && hueGpsTour.testSlug===p.id;
  hueGpsClearTracking(); hueGpsResetSuggestions();
  hueGpsHistory.saving=false;
  hueGpsTour.mode='simulation'; hueGpsTour.testSlug=p.id;
  hueGpsTour.status=`Mô phỏng: đã đến ${p.name} (0 m).`;
  hueGpsUpdateMapLocation(p); state.mapId=p.id;
  if (state.page==='map') window.HueMap?.focus(p.id);
  nearbyGps.status='ready';
  nearbyGps.items=[{attraction_id:p.dbId,distance_m:0}];
  if (sameArrival) {hueRefreshGpsUi();return;}
  hueGpsTour.testNear=true;
  hueRefreshGpsUi();
  hueGpsListenTo(p,true);
}
function hueSimulateDeparture() {
  if (hueGpsTour.mode !== 'simulation') return;
  const p=places.find(x=>x.id===hueGpsTour.testSlug && x.dbId);
  if (p) hueGpsUpdateMapLocation({latitude:Number(p.latitude)+0.007, longitude:Number(p.longitude)});
  hueGpsTour.testNear=false;
  hueGpsTour.status='Mô phỏng: đã đi xa khoảng 780 m. Có thể thử đến gần lần nữa.';
  hueGpsResetSuggestions();
  hueRefreshGpsUi();
}

document.addEventListener('click',e=>{const b=e.target.closest('button,a');if(!b){if(e.target===$('#modal'))closeModal();return}if(!IS_ADMIN && b.dataset.hueGalleryIndex !== undefined){selectHeritagePhoto(Number(b.dataset.hueGalleryIndex));return}else if(!IS_ADMIN && b.dataset.hueGalleryMove !== undefined){selectHeritagePhoto(heritageGalleryState.index+Number(b.dataset.hueGalleryMove));return}else if(!IS_ADMIN && b.hasAttribute('data-hue-real-stop')){const audio=document.querySelector('.audio-feature audio[data-hue-real-audio]');if(audio){audio.pause();audio.currentTime=0;}return}else if(!IS_ADMIN && b.dataset.hueDetailAudio !== undefined){const id=b.dataset.hueDetailAudio;if(state.trackId!==id){stopAudio(false);state.trackId=id;}playAudio();return}else if(!IS_ADMIN && b.hasAttribute('data-hue-detail-stop')){stopAudio(false);updateDock();return}else if(!IS_ADMIN && b.id==='retry-public-routes'){publicRouteApi.status='loading';render();loadPublishedRoutesFromBackend()}else if(!IS_ADMIN&&b.dataset.publicRouteSelect){selectPublishedRoute(b.dataset.publicRouteSelect)}else if(!IS_ADMIN&&b.dataset.publicRouteRetry){selectPublishedRoute(b.dataset.publicRouteRetry)}else if(!IS_ADMIN&&b.dataset.publicStopFocus!==undefined){huePublicRouteMap.focus(Number(b.dataset.publicStopFocus))}else if(!IS_ADMIN&&b.id==='public-route-fit-all'){huePublicRouteMap.fitAll()}else if(!IS_ADMIN&&b.id==='public-route-focus-current'){huePublicRouteMap.focus(Number(state.activeRoute?.step)||0)}else if(!IS_ADMIN&&b.id==='public-route-locate-me'){locatePublicRouteUser()}else if(!IS_ADMIN&&b.id==='start-public-route'){const route=publicRouteApi.detail;if(route?.stops?.length){state.activeRoute={id:Number(route.id),step:0};write('hue-active-route',state.activeRoute);trackEvent('route',String(route.id));const analyticsRouteId = Number(route.id);

if (
  Number.isSafeInteger(analyticsRouteId) &&
  analyticsRouteId > 0
) {
  void sendVisitorAnalyticsEvent({
    event_type: 'route_started',
    route_id: analyticsRouteId
  });
};render();toast('Đã bắt đầu tuyến. Bạn chuyển điểm dừng khi sẵn sàng.')}}else if(!IS_ADMIN&&b.id==='next-public-stop'){const route=publicRouteApi.detail;if(route?.stops?.length&&validPublicRouteId(state.activeRoute?.id)===Number(route.id)){if(state.activeRoute.step < route.stops.length-1){state.activeRoute.step++;toast('Điểm tiếp theo: '+(route.stops[state.activeRoute.step].attraction_name||'Điểm dừng'))}else{state.activeRoute=null;toast('Bạn đã hoàn thành hành trình!')}write('hue-active-route',state.activeRoute);render()}}else if(!IS_ADMIN&&b.id==='end-public-route'){state.activeRoute=null;write('hue-active-route',null);render();toast('Đã kết thúc hành trình.')}else if(b.dataset.exploreType){state.query='';state.filter=b.dataset.exploreType;navigate('explore')}else if(b.dataset.promoStep){setPromo(state.promoIndex+Number(b.dataset.promoStep));syncPromoTimer()}else if(b.dataset.promoDot!==undefined){setPromo(Number(b.dataset.promoDot));syncPromoTimer()}else if(b.id==='promo-pause'){togglePromo()}else if(IS_ADMIN&&b.closest('#staff-route-form')&&(b.id==='staff-route-add-stop'||b.dataset.staffStopUp!==undefined||b.dataset.staffStopDown!==undefined||b.dataset.staffStopRemove!==undefined)){const form=b.closest('#staff-route-form');const stops=staffRouteRawStops(form);if(b.id==='staff-route-add-stop')stops.push({attraction_id:'',visit_minutes:'',travel_minutes_from_previous:''});else if(b.dataset.staffStopUp!==undefined){const i=Number(b.dataset.staffStopUp);if(i>0&&i<stops.length)[stops[i-1],stops[i]]=[stops[i],stops[i-1]]}else if(b.dataset.staffStopDown!==undefined){const i=Number(b.dataset.staffStopDown);if(i>=0&&i<stops.length-1)[stops[i+1],stops[i]]=[stops[i],stops[i+1]]}else if(b.dataset.staffStopRemove!==undefined){const i=Number(b.dataset.staffStopRemove);if(stops.length>1&&i>=0&&i<stops.length)stops.splice(i,1)}renderStaffRouteStopRows(form,stops)}else if(IS_ADMIN&&b.dataset.staffRouteWorkflow){runStaffRouteWorkflow(b.dataset.routeId,b.dataset.staffRouteWorkflow)}else if(IS_ADMIN&&b.id==='staff-route-refresh'){loadStaffRoutesFromBackend()}else if(IS_ADMIN&&b.id==='staff-route-create'){showStaffRouteForm()}else if(IS_ADMIN&&b.dataset.staffRouteDetail){showStaffRouteDetail(b.dataset.staffRouteDetail)}else if(IS_ADMIN&&b.dataset.staffRouteEdit){const r=staffRouteApi.items.find(r=>String(r.id)===String(b.dataset.staffRouteEdit));if(r)showStaffRouteForm(r)}else if(b.dataset.adminTab){const previous=state.adminTab;state.adminTab=b.dataset.adminTab;render();if(state.adminTab==='routes' && staffRouteApi.status==='idle')loadStaffRoutesFromBackend();if(previous!==state.adminTab)playCloudTransition(adminTabs.find(t=>t[0]===state.adminTab)?.[2]||'Admin');$('.sidebar').classList.remove('open')}else if(b.hasAttribute('data-admin-review')){state.adminTab='content';state.adminFilter='in_review';render()}else if(b.id==='refresh-admin-attractions'){loadStaffAttractions()}else if(b.id==='add-admin-task'){adminTaskForm()}else if(b.id==='admin-export'){exportAdmin()}else if(b.id==='admin-refresh-analytics'){void loadStaffAnalytics(true)}else if(b.dataset.taskToggle){const t=state.tasks.find(t=>t.id===b.dataset.taskToggle);if(t)t.done=!t.done;write('hue-admin-tasks',state.tasks);render()}else if(b.dataset.taskDelete){state.tasks=state.tasks.filter(t=>t.id!==b.dataset.taskDelete);write('hue-admin-tasks',state.tasks);render()}else if(b.dataset.weatherDay!==undefined){weather.day=Number(b.dataset.weatherDay);paintWeather()}else if(b.id==='refresh-weather'||b.id==='retry-weather'){loadWeather(true)}else if(b.dataset.page){state.query='';state.filter='Tất cả';navigate(b.dataset.page)}else if(b.dataset.detail)detail(b.dataset.detail);else if(b.dataset.audio){selectTrack(b.dataset.audio);closeModal()}else if(b.dataset.track)selectTrack(b.dataset.track);else if(b.hasAttribute('data-play'))playAudio();else if(b.dataset.filter){state.filter=b.dataset.filter;render()}else if(b.dataset.adminFilter){state.adminFilter=b.dataset.adminFilter;render()}else if(b.dataset.mapPoi){state.mapId=b.dataset.mapPoi;window.HueMap?.focus(state.mapId);document.querySelectorAll('.map-poi').forEach(node=>node.classList.toggle('active',node.dataset.mapPoi===state.mapId));const current=byId(state.mapId);const title=$('#hue-map-selected-name'),subtitle=$('#hue-map-selected-type'),details=$('.hue-map-selected [data-detail]'),osm=$('#hue-open-osm'),google=$('#hue-open-google-maps');if(title)title.textContent=current.name;if(subtitle)subtitle.textContent=current.type+' · Điểm tham khảo';if(details)details.dataset.detail=current.id;if(osm&&validHuePoint(current.latitude,current.longitude))osm.href=`https://www.openstreetmap.org/?mlat=${current.latitude}&mlon=${current.longitude}#map=15/${current.latitude}/${current.longitude}`;if(google)google.href=hueGoogleMapsDirections(current)}else if(b.dataset.showMap){state.mapId=b.dataset.showMap;navigate('map')}else if(b.dataset.route){state.routeId=b.dataset.route;navigate('routes')}else if(b.dataset.selectRoute){state.routeId=b.dataset.selectRoute;render()}else if(b.dataset.question)sendQuestion(b.dataset.question);else if(b.dataset.edit)edit(b.dataset.edit);else if(b.id==='close-modal')closeModal();else if(b.id==='menu-toggle')$('.sidebar').classList.toggle('open');else if(b.id==='hue-attractions-retry'){attractionApi.status='loading';render();void loadAttractionsFromBackend()}else if(b.id==='enable-gps')enableGPS();else if(b.id==='hue-gps-stop')hueStopGps();else if(b.id==='hue-history-toggle')hueHistoryToggle();else if(b.id==='hue-history-clear')hueHistoryClear();else if(b.id==='hue-gps-sim-arrive')hueSimulateArrival();else if(b.id==='hue-gps-sim-leave')hueSimulateDeparture();else if(b.dataset.hueGpsListen)hueGpsManualListen(b.dataset.hueGpsListen);else if(b.id==='toggle-real-map'){state.realMap=!state.realMap;render()}else if(b.id==='start-route'){trackEvent('route',b.dataset.id);state.activeRoute={id:b.dataset.id,step:0};write('hue-active-route',state.activeRoute);render();toast('Đã bắt đầu tuyến. Bạn tự chuyển điểm dừng khi sẵn sàng.')}else if(b.id==='next-stop'){const r=routes.find(r=>r.id===state.activeRoute.id);if(state.activeRoute.step<r.stops.length-1){state.activeRoute.step++;toast('Điểm tiếp theo: '+byId(r.stops[state.activeRoute.step]).name)}else{state.activeRoute=null;toast('Bạn đã hoàn thành hành trình mẫu!')}write('hue-active-route',state.activeRoute);render()}else if(b.id==='audio-stop'||b.id==='dock-stop')stopAudio();else if(b.id==='audio-restart'){stopAudio(false);playAudio()}else if(b.id==='clear-chat'){chatResetVersion++;window.HueChatAPI.reset();state.chat=[];state.chatBusy=false;render()}});
// A public visitor session is created in memory only to report actual MP3/WAV playback.
// If progress API fails, audio remains playable; never use a Staff session for this purpose.
let visitorAudioTokenPromise = null;
const realAudioPlays = new WeakMap();
function audioVisitorToken() {
  if (!visitorAudioTokenPromise) {
    visitorAudioTokenPromise = fetch('/api/v1/visitor-sessions', {
      method: 'POST', headers: {'Content-Type':'application/json',Accept:'application/json'},
      body: JSON.stringify({language_code: state.audioLanguage.startsWith('en') ? 'en' : 'vi'})
    }).then(async response => {
      if (!response.ok) throw new Error('Không tạo được phiên khách');
      const payload = await response.json();
      if (!payload?.data?.token) throw new Error('Không nhận được token phiên khách');
      return payload.data.token;
    }).catch(error => { visitorAudioTokenPromise = null; throw error; });
  }
  return visitorAudioTokenPromise;
}
async function beginRealAudioPlay(element) {
  if (realAudioPlays.has(element)) return;
  const id = Number(element.dataset.hueRealAudio);
  if (!Number.isSafeInteger(id) || id <= 0) return;
  const record = {playId:null, token:null, lastSaved:-1, queue:Promise.resolve(), pending:true};
  realAudioPlays.set(element, record);
  try {
    record.token = await audioVisitorToken();
    const response = await fetch('/api/v1/audio-plays', {
      method:'POST', headers:{'Content-Type':'application/json','Authorization':`Bearer ${record.token}`},
      body:JSON.stringify({media_id:id})
    });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const payload = await response.json();
    record.playId = Number(payload?.data?.id);
    if (!Number.isSafeInteger(record.playId) || record.playId <= 0) throw new Error('ID lượt nghe không hợp lệ');
    record.pending = false;
    if (element.currentTime > 0) saveRealAudioProgress(element, element.ended, true);
  } catch (error) {
    record.pending = false;
    console.warn('[Audio plays] Không lưu được lượt nghe; audio vẫn phát bình thường.', error);
  }
}
function saveRealAudioProgress(element, completed = false, force = false) {
  const record = realAudioPlays.get(element);
  if (!record?.playId || !record.token) return;
  const max = Number(element.dataset.mediaDuration);
  const seconds = Math.max(0, Math.floor(Math.min(element.currentTime || 0,
    Number.isFinite(max) && max > 0 ? max : Number.MAX_SAFE_INTEGER)));
  if (!completed && (!force && Math.abs(seconds - record.lastSaved) < 15 || seconds === record.lastSaved)) return;
  record.lastSaved = seconds;
  record.queue = record.queue.then(async () => {
    const response = await fetch(`/api/v1/audio-plays/${record.playId}`, {
      method:'PATCH', headers:{'Content-Type':'application/json','Authorization':`Bearer ${record.token}`},
      body:JSON.stringify({played_seconds:seconds,completed:Boolean(completed)})
    });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
  }).catch(error => console.warn('[Audio plays] Không cập nhật được tiến độ.', error));
}
document.addEventListener('play', event => {
  const audio = event.target;
  if (!(audio instanceof HTMLAudioElement) || !audio.matches('[data-hue-real-audio]')) return;
  speechSynthesisSafe()?.cancel();
  clearInterval(timer);state.playing=false;state.paused=false;state.utterance=null;
  updateDock();
  document.querySelectorAll('audio[data-hue-real-audio]').forEach(other=> {if(other!==audio&&!other.paused)other.pause()});
  trackEvent('audio',state.trackId,state.audioLanguage);
  beginRealAudioPlay(audio);
},true);
document.addEventListener('timeupdate', event => {
  if (event.target instanceof HTMLAudioElement && event.target.matches('[data-hue-real-audio]')) saveRealAudioProgress(event.target);
},true);
document.addEventListener('pause', event => {
  if (event.target instanceof HTMLAudioElement && event.target.matches('[data-hue-real-audio]')) saveRealAudioProgress(event.target,false,true);
},true);
document.addEventListener('seeked', event => {
  if (event.target instanceof HTMLAudioElement && event.target.matches('[data-hue-real-audio]')) saveRealAudioProgress(event.target,false,true);
},true);
document.addEventListener('ended', event => {
  if (event.target instanceof HTMLAudioElement && event.target.matches('[data-hue-real-audio]')) saveRealAudioProgress(event.target,true,true);
},true);
document.addEventListener('error', event => {
  if (event.target instanceof HTMLAudioElement && event.target.matches('[data-hue-real-audio]')) {
    toast('Không thể phát âm thanh. Vui lòng thử lại sau.');
  }
},true);

window.addEventListener('hue-map-select', e=>{if(e.detail && places.some(p=>p.id===e.detail.slug))state.mapId=e.detail.slug});
document.addEventListener('input',e=>{if(IS_ADMIN&&e.target.closest?.('#staff-route-form'))refreshStaffRouteStopSummary(e.target.closest('#staff-route-form'));if(e.target.id==='local-search'){state.query=e.target.value;if(state.page==='popular'){$('#attraction-results').innerHTML=popularResults();$('#popular-count').textContent=popularPlaces().length+' điểm đến';return}const list=filteredPlaces();$('#attraction-results').innerHTML=list.length?`<div class="hue-explorer-grid">${list.map(card).join('')}</div>`:'<div class="empty"><h2>Chưa tìm thấy di tích phù hợp</h2><p>Thử từ khóa khác hoặc bỏ bộ lọc.</p></div>'}});
document.addEventListener('change',e=>{if(IS_ADMIN&&e.target.closest?.('#staff-route-form'))refreshStaffRouteStopSummary(e.target.closest('#staff-route-form'));if(e.target.id==='staff-route-filter'){state.staffRouteFilter=e.target.value;render()}else if(e.target.id==='admin-mode'){state.adminMode=e.target.value;render();if(state.adminMode==='server')void loadStaffAnalytics()}else if(e.target.id==='admin-period'){state.adminPeriod=Number(e.target.value);render();if(state.adminMode==='server')void loadStaffAnalytics()}else if(e.target.id==='audio-language'){stopAudio(false);state.audioLanguage=e.target.value;write('hue-audio-language',state.audioLanguage);if(narrationLanguage()!=='vi')ensureNarration(byId(state.trackId));render()}});
document.addEventListener('keydown',e=>{if(!IS_ADMIN && ['ArrowLeft','ArrowRight'].includes(e.key) && e.target.closest?.('#modal .hue-gallery')){e.preventDefault();selectHeritagePhoto(heritageGalleryState.index+(e.key==='ArrowRight'?1:-1));return}if(e.target.closest?.('#promo-carousel')&&['ArrowLeft','ArrowRight'].includes(e.key)){e.preventDefault();setPromo(state.promoIndex+(e.key==='ArrowRight'?1:-1));syncPromoTimer()}if(e.key==='Escape'){closeModal();$('.sidebar').classList.remove('open')}if(e.target.id==='admin-search'&&e.key==='Enter'){state.adminSearch=e.target.value;render()}if(e.target.id==='global-search'&&e.key==='Enter'&&state.page==='admin'){state.adminSearch=e.target.value.trim();state.adminTab='content';render();return}if(e.target.id==='global-search'&&e.key==='Enter'){state.query=e.target.value.trim();state.filter='Tất cả';navigate('explore')}if(!$('#modal').hidden&&e.key==='Tab'){const items=$('#modal').querySelectorAll('button,input,textarea,a,select');const first=items[0],last=items[items.length-1];if(e.shiftKey&&document.activeElement===first){e.preventDefault();last.focus()}else if(!e.shiftKey&&document.activeElement===last){e.preventDefault();first.focus()}}});
document.addEventListener('submit',e=>{if(IS_ADMIN&&e.target.id==='staff-route-form'){e.preventDefault();saveStaffRouteForm(e.target);return}if(e.target.id==='admin-task-form'){e.preventDefault();const f=new FormData(e.target),title=String(f.get('title')||'').trim(),date=String(f.get('date')||'');if(!title||!/^\d{4}-\d{2}-\d{2}$/.test(date))return;state.tasks.push({id:String(Date.now())+Math.random().toString(36).slice(2,7),title,date,done:false});write('hue-admin-tasks',state.tasks);closeModal();render();toast('Đã lưu công việc trên thiết bị.')}else if(e.target.id==='chat-form'){e.preventDefault();const input=$('#chat-input');sendQuestion(input.value)}else if(e.target.id==='edit-form'){e.preventDefault();const id=e.target.dataset.id;const f=new FormData(e.target),source=String(f.get('source')).trim(),review=e.submitter?.value==='review';if(review&&!source){toast('Vui lòng bổ sung nguồn tham khảo trước khi gửi duyệt.');$('#edit-source').focus();return}state.drafts[id]={name:String(f.get('name')).trim(),description:String(f.get('description')).trim(),source,status:review?'Chờ duyệt':'Bản nháp'};if(!state.drafts[id].name||!state.drafts[id].description){toast('Tên và nội dung không được để trống.');return}write('hue-content-drafts',state.drafts);closeModal();render();toast(review?'Đã chuyển sang chờ duyệt trên bản mô phỏng':'Đã lưu bản nháp trên thiết bị')}});
window.addEventListener('hashchange',()=>{const previous=state.page;if(openingActive)finishOpening();if(!IS_ADMIN&&location.hash!=='#admin')trackEvent('view',location.hash.slice(1)||'home');render();if(previous!==state.page)playCloudTransition($('#breadcrumb').textContent);window.scrollTo({top:0,behavior:'instant'});$('#content').focus({preventScroll:true})});window.addEventListener('pagehide',()=>{hueStopGps(false);clearTimeout(cloudExitTimer);const cloud=$('#cloud-transition');if(cloud)cloud.hidden=true;clearInterval(promoTimer);document.querySelectorAll('audio[data-hue-real-audio]').forEach(a => a.pause());speechSynthesisSafe()?.cancel()});
if(!IS_ADMIN){injectPublicRouteStyles();injectHeritageExplorerStyles();}if(!IS_ADMIN)initOpening();if(!IS_ADMIN&&location.hash!=='#admin')trackEvent('view',location.hash.slice(1)||'home');$('#menu-toggle').innerHTML=icon('menu');$('#search-icon').innerHTML=icon('search');if($('#top-popular'))$('#top-popular').innerHTML=icon('trend');render();loadAttractionsFromBackend();if (!IS_ADMIN) {
  loadPublishedRoutesFromBackend();
};if(IS_ADMIN){loadStaffAttractions();void loadStaffAnalytics();void hueRefreshLiveVisitors();setInterval(()=>{void hueRefreshLiveVisitors()},10000);document.addEventListener('visibilitychange',()=>{if(!document.hidden)void hueRefreshLiveVisitors()});}
else {void huePresenceHeartbeat();setInterval(()=>{void huePresenceHeartbeat()},25000);document.addEventListener('visibilitychange',()=>{if(!document.hidden)void huePresenceHeartbeat()});}
