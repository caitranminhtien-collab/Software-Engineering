\set ON_ERROR_STOP on

BEGIN;

DO $$
DECLARE
    test_staff_id bigint;
    fixture_count bigint;
    deleted_count bigint;
BEGIN
    IF current_database() <> 'hue_tourism_test' THEN
        RAISE EXCEPTION 'Dedicated test database required';
    END IF;

    SELECT staff_id INTO test_staff_id
    FROM public.staff_accounts
    WHERE email = 'be06-performance@example.com'
      AND is_active = FALSE;

    IF test_staff_id IS NULL THEN
        RAISE EXCEPTION 'Performance fixture marker not found';
    END IF;

    SELECT COUNT(*) INTO fixture_count
    FROM public.attractions
    WHERE created_by = test_staff_id
      AND slug ~ '^be06-perf-[0-9]+$';

    IF fixture_count <> 1000 THEN
        RAISE EXCEPTION 'Expected 1000 fixture attractions, found %',
            fixture_count;
    END IF;

    -- Các localization liên quan được xóa theo ON DELETE CASCADE.
    DELETE FROM public.attractions
    WHERE created_by = test_staff_id
      AND slug ~ '^be06-perf-[0-9]+$';

    GET DIAGNOSTICS deleted_count = ROW_COUNT;

    DELETE FROM public.staff_accounts
    WHERE staff_id = test_staff_id;

    RAISE NOTICE 'Removed % fixture attractions and their localizations',
        deleted_count;
END;
$$;

COMMIT;