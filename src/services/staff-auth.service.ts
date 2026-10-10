import bcrypt from "bcrypt";

import {
  findStaffByEmail,
  findStaffById,
  type StaffRole,
} from "../repositories/staff.repository";

export interface StaffAuthResult {
  id: number;
  email: string;
  full_name: string;
  role: StaffRole;
}

export class InvalidStaffCredentialsError
  extends Error {
  constructor() {
    super("Invalid email or password");
    this.name =
      "InvalidStaffCredentialsError";
  }
}

export class StaffAccountNotFoundError
  extends Error {
  constructor() {
    super("Staff account not found");
    this.name =
      "StaffAccountNotFoundError";
  }
}

function mapStaffAccount(account: {
  staff_id: string;
  email: string;
  full_name: string;
  role: StaffRole;
}): StaffAuthResult {
  return {
    id: Number(account.staff_id),
    email: account.email,
    full_name: account.full_name,
    role: account.role,
  };
}

export async function authenticateStaff(
  email: string,
  password: string
): Promise<StaffAuthResult> {
  const account =
    await findStaffByEmail(email);

  // Cùng một lỗi cho:
  // - email không tồn tại
  // - tài khoản inactive
  // - password sai
  if (!account || !account.is_active) {
    throw new InvalidStaffCredentialsError();
  }

  const passwordMatches =
    await bcrypt.compare(
      password,
      account.password_hash
    );

  if (!passwordMatches) {
    throw new InvalidStaffCredentialsError();
  }

  return mapStaffAccount(account);
}

export async function getActiveStaffById(
  staffId: number
): Promise<StaffAuthResult> {
  const account =
    await findStaffById(staffId);

  if (!account || !account.is_active) {
    throw new StaffAccountNotFoundError();
  }

  return mapStaffAccount(account);
}