-- Đổi thành 30 để kiểm tra báo cáo 30 ngày.
\set days 30

-- Chỉ đọc dữ liệu; các truy vấn dùng cùng một snapshot.
BEGIN TRANSACTION ISOLATION LEVEL REPEATABLE READ READ ONLY;

-- Khoảng ngày theo giờ Việt Nam, gồm hôm nay.
-- Mốc đầu được tính vào; mốc cuối không được tính vào.
SELECT
    (
        (
            (CURRENT_TIMESTAMP AT TIME ZONE 'Asia/Ho_Chi_Minh')::date
            - (:days - 1)
        )::timestamp AT TIME ZONE 'Asia/Ho_Chi_Minh'
    ) AS from_time,
    (
        (
            (CURRENT_TIMESTAMP AT TIME ZONE 'Asia/Ho_Chi_Minh')::date
            + 1
        )::timestamp AT TIME ZONE 'Asia/Ho_Chi_Minh'
    ) AS until_time
\gset

-- 1. Tổng lượt mở di tích.
SELECT COUNT(*) AS views
FROM public.visitor_events
WHERE event_type = 'attraction_view'
  AND created_at >= :'from_time'::timestamptz
  AND created_at < :'until_time'::timestamptz;

-- 2. Tổng lượt bắt đầu TTS, không phải lượt nghe hoàn tất.
SELECT COUNT(*) AS listens
FROM public.visitor_events
WHERE event_type = 'tts_started'
  AND created_at >= :'from_time'::timestamptz
  AND created_at < :'until_time'::timestamptz;

-- 3. Tổng lượt bắt đầu tuyến.
SELECT COUNT(*) AS starts
FROM public.visitor_events
WHERE event_type = 'route_started'
  AND created_at >= :'from_time'::timestamptz
  AND created_at < :'until_time'::timestamptz;

-- 4. Lượt xem theo ngày, gồm cả ngày không có event.
WITH calendar AS (
    SELECT
        (CURRENT_TIMESTAMP AT TIME ZONE 'Asia/Ho_Chi_Minh')::date
        - (:days - 1) + n AS day
    FROM generate_series(0, :days - 1) AS dates(n)
),
counts AS (
    SELECT
        (created_at AT TIME ZONE 'Asia/Ho_Chi_Minh')::date AS day,
        COUNT(*) AS views
    FROM public.visitor_events
    WHERE event_type = 'attraction_view'
      AND created_at >= :'from_time'::timestamptz
      AND created_at < :'until_time'::timestamptz
    GROUP BY 1
)
SELECT
    c.day,
    COALESCE(v.views, 0) AS views
FROM calendar AS c
LEFT JOIN counts AS v ON v.day = c.day
ORDER BY c.day;

-- 5. Lượt bắt đầu TTS theo ngôn ngữ.
-- Giữ cả NULL hoặc ngôn ngữ ngoài danh sách UI để phát hiện chênh lệch.
SELECT language_code, COUNT(*) AS total
FROM public.visitor_events
WHERE event_type = 'tts_started'
  AND created_at >= :'from_time'::timestamptz
  AND created_at < :'until_time'::timestamptz
GROUP BY language_code
ORDER BY language_code;

-- 6. Xếp hạng các di tích đang đủ điều kiện hiển thị công khai.
SELECT
    a.attraction_id,
    COALESCE(loc.name, a.slug) AS name,
    COUNT(e.event_id) AS total
FROM public.attractions AS a
JOIN public.attraction_localizations AS loc
    ON loc.attraction_id = a.attraction_id
    AND loc.language_code = 'vi'
    AND loc.status = 'published'
LEFT JOIN public.visitor_events AS e
    ON e.attraction_id = a.attraction_id
    AND e.event_type = 'attraction_view'
    AND e.created_at >= :'from_time'::timestamptz
    AND e.created_at < :'until_time'::timestamptz
WHERE a.status = 'published'
GROUP BY a.attraction_id, a.slug, loc.name
ORDER BY total DESC, name ASC
LIMIT 20;

ROLLBACK;