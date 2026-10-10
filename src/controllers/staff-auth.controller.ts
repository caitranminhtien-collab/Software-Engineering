import type {
  Request,
  Response,
} from "express";

import {
  authenticateStaff,
  InvalidStaffCredentialsError,
  type StaffAuthResult,
} from "../services/staff-auth.service";

import type {
  StaffLoginBody,
} from "../validators/staff-auth.validator";

import {
  createCsrfToken,
} from "../middleware/staff-csrf.middleware";

function regenerateSession(
  req: Request
): Promise<void> {
  return new Promise(
    (resolve, reject) => {
      req.session.regenerate(
        (error) => {
          if (error) {
            reject(error);
            return;
          }

          resolve();
        }
      );
    }
  );
}

function saveSession(
  req: Request
): Promise<void> {
  return new Promise(
    (resolve, reject) => {
      req.session.save(
        (error) => {
          if (error) {
            reject(error);
            return;
          }

          resolve();
        }
      );
    }
  );
}

function destroySession(
  req: Request
): Promise<void> {
  return new Promise(
    (resolve, reject) => {
      req.session.destroy(
        (error) => {
          if (error) {
            reject(error);
            return;
          }

          resolve();
        }
      );
    }
  );
}

export async function staffLoginController(
  _req: Request,
  res: Response
): Promise<void> {
  const req = _req;

  try {
    const {
      email,
      password,
    } = res.locals
      .staffLoginBody as StaffLoginBody;

    const staff =
      await authenticateStaff(
        email,
        password
      );

    // Rotate session ID sau khi login
    // để tránh session fixation.
    await regenerateSession(req);

    req.session.staffId = staff.id;

    // Bảo đảm session đã được ghi vào Redis
    // trước khi trả response.
    await saveSession(req);

    res.status(200).json({
      data: staff,
    });
  } catch (error) {
    if (
      error instanceof
      InvalidStaffCredentialsError
    ) {
      res.status(401).json({
        error: {
          code: "UNAUTHORIZED",
          message:
            "Invalid email or password",
        },
      });

      return;
    }

    console.error(
      "Staff login failed:",
      error
    );

    res.status(500).json({
      error: {
        code:
          "INTERNAL_SERVER_ERROR",
        message:
          "Unable to authenticate staff",
      },
    });
  }
}

export async function staffMeController(
  _req: Request,
  res: Response
): Promise<void> {
  const staff =
    res.locals.staff as StaffAuthResult;

  res.status(200).json({
    data: staff,
  });
}

export async function staffLogoutController(
  req: Request,
  res: Response
): Promise<void> {
  try {
    await destroySession(req);

    res.clearCookie(
      "hue_staff_session",
      {
        httpOnly: true,
        sameSite: "lax",
        secure:
          process.env.NODE_ENV ===
          "production",
        path: "/",
      }
    );

    res.status(200).json({
      data: {
        message:
          "Staff logged out successfully",
      },
    });
  } catch (error) {
    console.error(
      "Staff logout failed:",
      error
    );

    res.status(500).json({
      error: {
        code:
          "INTERNAL_SERVER_ERROR",
        message:
          "Unable to log out staff",
      },
    });
  }
}
export async function staffCsrfController(
  req: Request,
  res: Response
): Promise<void> {
  try {
    const csrfToken =
      createCsrfToken(req);

    await new Promise<void>(
      (resolve, reject) => {
        req.session.save(
          (error) => {
            if (error) {
              reject(error);
              return;
            }

            resolve();
          }
        );
      }
    );

    res.status(200).json({
      data: {
        csrf_token: csrfToken,
      },
    });
  } catch (error) {
    console.error(
      "CSRF token creation failed:",
      error
    );

    res.status(500).json({
      error: {
        code:
          "INTERNAL_SERVER_ERROR",
        message:
          "Unable to create CSRF token",
      },
    });
  }
}