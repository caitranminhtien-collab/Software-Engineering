CREATE INDEX IF NOT EXISTS idx_attractions_status
ON attractions(status);

CREATE INDEX IF NOT EXISTS idx_attraction_media_attraction_status_order
ON attraction_media(attraction_id, status, display_order);

CREATE INDEX IF NOT EXISTS idx_routes_status
ON routes(status);

CREATE INDEX IF NOT EXISTS idx_route_stops_attraction
ON route_stops(attraction_id);

CREATE INDEX IF NOT EXISTS idx_audio_plays_session_started
ON audio_plays(session_id, started_at DESC);

CREATE INDEX IF NOT EXISTS idx_chat_messages_session_created
ON chat_messages(session_id, created_at, message_id);

CREATE INDEX IF NOT EXISTS idx_knowledge_documents_attraction_language_status
ON knowledge_documents(attraction_id, language_code, status);

CREATE INDEX IF NOT EXISTS idx_visitor_sessions_expires
ON visitor_sessions(expires_at);