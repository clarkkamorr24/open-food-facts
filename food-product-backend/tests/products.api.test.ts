import type { Express } from "express";
import request from "supertest";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { createPrismaMock, TEST_USER } from "./helpers/mocks";

const prismaMock = createPrismaMock();

vi.mock("../src/lib/prisma", () => ({ prisma: prismaMock }));

const searchResponse = {
  count: 2,
  products: [
    {
      code: "3017620422003",
      product_name: "Nutella",
      brands: "Ferrero",
      image_front_small_url: "https://images.openfoodfacts.org/nutella.jpg",
      nutriments: { "energy-kcal_100g": 539, fat_100g: 30.9 },
    },
    { code: "0000000000001" },
  ],
};

function mockFetchOnce(body: unknown, status = 200): void {
  vi.stubGlobal(
    "fetch",
    vi.fn().mockResolvedValue({
      ok: status >= 200 && status < 300,
      status,
      json: async () => body,
    })
  );
}

let app: Express;

beforeEach(async () => {
  vi.clearAllMocks();
  prismaMock.user.upsert.mockResolvedValue(TEST_USER);
  prismaMock.subscription.findFirst.mockResolvedValue(null);
  const { createApp } = await import("../src/app");
  app = createApp();
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("GET /api/products/search", () => {
  it("returns normalized, paginated products for a valid query", async () => {
    mockFetchOnce(searchResponse);

    const response = await request(app).get("/api/products/search").query({ q: "nutella" });

    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
    expect(response.body.data.items).toHaveLength(2);
    expect(response.body.data.items[0]).toMatchObject({
      id: "3017620422003",
      name: "Nutella",
      brand: "Ferrero",
    });
    expect(response.body.data).toMatchObject({ page: 1, total: 2 });
  });

  it("returns null rather than undefined for missing product fields", async () => {
    mockFetchOnce(searchResponse);

    const response = await request(app).get("/api/products/search").query({ q: "nutella" });

    expect(response.body.data.items[1]).toMatchObject({
      id: "0000000000001",
      name: null,
      brand: null,
      imageUrl: null,
    });
  });

  it("never includes nutrition in search results", async () => {
    mockFetchOnce(searchResponse);

    const response = await request(app).get("/api/products/search").query({ q: "nutella" });

    for (const item of response.body.data.items) {
      expect(item.nutrition).toBeNull();
    }
  });

  it("persists the search against the demo user", async () => {
    mockFetchOnce(searchResponse);

    await request(app).get("/api/products/search").query({ q: "nutella" });

    expect(prismaMock.search.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: { userId: TEST_USER.id, query: "nutella" },
      })
    );
  });

  it("rejects an empty query with 400 and does not call Open Food Facts", async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);

    const response = await request(app).get("/api/products/search").query({ q: "" });

    expect(response.status).toBe(400);
    expect(response.body.error.code).toBe("VALIDATION_ERROR");
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("rejects a missing query parameter with 400", async () => {
    const response = await request(app).get("/api/products/search");

    expect(response.status).toBe(400);
    expect(response.body.success).toBe(false);
  });

  it("rejects a page size beyond the allowed maximum", async () => {
    const response = await request(app)
      .get("/api/products/search")
      .query({ q: "nutella", pageSize: 999999 });

    expect(response.status).toBe(400);
  });

  it("reports an Open Food Facts outage as 502 without leaking internals", async () => {
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("ECONNREFUSED 10.0.0.1")));

    const response = await request(app).get("/api/products/search").query({ q: "nutella" });

    expect(response.status).toBe(502);
    expect(response.body.error.code).toBe("OPEN_FOOD_FACTS_UNAVAILABLE");
    expect(JSON.stringify(response.body)).not.toContain("ECONNREFUSED");
  });

  it("maps an upstream rate limit onto a distinct error code", async () => {
    mockFetchOnce({}, 429);

    const response = await request(app).get("/api/products/search").query({ q: "nutella" });

    expect(response.status).toBe(502);
    expect(response.body.error.code).toBe("OPEN_FOOD_FACTS_RATE_LIMITED");
  });

  it("tolerates an invalid upstream payload shape", async () => {
    mockFetchOnce({ products: "not-an-array" });

    const response = await request(app).get("/api/products/search").query({ q: "nutella" });

    expect(response.status).toBe(200);
    expect(response.body.data.items).toEqual([]);
  });
});

describe("GET /api/products/:barcode", () => {
  const productResponse = {
    status: 1,
    product: {
      code: "3017620422003",
      product_name: "Nutella",
      brands: "Ferrero",
      nutriments: { "energy-kcal_100g": 539, fat_100g: 30.9 },
    },
  };

  it("withholds nutrition from a user without a subscription", async () => {
    mockFetchOnce(productResponse);
    prismaMock.subscription.findFirst.mockResolvedValue(null);

    const response = await request(app).get("/api/products/3017620422003");

    expect(response.status).toBe(200);
    expect(response.body.data.nutrition).toBeNull();
    expect(response.body.data.nutritionLocked).toBe(true);
    expect(JSON.stringify(response.body)).not.toContain("539");
  });

  it("returns nutrition to a user with an active subscription", async () => {
    mockFetchOnce(productResponse);
    prismaMock.subscription.findFirst.mockResolvedValue({
      status: "active",
      currentPeriodEnd: new Date(Date.now() + 86_400_000),
    });

    const response = await request(app).get("/api/products/3017620422003");

    expect(response.status).toBe(200);
    expect(response.body.data.nutrition).toMatchObject({ energyKcal: 539, fat: 30.9 });
    expect(response.body.data.nutritionLocked).toBe(false);
  });

  it("withholds nutrition once the paid period has lapsed", async () => {
    mockFetchOnce(productResponse);
    prismaMock.subscription.findFirst.mockResolvedValue({
      status: "active",
      currentPeriodEnd: new Date(Date.now() - 86_400_000),
    });

    const response = await request(app).get("/api/products/3017620422003");

    expect(response.body.data.nutrition).toBeNull();
    expect(response.body.data.nutritionLocked).toBe(true);
  });

  it("withholds nutrition for a cancelled subscription", async () => {
    mockFetchOnce(productResponse);
    prismaMock.subscription.findFirst.mockResolvedValue({
      status: "canceled",
      currentPeriodEnd: new Date(Date.now() + 86_400_000),
    });

    const response = await request(app).get("/api/products/3017620422003");

    expect(response.body.data.nutrition).toBeNull();
  });

  it("returns 404 for a barcode Open Food Facts does not know", async () => {
    mockFetchOnce({ status: 0 });

    const response = await request(app).get("/api/products/0000000000000");

    expect(response.status).toBe(404);
    expect(response.body.error.code).toBe("PRODUCT_NOT_FOUND");
  });

  it("rejects a non-numeric barcode with 400", async () => {
    const response = await request(app).get("/api/products/not-a-barcode");

    expect(response.status).toBe(400);
    expect(response.body.error.code).toBe("VALIDATION_ERROR");
  });
});
