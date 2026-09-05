import type { SubscriptionStatus } from "@prisma/client";
import type Stripe from "stripe";

import { env } from "../../config/env";
import { BadRequestError } from "../../errors";
import { stripe } from "../../integrations/stripe";
import { logger } from "../../utils/logger";
import { subscriptionService } from "../subscriptions/subscription.service";
import { userRepository } from "../users/user.repository";

const HANDLED_EVENTS = new Set<Stripe.Event.Type>([
  "checkout.session.completed",
  "customer.subscription.created",
  "customer.subscription.updated",
  "customer.subscription.deleted",
]);

function toCustomerId(customer: Stripe.Subscription["customer"]): string | null {
  if (typeof customer === "string") return customer;
  return customer?.id ?? null;
}

const KNOWN_STATUSES: readonly SubscriptionStatus[] = [
  "incomplete",
  "incomplete_expired",
  "trialing",
  "active",
  "past_due",
  "canceled",
  "unpaid",
  "paused",
];

function toSubscriptionStatus(status: string): SubscriptionStatus | null {
  return KNOWN_STATUSES.find((known) => known === status) ?? null;
}

function resolveCurrentPeriodEnd(subscription: Stripe.Subscription): Date | null {
  const periodEnds = subscription.items.data
    .map((item) => item.current_period_end)
    .filter((value): value is number => typeof value === "number");

  if (periodEnds.length === 0) return null;

  return new Date(Math.max(...periodEnds) * 1000);
}

async function resolveUserId(subscription: Stripe.Subscription): Promise<string | null> {
  const metadataUserId = subscription.metadata?.["userId"];
  if (metadataUserId) return metadataUserId;

  const customerId = toCustomerId(subscription.customer);
  if (!customerId) return null;

  const user = await userRepository.findByStripeCustomerId(customerId);
  return user?.id ?? null;
}

async function persistSubscription(subscription: Stripe.Subscription): Promise<void> {
  const userId = await resolveUserId(subscription);
  const customerId = toCustomerId(subscription.customer);
  const status = toSubscriptionStatus(subscription.status);

  if (!userId || !customerId || !status) {
    logger.warn("Skipping subscription webhook that could not be resolved", {
      subscriptionId: subscription.id,
      hasUser: Boolean(userId),
      hasCustomer: Boolean(customerId),
      status: subscription.status,
    });
    return;
  }

  await subscriptionService.syncFromStripe({
    userId,
    stripeCustomerId: customerId,
    stripeSubscriptionId: subscription.id,
    status,
    currentPeriodEnd: resolveCurrentPeriodEnd(subscription),
  });

  logger.info("Subscription state updated from Stripe", {
    userId,
    subscriptionId: subscription.id,
    status,
  });
}

async function handleCheckoutCompleted(session: Stripe.Checkout.Session): Promise<void> {
  const subscriptionId =
    typeof session.subscription === "string"
      ? session.subscription
      : session.subscription?.id;

  if (!subscriptionId) {
    logger.warn("Checkout session completed without a subscription", {
      sessionId: session.id,
    });
    return;
  }

  const subscription = await stripe.subscriptions.retrieve(subscriptionId);
  await persistSubscription(subscription);
}

export const stripeWebhookService = {
  constructEvent(rawBody: Buffer, signature: string | undefined): Stripe.Event {
    if (!signature) {
      throw new BadRequestError(
        "Missing Stripe signature header.",
        "STRIPE_SIGNATURE_MISSING"
      );
    }

    try {
      return stripe.webhooks.constructEvent(rawBody, signature, env.STRIPE_WEBHOOK_SECRET);
    } catch (error) {
      logger.warn("Rejected Stripe webhook with an invalid signature", {
        reason: error instanceof Error ? error.message : "unknown",
      });

      throw new BadRequestError(
        "Stripe signature verification failed.",
        "STRIPE_SIGNATURE_INVALID"
      );
    }
  },

  async handleEvent(event: Stripe.Event): Promise<void> {
    if (!HANDLED_EVENTS.has(event.type)) {
      logger.info("Ignoring unhandled Stripe event", { type: event.type });
      return;
    }

    switch (event.type) {
      case "checkout.session.completed":
        await handleCheckoutCompleted(event.data.object);
        break;

      case "customer.subscription.created":
      case "customer.subscription.updated":
      case "customer.subscription.deleted":
        await persistSubscription(event.data.object);
        break;
    }
  },
};
