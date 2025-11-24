import { getCoreClient } from "./client.js";
import { ensureCoreSchema } from "./schema.js";
import { Subscription, SubscriptionStatus } from "../types/core.js";

const toSubscription = (row: Record<string, unknown>): Subscription => ({
  id: typeof row.id === "number" ? row.id : Number(row.id ?? 0),
  userId: String(row.user_id),
  plan: String(row.plan),
  status: row.status as SubscriptionStatus,
  periodStart: (row.period_start as string | undefined | null) ?? undefined,
  periodEnd: (row.period_end as string | undefined | null) ?? undefined,
  createdAt: (row.created_at as string | undefined | null) ?? undefined,
  updatedAt: (row.updated_at as string | undefined | null) ?? undefined,
});

export const getSubscriptionsForUser = async (userId: string): Promise<Subscription[]> => {
  await ensureCoreSchema();
  const client = getCoreClient();
  const result = await client.execute({
    sql: `
      SELECT id, user_id, plan, status, period_start, period_end, created_at, updated_at
      FROM subscriptions
      WHERE user_id = ?
      ORDER BY created_at DESC
    `,
    args: [userId],
  });

  return (result.rows ?? []).map((row) => toSubscription(row as Record<string, unknown>));
};

export const getActiveSubscriptionForUser = async (
  userId: string,
): Promise<Subscription | null> => {
  await ensureCoreSchema();
  const client = getCoreClient();
  const result = await client.execute({
    sql: `
      SELECT id, user_id, plan, status, period_start, period_end, created_at, updated_at
      FROM subscriptions
      WHERE user_id = ?
      AND status = 'active'
      ORDER BY created_at DESC
      LIMIT 1
    `,
    args: [userId],
  });

  const row = result.rows?.[0];
  return row ? toSubscription(row as Record<string, unknown>) : null;
};

export const createSubscription = async (input: {
  userId: string;
  plan: string;
  status: SubscriptionStatus;
  periodStart?: string;
  periodEnd?: string;
}): Promise<Subscription> => {
  await ensureCoreSchema();
  const client = getCoreClient();
  const result = await client.execute({
    sql: `
      INSERT INTO subscriptions (user_id, plan, status, period_start, period_end)
      VALUES (?, ?, ?, ?, ?)
      RETURNING id, user_id, plan, status, period_start, period_end, created_at, updated_at
    `,
    args: [input.userId, input.plan, input.status, input.periodStart ?? null, input.periodEnd ?? null],
  });

  const row = result.rows?.[0];
  if (!row) {
    throw new Error("Failed to insert subscription.");
  }
  return toSubscription(row as Record<string, unknown>);
};

export const updateSubscriptionStatus = async (input: {
  id: number;
  status: SubscriptionStatus;
  periodStart?: string;
  periodEnd?: string;
}): Promise<Subscription | null> => {
  await ensureCoreSchema();
  const client = getCoreClient();
  const result = await client.execute({
    sql: `
      UPDATE subscriptions
      SET status = ?,
          period_start = COALESCE(?, period_start),
          period_end = COALESCE(?, period_end),
          updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
      RETURNING id, user_id, plan, status, period_start, period_end, created_at, updated_at
    `,
    args: [input.status, input.periodStart ?? null, input.periodEnd ?? null, input.id],
  });

  const row = result.rows?.[0];
  return row ? toSubscription(row as Record<string, unknown>) : null;
};
