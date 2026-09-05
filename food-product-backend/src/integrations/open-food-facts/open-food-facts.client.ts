import { env } from "../../config/env";
import { BadGatewayError } from "../../errors";
import { logger } from "../../utils/logger";
import type { RawOpenFoodFactsProduct, RawSearchResponse } from "./open-food-facts.types";

const REQUESTED_FIELDS = [
  "code",
  "product_name",
  "product_name_en",
  "product_name_nl",
  "product_name_de",
  "product_name_fr",
  "generic_name",
  "generic_name_en",
  "generic_name_nl",
  "generic_name_de",
  "generic_name_fr",
  "brands",
  "quantity",
  "image_front_small_url",
  "image_small_url",
  "image_front_url",
  "image_url",
  "nutriments",
].join(",");

interface SearchParams {
  query: string;
  page: number;
  pageSize: number;
  locale: string;
}

async function requestJson<T>(url: string, context: string): Promise<T> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), env.OPEN_FOOD_FACTS_TIMEOUT_MS);

  try {
    const response = await fetch(url, {
      signal: controller.signal,
      headers: {
        Accept: "application/json",
        "User-Agent": env.OPEN_FOOD_FACTS_USER_AGENT,
      },
    });

    if (response.status === 429) {
      logger.warn("Open Food Facts rate limited the request", { context });
      throw new BadGatewayError(
        "The product database is busy. Please try again in a moment.",
        "OPEN_FOOD_FACTS_RATE_LIMITED"
      );
    }

    if (!response.ok) {
      logger.warn("Open Food Facts returned an error status", {
        context,
        status: response.status,
      });
      throw new BadGatewayError(
        "The product database returned an unexpected response.",
        "OPEN_FOOD_FACTS_ERROR"
      );
    }

    return (await response.json()) as T;
  } catch (error) {
    if (error instanceof BadGatewayError) throw error;

    if (error instanceof Error && error.name === "AbortError") {
      logger.warn("Open Food Facts request timed out", { context });
      throw new BadGatewayError(
        "The product database took too long to respond.",
        "OPEN_FOOD_FACTS_TIMEOUT"
      );
    }

    logger.error("Open Food Facts request failed", {
      context,
      reason: error instanceof Error ? error.message : "unknown",
    });
    throw new BadGatewayError(
      "The product database is currently unavailable.",
      "OPEN_FOOD_FACTS_UNAVAILABLE"
    );
  } finally {
    clearTimeout(timeout);
  }
}

export const openFoodFactsClient = {
  async search({ query, page, pageSize, locale }: SearchParams): Promise<RawSearchResponse> {
    const url = new URL("/cgi/search.pl", env.OPEN_FOOD_FACTS_API_URL);

    url.searchParams.set("search_terms", query);
    url.searchParams.set("search_simple", "1");
    url.searchParams.set("action", "process");
    url.searchParams.set("json", "1");
    url.searchParams.set("page", String(page));
    url.searchParams.set("page_size", String(pageSize));
    url.searchParams.set("fields", REQUESTED_FIELDS);
    url.searchParams.set("lc", locale);

    return requestJson<RawSearchResponse>(url.toString(), "search");
  },

  async findByBarcode(
    barcode: string,
    locale: string
  ): Promise<RawOpenFoodFactsProduct | null> {
    const url = new URL(`/api/v2/product/${encodeURIComponent(barcode)}.json`, env.OPEN_FOOD_FACTS_API_URL);

    url.searchParams.set("fields", REQUESTED_FIELDS);
    url.searchParams.set("lc", locale);

    const response = await requestJson<{ status?: unknown; product?: unknown }>(
      url.toString(),
      "findByBarcode"
    );

    if (response.status !== 1 || typeof response.product !== "object" || response.product === null) {
      return null;
    }

    return response.product as RawOpenFoodFactsProduct;
  },
};
