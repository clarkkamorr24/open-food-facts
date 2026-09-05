export const SUPPORTED_LOCALES = ["en", "nl", "de", "fr"] as const;

export type Locale = (typeof SUPPORTED_LOCALES)[number];

export const DEFAULT_LOCALE: Locale = "en";

export type RawOpenFoodFactsProduct = Record<string, unknown>;

export interface RawSearchResponse {
  products?: unknown;
  count?: unknown;
  page?: unknown;
  page_size?: unknown;
}

export interface Nutrition {
  energyKcal: number | null;
  fat: number | null;
  saturatedFat: number | null;
  carbohydrates: number | null;
  sugars: number | null;
  fiber: number | null;
  protein: number | null;
  salt: number | null;
}

export interface Product {
  id: string;
  name: string | null;
  brand: string | null;
  imageUrl: string | null;
  quantity: string | null;
  nutrition: Nutrition | null;
  nutritionLocked: boolean;
}
