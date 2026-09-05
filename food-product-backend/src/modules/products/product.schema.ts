import { z } from "zod";

import { DEFAULT_LOCALE, SUPPORTED_LOCALES } from "../../integrations/open-food-facts";
import { DEFAULT_PAGE, DEFAULT_PAGE_SIZE, MAX_PAGE_SIZE } from "../../utils/pagination";

export const localeSchema = z.enum(SUPPORTED_LOCALES).default(DEFAULT_LOCALE);

export const searchQuerySchema = z
  .string()
  .trim()
  .min(2, "Search query must be at least 2 characters long")
  .max(100, "Search query must be at most 100 characters long");

export const searchProductsQuerySchema = z.object({
  q: searchQuerySchema,
  page: z.coerce.number().int().min(1).max(100).default(DEFAULT_PAGE),
  pageSize: z.coerce.number().int().min(1).max(MAX_PAGE_SIZE).default(DEFAULT_PAGE_SIZE),
  locale: localeSchema,
});

export const productParamsSchema = z.object({
  barcode: z
    .string()
    .trim()
    .regex(/^\d{4,20}$/, "Barcode must be between 4 and 20 digits"),
});

export const productQuerySchema = z.object({
  locale: localeSchema,
});

export type SearchProductsQuery = z.infer<typeof searchProductsQuerySchema>;
export type ProductParams = z.infer<typeof productParamsSchema>;
export type ProductQuery = z.infer<typeof productQuerySchema>;
