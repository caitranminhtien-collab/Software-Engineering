import type { QueryResultRow } from "pg";
import { db } from "../config/database";

export type StaffRole =
  | "editor"
  | "reviewer"
  | "admin";

export interface StaffAccountRow
  extends QueryResultRow {
  staff_id: string;
  email: string;
  password_hash: string;
  full_name: string;
  role: StaffRole;
  is_active: boolean;
  created_at: Date;
}

export async function findStaffByEmail(
  email: string
): Promise<StaffAccountRow | null> {
  const result =
    await db.query<StaffAccountRow>(
      `
        SELECT
          staff_id,
          email,
          password_hash,
          full_name,
          role,
          is_active,
          created_at
        FROM staff_accounts
        WHERE email = $1
        LIMIT 1
      `,
      [email]
    );

  return result.rows[0] ?? null;
}

export async function findStaffById(
  staffId: number
): Promise<StaffAccountRow | null> {
  const result =
    await db.query<StaffAccountRow>(
      `
        SELECT
          staff_id,
          email,
          password_hash,
          full_name,
          role,
          is_active,
          created_at
        FROM staff_accounts
        WHERE staff_id = $1
        LIMIT 1
      `,
      [staffId]
    );

  return result.rows[0] ?? null;
}