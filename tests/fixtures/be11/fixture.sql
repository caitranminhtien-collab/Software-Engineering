BEGIN;

DO $$
DECLARE
    staff_id_value bigint;
    first_attraction bigint;
    second_attraction bigint;
    route_id_value bigint;
BEGIN
    INSERT INTO public.staff_accounts (
        email, password_hash, full_name, role, is_active, created_at
    )
    VALUES (
        'be11@example.invalid', 'not-a-login-hash', 'BE11 Synthetic Staff',
        'editor', FALSE, '2026-01-01T00:00:00Z'
    )
    RETURNING staff_id INTO staff_id_value;

    INSERT INTO public.attractions (
        slug, area_code, latitude, longitude, trigger_radius_m,
        status, created_by, approved_by, published_at, updated_at
    )
    VALUES (
        'be11-first', 'BE11_TEST', 16.4698, 107.5792, 25, 'published',
        staff_id_value, staff_id_value,
        '2026-01-01T00:00:00Z', '2026-01-01T00:00:00Z'
    )
    RETURNING attraction_id INTO first_attraction;

    INSERT INTO public.attractions (
        slug, area_code, latitude, longitude, trigger_radius_m,
        status, created_by, approved_by, published_at, updated_at
    )
    VALUES (
        'be11-second', 'BE11_TEST', 16.4495, 107.6003, 35, 'published',
        staff_id_value, staff_id_value,
        '2026-01-01T00:00:00Z', '2026-01-01T00:00:00Z'
    )
    RETURNING attraction_id INTO second_attraction;

    INSERT INTO public.attraction_localizations (
        attraction_id, language_code, name, description, source_references,
        status, approved_by, published_at
    )
    VALUES
        (
            first_attraction, 'vi', 'BE11 Đại Nội', E'Dòng 1\nDòng 2: ''Huế''',
            '[{"source":"BE11 synthetic","verified":true}]',
            'published', staff_id_value, '2026-01-01T00:00:00Z'
        ),
        (
            second_attraction, 'vi', 'BE11 Cung điện', 'Synthetic second attraction',
            '[]', 'published', staff_id_value, '2026-01-01T00:00:00Z'
        );

    INSERT INTO public.routes (
        slug, name_vi, description_vi, area_code, estimated_minutes,
        verified_at, status, created_by, approved_by, published_at
    )
    VALUES (
        'be11-route', 'BE11 Tuyến tổng hợp', 'Linked restore fixture',
        'BE11_TEST', 60, '2026-01-01T00:00:00Z', 'published',
        staff_id_value, staff_id_value, '2026-01-01T00:00:00Z'
    )
    RETURNING route_id INTO route_id_value;

    INSERT INTO public.route_stops (
        route_id, attraction_id, stop_order,
        visit_minutes, travel_minutes_from_previous
    )
    VALUES
        (route_id_value, first_attraction, 1, 20, NULL),
        (route_id_value, second_attraction, 2, 30, 5);

    -- Metadata only: no real uploads are read or created by this fixture.
    INSERT INTO public.attraction_media (
        attraction_id, media_type, file_url, credit, rights_reference,
        caption, status, approved_by, published_at
    )
    VALUES (
        first_attraction, 'image',
        '/uploads/media/' || first_attraction || '/be11-synthetic.png',
        'BE11 synthetic', 'Test fixture only', NULL,
        'published', staff_id_value, '2026-01-01T00:00:00Z'
    );
END;
$$;

-- Deliberate gap: restored nextval must follow saved state, not MAX(id) + 1.
SELECT setval(
    pg_get_serial_sequence('public.attractions', 'attraction_id'),
    (SELECT MAX(attraction_id) + 7 FROM public.attractions),
    TRUE
);

COMMIT;
