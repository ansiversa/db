import { getCoreClient } from "./client.js";
import { ensureCoreSchema } from "./schema.js";
import { Subscription, SubscriptionStatus } from "../types/core.js";

const toSubscription = (row: Record<string, unknown>): Subscription => ({
  id: String(row.id),
  userId: String(row.user_id),
  plan: String(row.plan),
  status: row.status as SubscriptionStatus,
  currentPeriodEnd: (row.current_period_end as string | undefined | null) ?? undefined,
});

export const getSubscriptionsForUser = async (userId: string): Promise<Subscription[]> => {
  await ensureCoreSchema();
  const client = getCoreClient();
  const result = await client.execute({
    sql: `
      SELECT id, user_id, plan, status, current_period_end
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
      SELECT id, user_id, plan, status, current_period_end
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
  id: string;
  userId: string;
  plan: string;
  status: SubscriptionStatus;
  currentPeriodEnd?: string;
}): Promise<Subscription> => {
  await ensureCoreSchema();
  const client = getCoreClient();
  const result = await client.execute({
    sql: `
      INSERT INTO subscriptions (id, user_id, plan, status, current_period_end)
      VALUES (?, ?, ?, ?, ?)
      RETURNING id, user_id, plan, status, current_period_end
    `,
    args: [
      input.id,
      input.userId,
      input.plan,
      input.status,
      input.currentPeriodEnd ?? null,
    ],
  });

  const row = result.rows?.[0];
  if (!row) {
    throw new Error("Failed to insert subscription.");
  }
  return toSubscription(row as Record<string, unknown>);
};

export const updateSubscriptionStatus = async (input: {
  id: string;
  status: SubscriptionStatus;
  currentPeriodEnd?: string;
}): Promise<Subscription | null> => {
  await ensureCoreSchema();
  const client = getCoreClient();
  const result = await client.execute({
    sql: `
      UPDATE subscriptions
      SET status = ?,
          current_period_end = COALESCE(?, current_period_end),
          updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
      RETURNING id, user_id, plan, status, current_period_end
    `,
    args: [input.status, input.currentPeriodEnd ?? null, input.id],
  });

  const row = result.rows?.[0];
  return row ? toSubscription(row as Record<string, unknown>) : null;
};
