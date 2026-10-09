import {
  countPublishedRoutes,
  findPublishedRouteById,
  findPublishedRoutes,
  findRouteStopsByRouteId,
} from "../repositories/route.repository";

export interface RouteListItem {
  id: number;
  slug: string;
  name: string;
  description: string;
  area_code: string;
  estimated_minutes: number;
  verified_at: Date | null;
}
export interface RouteListResult {
  data: RouteListItem[];

  pagination: {
    page: number;
    page_size: number;
    total: number;
    total_pages: number;
  };
}
export interface RouteStopResult {
  id: number;
  order: number;

  attraction_id: number;
  attraction_slug: string;
  attraction_name: string | null;

  latitude: number;
  longitude: number;

  visit_minutes: number | null;
  travel_minutes_from_previous: number | null;
}

export interface RouteDetailResult {
  id: number;
  slug: string;
  name: string;
  description: string;
  area_code: string;
  estimated_minutes: number;
  verified_at: Date | null;

  stops: RouteStopResult[];
}

export async function getPublishedRoutes(
  page: number,
  pageSize: number
): Promise<RouteListResult> {
  const offset = (page - 1) * pageSize;

  const [rows, total] = await Promise.all([
    findPublishedRoutes(pageSize, offset),
    countPublishedRoutes(),
  ]);

  const data: RouteListItem[] = rows.map((row) => ({
    id: Number(row.route_id),
    slug: row.slug,
    name: row.name_vi,
    description: row.description_vi,
    area_code: row.area_code,
    estimated_minutes: row.estimated_minutes,
    verified_at: row.verified_at,
  }));

  return {
    data,

    pagination: {
      page,
      page_size: pageSize,
      total,
      total_pages: Math.ceil(total / pageSize),
    },
  };
}

export class RouteNotFoundError extends Error {
  constructor() {
    super("Route not found");
    this.name = "RouteNotFoundError";
  }
}

export async function getPublishedRouteById(
  routeId: number
): Promise<RouteDetailResult> {
  const row = await findPublishedRouteById(routeId);

  if (!row) {
    throw new RouteNotFoundError();
  }

  const stopRows = await findRouteStopsByRouteId(
    routeId
  );

  const stops: RouteStopResult[] = stopRows.map(
    (stop) => ({
      id: Number(stop.route_stop_id),
      order: stop.stop_order,

      attraction_id: Number(stop.attraction_id),
      attraction_slug: stop.attraction_slug,
      attraction_name: stop.attraction_name,

      latitude: stop.latitude,
      longitude: stop.longitude,

      visit_minutes: stop.visit_minutes,
      travel_minutes_from_previous:
        stop.travel_minutes_from_previous,
    })
  );

  return {
    id: Number(row.route_id),
    slug: row.slug,
    name: row.name_vi,
    description: row.description_vi,
    area_code: row.area_code,
    estimated_minutes: row.estimated_minutes,
    verified_at: row.verified_at,

    stops,
  };
}