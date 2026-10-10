import type {
  NextFunction,
  Request,
  Response,
} from "express";

import type {
  StaffRole,
} from "../repositories/staff.repository";

interface StaffLocal {
  id: number;
  email: string;
  full_name: string;
  role: StaffRole;
}

export function requireStaffRole(
  ...allowedRoles: StaffRole[]
) {
  return (
    _req: Request,
    res: Response,
    next: NextFunction
  ): void => {
    const staff =
      res.locals.staff as
        | StaffLocal
        | undefined;

    if (!staff) {
      res.status(401).json({
        error: {
          code: "UNAUTHORIZED",
          message:
            "Staff authentication required",
        },
      });

      return;
    }

    if (
      !allowedRoles.includes(
        staff.role
      )
    ) {
      res.status(403).json({
        error: {
          code: "FORBIDDEN",
          message:
            "You do not have permission to perform this action",
        },
      });

      return;
    }

    next();
  };
}