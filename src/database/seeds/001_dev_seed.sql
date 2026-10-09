\encoding UTF8

BEGIN;

-- DEV ONLY
-- Dữ liệu dùng để test API.
-- Tọa độ dưới đây là placeholder, KHÔNG dùng cho pilot thực tế.

INSERT INTO staff_accounts (
    email,
    password_hash,
    full_name,
    role,
    is_active
)
VALUES (
    'seed.admin@hue.local',
    'DEV_ONLY_NOT_A_REAL_PASSWORD_HASH',
    'Development Seed Admin',
    'admin',
    TRUE
)
ON CONFLICT (email) DO NOTHING;


-- Attraction 1
INSERT INTO attractions (
    slug,
    area_code,
    latitude,
    longitude,
    trigger_radius_m,
    status,
    content_version,
    created_by,
    approved_by,
    published_at
)
SELECT
    'dev-hue-imperial-city',
    'HUE_DEV',
    0,
    0,
    25,
    'published',
    1,
    staff_id,
    staff_id,
    CURRENT_TIMESTAMP
FROM staff_accounts
WHERE email = 'seed.admin@hue.local'
ON CONFLICT (slug) DO NOTHING;


-- Attraction 2
INSERT INTO attractions (
    slug,
    area_code,
    latitude,
    longitude,
    trigger_radius_m,
    status,
    content_version,
    created_by,
    approved_by,
    published_at
)
SELECT
    'dev-an-dinh-palace',
    'HUE_DEV',
    0.001,
    0.001,
    25,
    'published',
    1,
    staff_id,
    staff_id,
    CURRENT_TIMESTAMP
FROM staff_accounts
WHERE email = 'seed.admin@hue.local'
ON CONFLICT (slug) DO NOTHING;


-- Vietnamese localization - attraction 1
INSERT INTO attraction_localizations (
    attraction_id,
    language_code,
    name,
    description,
    source_references,
    status,
    content_version,
    approved_by,
    published_at
)
SELECT
    a.attraction_id,
    'vi',
    'Đại Nội Huế - DEV',
    'Dữ liệu thử nghiệm cho API.',
    'DEV_SEED',
    'published',
    1,
    s.staff_id,
    CURRENT_TIMESTAMP
FROM attractions a
JOIN staff_accounts s
    ON s.email = 'seed.admin@hue.local'
WHERE a.slug = 'dev-hue-imperial-city'
ON CONFLICT (attraction_id, language_code) DO NOTHING;


-- English localization - attraction 1
INSERT INTO attraction_localizations (
    attraction_id,
    language_code,
    name,
    description,
    source_references,
    status,
    content_version,
    approved_by,
    published_at
)
SELECT
    a.attraction_id,
    'en',
    'Hue Imperial City - DEV',
    'Development test data for the API.',
    'DEV_SEED',
    'published',
    1,
    s.staff_id,
    CURRENT_TIMESTAMP
FROM attractions a
JOIN staff_accounts s
    ON s.email = 'seed.admin@hue.local'
WHERE a.slug = 'dev-hue-imperial-city'
ON CONFLICT (attraction_id, language_code) DO NOTHING;


-- Attraction 2 chỉ có tiếng Việt
-- để test fallback en -> vi
INSERT INTO attraction_localizations (
    attraction_id,
    language_code,
    name,
    description,
    source_references,
    status,
    content_version,
    approved_by,
    published_at
)
SELECT
    a.attraction_id,
    'vi',
    'Cung An Định - DEV',
    'Dữ liệu thử nghiệm fallback ngôn ngữ.',
    'DEV_SEED',
    'published',
    1,
    s.staff_id,
    CURRENT_TIMESTAMP
FROM attractions a
JOIN staff_accounts s
    ON s.email = 'seed.admin@hue.local'
WHERE a.slug = 'dev-an-dinh-palace'
ON CONFLICT (attraction_id, language_code) DO NOTHING;

COMMIT;