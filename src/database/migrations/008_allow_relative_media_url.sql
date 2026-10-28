BEGIN;

ALTER TABLE public.attraction_media
DROP CONSTRAINT attraction_media_https_url_check;

ALTER TABLE public.attraction_media
ADD CONSTRAINT attraction_media_https_url_check
CHECK (
    -- Giữ hỗ trợ URL đã được chấp nhận trước đây.
    file_url ~* '^https://'
    OR file_url ~* '^http://(localhost|127[.]0[.]0[.]1)(:[0-9]+)?/'
    OR CASE
        WHEN file_url ~
            '^/uploads/media/[1-9][0-9]{0,17}/[A-Za-z0-9][A-Za-z0-9_.-]{0,127}$'
        THEN
            split_part(file_url, '/', 4)::numeric
                <= 9007199254740991
            AND position('..' IN split_part(file_url, '/', 5)) = 0
            AND file_url ~*
                '[.](jpg|jpeg|png|gif|webp|mp3|wav)$'
        ELSE FALSE
    END
);

COMMIT;