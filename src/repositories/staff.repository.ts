import type {
  QueryResultRow,
} from "pg";

import {
  db,
} from "../config/database";

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

export interface StaffAccountSafeRow
  extends QueryResultRow {
  staff_id: string;
  email: string;
  full_name: string;
  role: StaffRole;
  is_active: boolean;
  created_at: Date;
}

export interface UpdateStaffAccountRepositoryInput {
  email?: string;
  passwordHash?: string;
  fullName?: string;
  role?: StaffRole;
  isActive?: boolean;
}

/*
 * Dùng cho login.
 */
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

/*
 * Dùng cho authentication middleware.
 */
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

/*
 * Admin: GET /staff/accounts
 *
 * Không trả password_hash.
 */
export async function findAllStaffAccounts(): Promise<
  StaffAccountSafeRow[]
> {
  const result =
    await db.query<StaffAccountSafeRow>(
      `
        SELECT
          staff_id,
          email,
          full_name,
          role,
          is_active,
          created_at

        FROM staff_accounts

        ORDER BY staff_id ASC
      `
    );

  return result.rows;
}

/*
 * Admin: lấy account theo id.
 *
 * Không trả password_hash.
 */
export async function findStaffAccountById(
  staffId: number
): Promise<StaffAccountSafeRow | null> {
  const result =
    await db.query<StaffAccountSafeRow>(
      `
        SELECT
          staff_id,
          email,
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

/*
 * Admin: POST /staff/accounts
 */
export async function createStaffAccount(
  email: string,
  passwordHash: string,
  fullName: string,
  role: StaffRole,
  isActive: boolean
): Promise<StaffAccountSafeRow> {
  const result =
    await db.query<StaffAccountSafeRow>(
      `
        INSERT INTO staff_accounts (
          email,
          password_hash,
          full_name,
          role,
          is_active
        )
        VALUES (
          $1,
          $2,
          $3,
          $4,
          $5
        )

        RETURNING
          staff_id,
          email,
          full_name,
          role,
          is_active,
          created_at
      `,
      [
        email,
        passwordHash,
        fullName,
        role,
        isActive,
      ]
    );

  return result.rows[0];
}

/*
 * Admin: PATCH /staff/accounts/:id
 */
export async function updateStaffAccount(
  staffId: number,
  input: UpdateStaffAccountRepositoryInput
): Promise<StaffAccountSafeRow | null> {
  const result =
    await db.query<StaffAccountSafeRow>(
      `
        UPDATE staff_accounts

        SET
          email =
            COALESCE(
              $2,
              email
            ),

          password_hash =
            COALESCE(
              $3,
              password_hash
            ),

          full_name =
            COALESCE(
              $4,
              full_name
            ),

          role =
            COALESCE(
              $5,
              role
            ),

          is_active =
            COALESCE(
              $6,
              is_active
            )

        WHERE staff_id = $1

        RETURNING
          staff_id,
          email,
          full_name,
          role,
          is_active,
          created_at
      `,
      [
        staffId,
        input.email ?? null,
        input.passwordHash ?? null,
        input.fullName ?? null,
        input.role ?? null,
        input.isActive ?? null,
      ]
    );

  return result.rows[0] ?? null;
}