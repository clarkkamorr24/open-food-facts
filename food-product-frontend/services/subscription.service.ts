import { apiRequest } from "@/lib/api-client";
import type { CheckoutSession, SubscriptionSummary } from "@/types/subscription";

export const subscriptionService = {
  getSubscription(signal?: AbortSignal): Promise<SubscriptionSummary> {
    return apiRequest<SubscriptionSummary>("/api/subscription", { signal });
  },

  createCheckoutSession(returnPath?: string): Promise<CheckoutSession> {
    return apiRequest<CheckoutSession>("/api/subscription/checkout", {
      method: "POST",
      body: returnPath ? { returnPath } : {},
    });
  },
};
