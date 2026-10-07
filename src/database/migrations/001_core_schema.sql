\encoding UTF8
BEGIN;

-- Core schema for Hue Tourism Guide App
-- Migration: 001_core_schema.sql

CREATE TABLE staff_accounts (
    -- là khóa chính, tự động tăng
    staff_id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    --phải là duy nhất, viết lowercase
    email VARCHAR(255) NOT NULL UNIQUE,
    --sau này sẽ chứa hash Argon2/bcrypt, không chứa password thường
    password_hash TEXT NOT NULL,
    full_name VARCHAR(255) NOT NULL,

    role VARCHAR(20) NOT NULL,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,

    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT staff_accounts_email_lowercase
        CHECK (email = LOWER(email)),

    CONSTRAINT staff_accounts_role_check
        CHECK (role IN ('editor', 'reviewer', 'admin'))
);
CREATE TABLE attractions (
    attraction_id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,

    slug VARCHAR(255) NOT NULL UNIQUE,
    area_code VARCHAR(100) NOT NULL,

    latitude DOUBLE PRECISION NOT NULL,
    longitude DOUBLE PRECISION NOT NULL,
    trigger_radius_m INTEGER NOT NULL DEFAULT 25,

    status VARCHAR(20) NOT NULL DEFAULT 'draft',
    content_version INTEGER NOT NULL DEFAULT 1,

    created_by BIGINT NOT NULL,
    approved_by BIGINT,

    published_at TIMESTAMPTZ,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT attractions_latitude_check
        CHECK (latitude >= -90 AND latitude <= 90),

    CONSTRAINT attractions_longitude_check
        CHECK (longitude >= -180 AND longitude <= 180),

    CONSTRAINT attractions_trigger_radius_check
        CHECK (trigger_radius_m > 0),

    CONSTRAINT attractions_content_version_check
        CHECK (content_version > 0),

    CONSTRAINT attractions_status_check
        CHECK (
            status IN (
                'draft',
                'in_review',
                'published',
                'archived'
            )
        ),

    CONSTRAINT attractions_created_by_fk
        FOREIGN KEY (created_by)
        REFERENCES staff_accounts(staff_id),

    CONSTRAINT attractions_approved_by_fk
        FOREIGN KEY (approved_by)
        REFERENCES staff_accounts(staff_id),

    CONSTRAINT attractions_published_check
        CHECK (
            status <> 'published'
            OR (
                approved_by IS NOT NULL
                AND published_at IS NOT NULL
            )
        )
);
CREATE TABLE attraction_localizations (
    localization_id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,

    attraction_id BIGINT NOT NULL,
    language_code VARCHAR(10) NOT NULL,

    name VARCHAR(255) NOT NULL,
    description TEXT NOT NULL,
    source_references TEXT NOT NULL,

    status VARCHAR(20) NOT NULL DEFAULT 'draft',
    content_version INTEGER NOT NULL DEFAULT 1,

    approved_by BIGINT,
    published_at TIMESTAMPTZ,

    CONSTRAINT attraction_localizations_unique_language
        UNIQUE (attraction_id, language_code),

    CONSTRAINT attraction_localizations_content_version_check
        CHECK (content_version > 0),

    CONSTRAINT attraction_localizations_status_check
        CHECK (
            status IN (
                'draft',
                'in_review',
                'published',
                'archived'
            )
        ),

    CONSTRAINT attraction_localizations_attraction_fk
        FOREIGN KEY (attraction_id)
        REFERENCES attractions(attraction_id)
        ON DELETE CASCADE,

    CONSTRAINT attraction_localizations_approved_by_fk
        FOREIGN KEY (approved_by)
        REFERENCES staff_accounts(staff_id),

    CONSTRAINT attraction_localizations_published_check
        CHECK (
            status <> 'published'
            OR (
                approved_by IS NOT NULL
                AND published_at IS NOT NULL
            )
        )
);
CREATE TABLE attraction_media (
    media_id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,

    attraction_id BIGINT NOT NULL,
    language_code VARCHAR(10),

    media_type VARCHAR(20) NOT NULL,
    file_url TEXT NOT NULL,

    caption TEXT,
    credit TEXT NOT NULL,
    rights_reference TEXT NOT NULL,

    duration_seconds INTEGER,
    display_order INTEGER NOT NULL DEFAULT 1,

    status VARCHAR(20) NOT NULL DEFAULT 'draft',
    approved_by BIGINT,
    published_at TIMESTAMPTZ,

    CONSTRAINT attraction_media_type_check
        CHECK (
            media_type IN (
                'image',
                'audio'
            )
        ),

    CONSTRAINT attraction_media_duration_check
        CHECK (
            duration_seconds IS NULL
            OR duration_seconds > 0
        ),

    CONSTRAINT attraction_media_display_order_check
        CHECK (display_order > 0),
    CONSTRAINT attraction_media_https_url_check
        CHECK (file_url LIKE 'https://%'),
    CONSTRAINT attraction_media_status_check
        CHECK (
            status IN (
                'draft',
                'in_review',
                'published',
                'archived'
            )
        ),

    CONSTRAINT attraction_media_audio_language_check
        CHECK (
            media_type <> 'audio'
            OR language_code IS NOT NULL
        ),

    CONSTRAINT attraction_media_attraction_fk
        FOREIGN KEY (attraction_id)
        REFERENCES attractions(attraction_id)
        ON DELETE CASCADE,

    CONSTRAINT attraction_media_approved_by_fk
        FOREIGN KEY (approved_by)
        REFERENCES staff_accounts(staff_id),

    CONSTRAINT attraction_media_published_check
        CHECK (
            status <> 'published'
            OR (
                approved_by IS NOT NULL
                AND published_at IS NOT NULL
            )
        )
);
CREATE TABLE routes (
    route_id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,

    slug VARCHAR(255) NOT NULL UNIQUE,
    name_vi VARCHAR(255) NOT NULL,
    description_vi TEXT NOT NULL,
    area_code VARCHAR(100) NOT NULL,

    estimated_minutes INTEGER NOT NULL,
    verified_at TIMESTAMPTZ,

    status VARCHAR(20) NOT NULL DEFAULT 'draft',
    content_version INTEGER NOT NULL DEFAULT 1,

    created_by BIGINT NOT NULL,
    approved_by BIGINT,
    published_at TIMESTAMPTZ,

    CONSTRAINT routes_estimated_minutes_check
        CHECK (estimated_minutes > 0),

    CONSTRAINT routes_content_version_check
        CHECK (content_version > 0),

    CONSTRAINT routes_status_check
        CHECK (
            status IN (
                'draft',
                'in_review',
                'published',
                'archived'
            )
        ),

    CONSTRAINT routes_created_by_fk
        FOREIGN KEY (created_by)
        REFERENCES staff_accounts(staff_id),

    CONSTRAINT routes_approved_by_fk
        FOREIGN KEY (approved_by)
        REFERENCES staff_accounts(staff_id),

    CONSTRAINT routes_published_check
        CHECK (
            status <> 'published'
            OR (
                approved_by IS NOT NULL
                AND published_at IS NOT NULL
                AND verified_at IS NOT NULL
            )
        )
);
CREATE TABLE route_stops (
    route_stop_id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,

    route_id BIGINT NOT NULL,
    attraction_id BIGINT NOT NULL,

    stop_order INTEGER NOT NULL,
    visit_minutes INTEGER,
    travel_minutes_from_previous INTEGER,

    verified_path_geojson JSONB,

    CONSTRAINT route_stops_unique_order
        UNIQUE (route_id, stop_order),

    CONSTRAINT route_stops_stop_order_check
        CHECK (stop_order > 0),

    CONSTRAINT route_stops_visit_minutes_check
        CHECK (
            visit_minutes IS NULL
            OR visit_minutes > 0
        ),

    CONSTRAINT route_stops_travel_minutes_check
        CHECK (
            travel_minutes_from_previous IS NULL
            OR travel_minutes_from_previous >= 0
        ),

    CONSTRAINT route_stops_route_fk
        FOREIGN KEY (route_id)
        REFERENCES routes(route_id)
        ON DELETE CASCADE,

    CONSTRAINT route_stops_attraction_fk
        FOREIGN KEY (attraction_id)
        REFERENCES attractions(attraction_id)
);
CREATE TABLE knowledge_documents (
    document_id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,

    attraction_id BIGINT,

    title VARCHAR(255) NOT NULL,
    language_code VARCHAR(10) NOT NULL,

    source_url TEXT,
    source_credit TEXT NOT NULL,
    body_text TEXT NOT NULL,

    version INTEGER NOT NULL DEFAULT 1,
    status VARCHAR(20) NOT NULL DEFAULT 'draft',

    created_by BIGINT NOT NULL,
    approved_by BIGINT,
    approved_at TIMESTAMPTZ,

    CONSTRAINT knowledge_documents_version_unique
        UNIQUE (document_id, version),

    CONSTRAINT knowledge_documents_version_check
        CHECK (version > 0),

    CONSTRAINT knowledge_documents_status_check
        CHECK (
            status IN (
                'draft',
                'in_review',
                'approved',
                'archived'
            )
        ),

    CONSTRAINT knowledge_documents_attraction_fk
        FOREIGN KEY (attraction_id)
        REFERENCES attractions(attraction_id),

    CONSTRAINT knowledge_documents_created_by_fk
        FOREIGN KEY (created_by)
        REFERENCES staff_accounts(staff_id),

    CONSTRAINT knowledge_documents_approved_by_fk
        FOREIGN KEY (approved_by)
        REFERENCES staff_accounts(staff_id),

    CONSTRAINT knowledge_documents_approved_check
        CHECK (
            status <> 'approved'
            OR (
                approved_by IS NOT NULL
                AND approved_at IS NOT NULL
            )
        )
);
CREATE TABLE knowledge_chunks (
    chunk_id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,

    document_id BIGINT NOT NULL,
    document_version INTEGER NOT NULL,

    chunk_order INTEGER NOT NULL,
    content TEXT NOT NULL,

    embedding_model VARCHAR(255),
    embedding DOUBLE PRECISION[],
    indexed_at TIMESTAMPTZ,

    CONSTRAINT knowledge_chunks_unique_order
        UNIQUE (
            document_id,
            document_version,
            chunk_order
        ),

    CONSTRAINT knowledge_chunks_order_check
        CHECK (chunk_order > 0),

    CONSTRAINT knowledge_chunks_document_fk
        FOREIGN KEY (
            document_id,
            document_version
        )
        REFERENCES knowledge_documents(
            document_id,
            version
        )
        ON DELETE CASCADE
);
CREATE TABLE visitor_sessions (
    session_id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,

    token_hash VARCHAR(64) NOT NULL UNIQUE,
    language_code VARCHAR(10) NOT NULL DEFAULT 'vi',

    started_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    expires_at TIMESTAMPTZ NOT NULL,
    revoked_at TIMESTAMPTZ,

    access_scope VARCHAR(20) NOT NULL DEFAULT 'public',
    access_route_id BIGINT,
    access_attraction_id BIGINT,
    access_expires_at TIMESTAMPTZ,

    CONSTRAINT visitor_sessions_expiry_check
        CHECK (expires_at > started_at),

    CONSTRAINT visitor_sessions_access_scope_check
        CHECK (
            access_scope IN (
                'public',
                'route',
                'attraction'
            )
        ),

    CONSTRAINT visitor_sessions_access_route_fk
        FOREIGN KEY (access_route_id)
        REFERENCES routes(route_id),

    CONSTRAINT visitor_sessions_access_attraction_fk
        FOREIGN KEY (access_attraction_id)
        REFERENCES attractions(attraction_id),

    CONSTRAINT visitor_sessions_public_scope_check
        CHECK (
            access_scope <> 'public'
            OR (
                access_route_id IS NULL
                AND access_attraction_id IS NULL
                AND access_expires_at IS NULL
            )
        )
);
CREATE TABLE chat_messages (
    message_id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,

    session_id BIGINT NOT NULL,

    speaker VARCHAR(20) NOT NULL,
    content TEXT NOT NULL,

    citations JSONB,
    response_status VARCHAR(20),

    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT chat_messages_speaker_check
        CHECK (
            speaker IN (
                'visitor',
                'assistant'
            )
        ),

    CONSTRAINT chat_messages_response_status_check
        CHECK (
            response_status IS NULL
            OR response_status IN (
                'answered',
                'insufficient',
                'error'
            )
        ),

    CONSTRAINT chat_messages_visitor_status_check
        CHECK (
            speaker <> 'visitor'
            OR response_status IS NULL
        ),

    CONSTRAINT chat_messages_session_fk
        FOREIGN KEY (session_id)
        REFERENCES visitor_sessions(session_id)
        ON DELETE CASCADE
);
CREATE TABLE audio_plays (
    play_id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,

    session_id BIGINT NOT NULL,
    media_id BIGINT NOT NULL,

    started_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    played_seconds INTEGER NOT NULL DEFAULT 0,
    completed BOOLEAN NOT NULL DEFAULT FALSE,

    CONSTRAINT audio_plays_played_seconds_check
        CHECK (played_seconds >= 0),

    CONSTRAINT audio_plays_session_fk
        FOREIGN KEY (session_id)
        REFERENCES visitor_sessions(session_id)
        ON DELETE CASCADE,

    CONSTRAINT audio_plays_media_fk
        FOREIGN KEY (media_id)
        REFERENCES attraction_media(media_id)
);
CREATE OR REPLACE FUNCTION enforce_audio_media()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM attraction_media
        WHERE media_id = NEW.media_id
          AND media_type = 'audio'
    ) THEN
        RAISE EXCEPTION 'audio_plays.media_id must reference audio media';
    END IF;

    RETURN NEW;
END;
$$;

CREATE TRIGGER audio_media_guard
BEFORE INSERT OR UPDATE OF media_id
ON audio_plays
FOR EACH ROW
EXECUTE FUNCTION enforce_audio_media();
COMMIT;