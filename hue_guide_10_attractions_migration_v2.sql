-- Hue Guide / PostgreSQL 18: thay du lieu DEV bang 10 di tich trong frontend.
-- Ban v2: don audio_plays test truoc media; MAC DINH ROLLBACK. Chi COMMIT voi -v apply=1.
-- Backup bat buoc: hue_tourism_before_cleanup.dump (user da xac nhan).
-- Khong tu dong xoa file vat ly tren dia.
-- Diem toa do la diem di tich tham khao, KHONG phai cong vao hoac diem GPS kich hoat da xac minh.
-- Ban mo ta gioi thieu lay tu frontend mau; KHONG phai noi dung lich su da duoc kiem duyet.
\set ON_ERROR_STOP on
\encoding UTF8
SET client_encoding = 'UTF8';
BEGIN;

CREATE TEMP TABLE _hue_seed (
  legacy_id bigint,
  slug varchar(255) NOT NULL PRIMARY KEY,
  name_vi varchar(255) NOT NULL,
  area_code varchar(100) NOT NULL,
  latitude double precision NOT NULL,
  longitude double precision NOT NULL,
  trigger_radius_m integer NOT NULL,
  description_vi text NOT NULL,
  map_source text NOT NULL
) ON COMMIT DROP;

INSERT INTO _hue_seed
  (legacy_id, slug, name_vi, area_code, latitude, longitude,
   trigger_radius_m, description_vi, map_source)
VALUES
  (1, 'dai-noi', 'Đại Nội Huế', 'HUE_CENTRAL', 16.468970, 107.578130, 50,
   'Bắt đầu hành trình với không gian kiến trúc cung đình và những câu chuyện về Cố đô.',
   'https://mapcarta.com/N5182931945'),
  (2, 'an-dinh', 'Cung An Định', 'HUE_CENTRAL', 16.456630, 107.598310, 50,
   'Một điểm dừng trong hành trình khám phá các cung điện của Huế.',
   'https://mapcarta.com/W1172897446'),
  (NULL, 'duc-duc', 'Lăng Dục Đức', 'HUE_HERITAGE', 16.451500, 107.592900, 50,
   'Khám phá một điểm đến trong nhóm lăng tẩm thuộc phạm vi dự án.',
   'https://commons.wikimedia.org/wiki/Category:Tomb_of_Emperor_D%E1%BB%A5c_%C4%90%E1%BB%A9c'),
  (NULL, 'nam-giao', 'Đàn Nam Giao', 'HUE_HERITAGE', 16.437630, 107.582530, 50,
   'Một điểm dừng bổ sung cho hành trình tìm hiểu không gian di sản Cố đô.',
   'https://mapcarta.com/W1174199427'),
  (NULL, 'tu-duc', 'Lăng Tự Đức', 'HUE_HERITAGE', 16.432560, 107.565810, 50,
   'Chậm lại một chút để khám phá không gian di sản và nghe những câu chuyện.',
   'https://mapcarta.com/29658226'),
  (NULL, 'dong-khanh', 'Lăng Đồng Khánh', 'HUE_HERITAGE', 16.430160, 107.569950, 50,
   'Tiếp nối hành trình khám phá hệ thống lăng tẩm trong phạm vi thử nghiệm.',
   'https://mapcarta.com/29658224'),
  (NULL, 'thieu-tri', 'Lăng Thiệu Trị', 'HUE_HERITAGE', 16.416280, 107.572830, 50,
   'Một điểm đến dành cho hành trình tìm hiểu các di tích của Huế.',
   'https://mapcarta.com/W264285103'),
  (NULL, 'khai-dinh', 'Lăng Khải Định', 'HUE_HERITAGE', 16.398950, 107.590280, 50,
   'Tìm hiểu di tích qua hình ảnh, nội dung giới thiệu và thuyết minh.',
   'https://mapcarta.com/N6114438287'),
  (NULL, 'minh-mang', 'Lăng Minh Mạng', 'HUE_HERITAGE', 16.387720, 107.568250, 50,
   'Lựa chọn một điểm dừng mới trong hành trình di sản của bạn.',
   'https://mapcarta.com/29658222'),
  (NULL, 'gia-long', 'Lăng Gia Long', 'HUE_HERITAGE', 16.363160, 107.596490, 50,
   'Thêm một điểm dừng trong hành trình khám phá di sản Huế.',
   'https://mapcarta.com/29658220');

-- CHAN DESTRUCTIVE MIGRATION NEU DB KHONG CON DUNG DU LIEU TEST DA KIEM TRA.
DO $$
BEGIN
  IF (SELECT count(*) FROM _hue_seed) <> 10 THEN
    RAISE EXCEPTION 'Expected exactly 10 Hue Guide seed items';
  END IF;

  IF (SELECT count(*) FROM attractions) <> 6 OR
     (SELECT count(*)
        FROM attractions a
        JOIN (VALUES
          (1::bigint, 'dev-hue-imperial-city'::text),
          (2::bigint, 'dev-an-dinh-palace'::text),
          (3::bigint, 'dev-thien-mu-pagoda'::text),
          (4::bigint, 'demo-workflow-1792389703164'::text),
          (5::bigint, 'demo-workflow-1792390522071'::text),
          (6::bigint, 'demo-workflow-1792391200525'::text)
        ) v(id, slug)
          ON a.attraction_id = v.id AND a.slug = v.slug) <> 6
  THEN
    RAISE EXCEPTION 'Attractions have changed since inspection; refusing cleanup';
  END IF;

  IF (SELECT count(*) FROM routes) <> 2 OR
     (SELECT count(*) FROM routes r JOIN (VALUES
       (1::bigint, 'dev-hue-walking-route'::text),
       (2::bigint, 'dev-hue-heritage-route'::text)
     ) v(id,slug) ON r.route_id=v.id AND r.slug=v.slug) <> 2
  THEN
    RAISE EXCEPTION 'Routes have changed since inspection; refusing cleanup';
  END IF;

  IF EXISTS (
    SELECT 1 FROM visitor_sessions
    WHERE access_attraction_id IN (3,4,5,6)
       OR access_route_id IN (1,2)
  ) THEN
    RAISE EXCEPTION 'Visitor sessions reference old items; refusing cleanup';
  END IF;

  IF (SELECT count(*) FROM knowledge_documents) <> 4 OR
     (SELECT count(*) FROM knowledge_documents WHERE attraction_id IN (1,2,3)) <> 4
  THEN
    RAISE EXCEPTION 'Knowledge documents have changed; refusing cleanup';
  END IF;

  IF NOT EXISTS (SELECT 1 FROM staff_accounts WHERE staff_id = 1) THEN
    RAISE EXCEPTION 'Missing seed staff account ID 1';
  END IF;
END $$;

-- Toan bo route DEV chi la du lieu mau; khong co visitor session link truc tiep.
-- ON DELETE CASCADE se xoa route_stops tuong ung.
DELETE FROM routes WHERE route_id IN (1,2);

-- 4 Knowledge documents cu va chunks cascade tu dong duoc xoa.
-- Dieu nay lam Gemini mat du lieu thu nghiem truoc do (dung chu y).
DELETE FROM knowledge_documents WHERE attraction_id IN (1,2,3);

-- Audio play logs tham chieu media DEV qua FK (RESTRICT/NO ACTION).
-- DAY LA DU LIEU KIEM THU: xoa cac log phat gan voi media cua 3 attraction DEV
-- truoc khi xoa media. Ban backup PostgreSQL truoc do giu lich su cu.
\echo ==== SO BAN GHI AUDIO PLAYS TEST SE XOA (TRONG PREVIEW) ====
SELECT count(*) AS demo_audio_plays_to_delete
FROM audio_plays ap
JOIN attraction_media am ON am.media_id = ap.media_id
WHERE am.attraction_id IN (1,2,3);

DELETE FROM audio_plays ap
USING attraction_media am
WHERE ap.media_id = am.media_id
  AND am.attraction_id IN (1,2,3);

-- Media DEV: xoa sau khi da don cac ban ghi audio_plays lien quan.
-- Khong tu dong xoa file vat ly tren dia.
DELETE FROM attraction_media WHERE attraction_id IN (1,2,3);

-- Noi dung mau cua hai attractions duoc GIU ID se duoc thay the.
DELETE FROM attraction_localizations WHERE attraction_id IN (1,2);

-- Xoa Chua Thien Mu DEV va 3 attraction workflow demo.
DELETE FROM attractions WHERE attraction_id IN (3,4,5,6);

-- Chuyen 2 records dau thanh DIA DIEM CUA FRONTEND, giu IDs 1 va 2.
UPDATE attractions a
SET slug = s.slug,
    area_code = s.area_code,
    latitude = s.latitude,
    longitude = s.longitude,
    trigger_radius_m = s.trigger_radius_m,
    status = 'published',
    content_version = a.content_version + 1,
    approved_by = 1,
    published_at = CURRENT_TIMESTAMP,
    updated_at = CURRENT_TIMESTAMP
FROM _hue_seed s
WHERE a.attraction_id = s.legacy_id;

-- Tao 8 attraction con thieu; cac attr status published phuc vu giao dien demo.
INSERT INTO attractions
  (slug, area_code, latitude, longitude, trigger_radius_m,
   status, content_version, created_by, approved_by, published_at, updated_at)
SELECT
  s.slug, s.area_code, s.latitude, s.longitude, s.trigger_radius_m,
  'published', 1, 1, 1, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
FROM _hue_seed s
WHERE s.legacy_id IS NULL;

-- Noi dung gioi thieu ngan lay dung tu FRONTEND; KHONG tao su kien lich su moi.
INSERT INTO attraction_localizations
  (attraction_id, language_code, name, description, source_references,
   status, content_version, approved_by, published_at)
SELECT
  a.attraction_id,
  'vi',
  s.name_vi,
  s.description_vi,
  'Tọa độ tham khảo: ' || s.map_source ||
   '. Mô tả ngắn theo bản thiết kế frontend Hue Guide; chưa xác minh nội dung thuyết minh lịch sử.',
  'published', 1, 1, CURRENT_TIMESTAMP
FROM _hue_seed s
JOIN attractions a ON a.slug = s.slug;

-- Thay 2 route DEV bang 3 TUYEN BAN NHAP tu frontend.
-- CHUA CONG BO: duong di, quang duong, thoi gian di chuyen chua kiem chung.
INSERT INTO routes
  (slug, name_vi, description_vi, area_code, estimated_minutes,
   verified_at, status, content_version, created_by, approved_by, published_at)
VALUES
  ('royal', 'Dấu ấn cung đình',
   'Bắt đầu từ những không gian quen thuộc của Cố đô. TUYẾN BẢN NHÁP: thời gian dự kiến và đường đi cần được xác minh.',
   'HUE_ROUTE', 90, NULL, 'draft', 1, 1, NULL, NULL),
  ('tombs', 'Hành trình lăng tẩm',
   'Một lựa chọn dành cho người yêu kiến trúc di sản. TUYẾN BẢN NHÁP: thời gian dự kiến và đường đi cần được xác minh.',
   'HUE_ROUTE', 150, NULL, 'draft', 1, 1, NULL, NULL),
  ('heritage', 'Theo dấu di sản',
   'Tự chọn nhịp điệu, nối tiếp những điểm dừng. TUYẾN BẢN NHÁP: thời gian dự kiến và đường đi cần được xác minh.',
   'HUE_ROUTE', 180, NULL, 'draft', 1, 1, NULL, NULL);

INSERT INTO route_stops
  (route_id, attraction_id, stop_order, visit_minutes,
   travel_minutes_from_previous, verified_path_geojson)
SELECT r.route_id, a.attraction_id, route_seed.stop_order,
       NULL, NULL, NULL
FROM (VALUES
  ('royal'::text, 'dai-noi'::text, 1),
  ('royal', 'an-dinh', 2),
  ('royal', 'nam-giao', 3),
  ('tombs', 'tu-duc', 1),
  ('tombs', 'dong-khanh', 2),
  ('tombs', 'khai-dinh', 3),
  ('heritage', 'dai-noi', 1),
  ('heritage', 'minh-mang', 2),
  ('heritage', 'gia-long', 3)
) AS route_seed(route_slug, attraction_slug, stop_order)
JOIN routes r ON r.slug = route_seed.route_slug
JOIN attractions a ON a.slug = route_seed.attraction_slug;

-- QUY TAC AN TOAN CUOI TRANSACTION.
DO $$
BEGIN
  IF (SELECT count(*) FROM attractions) <> 10
    OR (SELECT count(*) FROM attractions a JOIN _hue_seed s ON a.slug=s.slug) <> 10
    OR (SELECT count(*) FROM attractions WHERE status='published') <> 10
  THEN
    RAISE EXCEPTION 'Unexpected attraction count or status; rollback';
  END IF;

  IF (SELECT count(*) FROM attraction_localizations
        WHERE language_code='vi' AND status='published') <> 10
  THEN
    RAISE EXCEPTION 'Expected 10 Vietnamese published localizations; rollback';
  END IF;

  IF (SELECT count(*) FROM routes WHERE status='draft') <> 3
    OR (SELECT count(*) FROM route_stops) <> 9
  THEN
    RAISE EXCEPTION 'Expected 3 draft routes and 9 stops; rollback';
  END IF;

  IF EXISTS (
    SELECT 1 FROM attractions
    WHERE NOT (latitude BETWEEN 16.30 AND 16.50)
       OR NOT (longitude BETWEEN 107.50 AND 107.70)
       OR slug LIKE 'dev-%' OR slug LIKE 'demo-%'
  ) THEN
    RAISE EXCEPTION 'Invalid coordinate range or DEV slug detected; rollback';
  END IF;

  IF (SELECT count(*) FROM knowledge_documents) <> 0 THEN
    RAISE EXCEPTION 'Expected all demo knowledge to be removed; rollback';
  END IF;
END $$;

\echo ==== CHI TIET 10 DI TICH (PREVIEW) ====
SELECT a.attraction_id, a.slug, l.name, a.latitude, a.longitude, a.status
FROM attractions a
JOIN attraction_localizations l ON l.attraction_id=a.attraction_id AND l.language_code='vi'
ORDER BY a.attraction_id;

\echo ==== 3 TUYEN BAN NHAP (CHUA PUBLISH) ====
SELECT r.slug, r.status, count(rs.route_stop_id) AS stops
FROM routes r LEFT JOIN route_stops rs ON rs.route_id=r.route_id
GROUP BY r.route_id, r.slug, r.status ORDER BY r.route_id;

-- MAC DINH PREVIEW = ROLLBACK. COMMIT CHI KHI -v apply=1.
\if :{?apply}
  \if :apply
    \echo ==== APPLY MODE: COMMIT ====
    COMMIT;
  \else
    \echo ==== PREVIEW MODE: ROLLBACK - CHUA THAY DOI DATABASE ====
    ROLLBACK;
  \endif
\else
  \echo ==== PREVIEW MODE: ROLLBACK - CHUA THAY DOI DATABASE ====
  ROLLBACK;
\endif
