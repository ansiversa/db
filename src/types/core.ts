export interface User {
  id: string;
  email: string;
  name?: string | null;
  createdAt?: string;
  updatedAt?: string;
}

export type SubscriptionStatus = "active" | "canceled" | "trialing" | "past_due";

export interface Subscription {
  id: string;
  userId: string;
  plan: string;
  status: SubscriptionStatus;
  currentPeriodEnd?: string;
}
