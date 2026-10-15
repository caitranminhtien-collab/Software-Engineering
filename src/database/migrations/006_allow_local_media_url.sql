ALTER TABLE attraction_media
DROP CONSTRAINT IF EXISTS attraction_media_https_url_check;

ALTER TABLE attraction_media
ADD CONSTRAINT attraction_media_https_url_check
CHECK (
  file_url ~* '^https://'
  OR
  file_url ~* '^http://(localhost|127[.]0[.]0[.]1)(:[0-9]+)?/'
);