-- M2.5: staged localization revisions.
-- Additive migration only: existing published localization rows stay untouched.
-- Apply once with psql -v ON_ERROR_STOP=1 -f <this-file>.

BEGIN;

CREATE TABLE IF NOT EXISTS public.attraction_localization_revisions (
    revision_id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    attraction_id bigint NOT NULL
        REFERENCES public.attractions(attraction_id) ON DELETE CASCADE,
    language_code varchar(10) NOT NULL,
    name varchar(255) NOT NULL,
    description text NOT NULL,
    source_references text NOT NULL DEFAULT '[]',
    base_content_version integer,
    status varchar(20) NOT NULL DEFAULT 'draft',
    created_by bigint NOT NULL
        REFERENCES public.staff_accounts(staff_id),
    approved_by bigint
        REFERENCES public.staff_accounts(staff_id),
    published_at timestamptz,
    created_at timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT localization_revision_status_check
        CHECK (status IN ('draft', 'in_review', 'published', 'archived')),
    CONSTRAINT localization_revision_base_version_check
        CHECK (base_content_version IS NULL OR base_content_version > 0),
    CONSTRAINT localization_revision_published_check
        CHECK (status <> 'published' OR (approved_by IS NOT NULL AND published_at IS NOT NULL))
);

-- Only one working revision per attraction/language; published revisions form history.
CREATE UNIQUE INDEX IF NOT EXISTS localization_revision_one_active
    ON public.attraction_localization_revisions (attraction_id, language_code)
    WHERE status IN ('draft', 'in_review');

CREATE INDEX IF NOT EXISTS localization_revision_attraction_history
    ON public.attraction_localization_revisions (attraction_id, language_code, revision_id DESC);

COMMIT;
