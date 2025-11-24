export interface User {
  id: string;
  email: string;
  name?: string | null;
  createdAt?: string;
  updatedAt?: string;
}

export type SubscriptionStatus = "active" | "cancelled" | "expired";

export interface Subscription {
  id: number;
  userId: string;
  plan: string;
  status: SubscriptionStatus;
  periodStart?: string;
  periodEnd?: string;
  createdAt?: string;
  updatedAt?: string;
}
