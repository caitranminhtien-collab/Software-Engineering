-- CSDL tham khảo cho ứng dụng bản đồ du lịch Huế và AI chatbot
-- PostgreSQL 14+. Mọi tọa độ WGS84 theo thứ tự latitude, longitude.
-- Không chứa dữ liệu địa điểm thực tế; cần khảo sát và xác minh trước khi nhập.
BEGIN;

CREATE TABLE attractions (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    code VARCHAR(50) NOT NULL UNIQUE,
    name_vi VARCHAR(200) NOT NULL,
    description_vi TEXT NOT NULL DEFAULT '',
    address_vi TEXT,
    latitude NUMERIC(9,6) NOT NULL CHECK (latitude BETWEEN -90 AND 90),
    longitude NUMERIC(9,6) NOT NULL CHECK (longitude BETWEEN -180 AND 180),
    trigger_radius_m INTEGER NOT NULL DEFAULT 25 CHECK (trigger_radius_m BETWEEN 5 AND 500),
    audio_priority SMALLINT NOT NULL DEFAULT 0,
    access_policy VARCHAR(12) NOT NULL DEFAULT 'free' CHECK (access_policy IN ('free','ticketed')),
    is_published BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE attraction_localizations (
    attraction_id BIGINT NOT NULL REFERENCES attractions(id) ON DELETE CASCADE,
    lang_code VARCHAR(15) NOT NULL,
    name TEXT NOT NULL,
    description TEXT NOT NULL,
    audio_url TEXT,
    content_version INTEGER NOT NULL DEFAULT 1 CHECK (content_version > 0),
    translation_status VARCHAR(15) NOT NULL DEFAULT 'draft'
        CHECK (translation_status IN ('draft','review','published')),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    PRIMARY KEY (attraction_id, lang_code)
);

CREATE TABLE attraction_media (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    attraction_id BIGINT NOT NULL REFERENCES attractions(id) ON DELETE CASCADE,
    media_type VARCHAR(12) NOT NULL CHECK (media_type IN ('thumbnail','gallery')),
    media_url TEXT NOT NULL,
    alt_vi TEXT,
    source_credit TEXT,
    sort_order INTEGER NOT NULL DEFAULT 0 CHECK (sort_order >= 0)
);
CREATE INDEX idx_attraction_media_order ON attraction_media(attraction_id, media_type, sort_order);

CREATE TABLE routes (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    code VARCHAR(50) NOT NULL UNIQUE,
    name_vi VARCHAR(200) NOT NULL,
    description_vi TEXT,
    estimated_minutes INTEGER CHECK (estimated_minutes > 0),
    is_published BOOLEAN NOT NULL DEFAULT FALSE
);
CREATE TABLE route_stops (
    route_id BIGINT NOT NULL REFERENCES routes(id) ON DELETE CASCADE,
    attraction_id BIGINT NOT NULL REFERENCES attractions(id) ON DELETE RESTRICT,
    stop_order INTEGER NOT NULL CHECK (stop_order > 0),
    PRIMARY KEY (route_id, stop_order),
    UNIQUE (route_id, attraction_id)
);

-- Tài liệu nguồn và đoạn văn dùng cho RAG. Vector có thể lưu ở kho vector riêng,
-- dùng chunk.id làm khóa đồng bộ; embedding_ref trỏ tới bản ghi bên ngoài.
CREATE TABLE knowledge_documents (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    title VARCHAR(255) NOT NULL,
    source_url TEXT,
    source_note TEXT,
    lang_code VARCHAR(15) NOT NULL DEFAULT 'vi',
    attraction_id BIGINT REFERENCES attractions(id) ON DELETE SET NULL,
    status VARCHAR(12) NOT NULL DEFAULT 'draft' CHECK (status IN ('draft','approved','archived')),
    reviewed_at TIMESTAMPTZ,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE TABLE knowledge_chunks (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    document_id BIGINT NOT NULL REFERENCES knowledge_documents(id) ON DELETE CASCADE,
    chunk_order INTEGER NOT NULL CHECK (chunk_order >= 0),
    content TEXT NOT NULL,
    embedding_ref VARCHAR(255),
    UNIQUE (document_id, chunk_order)
);

-- Lưu bản băm mã đổi vé, không lưu mã gốc; code_hash được tạo bởi backend.
CREATE TABLE visitor_sessions (
    id UUID PRIMARY KEY,
    lang_code VARCHAR(15) NOT NULL DEFAULT 'vi',
    status VARCHAR(12) NOT NULL DEFAULT 'pending'
        CHECK (status IN ('pending','active','expired','revoked')),
    access_scope VARCHAR(12) NOT NULL DEFAULT 'free'
        CHECK (access_scope IN ('free','ticketed')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    activated_at TIMESTAMPTZ,
    expires_at TIMESTAMPTZ,
    CHECK (expires_at IS NULL OR expires_at > created_at)
);
CREATE INDEX idx_sessions_expiry ON visitor_sessions(status, expires_at);

CREATE TABLE ticket_transactions (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    session_id UUID NOT NULL REFERENCES visitor_sessions(id) ON DELETE RESTRICT,
    provider VARCHAR(12) NOT NULL CHECK (provider IN ('payoo','cash')),
    external_reference VARCHAR(150),
    amount_vnd BIGINT NOT NULL CHECK (amount_vnd >= 0),
    status VARCHAR(12) NOT NULL DEFAULT 'pending'
        CHECK (status IN ('pending','paid','failed','refunded')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    paid_at TIMESTAMPTZ,
    UNIQUE (provider, external_reference)
);
CREATE INDEX idx_transactions_session ON ticket_transactions(session_id);

-- auth: mã online; claim: mã do thu ngân cấp. Mỗi giao dịch có tối đa một mã.
CREATE TABLE redemption_codes (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    transaction_id BIGINT NOT NULL UNIQUE REFERENCES ticket_transactions(id) ON DELETE RESTRICT,
    code_type VARCHAR(8) NOT NULL CHECK (code_type IN ('auth','claim')),
    code_hash TEXT NOT NULL UNIQUE,
    expires_at TIMESTAMPTZ NOT NULL,
    redeemed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    CHECK (expires_at > created_at),
    CHECK (redeemed_at IS NULL OR redeemed_at >= created_at)
);

CREATE TABLE chat_messages (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    session_id UUID NOT NULL REFERENCES visitor_sessions(id) ON DELETE CASCADE,
    role VARCHAR(10) NOT NULL CHECK (role IN ('user','assistant')),
    content TEXT NOT NULL,
    lang_code VARCHAR(15) NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_chat_session_time ON chat_messages(session_id, created_at);

CREATE TABLE audio_plays (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    session_id UUID NOT NULL REFERENCES visitor_sessions(id) ON DELETE CASCADE,
    attraction_id BIGINT NOT NULL REFERENCES attractions(id) ON DELETE RESTRICT,
    lang_code VARCHAR(15) NOT NULL,
    played_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_audio_attraction_time ON audio_plays(attraction_id, played_at);

CREATE TABLE staff_accounts (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    email VARCHAR(255) NOT NULL UNIQUE,
    password_hash TEXT NOT NULL,
    role VARCHAR(10) NOT NULL CHECK (role IN ('admin','cashier','editor')),
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
COMMIT;
