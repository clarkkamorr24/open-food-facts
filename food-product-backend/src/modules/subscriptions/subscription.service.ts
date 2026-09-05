import type { SubscriptionStatus } from "@prisma/client";

import { env } from "../../config/env";
import { BadGatewayError } from "../../errors";
import { stripe } from "../../integrations/stripe";
import { userRepository } from "../users/user.repository";
import type { DemoUser } from "../users/user.types";
import { logger } from "../../utils/logger";
import { subscriptionRepository } from "./subscription.repository";
import {
  ACTIVE_SUBSCRIPTION_STATUSES,
  type CheckoutSessionResult,
  type SubscriptionSummary,
  type UpsertSubscriptionInput,
} from "./subscription.types";

function grantsAccess(status: SubscriptionStatus, currentPeriodEnd: Date | null): boolean {
  if (!ACTIVE_SUBSCRIPTION_STATUSES.includes(status)) return false;

  return currentPeriodEnd === null || currentPeriodEnd.getTime() > Date.now();
}

function buildReturnUrl(configuredUrl: string, returnPath: string | undefined): string {
  if (!returnPath) return configuredUrl;

  const base = new URL(configuredUrl);
  // Resolving a caller-supplied path against the configured origin keeps the
  // redirect on this site: an absolute URL or "//evil.com" cannot escape it.
  const resolved = new URL(returnPath, base.origin);

  if (resolved.origin !== base.origin) return configuredUrl;

  for (const [key, value] of base.searchParams) {
    resolved.searchParams.set(key, value);
  }

  return resolved.toString();
}

export const subscriptionService = {
  async getSummary(userId: string): Promise<SubscriptionSummary> {
    // A user can hold several subscriptions (a re-subscribe leaves the old row
    // behind). Access is granted if any of them still grants it, so the newest
    // row is only used to report a status when none does.
    const subscription =
      (await subscriptionRepository.findAccessGrantingForUser(
        userId,
        ACTIVE_SUBSCRIPTION_STATUSES
      )) ?? (await subscriptionRepository.findLatestForUser(userId));

    if (!subscription) {
      return { isActive: false, status: null, currentPeriodEnd: null };
    }

    return {
      isActive: grantsAccess(subscription.status, subscription.currentPeriodEnd),
      status: subscription.status,
      currentPeriodEnd: subscription.currentPeriodEnd?.toISOString() ?? null,
    };
  },

  async hasActiveSubscription(userId: string): Promise<boolean> {
    const { isActive } = await this.getSummary(userId);
    return isActive;
  },

  async resolveStripeCustomerId(user: DemoUser): Promise<string> {
    if (user.stripeCustomerId) return user.stripeCustomerId;

    const customer = await stripe.customers.create({
      email: user.email,
      metadata: { userId: user.id },
    });

    await userRepository.setStripeCustomerId(user.id, customer.id);

    return customer.id;
  },

  async createCheckoutSession(
    user: DemoUser,
    returnPath?: string
  ): Promise<CheckoutSessionResult> {
    try {
      const customerId = await this.resolveStripeCustomerId(user);

      const session = await stripe.checkout.sessions.create({
        mode: "subscription",
        customer: customerId,
        line_items: [{ price: env.STRIPE_PRICE_ID, quantity: 1 }],
        success_url: buildReturnUrl(env.CHECKOUT_SUCCESS_URL, returnPath),
        cancel_url: buildReturnUrl(env.CHECKOUT_CANCEL_URL, returnPath),
        client_reference_id: user.id,
        metadata: { userId: user.id },
        subscription_data: { metadata: { userId: user.id } },
      });

      if (!session.url) {
        throw new BadGatewayError(
          "Stripe did not return a checkout URL.",
          "STRIPE_CHECKOUT_FAILED"
        );
      }

      return { checkoutUrl: session.url };
    } catch (error) {
      if (error instanceof BadGatewayError) throw error;

      logger.error("Failed to create Stripe checkout session", {
        userId: user.id,
        reason: error instanceof Error ? error.message : "unknown",
      });

      throw new BadGatewayError(
        "Unable to start the checkout process. Please try again.",
        "STRIPE_CHECKOUT_FAILED"
      );
    }
  },

  async syncFromStripe(input: UpsertSubscriptionInput): Promise<void> {
    await subscriptionRepository.upsertFromStripe(input);
  },
};
