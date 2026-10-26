-- Hue Tourism Guide: persist last heartbeat without adding another table.
-- Safe to rerun. No deletes; token_hash and auth/session semantics unchanged.
BEGIN;
ALTER TABLE public.visitor_sessions
    ADD COLUMN IF NOT EXISTS presence_browser_hash varchar(64),
    ADD COLUMN IF NOT EXISTS last_seen_at timestamptz;

CREATE INDEX IF NOT EXISTS idx_visitor_sessions_presence_recent
    ON public.visitor_sessions (last_seen_at DESC, presence_browser_hash)
    WHERE presence_browser_hash IS NOT NULL;
COMMIT;
