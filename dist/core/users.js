import { getCoreClient } from "./client";
const toUser = (row) => ({
    id: String(row.id),
    email: String(row.email),
    name: row.name ?? null,
    createdAt: row.created_at ?? row.createdAt,
    updatedAt: row.updated_at ?? row.updatedAt,
});
export const getUserById = async (userId) => {
    const client = getCoreClient();
    const result = await client.execute({
        sql: `SELECT id, email, name, created_at, updated_at FROM users WHERE id = ? LIMIT 1`,
        args: [userId],
    });
    const row = result.rows?.[0];
    return row ? toUser(row) : null;
};
export const getUserByEmail = async (email) => {
    const client = getCoreClient();
    const result = await client.execute({
        sql: `SELECT id, email, name, created_at, updated_at FROM users WHERE email = ? LIMIT 1`,
        args: [email],
    });
    const row = result.rows?.[0];
    return row ? toUser(row) : null;
};
