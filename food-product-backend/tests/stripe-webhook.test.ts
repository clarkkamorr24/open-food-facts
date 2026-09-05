import type { Express } from "express";
import Stripe from "stripe";
import request from "supertest";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { createPrismaMock, TEST_USER } from "./helpers/mocks";

const prismaMock = createPrismaMock();

vi.mock("../src/lib/prisma", () => ({ prisma: prismaMock }));

const WEBHOOK_SECRET = "whsec_dummy";

function signPayload(payload: string): string {
  return Stripe.webhooks.generateTestHeaderString({
    payload,
    secret: WEBHOOK_SECRET,
  });
}

function subscriptionEvent(
  type: string,
  overrides: Record<string, unknown> = {}
): Record<string, unknown> {
  return {
    id: "evt_test_1",
    object: "event",
    type,
    data: {
      object: {
        id: "sub_test_1",
        object: "subscription",
        customer: "cus_test_1",
        status: "active",
        metadata: { userId: TEST_USER.id },
        items: {
          object: "list",
          data: [
            {
              id: "si_test_1",
              object: "subscription_item",
              current_period_end: Math.floor(Date.now() / 1000) + 86_400,
            },
          ],
        },
        ...overrides,
      },
    },
  };
}

async function postWebhook(app: Express, body: unknown, signature?: string) {
  const payload = JSON.stringify(body);

  const req = request(app)
    .post("/api/webhooks/stripe")
    .set("Content-Type", "application/json");

  if (signature !== undefined) {
    req.set("stripe-signature", signature);
  }

  return req.send(payload);
}

let app: Express;

beforeEach(async () => {
  vi.clearAllMocks();
  prismaMock.user.upsert.mockResolvedValue(TEST_USER);
  prismaMock.subscription.upsert.mockResolvedValue(undefined);
  const { createApp } = await import("../src/app");
  app = createApp();
});

describe("POST /api/webhooks/stripe", () => {
  it("rejects a request with no signature header", async () => {
    const response = await postWebhook(app, subscriptionEvent("customer.subscription.created"));

    expect(response.status).toBe(400);
    expect(response.body.error.code).toBe("STRIPE_SIGNATURE_MISSING");
    expect(prismaMock.subscription.upsert).not.toHaveBeenCalled();
  });

  it("rejects a forged signature", async () => {
    const response = await postWebhook(
      app,
      subscriptionEvent("customer.subscription.created"),
      "t=1,v1=forged"
    );

    expect(response.status).toBe(400);
    expect(response.body.error.code).toBe("STRIPE_SIGNATURE_INVALID");
    expect(prismaMock.subscription.upsert).not.toHaveBeenCalled();
  });

  it("rejects a payload that was tampered with after signing", async () => {
    const original = JSON.stringify(subscriptionEvent("customer.subscription.created"));
    const signature = signPayload(original);
    const tampered = subscriptionEvent("customer.subscription.created", { status: "active" });

    const response = await postWebhook(app, { ...tampered, id: "evt_tampered" }, signature);

    expect(response.status).toBe(400);
    expect(prismaMock.subscription.upsert).not.toHaveBeenCalled();
  });

  it("persists an active subscription from a correctly signed event", async () => {
    const event = subscriptionEvent("customer.subscription.created");
    const payload = JSON.stringify(event);

    const response = await postWebhook(app, event, signPayload(payload));

    expect(response.status).toBe(200);
    expect(response.body.data).toEqual({ received: true });
    expect(prismaMock.subscription.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { stripeSubscriptionId: "sub_test_1" },
        create: expect.objectContaining({
          userId: TEST_USER.id,
          stripeCustomerId: "cus_test_1",
          status: "active",
        }),
      })
    );
  });

  it("records a cancellation so access is revoked", async () => {
    const event = subscriptionEvent("customer.subscription.deleted", { status: "canceled" });
    const payload = JSON.stringify(event);

    const response = await postWebhook(app, event, signPayload(payload));

    expect(response.status).toBe(200);
    expect(prismaMock.subscription.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        update: expect.objectContaining({ status: "canceled" }),
      })
    );
  });

  it("records a status change from an update event", async () => {
    const event = subscriptionEvent("customer.subscription.updated", { status: "past_due" });
    const payload = JSON.stringify(event);

    await postWebhook(app, event, signPayload(payload));

    expect(prismaMock.subscription.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        update: expect.objectContaining({ status: "past_due" }),
      })
    );
  });

  it("is idempotent: replaying an event upserts the same row", async () => {
    const event = subscriptionEvent("customer.subscription.created");
    const signature = signPayload(JSON.stringify(event));

    await postWebhook(app, event, signature);
    await postWebhook(app, event, signature);

    expect(prismaMock.subscription.upsert).toHaveBeenCalledTimes(2);
    for (const call of prismaMock.subscription.upsert.mock.calls) {
      expect(call[0]).toMatchObject({ where: { stripeSubscriptionId: "sub_test_1" } });
    }
  });

  it("falls back to the stored customer id when metadata has no userId", async () => {
    prismaMock.user.findUnique.mockResolvedValue({ ...TEST_USER, stripeCustomerId: "cus_test_1" });

    const event = subscriptionEvent("customer.subscription.created", { metadata: {} });
    await postWebhook(app, event, signPayload(JSON.stringify(event)));

    expect(prismaMock.subscription.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        create: expect.objectContaining({ userId: TEST_USER.id }),
      })
    );
  });

  it("skips a subscription it cannot attribute to a user", async () => {
    prismaMock.user.findUnique.mockResolvedValue(null);

    const event = subscriptionEvent("customer.subscription.created", { metadata: {} });
    const response = await postWebhook(app, event, signPayload(JSON.stringify(event)));

    expect(response.status).toBe(200);
    expect(prismaMock.subscription.upsert).not.toHaveBeenCalled();
  });

  it("acknowledges an unrelated event without touching subscription state", async () => {
    const event = {
      id: "evt_other",
      object: "event",
      type: "invoice.created",
      data: { object: { id: "in_1", object: "invoice" } },
    };

    const response = await postWebhook(app, event, signPayload(JSON.stringify(event)));

    expect(response.status).toBe(200);
    expect(prismaMock.subscription.upsert).not.toHaveBeenCalled();
  });
});
