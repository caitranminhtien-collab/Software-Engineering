import {
  findPublishedRouteById,
  findRouteStopsByRouteId,
} from "../repositories/route.repository";

/** Only requireVisitorSession can supply these fields; never trust request body. */
export interface VisitorGrantSession {
  sessionId: number;
  accessScope: "public" | "route" | "attraction";
  accessRouteId: number | null;
  accessAttractionId: number | null;
  accessExpiresAt?: Date | string | null;
}

export class VisitorGrantDeniedError extends Error {
  constructor() {
    super("Visitor session does not grant access to this resource");
    this.name = "VisitorGrantDeniedError";
  }
}

function positiveId(value: unknown): value is number {
  return typeof value === "number" && Number.isSafeInteger(value) && value > 0;
}

/** Fails closed on unknown, malformed and expired scopes. */
export function assertVisitorGrantValid(session: VisitorGrantSession): void {
  if (!session || !positiveId(session.sessionId)) {
    throw new VisitorGrantDeniedError();
  }
  if (session.accessScope === "public") return;
  if (session.accessScope !== "route" && session.accessScope !== "attraction") {
    throw new VisitorGrantDeniedError();
  }
  const expiresAt = session.accessExpiresAt == null
    ? NaN
    : new Date(session.accessExpiresAt).getTime();
  if (!Number.isFinite(expiresAt) || expiresAt <= Date.now()) {
    throw new VisitorGrantDeniedError();
  }
}

/** null represents unrestricted PUBLIC grants; Set represents scoped attractions. */
export async function accessibleVisitorAttractionIds(
  session: VisitorGrantSession
): Promise<Set<number> | null> {
  assertVisitorGrantValid(session);
  if (session.accessScope === "public") return null;
  if (session.accessScope === "attraction") {
    if (!positiveId(session.accessAttractionId)) throw new VisitorGrantDeniedError();
    return new Set([session.accessAttractionId]);
  }
  const routeId = session.accessRouteId;
  if (!positiveId(routeId)) throw new VisitorGrantDeniedError();
  // A route-scoped visitor cannot keep using a route that is no longer public.
  const publishedRoute = await findPublishedRouteById(routeId);
  if (!publishedRoute) throw new VisitorGrantDeniedError();
  const stops = await findRouteStopsByRouteId(routeId);
  return new Set(stops.map(stop => Number(stop.attraction_id))
    .filter(positiveId));
}

export async function assertVisitorAttractionAccess(
  session: VisitorGrantSession,
  attractionId: number | null
): Promise<void> {
  const allowed = await accessibleVisitorAttractionIds(session);
  if (allowed === null) return; // public session
  // A scoped visitor must supply a specific, authorized attraction to chat.
  if (!positiveId(attractionId) || !allowed.has(attractionId)) {
    throw new VisitorGrantDeniedError();
  }
}
