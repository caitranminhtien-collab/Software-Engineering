import "dotenv/config";
import { Pool } from "pg";

const useSSL = process.env.DB_SSL === "true";

export const db = new Pool({
  host: process.env.DB_HOST,
  port: Number(process.env.DB_PORT ?? 5432),
  database: process.env.DB_NAME,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,

  ssl: useSSL
    ? { rejectUnauthorized: true }
    : false,
});

export async function checkDatabaseConnection(): Promise<void> {
  await db.query("SELECT 1");
}