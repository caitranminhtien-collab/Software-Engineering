import type {
  NextFunction,
  Request,
  Response,
} from "express";

import {
  getActiveStaffById,
  StaffAccountNotFoundError,
} from "../services/staff-auth.service";

export async function requireStaffSession(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const staffId =
      req.session.staffId;

    if (!staffId) {
      res.status(401).json({
        error: {
          code: "UNAUTHORIZED",
          message:
            "Staff authentication required",
        },
      });

      return;
    }

    const staff =
      await getActiveStaffById(staffId);

    res.locals.staff = staff;

    next();
  } catch (error) {
    if (
      error instanceof
      StaffAccountNotFoundError
    ) {
      req.session.destroy(
        () => {}
      );

      res.status(401).json({
        error: {
          code: "UNAUTHORIZED",
          message:
            "Staff session is no longer valid",
        },
      });

      return;
    }

    console.error(
      "Staff authentication failed:",
      error
    );

    res.status(500).json({
      error: {
        code:
          "INTERNAL_SERVER_ERROR",
        message:
          "Unable to verify staff session",
      },
    });
  }
}