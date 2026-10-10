\encoding UTF8

BEGIN;

-- =========================================================
-- Media mẫu cho Đại Nội Huế - DEV
-- =========================================================

-- Ảnh
INSERT INTO attraction_media (
    attraction_id,
    language_code,
    media_type,
    file_url,
    caption,
    credit,
    rights_reference,
    duration_seconds,
    display_order,
    status,
    approved_by,
    published_at
)
SELECT
    a.attraction_id,
    NULL,
    'image',
    'https://example.com/dev/hue-imperial-city.jpg',
    'Ảnh thử nghiệm Đại Nội Huế',
    'DEV SEED',
    'DEV ONLY',
    NULL,
    1,
    'published',
    s.staff_id,
    CURRENT_TIMESTAMP
FROM attractions a
JOIN staff_accounts s
    ON s.email = 'seed.admin@hue.local'
WHERE a.slug = 'dev-hue-imperial-city'
  AND NOT EXISTS (
      SELECT 1
      FROM attraction_media am
      WHERE am.attraction_id = a.attraction_id
        AND am.file_url =
            'https://example.com/dev/hue-imperial-city.jpg'
  );


-- Audio tiếng Việt
INSERT INTO attraction_media (
    attraction_id,
    language_code,
    media_type,
    file_url,
    caption,
    credit,
    rights_reference,
    duration_seconds,
    display_order,
    status,
    approved_by,
    published_at
)
SELECT
    a.attraction_id,
    'vi',
    'audio',
    'https://example.com/dev/hue-imperial-city-vi.mp3',
    'Audio giới thiệu Đại Nội Huế',
    'DEV SEED',
    'DEV ONLY',
    120,
    2,
    'published',
    s.staff_id,
    CURRENT_TIMESTAMP
FROM attractions a
JOIN staff_accounts s
    ON s.email = 'seed.admin@hue.local'
WHERE a.slug = 'dev-hue-imperial-city'
  AND NOT EXISTS (
      SELECT 1
      FROM attraction_media am
      WHERE am.attraction_id = a.attraction_id
        AND am.file_url =
            'https://example.com/dev/hue-imperial-city-vi.mp3'
  );


-- =========================================================
-- Media mẫu cho Cung An Định - DEV
-- =========================================================

INSERT INTO attraction_media (
    attraction_id,
    language_code,
    media_type,
    file_url,
    caption,
    credit,
    rights_reference,
    duration_seconds,
    display_order,
    status,
    approved_by,
    published_at
)
SELECT
    a.attraction_id,
    NULL,
    'image',
    'https://example.com/dev/an-dinh-palace.jpg',
    'Ảnh thử nghiệm Cung An Định',
    'DEV SEED',
    'DEV ONLY',
    NULL,
    1,
    'published',
    s.staff_id,
    CURRENT_TIMESTAMP
FROM attractions a
JOIN staff_accounts s
    ON s.email = 'seed.admin@hue.local'
WHERE a.slug = 'dev-an-dinh-palace'
  AND NOT EXISTS (
      SELECT 1
      FROM attraction_media am
      WHERE am.attraction_id = a.attraction_id
        AND am.file_url =
            'https://example.com/dev/an-dinh-palace.jpg'
  );

COMMIT;