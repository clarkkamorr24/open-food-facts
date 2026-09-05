import type { Express } from "express";
import request from "supertest";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { createPrismaMock, TEST_USER } from "./helpers/mocks";

const prismaMock = createPrismaMock();

const stripeMock = {
  customers: { create: vi.fn() },
  checkout: { sessions: { create: vi.fn() } },
  subscriptions: { retrieve: vi.fn() },
  webhooks: { constructEvent: vi.fn() },
};

vi.mock("../src/lib/prisma", () => ({ prisma: prismaMock }));
vi.mock("../src/integrations/stripe", () => ({ stripe: stripeMock }));

let app: Express;

beforeEach(async () => {
  vi.clearAllMocks();
  prismaMock.user.upsert.mockResolvedValue(TEST_USER);
  prismaMock.user.update.mockResolvedValue(TEST_USER);
  prismaMock.subscription.findFirst.mockResolvedValue(null);
  const { createApp } = await import("../src/app");
  app = createApp();
});

describe("GET /api/subscription", () => {
  it("reports an inactive subscription when none exists", async () => {
    const response = await request(app).get("/api/subscription");

    expect(response.status).toBe(200);
    expect(response.body.data).toEqual({
      isActive: false,
      status: null,
      currentPeriodEnd: null,
    });
  });

  it("reports an active subscription within its paid period", async () => {
    const periodEnd = new Date(Date.now() + 86_400_000);
    prismaMock.subscription.findFirst.mockResolvedValue({
      status: "active",
      currentPeriodEnd: periodEnd,
    });

    const response = await request(app).get("/api/subscription");

    expect(response.body.data).toEqual({
      isActive: true,
      status: "active",
      currentPeriodEnd: periodEnd.toISOString(),
    });
  });

  it("treats a trialing subscription as active", async () => {
    prismaMock.subscription.findFirst.mockResolvedValue({
      status: "trialing",
      currentPeriodEnd: new Date(Date.now() + 86_400_000),
    });

    const response = await request(app).get("/api/subscription");

    expect(response.body.data.isActive).toBe(true);
  });

  it("reports past_due as inactive while retaining the status", async () => {
    prismaMock.subscription.findFirst.mockResolvedValue({
      status: "past_due",
      currentPeriodEnd: new Date(Date.now() + 86_400_000),
    });

    const response = await request(app).get("/api/subscription");

    expect(response.body.data).toMatchObject({ isActive: false, status: "past_due" });
  });
});

  it("grants access from an active subscription even when a newer row is cancelled", async () => {
    const activePeriodEnd = new Date(Date.now() + 86_400_000);

    // The access-granting lookup runs first and finds the active row; the
    // "latest row" fallback would have returned the cancelled one.
    prismaMock.subscription.findFirst.mockImplementation((args: {
      where?: { status?: { in?: string[] } };
    }) =>
      Promise.resolve(
        args?.where?.status?.in
          ? { status: "active", currentPeriodEnd: activePeriodEnd }
          : { status: "canceled", currentPeriodEnd: activePeriodEnd }
      )
    );

    const response = await request(app).get("/api/subscription");

    expect(response.body.data).toMatchObject({ isActive: true, status: "active" });
  });

describe("POST /api/subscription/checkout", () => {
  it("creates a Stripe customer and checkout session, returning the URL", async () => {
    stripeMock.customers.create.mockResolvedValue({ id: "cus_123" });
    stripeMock.checkout.sessions.create.mockResolvedValue({
      url: "https://checkout.stripe.com/c/pay/session_123",
    });

    const response = await request(app).post("/api/subscription/checkout");

    expect(response.status).toBe(201);
    expect(response.body.data.checkoutUrl).toBe(
      "https://checkout.stripe.com/c/pay/session_123"
    );
    expect(stripeMock.checkout.sessions.create).toHaveBeenCalledWith(
      expect.objectContaining({
        mode: "subscription",
        customer: "cus_123",
        client_reference_id: TEST_USER.id,
      })
    );
  });

  it("reuses an existing Stripe customer instead of creating another", async () => {
    prismaMock.user.upsert.mockResolvedValue({ ...TEST_USER, stripeCustomerId: "cus_existing" });
    stripeMock.checkout.sessions.create.mockResolvedValue({ url: "https://checkout.stripe.com/x" });

    await request(app).post("/api/subscription/checkout");

    expect(stripeMock.customers.create).not.toHaveBeenCalled();
    expect(stripeMock.checkout.sessions.create).toHaveBeenCalledWith(
      expect.objectContaining({ customer: "cus_existing" })
    );
  });

  it("never grants access as a side effect of starting checkout", async () => {
    stripeMock.customers.create.mockResolvedValue({ id: "cus_123" });
    stripeMock.checkout.sessions.create.mockResolvedValue({ url: "https://checkout.stripe.com/x" });

    await request(app).post("/api/subscription/checkout");

    expect(prismaMock.subscription.upsert).not.toHaveBeenCalled();
  });

  it("returns the user to the product page they started from", async () => {
    stripeMock.customers.create.mockResolvedValue({ id: "cus_123" });
    stripeMock.checkout.sessions.create.mockResolvedValue({ url: "https://checkout.stripe.com/x" });

    await request(app)
      .post("/api/subscription/checkout")
      .send({ returnPath: "/en/products/3017620422003" });

    const args = stripeMock.checkout.sessions.create.mock.calls[0]?.[0];
    expect(args.success_url).toContain("/en/products/3017620422003");
    expect(args.success_url).toContain("checkout=success");
    expect(args.cancel_url).toContain("/en/products/3017620422003");
    expect(args.cancel_url).toContain("checkout=cancelled");
  });

  it("falls back to the configured URL when no return path is given", async () => {
    stripeMock.customers.create.mockResolvedValue({ id: "cus_123" });
    stripeMock.checkout.sessions.create.mockResolvedValue({ url: "https://checkout.stripe.com/x" });

    await request(app).post("/api/subscription/checkout");

    const args = stripeMock.checkout.sessions.create.mock.calls[0]?.[0];
    expect(args.success_url).toBe("http://localhost:3000/en?checkout=success");
  });

  it.each([
    ["an absolute URL", "https://evil.example.com/steal"],
    ["a protocol-relative URL", "//evil.example.com/steal"],
    ["a backslash-prefixed path", "\\evil.example.com"],
    ["a javascript URL", "javascript:alert(1)"],
  ])("rejects %s as a return path", async (_label, returnPath) => {
    const response = await request(app)
      .post("/api/subscription/checkout")
      .send({ returnPath });

    expect(response.status).toBe(400);
    expect(stripeMock.checkout.sessions.create).not.toHaveBeenCalled();
  });

  it("surfaces a Stripe failure as 502 without exposing the Stripe message", async () => {
    stripeMock.customers.create.mockResolvedValue({ id: "cus_123" });
    stripeMock.checkout.sessions.create.mockRejectedValue(
      new Error("No such price: price_dummy")
    );

    const response = await request(app).post("/api/subscription/checkout");

    expect(response.status).toBe(502);
    expect(response.body.error.code).toBe("STRIPE_CHECKOUT_FAILED");
    expect(JSON.stringify(response.body)).not.toContain("No such price");
  });
});
