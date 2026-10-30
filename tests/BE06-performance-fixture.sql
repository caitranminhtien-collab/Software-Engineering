\set ON_ERROR_STOP on

BEGIN;

DO $$
DECLARE
    test_staff_id bigint;
BEGIN
    IF current_database() <> 'hue_tourism_test' THEN
        RAISE EXCEPTION 'Dedicated test database required';
    END IF;

    IF EXISTS (
        SELECT 1
        FROM public.staff_accounts
        WHERE email = 'be06-performance@example.com'
    ) THEN
        RAISE EXCEPTION 'Performance fixture already exists';
    END IF;

    -- Tài khoản chỉ làm dấu nhận diện dữ liệu, không cho đăng nhập.
    INSERT INTO public.staff_accounts (
        email, password_hash, full_name, role, is_active
    )
    VALUES (
        'be06-performance@example.com',
        'not-a-login-password-hash',
        'BE06 Performance Fixture',
        'editor',
        FALSE
    )
    RETURNING staff_id INTO test_staff_id;

    WITH created AS (
        INSERT INTO public.attractions (
            slug,
            area_code,
            latitude,
            longitude,
            trigger_radius_m,
            status,
            created_by,
            approved_by,
            published_at
        )
        SELECT
            'be06-perf-' || n,
            'BE06_TEST',
            16.4,
            107.5,
            25,
            'published',
            test_staff_id,
            test_staff_id,
            NOW()
        FROM generate_series(1, 1000) AS items(n)
        RETURNING attraction_id, slug
    )
    INSERT INTO public.attraction_localizations (
        attraction_id,
        language_code,
        name,
        description,
        source_references,
        status,
        approved_by,
        published_at
    )
    SELECT
        attraction_id,
        'vi',
        slug,
        'Synthetic BE06 performance fixture',
        '[]',
        'published',
        test_staff_id,
        NOW()
    FROM created;
END;
$$;

COMMIT;