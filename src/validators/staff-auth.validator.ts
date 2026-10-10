import type {
  NextFunction,
  Request,
  Response,
} from "express";

export interface StaffLoginBody {
  email: string;
  password: string;
}

export function validateStaffLogin(
  req: Request,
  res: Response,
  next: NextFunction
): void {
  const errors: string[] = [];

  const rawEmail = req.body.email;
  const rawPassword = req.body.password;

  const email =
    typeof rawEmail === "string"
      ? rawEmail.trim().toLowerCase()
      : "";

  const password =
    typeof rawPassword === "string"
      ? rawPassword
      : "";

  if (
    !email ||
    !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
  ) {
    errors.push(
      "email must be a valid email address"
    );
  }

  if (!password) {
    errors.push(
      "password is required"
    );
  }

  if (password.length > 200) {
    errors.push(
      "password is too long"
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

  res.locals.staffLoginBody = {
    email,
    password,
  } satisfies StaffLoginBody;

  next();
}