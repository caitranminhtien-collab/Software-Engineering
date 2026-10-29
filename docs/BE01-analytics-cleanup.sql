\set ON_ERROR_STOP on

BEGIN;

-- Chỉ chọn session có đúng dấu nhận diện của fixture BE01.
SELECT session_id
FROM public.visitor_sessions
WHERE token_hash =
    md5('BE01-local-fixture') || md5('BE01-local-fixture-marker')
FOR UPDATE;

DELETE FROM public.visitor_events
WHERE session_id IN (
    SELECT session_id
    FROM public.visitor_sessions
    WHERE token_hash =
        md5('BE01-local-fixture') || md5('BE01-local-fixture-marker')
);

DELETE FROM public.visitor_sessions
WHERE token_hash =
    md5('BE01-local-fixture') || md5('BE01-local-fixture-marker');

COMMIT;