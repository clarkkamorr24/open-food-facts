import type { SubscriptionStatus } from "@prisma/client";

import { prisma } from "../../lib/prisma";
import type { UpsertSubscriptionInput } from "./subscription.types";

interface SubscriptionRecord {
  status: SubscriptionStatus;
  currentPeriodEnd: Date | null;
}

const subscriptionSelection = {
  status: true,
  currentPeriodEnd: true,
} as const;

export const subscriptionRepository = {
  findLatestForUser(userId: string): Promise<SubscriptionRecord | null> {
    return prisma.subscription.findFirst({
      where: { userId },
      orderBy: { updatedAt: "desc" },
      select: subscriptionSelection,
    });
  },

  findAccessGrantingForUser(
    userId: string,
    statuses: readonly SubscriptionStatus[]
  ): Promise<SubscriptionRecord | null> {
    return prisma.subscription.findFirst({
      where: {
        userId,
        status: { in: [...statuses] },
        OR: [{ currentPeriodEnd: null }, { currentPeriodEnd: { gt: new Date() } }],
      },
      orderBy: { currentPeriodEnd: "desc" },
      select: subscriptionSelection,
    });
  },

  async upsertFromStripe(input: UpsertSubscriptionInput): Promise<void> {
    const { stripeSubscriptionId, ...rest } = input;

    await prisma.subscription.upsert({
      where: { stripeSubscriptionId },
      create: { stripeSubscriptionId, ...rest },
      update: {
        status: rest.status,
        currentPeriodEnd: rest.currentPeriodEnd,
        stripeCustomerId: rest.stripeCustomerId,
      },
    });
  },
};
