import {
  createDraftAttraction,
  findAttractionBySlug,
  findStaffAttractionById,
  updateEditableAttraction,
} from "../repositories/staff-attraction.repository";

export interface CreateStaffAttractionResult {
  id: number;
  slug: string;
  area_code: string;
  latitude: number;
  longitude: number;
  trigger_radius_m: number;
  status: "draft";
  content_version: number;
  created_by: number;
  approved_by: number | null;
  published_at: Date | null;
  updated_at: Date;
}

export class AttractionSlugConflictError
  extends Error {
  constructor() {
    super("Attraction slug already exists");
    this.name =
      "AttractionSlugConflictError";
  }
}

function isUniqueViolation(
  error: unknown
): boolean {
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    (
      error as {
        code?: string;
      }
    ).code === "23505"
  );
}

export async function createStaffAttraction(
  slug: string,
  areaCode: string,
  latitude: number,
  longitude: number,
  triggerRadiusM: number,
  createdBy: number
): Promise<CreateStaffAttractionResult> {
  const existing =
    await findAttractionBySlug(slug);

  if (existing) {
    throw new AttractionSlugConflictError();
  }

  try {
    const attraction =
      await createDraftAttraction(
        slug,
        areaCode,
        latitude,
        longitude,
        triggerRadiusM,
        createdBy
      );

    return {
      id: Number(
        attraction.attraction_id
      ),
      slug: attraction.slug,
      area_code:
        attraction.area_code,
      latitude:
        attraction.latitude,
      longitude:
        attraction.longitude,
      trigger_radius_m:
        attraction.trigger_radius_m,
      status: "draft",
      content_version:
        attraction.content_version,
      created_by: Number(
        attraction.created_by
      ),
      approved_by:
        attraction.approved_by === null
          ? null
          : Number(
              attraction.approved_by
            ),
      published_at:
        attraction.published_at,
      updated_at:
        attraction.updated_at,
    };
  } catch (error) {
    // DB UNIQUE constraint vẫn là lớp bảo vệ cuối
    // nếu 2 request tạo cùng slug đồng thời.
    if (isUniqueViolation(error)) {
      throw new AttractionSlugConflictError();
    }

    throw error;
  }
}

export interface UpdateStaffAttractionInput {
  slug?: string;
  areaCode?: string;
  latitude?: number;
  longitude?: number;
  triggerRadiusM?: number;
}

export interface UpdateStaffAttractionResult {
  id: number;
  slug: string;
  area_code: string;
  latitude: number;
  longitude: number;
  trigger_radius_m: number;
  status: "draft";
  content_version: number;
  created_by: number;
  approved_by: number | null;
  published_at: Date | null;
  updated_at: Date;
}

export class StaffAttractionNotFoundError
  extends Error {
  constructor() {
    super("Attraction not found");
    this.name =
      "StaffAttractionNotFoundError";
  }
}

export class AttractionWorkflowConflictError
  extends Error {
  constructor() {
    super(
      "Attraction cannot be edited in its current status"
    );

    this.name =
      "AttractionWorkflowConflictError";
  }
}

export async function updateStaffAttraction(
  attractionId: number,
  input: UpdateStaffAttractionInput
): Promise<UpdateStaffAttractionResult> {
  const current =
    await findStaffAttractionById(
      attractionId
    );

  if (!current) {
    throw new StaffAttractionNotFoundError();
  }

  if (
    current.status !== "draft" &&
    current.status !== "published"
  ) {
    throw new AttractionWorkflowConflictError();
  }

  const slug =
    input.slug ?? current.slug;

  const areaCode =
    input.areaCode ??
    current.area_code;

  const latitude =
    input.latitude ??
    current.latitude;

  const longitude =
    input.longitude ??
    current.longitude;

  const triggerRadiusM =
    input.triggerRadiusM ??
    current.trigger_radius_m;

  if (slug !== current.slug) {
    const sameSlug =
      await findAttractionBySlug(slug);

    if (
      sameSlug &&
      Number(
        sameSlug.attraction_id
      ) !== attractionId
    ) {
      throw new AttractionSlugConflictError();
    }
  }

  try {
    const updated =
      await updateEditableAttraction(
        attractionId,
        slug,
        areaCode,
        latitude,
        longitude,
        triggerRadiusM
      );

    if (!updated) {
      throw new AttractionWorkflowConflictError();
    }

    return {
      id: Number(
        updated.attraction_id
      ),
      slug: updated.slug,
      area_code:
        updated.area_code,
      latitude:
        updated.latitude,
      longitude:
        updated.longitude,
      trigger_radius_m:
        updated.trigger_radius_m,
      status: "draft",
      content_version:
        updated.content_version,
      created_by: Number(
        updated.created_by
      ),
      approved_by:
        updated.approved_by === null
          ? null
          : Number(
              updated.approved_by
            ),
      published_at:
        updated.published_at,
      updated_at:
        updated.updated_at,
    };
  } catch (error) {
    if (isUniqueViolation(error)) {
      throw new AttractionSlugConflictError();
    }

    throw error;
  }
}