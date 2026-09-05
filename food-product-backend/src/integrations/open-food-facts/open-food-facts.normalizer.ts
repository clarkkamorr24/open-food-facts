import {
  DEFAULT_LOCALE,
  type Locale,
  type Nutrition,
  type Product,
  type RawOpenFoodFactsProduct,
} from "./open-food-facts.types";

function toTrimmedString(value: unknown): string | null {
  if (typeof value !== "string") return null;

  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

function toFiniteNumber(value: unknown): number | null {
  if (typeof value === "number") {
    return Number.isFinite(value) ? value : null;
  }

  if (typeof value === "string") {
    const parsed = Number(value.trim());
    return value.trim().length > 0 && Number.isFinite(parsed) ? parsed : null;
  }

  return null;
}

function toHttpUrl(value: unknown): string | null {
  const candidate = toTrimmedString(value);
  if (!candidate) return null;

  try {
    const url = new URL(candidate);
    return url.protocol === "https:" || url.protocol === "http:" ? url.toString() : null;
  } catch {
    return null;
  }
}

function resolveLocalizedField(
  product: RawOpenFoodFactsProduct,
  field: string,
  locale: Locale
): string | null {
  const candidateKeys = [
    `${field}_${locale}`,
    `${field}_${DEFAULT_LOCALE}`,
    field,
  ];

  for (const key of candidateKeys) {
    const value = toTrimmedString(product[key]);
    if (value) return value;
  }

  return null;
}

function resolveBrand(product: RawOpenFoodFactsProduct): string | null {
  const brands = toTrimmedString(product["brands"]);
  if (!brands) return null;

  const [primary] = brands.split(",");
  return toTrimmedString(primary);
}

function resolveImageUrl(product: RawOpenFoodFactsProduct, locale: Locale): string | null {
  const candidates = [
    product[`image_front_small_url_${locale}`],
    product["image_front_small_url"],
    product["image_small_url"],
    product["image_front_url"],
    product["image_url"],
  ];

  for (const candidate of candidates) {
    const url = toHttpUrl(candidate);
    if (url) return url;
  }

  return null;
}

function normalizeNutrition(product: RawOpenFoodFactsProduct): Nutrition | null {
  const nutriments = product["nutriments"];

  if (typeof nutriments !== "object" || nutriments === null) {
    return null;
  }

  const source = nutriments as Record<string, unknown>;

  const nutrition: Nutrition = {
    energyKcal: toFiniteNumber(source["energy-kcal_100g"] ?? source["energy_100g"]),
    fat: toFiniteNumber(source["fat_100g"]),
    saturatedFat: toFiniteNumber(source["saturated-fat_100g"]),
    carbohydrates: toFiniteNumber(source["carbohydrates_100g"]),
    sugars: toFiniteNumber(source["sugars_100g"]),
    fiber: toFiniteNumber(source["fiber_100g"]),
    protein: toFiniteNumber(source["proteins_100g"]),
    salt: toFiniteNumber(source["salt_100g"]),
  };

  const hasAnyValue = Object.values(nutrition).some((value) => value !== null);

  return hasAnyValue ? nutrition : null;
}

interface NormalizeProductOptions {
  locale: Locale;
  includeNutrition: boolean;
}

export function normalizeProduct(
  raw: RawOpenFoodFactsProduct,
  { locale, includeNutrition }: NormalizeProductOptions
): Product | null {
  const id = toTrimmedString(raw["code"]) ?? toTrimmedString(raw["_id"]);

  if (!id) return null;

  const nutrition = normalizeNutrition(raw);

  return {
    id,
    name:
      resolveLocalizedField(raw, "product_name", locale) ??
      resolveLocalizedField(raw, "generic_name", locale),
    brand: resolveBrand(raw),
    imageUrl: resolveImageUrl(raw, locale),
    quantity: toTrimmedString(raw["quantity"]),
    nutrition: includeNutrition ? nutrition : null,
    nutritionLocked: !includeNutrition && nutrition !== null,
  };
}

export function normalizeProducts(
  rawProducts: unknown,
  options: NormalizeProductOptions
): Product[] {
  if (!Array.isArray(rawProducts)) return [];

  return rawProducts
    .filter((entry): entry is RawOpenFoodFactsProduct =>
      typeof entry === "object" && entry !== null
    )
    .map((entry) => normalizeProduct(entry, options))
    .filter((product): product is Product => product !== null);
}
