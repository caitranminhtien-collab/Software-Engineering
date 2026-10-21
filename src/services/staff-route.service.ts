import {
  createDraftRoute,
  findExistingAttractionIds,
  findStaffRouteById,
  findStaffRouteBySlug,
  replaceRouteStopsAtomically,
  findAllStaffRoutes,
  findStaffRouteStopsByRouteId,
  updateStaffRouteDetails,
} from "../repositories/staff-route.repository";

import type {
  StaffRouteStopInput,
  UpdateStaffRouteBody,
} from "../validators/staff-route.validator";

export interface CreateStaffRouteInput {
  slug: string;
  nameVi: string;
  descriptionVi: string;
  areaCode: string;
  estimatedMinutes: number;
}

export interface StaffRouteResult {
  id: number;

  slug: string;
  name_vi: string;
  description_vi: string;
  area_code: string;

  estimated_minutes: number;

  verified_at: Date | null;

  status: string;
  content_version: number;

  created_by: number;

  approved_by: number | null;
  published_at: Date | null;
}

export interface ReplaceStaffRouteStopsResult {
  route: StaffRouteResult;

  stops: {
    attraction_id: number;
    stop_order: number;
    visit_minutes: number | null;
    travel_minutes_from_previous:
      number | null;
  }[];
}

export class StaffRouteNotFoundError
  extends Error {
  constructor() {
    super("Route not found");

    this.name =
      "StaffRouteNotFoundError";
  }
}

export class StaffRouteSlugConflictError
  extends Error {
  constructor() {
    super("Route slug already exists");

    this.name =
      "StaffRouteSlugConflictError";
  }
}

export class StaffRouteEditConflictError
  extends Error {
  constructor() {
    super(
      "Route cannot be edited in its current status"
    );

    this.name =
      "StaffRouteEditConflictError";
  }
}

export class StaffRouteAttractionNotFoundError
  extends Error {
  public readonly attractionIds:
    number[];

  constructor(
    attractionIds: number[]
  ) {
    super(
      "One or more attractions do not exist"
    );

    this.name =
      "StaffRouteAttractionNotFoundError";

    this.attractionIds =
      attractionIds;
  }
}

function mapStaffRoute(
  route: {
    route_id: string;
    slug: string;
    name_vi: string;
    description_vi: string;
    area_code: string;
    estimated_minutes: number;
    verified_at: Date | null;
    status: string;
    content_version: number;
    created_by: string;
    approved_by: string | null;
    published_at: Date | null;
  }
): StaffRouteResult {
  return {
    id: Number(
      route.route_id
    ),

    slug:
      route.slug,

    name_vi:
      route.name_vi,

    description_vi:
      route.description_vi,

    area_code:
      route.area_code,

    estimated_minutes:
      Number(
        route.estimated_minutes
      ),

    verified_at:
      route.verified_at,

    status:
      route.status,

    content_version:
      Number(
        route.content_version
      ),

    created_by:
      Number(
        route.created_by
      ),

    approved_by:
      route.approved_by === null
        ? null
        : Number(
            route.approved_by
          ),

    published_at:
      route.published_at,
  };
}

export async function createStaffRoute(
  input: CreateStaffRouteInput,
  createdBy: number
): Promise<StaffRouteResult> {
  const existing =
    await findStaffRouteBySlug(
      input.slug
    );

  if (existing) {
    throw new StaffRouteSlugConflictError();
  }

  const route =
    await createDraftRoute(
      input.slug,
      input.nameVi,
      input.descriptionVi,
      input.areaCode,
      input.estimatedMinutes,
      createdBy
    );

  return mapStaffRoute(
    route
  );
}

export async function replaceStaffRouteStops(
  routeId: number,
  stops: StaffRouteStopInput[]
): Promise<ReplaceStaffRouteStopsResult> {
  const route =
    await findStaffRouteById(
      routeId
    );

  if (!route) {
    throw new StaffRouteNotFoundError();
  }

  if (
    route.status !== "draft" &&
    route.status !== "published"
  ) {
    throw new StaffRouteEditConflictError();
  }

  const requestedIds =
    [
      ...new Set(
        stops.map(
          (stop) =>
            stop.attractionId
        )
      ),
    ];

  const existingIds =
    await findExistingAttractionIds(
      requestedIds
    );

  const existingSet =
    new Set(
      existingIds
    );

  const missingIds =
    requestedIds.filter(
      (id) =>
        !existingSet.has(id)
    );

  if (
    missingIds.length > 0
  ) {
    throw new StaffRouteAttractionNotFoundError(
      missingIds
    );
  }

  const updatedRoute =
    await replaceRouteStopsAtomically(
      routeId,
      stops
    );

  if (!updatedRoute) {
    throw new StaffRouteEditConflictError();
  }

  return {
    route:
      mapStaffRoute(
        updatedRoute
      ),

    stops:
      stops.map(
        (stop) => ({
          attraction_id:
            stop.attractionId,

          stop_order:
            stop.stopOrder,

          visit_minutes:
            stop.visitMinutes,

          travel_minutes_from_previous:
            stop
              .travelMinutesFromPrevious,
        })
      ),
  };
}
export interface StaffRouteDetailResult {
  route: StaffRouteResult;
  stops: {
    attraction_id: number;
    stop_order: number;
    visit_minutes: number | null;
    travel_minutes_from_previous: number | null;
  }[];
}

export async function listStaffRoutes(): Promise<
  StaffRouteResult[]
> {
  const routes =
    await findAllStaffRoutes();

  return routes.map(mapStaffRoute);
}

export async function getStaffRoute(
  routeId: number
): Promise<StaffRouteDetailResult> {
  const route =
    await findStaffRouteById(routeId);

  if (!route) {
    throw new StaffRouteNotFoundError();
  }

  const stops =
    await findStaffRouteStopsByRouteId(
      routeId
    );

  return {
    route: mapStaffRoute(route),

    stops: stops.map((stop) => ({
      attraction_id: Number(
        stop.attraction_id
      ),
      stop_order: Number(
        stop.stop_order
      ),
      visit_minutes:
        stop.visit_minutes === null
          ? null
          : Number(stop.visit_minutes),
      travel_minutes_from_previous:
        stop.travel_minutes_from_previous ===
        null
          ? null
          : Number(
              stop.travel_minutes_from_previous
            ),
    })),
  };
}

export async function updateStaffRoute(
  routeId: number,
  input: UpdateStaffRouteBody
): Promise<StaffRouteResult> {
  const existingRoute =
    await findStaffRouteById(routeId);

  if (!existingRoute) {
    throw new StaffRouteNotFoundError();
  }

  if (
    existingRoute.status !== "draft" &&
    existingRoute.status !== "published"
  ) {
    throw new StaffRouteEditConflictError();
  }

  const updatedRoute =
    await updateStaffRouteDetails(
      routeId,
      input
    );

  if (!updatedRoute) {
    throw new StaffRouteEditConflictError();
  }

  return mapStaffRoute(updatedRoute);
}
