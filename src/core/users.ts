import { getCoreClient } from "./client.js";
import { ensureCoreSchema } from "./schema.js";
import { User } from "../types/core.js";

const toUser = (row: Record<string, unknown>): User => ({
  id: String(row.id),
  email: String(row.email),
  name: (row.name as string | null | undefined) ?? null,
  createdAt: (row.created_at as string | undefined) ?? (row.createdAt as string | undefined),
  updatedAt: (row.updated_at as string | undefined) ?? (row.updatedAt as string | undefined),
});

export const getUserById = async (userId: string): Promise<User | null> => {
  await ensureCoreSchema();
  const client = getCoreClient();
  const result = await client.execute({
    sql: `SELECT id, email, name, created_at, updated_at FROM users WHERE id = ? LIMIT 1`,
    args: [userId],
  });

  const row = result.rows?.[0];
  return row ? toUser(row as Record<string, unknown>) : null;
};

export const getUserByEmail = async (email: string): Promise<User | null> => {
  await ensureCoreSchema();
  const client = getCoreClient();
  const result = await client.execute({
    sql: `SELECT id, email, name, created_at, updated_at FROM users WHERE email = ? LIMIT 1`,
    args: [email],
  });

  const row = result.rows?.[0];
  return row ? toUser(row as Record<string, unknown>) : null;
};

export const createUser = async (input: {
  id: string;
  email: string;
  name?: string | null;
}): Promise<User> => {
  await ensureCoreSchema();
  const client = getCoreClient();
  const result = await client.execute({
    sql: `
      INSERT INTO users (id, email, name)
      VALUES (?, ?, ?)
      RETURNING id, email, name, created_at, updated_at
    `,
    args: [input.id, input.email, input.name ?? null],
  });
  const row = result.rows?.[0];
  if (!row) {
    throw new Error("Failed to insert user.");
  }
  return toUser(row as Record<string, unknown>);
};

export const getOrCreateUserByEmail = async (email: string, name?: string | null): Promise<User> => {
  const existing = await getUserByEmail(email);
  if (existing) return existing;

  const id = globalThis.crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random()}`;
  return createUser({ id, email, name: name ?? null });
};
