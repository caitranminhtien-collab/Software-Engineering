import type {
  NextFunction,
  Request,
  Response,
} from "express";

export interface CreateStaffAttractionBody {
  slug: string;
  areaCode: string;
  latitude: number;
  longitude: number;
  triggerRadiusM: number;
}

export function validateCreateStaffAttraction(
  req: Request,
  res: Response,
  next: NextFunction
): void {
  const errors: string[] = [];

  const rawSlug = req.body.slug;
  const rawAreaCode = req.body.area_code;
  const rawLatitude = req.body.latitude;
  const rawLongitude = req.body.longitude;
  const rawTriggerRadiusM =
    req.body.trigger_radius_m;

  const slug =
    typeof rawSlug === "string"
      ? rawSlug.trim().toLowerCase()
      : "";

  const areaCode =
    typeof rawAreaCode === "string"
      ? rawAreaCode.trim()
      : "";

  const latitude = Number(rawLatitude);
  const longitude = Number(rawLongitude);
  const triggerRadiusM =
    Number(rawTriggerRadiusM);

  if (
    !slug ||
    slug.length > 255 ||
    !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(
      slug
    )
  ) {
    errors.push(
      "slug must use lowercase letters, numbers, and hyphens"
    );
  }

  if (
    !areaCode ||
    areaCode.length > 100
  ) {
    errors.push(
      "area_code is required and must not exceed 100 characters"
    );
  }

  if (
    rawLatitude === undefined ||
    !Number.isFinite(latitude) ||
    latitude < -90 ||
    latitude > 90
  ) {
    errors.push(
      "latitude must be a number between -90 and 90"
    );
  }

  if (
    rawLongitude === undefined ||
    !Number.isFinite(longitude) ||
    longitude < -180 ||
    longitude > 180
  ) {
    errors.push(
      "longitude must be a number between -180 and 180"
    );
  }

  if (
    rawTriggerRadiusM === undefined ||
    !Number.isInteger(triggerRadiusM) ||
    triggerRadiusM <= 0
  ) {
    errors.push(
      "trigger_radius_m must be a positive integer"
    );
  }

  if (errors.length > 0) {
    res.status(400).json({
      error: {
        code: "VALIDATION_ERROR",
        message: "Invalid request body",
        details: errors,
      },
    });

    return;
  }

  res.locals.createStaffAttractionBody = {
    slug,
    areaCode,
    latitude,
    longitude,
    triggerRadiusM,
  } satisfies CreateStaffAttractionBody;

  next();
}

export interface UpdateStaffAttractionParams {
  attractionId: number;
}

export interface UpdateStaffAttractionBody {
  slug?: string;
  areaCode?: string;
  latitude?: number;
  longitude?: number;
  triggerRadiusM?: number;
}

export function validateStaffAttractionId(
  req: Request,
  res: Response,
  next: NextFunction
): void {
  const attractionId = Number(req.params.id);

  if (
    !Number.isInteger(attractionId) ||
    attractionId <= 0
  ) {
    res.status(400).json({
      error: {
        code: "VALIDATION_ERROR",
        message: "Invalid request parameters",
        details: [
          "attraction id must be a positive integer",
        ],
      },
    });

    return;
  }

  res.locals.staffAttractionParams = {
    attractionId,
  } satisfies UpdateStaffAttractionParams;

  next();
}

export function validateUpdateStaffAttraction(
  req: Request,
  res: Response,
  next: NextFunction
): void {
  const errors: string[] = [];
  const body: UpdateStaffAttractionBody = {};

  if (req.body.slug !== undefined) {
    const slug =
      typeof req.body.slug === "string"
        ? req.body.slug.trim().toLowerCase()
        : "";

    if (
      !slug ||
      slug.length > 255 ||
      !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug)
    ) {
      errors.push(
        "slug must use lowercase letters, numbers, and hyphens"
      );
    } else {
      body.slug = slug;
    }
  }

  if (req.body.area_code !== undefined) {
    const areaCode =
      typeof req.body.area_code === "string"
        ? req.body.area_code.trim()
        : "";

    if (
      !areaCode ||
      areaCode.length > 100
    ) {
      errors.push(
        "area_code must not be empty or exceed 100 characters"
      );
    } else {
      body.areaCode = areaCode;
    }
  }

  if (req.body.latitude !== undefined) {
    const latitude = Number(req.body.latitude);

    if (
      !Number.isFinite(latitude) ||
      latitude < -90 ||
      latitude > 90
    ) {
      errors.push(
        "latitude must be a number between -90 and 90"
      );
    } else {
      body.latitude = latitude;
    }
  }

  if (req.body.longitude !== undefined) {
    const longitude = Number(req.body.longitude);

    if (
      !Number.isFinite(longitude) ||
      longitude < -180 ||
      longitude > 180
    ) {
      errors.push(
        "longitude must be a number between -180 and 180"
      );
    } else {
      body.longitude = longitude;
    }
  }

  if (req.body.trigger_radius_m !== undefined) {
    const triggerRadiusM =
      Number(req.body.trigger_radius_m);

    if (
      !Number.isInteger(triggerRadiusM) ||
      triggerRadiusM <= 0
    ) {
      errors.push(
        "trigger_radius_m must be a positive integer"
      );
    } else {
      body.triggerRadiusM = triggerRadiusM;
    }
  }

  if (
    Object.keys(body).length === 0 &&
    errors.length === 0
  ) {
    errors.push(
      "at least one editable field is required"
    );
  }

  if (errors.length > 0) {
    res.status(400).json({
      error: {
        code: "VALIDATION_ERROR",
        message: "Invalid request body",
        details: errors,
      },
    });

    return;
  }

  res.locals.updateStaffAttractionBody = body;

  next();
}