\encoding UTF8

BEGIN;

-- Stop 1: Đại Nội Huế
INSERT INTO route_stops (
    route_id,
    attraction_id,
    stop_order,
    visit_minutes,
    travel_minutes_from_previous
)
SELECT
    r.route_id,
    a.attraction_id,
    1,
    35,
    NULL
FROM routes r
JOIN attractions a
    ON a.slug = 'dev-hue-imperial-city'
WHERE r.slug = 'dev-hue-walking-route'
ON CONFLICT (route_id, stop_order)
DO UPDATE SET
    attraction_id = EXCLUDED.attraction_id,
    visit_minutes = EXCLUDED.visit_minutes,
    travel_minutes_from_previous =
        EXCLUDED.travel_minutes_from_previous;


-- Stop 2: Cung An Định
INSERT INTO route_stops (
    route_id,
    attraction_id,
    stop_order,
    visit_minutes,
    travel_minutes_from_previous
)
SELECT
    r.route_id,
    a.attraction_id,
    2,
    20,
    10
FROM routes r
JOIN attractions a
    ON a.slug = 'dev-an-dinh-palace'
WHERE r.slug = 'dev-hue-walking-route'
ON CONFLICT (route_id, stop_order)
DO UPDATE SET
    attraction_id = EXCLUDED.attraction_id,
    visit_minutes = EXCLUDED.visit_minutes,
    travel_minutes_from_previous =
        EXCLUDED.travel_minutes_from_previous;

COMMIT;