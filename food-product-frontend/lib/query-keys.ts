import type { Locale } from "@/i18n/config";

export const queryKeys = {
  currentUser: ["current-user"] as const,
  subscription: ["subscription"] as const,
  recentSearches: ["recent-searches"] as const,
  productSearch: (query: string, locale: Locale) =>
    ["product-search", query, locale] as const,
  product: (barcode: string, locale: Locale) => ["product", barcode, locale] as const,
};
