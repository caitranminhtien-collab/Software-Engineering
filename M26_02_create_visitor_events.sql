BEGIN;

CREATE TABLE public.visitor_events (
    event_id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    session_id BIGINT NOT NULL
        REFERENCES public.visitor_sessions(session_id),
    event_type VARCHAR(30) NOT NULL,
    attraction_id BIGINT
        REFERENCES public.attractions(attraction_id),
    route_id BIGINT
        REFERENCES public.routes(route_id),
    language_code VARCHAR(10),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    CONSTRAINT visitor_events_type_check
    CHECK (
        event_type IN (
            'attraction_view',
            'tts_started',
            'route_started'
        )
    ),

    CONSTRAINT visitor_events_payload_check
    CHECK (
        (
            event_type = 'attraction_view'
            AND attraction_id IS NOT NULL
            AND route_id IS NULL
        )
        OR
        (
            event_type = 'tts_started'
            AND attraction_id IS NOT NULL
            AND route_id IS NULL
            AND language_code IN (
                'vi', 'en', 'zh', 'ja',
                'ko', 'fr', 'de'
            )
        )
        OR
        (
            event_type = 'route_started'
            AND route_id IS NOT NULL
            AND attraction_id IS NULL
        )
    )
);

CREATE INDEX visitor_events_type_created_idx
ON public.visitor_events(event_type, created_at);

CREATE INDEX visitor_events_attraction_idx
ON public.visitor_events(attraction_id, created_at);

CREATE INDEX visitor_events_route_idx
ON public.visitor_events(route_id, created_at);

GRANT SELECT, INSERT
ON public.visitor_events
TO hue_app;

GRANT USAGE
ON SEQUENCE public.visitor_events_event_id_seq
TO hue_app;

COMMIT;
