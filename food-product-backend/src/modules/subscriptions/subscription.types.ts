import type { SubscriptionStatus } from "@prisma/client";

export const ACTIVE_SUBSCRIPTION_STATUSES: readonly SubscriptionStatus[] = [
  "active",
  "trialing",
];

export interface SubscriptionSummary {
  isActive: boolean;
  status: SubscriptionStatus | null;
  currentPeriodEnd: string | null;
}

export interface CheckoutSessionResult {
  checkoutUrl: string;
}

export interface UpsertSubscriptionInput {
  userId: string;
  stripeCustomerId: string;
  stripeSubscriptionId: string;
  status: SubscriptionStatus;
  currentPeriodEnd: Date | null;
}
