import { vi } from "vitest";

export const TEST_USER = {
  id: "user_test_1",
  email: "demo@example.com",
  stripeCustomerId: null as string | null,
};

export function createPrismaMock() {
  return {
    user: {
      upsert: vi.fn().mockResolvedValue(TEST_USER),
      findUnique: vi.fn().mockResolvedValue(TEST_USER),
      update: vi.fn().mockResolvedValue(TEST_USER),
    },
    search: {
      create: vi.fn(),
      findMany: vi.fn().mockResolvedValue([]),
    },
    subscription: {
      findFirst: vi.fn().mockResolvedValue(null),
      upsert: vi.fn().mockResolvedValue(undefined),
    },
  };
}
