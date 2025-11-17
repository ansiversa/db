import { getCoreClient } from "./client.js";
import { User } from "../types/core.js";

const toUser = (row: Record<string, unknown>): User => ({
  id: String(row.id),
  email: String(row.email),
  name: (row.name as string | null | undefined) ?? null,
  createdAt: (row.created_at as string | undefined) ?? (row.createdAt as string | undefined),
  updatedAt: (row.updated_at as string | undefined) ?? (row.updatedAt as string | undefined),
});

export const getUserById = async (userId: string): Promise<User | null> => {
  const client = getCoreClient();
  const result = await client.execute({
    sql: `SELECT id, email, name, created_at, updated_at FROM users WHERE id = ? LIMIT 1`,
    args: [userId],
  });

  const row = result.rows?.[0];
  return row ? toUser(row) : null;
};

export const getUserByEmail = async (email: string): Promise<User | null> => {
  const client = getCoreClient();
  const result = await client.execute({
    sql: `SELECT id, email, name, created_at, updated_at FROM users WHERE email = ? LIMIT 1`,
    args: [email],
  });

  const row = result.rows?.[0];
  return row ? toUser(row) : null;
};
