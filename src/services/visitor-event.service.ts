import {
  findPublishedAttractionById,
} from "../repositories/attraction.repository";
import {
  findPublishedRouteById,
  findRouteStopsByRouteId,
} from "../repositories/route.repository";
import {
  createVisitorEvent,
  type VisitorEventType,
} from "../repositories/visitor-event.repository";

const SUPPORTED_LANGUAGES = new Set([
  "vi", "en", "zh", "ja", "ko", "fr", "de",
]);
const EVENT_TYPES = new Set<VisitorEventType>([
  "attraction_view", "tts_started", "route_started",
]);

/** This data must come from requireVisitorSession, never from the request body. */
export interface VisitorEventSession {
  sessionId: number;
  accessScope: "public" | "route" | "attraction";
  accessRouteId: number | null;
  accessAttractionId: number | null;
  /** Needed to validate time-limited scoped access. */
  accessExpiresAt?: Date | string | null;
}

export interface RecordVisitorEventInput {
  eventType: VisitorEventType;
  attractionId?: number | null;
  routeId?: number | null;
  languageCode?: string | null;
}

export interface VisitorEventResult {
  id: number;
  session_id: number;
  event_type: VisitorEventType;
  attraction_id: number | null;
  route_id: number | null;
  language_code: string | null;
  created_at: Date;
}

export class InvalidVisitorEventError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "InvalidVisitorEventError";
  }
}

export class VisitorEventAccessDeniedError extends Error {
  constructor() {
    super("Visitor session does not allow this event");
    this.name = "VisitorEventAccessDeniedError";
  }
}

export class VisitorEventTargetNotFoundError extends Error {
  constructor() {
    super("Published attraction or route not found");
    this.name = "VisitorEventTargetNotFoundError";
  }
}

function isPositiveId(value: unknown): value is number {
  return typeof value === "number" &&
    Number.isSafeInteger(value) && value > 0;
}

/** Enforce route/attraction scopes as well as a scoped access expiration. */
async function checkAccess(
  session: VisitorEventSession,
  attractionId: number | null,
  routeId: number | null
): Promise<void> {
  if (!isPositiveId(session.sessionId)) {
    throw new VisitorEventAccessDeniedError();
  }
  if (session.accessScope === "public") return;

  // Non-public grants are time-limited. The middleware must pass accessExpiresAt.
  const expiration = session.accessExpiresAt;
  const expiresAt = expiration == null ? NaN : new Date(expiration).getTime();
  if (!Number.isFinite(expiresAt) || expiresAt <= Date.now()) {
    throw new VisitorEventAccessDeniedError();
  }

  if (session.accessScope === "attraction") {
    if (
      attractionId === null ||
      session.accessAttractionId !== attractionId ||
      routeId !== null
    ) {
      throw new VisitorEventAccessDeniedError();
    }
    return;
  }

  if (session.accessScope === "route") {
    const scopedRouteId = session.accessRouteId;
    if (!isPositiveId(scopedRouteId)) {
      throw new VisitorEventAccessDeniedError();
    }
    if (routeId !== null) {
      if (routeId !== scopedRouteId) {
        throw new VisitorEventAccessDeniedError();
      }
      return;
    }
    if (attractionId !== null) {
      const stops = await findRouteStopsByRouteId(scopedRouteId);
      if (!stops.some((stop) => Number(stop.attraction_id) === attractionId)) {
        throw new VisitorEventAccessDeniedError();
      }
      return;
    }
  }
  throw new VisitorEventAccessDeniedError();
}

/**
 * Validate and record an event for an authenticated Visitor Session.
 * The Controller must call requireVisitorSession first.
 */
export async function recordVisitorEvent(
  session: VisitorEventSession,
  input: RecordVisitorEventInput
): Promise<VisitorEventResult> {
  if (!EVENT_TYPES.has(input.eventType)) {
    throw new InvalidVisitorEventError("Unsupported event_type");
  }

  const attractionId = input.attractionId ?? null;
  const routeId = input.routeId ?? null;
  const languageCode = input.languageCode ?? null;

  if (input.eventType === "route_started") {
    if (!isPositiveId(routeId) || attractionId !== null || languageCode !== null) {
      throw new InvalidVisitorEventError("route_started requires route_id only");
    }
  } else {
    if (!isPositiveId(attractionId) || routeId !== null) {
      throw new InvalidVisitorEventError("Attraction events require attraction_id only");
    }
    if (input.eventType === "tts_started") {
      if (typeof languageCode !== "string" || !SUPPORTED_LANGUAGES.has(languageCode)) {
        throw new InvalidVisitorEventError("tts_started requires a supported language_code");
      }
    } else if (languageCode !== null) {
      throw new InvalidVisitorEventError("attraction_view must not include language_code");
    }
  }

  await checkAccess(session, attractionId, routeId);

  if (routeId !== null) {
    const route = await findPublishedRouteById(routeId);
    if (!route) throw new VisitorEventTargetNotFoundError();
  }
  if (attractionId !== null) {
    const language = languageCode ?? "vi";
    const attraction = await findPublishedAttractionById(attractionId, language);
    if (!attraction) throw new VisitorEventTargetNotFoundError();

    // Do not count TTS in a language for which no public text exists.
    if (input.eventType === "tts_started" &&
        languageCode !== "vi" &&
        !attraction.requested_description?.trim()) {
      throw new VisitorEventTargetNotFoundError();
    }
  }

  const saved = await createVisitorEvent({
    sessionId: session.sessionId,
    eventType: input.eventType,
    attractionId,
    routeId,
    languageCode,
  });

  return {
    id: Number(saved.event_id),
    session_id: Number(saved.session_id),
    event_type: saved.event_type,
    attraction_id: saved.attraction_id === null ? null : Number(saved.attraction_id),
    route_id: saved.route_id === null ? null : Number(saved.route_id),
    language_code: saved.language_code,
    created_at: saved.created_at,
  };
}
