export type SubscriptionStatus =
  | "incomplete"
  | "incomplete_expired"
  | "trialing"
  | "active"
  | "past_due"
  | "canceled"
  | "unpaid"
  | "paused";

export interface SubscriptionSummary {
  isActive: boolean;
  status: SubscriptionStatus | null;
  currentPeriodEnd: string | null;
}

export interface CheckoutSession {
  checkoutUrl: string;
}
