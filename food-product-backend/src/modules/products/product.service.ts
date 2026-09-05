import { NotFoundError } from "../../errors";
import {
  normalizeProduct,
  normalizeProducts,
  openFoodFactsClient,
  type Locale,
  type Product,
} from "../../integrations/open-food-facts";
import type { PaginatedResult } from "../../types/api";
import { buildPaginatedResult } from "../../utils/pagination";
import { searchService } from "../searches/search.service";
import { subscriptionService } from "../subscriptions/subscription.service";

interface SearchProductsInput {
  userId: string;
  query: string;
  page: number;
  pageSize: number;
  locale: Locale;
}

interface GetProductInput {
  userId: string;
  barcode: string;
  locale: Locale;
}

function toPositiveInteger(value: unknown, fallback: number): number {
  const parsed = typeof value === "number" ? value : Number(value);
  return Number.isFinite(parsed) && parsed >= 0 ? Math.trunc(parsed) : fallback;
}

export const productService = {
  async search({
    userId,
    query,
    page,
    pageSize,
    locale,
  }: SearchProductsInput): Promise<PaginatedResult<Product>> {
    const [, response] = await Promise.all([
      searchService.recordSafely(userId, query),
      openFoodFactsClient.search({ query, page, pageSize, locale }),
    ]);

    const items = normalizeProducts(response.products, {
      locale,
      includeNutrition: false,
    });

    return buildPaginatedResult({
      items,
      page,
      pageSize,
      total: toPositiveInteger(response.count, items.length),
    });
  },

  async getByBarcode({ userId, barcode, locale }: GetProductInput): Promise<Product> {
    const [raw, hasSubscription] = await Promise.all([
      openFoodFactsClient.findByBarcode(barcode, locale),
      subscriptionService.hasActiveSubscription(userId),
    ]);

    if (!raw) {
      throw new NotFoundError("We could not find that product.", "PRODUCT_NOT_FOUND");
    }

    const product = normalizeProduct(raw, {
      locale,
      includeNutrition: hasSubscription,
    });

    if (!product) {
      throw new NotFoundError("We could not find that product.", "PRODUCT_NOT_FOUND");
    }

    return product;
  },
};
