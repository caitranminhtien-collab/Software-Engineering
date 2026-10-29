\set ON_ERROR_STOP on

BEGIN;

-- Dừng nếu thiếu dữ liệu cần thiết hoặc fixture đã tồn tại.
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM public.attractions AS a
        JOIN public.attraction_localizations AS l
          ON l.attraction_id = a.attraction_id
        WHERE a.status = 'published'
          AND l.language_code = 'vi'
          AND l.status = 'published'
    ) THEN
        RAISE EXCEPTION 'No published attraction available';
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM public.routes WHERE status = 'published'
    ) THEN
        RAISE EXCEPTION 'No published route available';
    END IF;

    IF EXISTS (
        SELECT 1 FROM public.visitor_sessions
        WHERE token_hash =
            md5('BE01-local-fixture') || md5('BE01-local-fixture-marker')
    ) THEN
        RAISE EXCEPTION 'BE01 fixture already exists; do not insert twice';
    END IF;
END;
$$;

SELECT a.attraction_id AS fixture_attraction_id
FROM public.attractions AS a
JOIN public.attraction_localizations AS l
  ON l.attraction_id = a.attraction_id
WHERE a.status = 'published'
  AND l.language_code = 'vi'
  AND l.status = 'published'
ORDER BY a.attraction_id
LIMIT 1
\gset

SELECT route_id AS fixture_route_id
FROM public.routes
WHERE status = 'published'
ORDER BY route_id
LIMIT 1
\gset

-- Token giả chỉ để nhận diện fixture, không phải token đăng nhập.
INSERT INTO public.visitor_sessions (
    token_hash,
    language_code,
    started_at,
    expires_at
)
VALUES (
    md5('BE01-local-fixture') || md5('BE01-local-fixture-marker'),
    'vi',
    CURRENT_TIMESTAMP - INTERVAL '40 days',
    CURRENT_TIMESTAMP - INTERVAL '1 day'
)
RETURNING session_id AS fixture_session_id
\gset

WITH test_days AS (
    SELECT unnest(ARRAY[0, -6, -7, -29, -30, 1]) AS day_offset
),
test_types AS (
    SELECT unnest(ARRAY[
        'attraction_view',
        'tts_started',
        'route_started'
    ]) AS event_type
)
INSERT INTO public.visitor_events (
    session_id,
    event_type,
    attraction_id,
    route_id,
    language_code,
    created_at
)
SELECT
    :fixture_session_id,
    t.event_type,
    CASE
        WHEN t.event_type <> 'route_started'
        THEN :fixture_attraction_id
    END,
    CASE
        WHEN t.event_type = 'route_started'
        THEN :fixture_route_id
    END,
    CASE
        WHEN t.event_type = 'tts_started'
        THEN CASE
            WHEN d.day_offset IN (0, -7, -30, 1) THEN 'vi'
            ELSE 'en'
        END
    END,
    (
        (
            (CURRENT_TIMESTAMP AT TIME ZONE 'Asia/Ho_Chi_Minh')::date
            + d.day_offset
        ) + TIME '00:00:00'
    ) AT TIME ZONE 'Asia/Ho_Chi_Minh'
FROM test_days AS d
CROSS JOIN test_types AS t;

COMMIT;