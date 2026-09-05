import type { Express } from "express";
import request from "supertest";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { createPrismaMock, TEST_USER } from "./helpers/mocks";

const prismaMock = createPrismaMock();

vi.mock("../src/lib/prisma", () => ({ prisma: prismaMock }));

let app: Express;

beforeEach(async () => {
  vi.clearAllMocks();
  prismaMock.user.upsert.mockResolvedValue(TEST_USER);
  const { createApp } = await import("../src/app");
  app = createApp();
});

describe("POST /api/searches", () => {
  it("stores a search for the demo user and answers 201", async () => {
    prismaMock.search.create.mockResolvedValue({
      id: "search_1",
      query: "oreo",
      createdAt: new Date("2026-01-01T10:00:00.000Z"),
    });

    const response = await request(app).post("/api/searches").send({ query: "oreo" });

    expect(response.status).toBe(201);
    expect(response.body.data).toMatchObject({ id: "search_1", query: "oreo" });
    expect(prismaMock.search.create).toHaveBeenCalledWith(
      expect.objectContaining({ data: { userId: TEST_USER.id, query: "oreo" } })
    );
  });

  it("trims the query before storing it", async () => {
    prismaMock.search.create.mockResolvedValue({
      id: "search_1",
      query: "oreo",
      createdAt: new Date(),
    });

    await request(app).post("/api/searches").send({ query: "   oreo   " });

    expect(prismaMock.search.create).toHaveBeenCalledWith(
      expect.objectContaining({ data: { userId: TEST_USER.id, query: "oreo" } })
    );
  });

  it("rejects a query that is too short", async () => {
    const response = await request(app).post("/api/searches").send({ query: "a" });

    expect(response.status).toBe(400);
    expect(prismaMock.search.create).not.toHaveBeenCalled();
  });

  it("rejects a query that exceeds the maximum length", async () => {
    const response = await request(app)
      .post("/api/searches")
      .send({ query: "x".repeat(101) });

    expect(response.status).toBe(400);
  });

  it("ignores a client supplied userId", async () => {
    prismaMock.search.create.mockResolvedValue({
      id: "search_1",
      query: "oreo",
      createdAt: new Date(),
    });

    await request(app)
      .post("/api/searches")
      .send({ query: "oreo", userId: "someone-else" });

    expect(prismaMock.search.create).toHaveBeenCalledWith(
      expect.objectContaining({ data: { userId: TEST_USER.id, query: "oreo" } })
    );
  });
});

describe("GET /api/searches", () => {
  it("returns the demo user's recent searches, newest first", async () => {
    prismaMock.search.findMany.mockResolvedValue([
      { id: "s2", query: "oreo", createdAt: new Date("2026-01-02T10:00:00.000Z") },
      { id: "s1", query: "nutella", createdAt: new Date("2026-01-01T10:00:00.000Z") },
    ]);

    const response = await request(app).get("/api/searches");

    expect(response.status).toBe(200);
    expect(response.body.data.map((entry: { query: string }) => entry.query)).toEqual([
      "oreo",
      "nutella",
    ]);
  });

  it("scopes the lookup to the demo user and de-duplicates queries", async () => {
    prismaMock.search.findMany.mockResolvedValue([]);

    await request(app).get("/api/searches");

    expect(prismaMock.search.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { userId: TEST_USER.id },
        orderBy: { createdAt: "desc" },
        distinct: ["query"],
      })
    );
  });

  it("returns an empty list when nothing has been searched yet", async () => {
    prismaMock.search.findMany.mockResolvedValue([]);

    const response = await request(app).get("/api/searches");

    expect(response.status).toBe(200);
    expect(response.body.data).toEqual([]);
  });

  it("rejects an out-of-range limit", async () => {
    const response = await request(app).get("/api/searches").query({ limit: 500 });

    expect(response.status).toBe(400);
  });
});
