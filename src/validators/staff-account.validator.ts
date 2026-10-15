import type {
  NextFunction,
  Request,
  Response,
} from "express";

export type StaffAccountRole =
  | "editor"
  | "reviewer"
  | "admin";

export interface StaffAccountParams {
  staffId: number;
}

export interface CreateStaffAccountBody {
  email: string;
  password: string;
  fullName: string;
  role: StaffAccountRole;
  isActive: boolean;
}

export interface UpdateStaffAccountBody {
  email?: string;
  password?: string;
  fullName?: string;
  role?: StaffAccountRole;
  isActive?: boolean;
}

const STAFF_ROLES =
  new Set<StaffAccountRole>([
    "editor",
    "reviewer",
    "admin",
  ]);

function isValidEmail(
  value: string
): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(
    value
  );
}

export function validateStaffAccountParams(
  req: Request,
  res: Response,
  next: NextFunction
): void {
  const staffId =
    Number(req.params.id);

  if (
    !Number.isInteger(staffId) ||
    staffId <= 0
  ) {
    res.status(400).json({
      error: {
        code: "VALIDATION_ERROR",
        message:
          "Invalid request parameters",
        details: [
          "staff id must be a positive integer",
        ],
      },
    });

    return;
  }

  res.locals.staffAccountParams = {
    staffId,
  } satisfies StaffAccountParams;

  next();
}

export function validateCreateStaffAccount(
  req: Request,
  res: Response,
  next: NextFunction
): void {
  const errors: string[] = [];

  const email =
    typeof req.body.email === "string"
      ? req.body.email
          .trim()
          .toLowerCase()
      : "";

  const password =
    typeof req.body.password ===
    "string"
      ? req.body.password
      : "";

  const fullName =
    typeof req.body.full_name ===
    "string"
      ? req.body.full_name.trim()
      : "";

  const role =
    typeof req.body.role === "string"
      ? req.body.role
          .trim()
          .toLowerCase()
      : "";

  const isActive =
    req.body.is_active === undefined
      ? true
      : req.body.is_active;

  if (
    !email ||
    !isValidEmail(email)
  ) {
    errors.push(
      "email must be a valid email address"
    );
  }

  if (
    !password ||
    password.length < 8
  ) {
    errors.push(
      "password must contain at least 8 characters"
    );
  }

  if (!fullName) {
    errors.push(
      "full_name is required"
    );
  }

  if (
    !STAFF_ROLES.has(
      role as StaffAccountRole
    )
  ) {
    errors.push(
      "role must be editor, reviewer, or admin"
    );
  }

  if (
    typeof isActive !==
    "boolean"
  ) {
    errors.push(
      "is_active must be boolean"
    );
  }

  if (errors.length > 0) {
    res.status(400).json({
      error: {
        code: "VALIDATION_ERROR",
        message:
          "Invalid staff account request body",
        details: errors,
      },
    });

    return;
  }

  res.locals.createStaffAccountBody = {
    email,
    password,
    fullName,
    role:
      role as StaffAccountRole,
    isActive,
  } satisfies CreateStaffAccountBody;

  next();
}

export function validateUpdateStaffAccount(
  req: Request,
  res: Response,
  next: NextFunction
): void {
  const errors: string[] = [];

  const body:
    UpdateStaffAccountBody = {};

  if (
    req.body.email !== undefined
  ) {
    if (
      typeof req.body.email !==
      "string"
    ) {
      errors.push(
        "email must be a string"
      );
    } else {
      const email =
        req.body.email
          .trim()
          .toLowerCase();

      if (
        !email ||
        !isValidEmail(email)
      ) {
        errors.push(
          "email must be a valid email address"
        );
      } else {
        body.email = email;
      }
    }
  }

  if (
    req.body.password !==
    undefined
  ) {
    if (
      typeof req.body.password !==
        "string" ||
      req.body.password.length < 8
    ) {
      errors.push(
        "password must contain at least 8 characters"
      );
    } else {
      body.password =
        req.body.password;
    }
  }

  if (
    req.body.full_name !==
    undefined
  ) {
    if (
      typeof req.body.full_name !==
      "string"
    ) {
      errors.push(
        "full_name must be a string"
      );
    } else {
      const fullName =
        req.body.full_name.trim();

      if (!fullName) {
        errors.push(
          "full_name must not be empty"
        );
      } else {
        body.fullName =
          fullName;
      }
    }
  }

  if (
    req.body.role !== undefined
  ) {
    if (
      typeof req.body.role !==
      "string"
    ) {
      errors.push(
        "role must be a string"
      );
    } else {
      const role =
        req.body.role
          .trim()
          .toLowerCase();

      if (
        !STAFF_ROLES.has(
          role as StaffAccountRole
        )
      ) {
        errors.push(
          "role must be editor, reviewer, or admin"
        );
      } else {
        body.role =
          role as StaffAccountRole;
      }
    }
  }

  if (
    req.body.is_active !==
    undefined
  ) {
    if (
      typeof req.body.is_active !==
      "boolean"
    ) {
      errors.push(
        "is_active must be boolean"
      );
    } else {
      body.isActive =
        req.body.is_active;
    }
  }

  if (
    Object.keys(body).length === 0 &&
    errors.length === 0
  ) {
    errors.push(
      "At least one field must be provided"
    );
  }

  if (errors.length > 0) {
    res.status(400).json({
      error: {
        code: "VALIDATION_ERROR",
        message:
          "Invalid staff account request body",
        details: errors,
      },
    });

    return;
  }

  res.locals.updateStaffAccountBody =
    body;

  next();
}