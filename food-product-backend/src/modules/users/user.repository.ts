import { prisma } from "../../lib/prisma";
import type { DemoUser } from "./user.types";

const userSelection = {
  id: true,
  email: true,
  stripeCustomerId: true,
} as const;

export const userRepository = {
  findByEmail(email: string): Promise<DemoUser | null> {
    return prisma.user.findUnique({
      where: { email },
      select: userSelection,
    });
  },

  findOrCreateByEmail(email: string): Promise<DemoUser> {
    return prisma.user.upsert({
      where: { email },
      update: {},
      create: { email },
      select: userSelection,
    });
  },

  setStripeCustomerId(userId: string, stripeCustomerId: string): Promise<DemoUser> {
    return prisma.user.update({
      where: { id: userId },
      data: { stripeCustomerId },
      select: userSelection,
    });
  },

  findByStripeCustomerId(stripeCustomerId: string): Promise<DemoUser | null> {
    return prisma.user.findUnique({
      where: { stripeCustomerId },
      select: userSelection,
    });
  },
};
