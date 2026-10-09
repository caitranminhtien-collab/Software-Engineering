\encoding UTF8

BEGIN;

-- DEV ONLY
-- Route mẫu để test API /api/v1/routes

INSERT INTO routes (
    slug,
    name_vi,
    description_vi,
    area_code,
    estimated_minutes,
    verified_at,
    status,
    content_version,
    created_by,
    approved_by,
    published_at
)
SELECT
    'dev-hue-walking-route',
    'Tuyến tham quan Huế - DEV',
    'Dữ liệu thử nghiệm dùng để kiểm tra Routes API.',
    'HUE_DEV',
    60,
    CURRENT_TIMESTAMP,
    'published',
    1,
    staff_id,
    staff_id,
    CURRENT_TIMESTAMP
FROM staff_accounts
WHERE email = 'seed.admin@hue.local'
ON CONFLICT (slug) DO NOTHING;

COMMIT;