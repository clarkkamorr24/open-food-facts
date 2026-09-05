import { apiRequest } from "@/lib/api-client";
import type { Locale } from "@/i18n/config";
import type { PaginatedResult } from "@/types/api";
import type { Product } from "@/types/product";

interface SearchProductsParams {
  query: string;
  page: number;
  locale: Locale;
  signal?: AbortSignal;
}

interface GetProductParams {
  barcode: string;
  locale: Locale;
  signal?: AbortSignal;
}

export const productService = {
  searchProducts({
    query,
    page,
    locale,
    signal,
  }: SearchProductsParams): Promise<PaginatedResult<Product>> {
    return apiRequest<PaginatedResult<Product>>("/api/products/search", {
      query: { q: query, page, locale },
      signal,
    });
  },

  getProduct({ barcode, locale, signal }: GetProductParams): Promise<Product> {
    return apiRequest<Product>(`/api/products/${encodeURIComponent(barcode)}`, {
      query: { locale },
      signal,
    });
  },
};
