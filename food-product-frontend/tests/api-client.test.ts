import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { apiRequest } from "@/lib/api-client";
import { ApiError } from "@/lib/api-error";

function mockFetch(body: unknown, status = 200): ReturnType<typeof vi.fn> {
  const fetchMock = vi.fn().mockResolvedValue({
    ok: status >= 200 && status < 300,
    status,
    json: async () => body,
  });

  vi.stubGlobal("fetch", fetchMock);
  return fetchMock;
}

beforeEach(() => {
  vi.unstubAllGlobals();
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("apiRequest", () => {
  it("unwraps the success envelope", async () => {
    mockFetch({ success: true, data: { id: "1" } });

    await expect(apiRequest("/api/thing")).resolves.toEqual({ id: "1" });
  });

  it("appends defined query parameters and omits empty ones", async () => {
    const fetchMock = mockFetch({ success: true, data: null });

    await apiRequest("/api/products/search", {
      query: { q: "nutella", page: 2, locale: undefined },
    });

    const [requestedUrl] = fetchMock.mock.calls[0] as [string];
    expect(requestedUrl).toContain("q=nutella");
    expect(requestedUrl).toContain("page=2");
    expect(requestedUrl).not.toContain("locale");
  });

  it("throws an ApiError carrying the backend's code and status", async () => {
    mockFetch(
      { success: false, error: { code: "PRODUCT_NOT_FOUND", message: "Not found." } },
      404
    );

    await expect(apiRequest("/api/products/1")).rejects.toMatchObject({
      code: "PRODUCT_NOT_FOUND",
      message: "Not found.",
      status: 404,
    });
  });

  it("reports an unreachable backend as a network error", async () => {
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new TypeError("Failed to fetch")));

    const error = await apiRequest("/api/thing").catch((thrown: unknown) => thrown);

    expect(error).toBeInstanceOf(ApiError);
    expect((error as ApiError).isNetworkError).toBe(true);
  });

  it("reports an unreadable response body", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => {
          throw new SyntaxError("Unexpected token");
        },
      })
    );

    await expect(apiRequest("/api/thing")).rejects.toMatchObject({
      code: "INVALID_RESPONSE",
    });
  });

  it("sends a JSON body for POST requests", async () => {
    const fetchMock = mockFetch({ success: true, data: null });

    await apiRequest("/api/searches", { method: "POST", body: { query: "oreo" } });

    const [, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(init.method).toBe("POST");
    expect(init.body).toBe(JSON.stringify({ query: "oreo" }));
  });

  it("propagates an abort rather than reporting it as a failure", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockRejectedValue(new DOMException("Aborted", "AbortError"))
    );

    await expect(apiRequest("/api/thing")).rejects.toBeInstanceOf(DOMException);
  });
});
