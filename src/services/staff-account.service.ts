import bcrypt from "bcrypt";

import {
  createStaffAccount,
  findAllStaffAccounts,
  findStaffAccountById,
  findStaffByEmail,
  updateStaffAccount,
} from "../repositories/staff.repository";

import type {
  StaffAccountSafeRow,
  StaffRole,
} from "../repositories/staff.repository";

import type {
  CreateStaffAccountBody,
  UpdateStaffAccountBody,
} from "../validators/staff-account.validator";

export interface StaffAccountResult {
  id: number;
  email: string;
  full_name: string;
  role: StaffRole;
  is_active: boolean;
  created_at: Date;
}

export class StaffAccountNotFoundError
  extends Error {
  constructor() {
    super("Staff account not found");

    this.name =
      "StaffAccountNotFoundError";
  }
}

export class StaffAccountEmailConflictError
  extends Error {
  constructor() {
    super(
      "Staff account email already exists"
    );

    this.name =
      "StaffAccountEmailConflictError";
  }
}

function mapStaffAccount(
  row: StaffAccountSafeRow
): StaffAccountResult {
  return {
    id: Number(
      row.staff_id
    ),

    email:
      row.email,

    full_name:
      row.full_name,

    role:
      row.role,

    is_active:
      row.is_active,

    created_at:
      row.created_at,
  };
}

export async function listStaffAccounts(): Promise<
  StaffAccountResult[]
> {
  const accounts =
    await findAllStaffAccounts();

  return accounts.map(
    mapStaffAccount
  );
}

export async function createStaffAccountService(
  input: CreateStaffAccountBody
): Promise<StaffAccountResult> {
  const existing =
    await findStaffByEmail(
      input.email
    );

  if (existing) {
    throw new StaffAccountEmailConflictError();
  }

  const passwordHash =
    await bcrypt.hash(
      input.password,
      12
    );

  try {
    const account =
      await createStaffAccount(
        input.email,
        passwordHash,
        input.fullName,
        input.role,
        input.isActive
      );

    return mapStaffAccount(
      account
    );
  } catch (error) {
    if (
      typeof error === "object" &&
      error !== null &&
      "code" in error &&
      error.code === "23505"
    ) {
      throw new StaffAccountEmailConflictError();
    }

    throw error;
  }
}

export async function updateStaffAccountService(
  staffId: number,
  input: UpdateStaffAccountBody
): Promise<StaffAccountResult> {
  const current =
    await findStaffAccountById(
      staffId
    );

  if (!current) {
    throw new StaffAccountNotFoundError();
  }

  if (
    input.email !== undefined &&
    input.email !== current.email
  ) {
    const existing =
      await findStaffByEmail(
        input.email
      );

    if (
      existing &&
      Number(
        existing.staff_id
      ) !== staffId
    ) {
      throw new StaffAccountEmailConflictError();
    }
  }

  const passwordHash =
    input.password !== undefined
      ? await bcrypt.hash(
          input.password,
          12
        )
      : undefined;

  try {
    const updated =
      await updateStaffAccount(
        staffId,
        {
          email:
            input.email,

          passwordHash,

          fullName:
            input.fullName,

          role:
            input.role,

          isActive:
            input.isActive,
        }
      );

    if (!updated) {
      throw new StaffAccountNotFoundError();
    }

    return mapStaffAccount(
      updated
    );
  } catch (error) {
    if (
      error instanceof
      StaffAccountNotFoundError
    ) {
      throw error;
    }

    if (
      typeof error === "object" &&
      error !== null &&
      "code" in error &&
      error.code === "23505"
    ) {
      throw new StaffAccountEmailConflictError();
    }

    throw error;
  }
}