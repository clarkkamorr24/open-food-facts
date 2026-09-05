import "dotenv/config";

import type { SubscriptionStatus } from "@prisma/client";

import { stripe } from "../integrations/stripe";
import { prisma } from "../lib/prisma";
import { subscriptionService } from "../modules/subscriptions/subscription.service";
import { userService } from "../modules/users/user.service";
import { logger } from "../utils/logger";

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

async function main(): Promise<void> {
  const user = await userService.getDemoUser();

  if (!user.stripeCustomerId) {
    console.log("The demo user has no Stripe customer yet - nothing to sync.");
    return;
  }

  const subscriptions = await stripe.subscriptions.list({
    customer: user.stripeCustomerId,
    status: "all",
    limit: 100,
  });

  if (subscriptions.data.length === 0) {
    console.log(`No subscriptions found for customer ${user.stripeCustomerId}.`);
    return;
  }

  let synced = 0;

  for (const subscription of subscriptions.data) {
    const status = toSubscriptionStatus(subscription.status);

    if (!status) {
      logger.warn("Skipping subscription with an unrecognised status", {
        subscriptionId: subscription.id,
        status: subscription.status,
      });
      continue;
    }

    const periodEnds = subscription.items.data
      .map((item) => item.current_period_end)
      .filter((value): value is number => typeof value === "number");

    await subscriptionService.syncFromStripe({
      userId: user.id,
      stripeCustomerId: user.stripeCustomerId,
      stripeSubscriptionId: subscription.id,
      status,
      currentPeriodEnd:
        periodEnds.length > 0 ? new Date(Math.max(...periodEnds) * 1000) : null,
    });

    console.log(`  ${subscription.id}  ->  ${status}`);
    synced += 1;
  }

  const summary = await subscriptionService.getSummary(user.id);

  console.log(`\nSynced ${synced} subscription(s) for ${user.email}.`);
  console.log(`Access is currently ${summary.isActive ? "ACTIVE" : "INACTIVE"}.`);
}

main()
  .catch((error: unknown) => {
    console.error("Subscription sync failed:", error);
    process.exitCode = 1;
  })
  .finally(() => void prisma.$disconnect());
