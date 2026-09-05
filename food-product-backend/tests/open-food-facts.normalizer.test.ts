import { describe, expect, it } from "vitest";

import {
  normalizeProduct,
  normalizeProducts,
} from "../src/integrations/open-food-facts/open-food-facts.normalizer";

const options = { locale: "en", includeNutrition: true } as const;

describe("normalizeProduct", () => {
  it("maps a complete product onto the API contract", () => {
    const product = normalizeProduct(
      {
        code: "3017620422003",
        product_name: "Nutella",
        brands: "Ferrero",
        quantity: "400 g",
        image_front_small_url: "https://images.openfoodfacts.org/nutella.jpg",
        nutriments: {
          "energy-kcal_100g": 539,
          fat_100g: 30.9,
          "saturated-fat_100g": 10.6,
          carbohydrates_100g: 57.5,
          sugars_100g: 56.3,
          proteins_100g: 6.3,
          salt_100g: 0.107,
        },
      },
      options
    );

    expect(product).toMatchObject({
      id: "3017620422003",
      name: "Nutella",
      brand: "Ferrero",
      quantity: "400 g",
      imageUrl: "https://images.openfoodfacts.org/nutella.jpg",
      nutritionLocked: false,
    });
    expect(product?.nutrition?.energyKcal).toBe(539);
  });

  it("returns null fields instead of undefined when data is missing", () => {
    const product = normalizeProduct({ code: "123456" }, options);

    expect(product).toEqual({
      id: "123456",
      name: null,
      brand: null,
      imageUrl: null,
      quantity: null,
      nutrition: null,
      nutritionLocked: false,
    });
  });

  it("treats blank strings as missing values", () => {
    const product = normalizeProduct(
      { code: "123456", product_name: "   ", brands: "  ", quantity: "" },
      options
    );

    expect(product?.name).toBeNull();
    expect(product?.brand).toBeNull();
    expect(product?.quantity).toBeNull();
  });

  it("discards a product without a usable barcode", () => {
    expect(normalizeProduct({ product_name: "Orphan" }, options)).toBeNull();
  });

  it("prefers the requested locale and falls back when it is absent", () => {
    const raw = {
      code: "123456",
      product_name: "Chocolate spread",
      product_name_nl: "Chocoladepasta",
    };

    expect(normalizeProduct(raw, { locale: "nl", includeNutrition: false })?.name).toBe(
      "Chocoladepasta"
    );
    expect(normalizeProduct(raw, { locale: "de", includeNutrition: false })?.name).toBe(
      "Chocolate spread"
    );
  });

  it("uses only the primary brand from a comma separated list", () => {
    const product = normalizeProduct(
      { code: "123456", brands: "Ferrero, Nutella, Ferrero France" },
      options
    );

    expect(product?.brand).toBe("Ferrero");
  });

  it("rejects image values that are not absolute http(s) URLs", () => {
    const product = normalizeProduct(
      { code: "123456", image_front_small_url: "not-a-url" },
      options
    );

    expect(product?.imageUrl).toBeNull();
  });

  it("coerces numeric strings and drops non-numeric nutriments", () => {
    const product = normalizeProduct(
      {
        code: "123456",
        nutriments: { fat_100g: "30.9", sugars_100g: "unknown", salt_100g: 0.1 },
      },
      options
    );

    expect(product?.nutrition?.fat).toBe(30.9);
    expect(product?.nutrition?.sugars).toBeNull();
    expect(product?.nutrition?.salt).toBe(0.1);
  });

  it("reports no nutrition when every nutriment is missing", () => {
    const product = normalizeProduct({ code: "123456", nutriments: {} }, options);

    expect(product?.nutrition).toBeNull();
    expect(product?.nutritionLocked).toBe(false);
  });

  it("withholds nutrition and flags it as locked when access is not granted", () => {
    const product = normalizeProduct(
      { code: "123456", nutriments: { fat_100g: 30.9 } },
      { locale: "en", includeNutrition: false }
    );

    expect(product?.nutrition).toBeNull();
    expect(product?.nutritionLocked).toBe(true);
  });
});

describe("normalizeProducts", () => {
  it("skips malformed entries and keeps the valid ones", () => {
    const products = normalizeProducts(
      [{ code: "1111" }, null, "unexpected", { product_name: "No barcode" }, { code: "2222" }],
      options
    );

    expect(products.map((product) => product.id)).toEqual(["1111", "2222"]);
  });

  it("returns an empty list when the upstream payload is not an array", () => {
    expect(normalizeProducts(undefined, options)).toEqual([]);
    expect(normalizeProducts({ products: [] }, options)).toEqual([]);
  });
});
