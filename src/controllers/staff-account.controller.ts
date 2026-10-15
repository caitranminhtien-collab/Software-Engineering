import type {
  Request,
  Response,
} from "express";

import {
  createStaffAccountService,
  listStaffAccounts,
  StaffAccountEmailConflictError,
  StaffAccountNotFoundError,
  updateStaffAccountService,
} from "../services/staff-account.service";

import type {
  CreateStaffAccountBody,
  StaffAccountParams,
  UpdateStaffAccountBody,
} from "../validators/staff-account.validator";

export async function listStaffAccountsController(
  _req: Request,
  res: Response
): Promise<void> {
  try {
    const accounts =
      await listStaffAccounts();

    res.status(200).json({
      data: accounts,
    });
  } catch (error) {
    console.error(
      "List staff accounts failed:",
      error
    );

    res.status(500).json({
      error: {
        code:
          "INTERNAL_SERVER_ERROR",
        message:
          "Unable to list staff accounts",
      },
    });
  }
}

export async function createStaffAccountController(
  _req: Request,
  res: Response
): Promise<void> {
  try {
    const body =
      res.locals
        .createStaffAccountBody as CreateStaffAccountBody;

    const account =
      await createStaffAccountService(
        body
      );

    res.status(201).json({
      data: account,
    });
  } catch (error) {
    if (
      error instanceof
      StaffAccountEmailConflictError
    ) {
      res.status(409).json({
        error: {
          code:
            "STAFF_EMAIL_CONFLICT",
          message:
            "Staff account email already exists",
        },
      });

      return;
    }

    console.error(
      "Create staff account failed:",
      error
    );

    res.status(500).json({
      error: {
        code:
          "INTERNAL_SERVER_ERROR",
        message:
          "Unable to create staff account",
      },
    });
  }
}

export async function updateStaffAccountController(
  _req: Request,
  res: Response
): Promise<void> {
  try {
    const {
      staffId,
    } =
      res.locals
        .staffAccountParams as StaffAccountParams;

    const body =
      res.locals
        .updateStaffAccountBody as UpdateStaffAccountBody;

    const account =
      await updateStaffAccountService(
        staffId,
        body
      );

    res.status(200).json({
      data: account,
    });
  } catch (error) {
    if (
      error instanceof
      StaffAccountNotFoundError
    ) {
      res.status(404).json({
        error: {
          code:
            "STAFF_ACCOUNT_NOT_FOUND",
          message:
            "Staff account not found",
        },
      });

      return;
    }

    if (
      error instanceof
      StaffAccountEmailConflictError
    ) {
      res.status(409).json({
        error: {
          code:
            "STAFF_EMAIL_CONFLICT",
          message:
            "Staff account email already exists",
        },
      });

      return;
    }

    console.error(
      "Update staff account failed:",
      error
    );

    res.status(500).json({
      error: {
        code:
          "INTERNAL_SERVER_ERROR",
        message:
          "Unable to update staff account",
      },
    });
  }
}