import { screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { ProductCard } from "@/components/products/product-card";
import type { Product } from "@/types/product";

import { dictionary, renderWithProviders } from "./helpers/render";

function buildProduct(overrides: Partial<Product> = {}): Product {
  return {
    id: "3017620422003",
    name: "Nutella",
    brand: "Ferrero",
    imageUrl: "https://images.openfoodfacts.org/nutella.jpg",
    quantity: "400 g",
    nutrition: null,
    nutritionLocked: true,
    ...overrides,
  };
}

describe("ProductCard", () => {
  it("shows the product name and brand", () => {
    renderWithProviders(<ProductCard product={buildProduct()} />);

    expect(screen.getByRole("heading", { name: "Nutella" })).toBeInTheDocument();
    expect(screen.getByText("Ferrero")).toBeInTheDocument();
  });

  it("falls back to translated copy when the name is missing", () => {
    renderWithProviders(<ProductCard product={buildProduct({ name: null })} />);

    expect(screen.getByText(dictionary.product.unknownName)).toBeInTheDocument();
    expect(screen.queryByText(/undefined|null/i)).not.toBeInTheDocument();
  });

  it("falls back to translated copy when the brand is missing", () => {
    renderWithProviders(<ProductCard product={buildProduct({ brand: null })} />);

    expect(screen.getByText(dictionary.product.unknownBrand)).toBeInTheDocument();
  });

  it("shows a placeholder instead of a broken image", () => {
    renderWithProviders(<ProductCard product={buildProduct({ imageUrl: null })} />);

    expect(screen.getByText(dictionary.product.noImage)).toBeInTheDocument();
    expect(screen.queryByRole("img")).not.toBeInTheDocument();
  });

  it("gives the image alt text describing the product", () => {
    renderWithProviders(<ProductCard product={buildProduct()} />);

    expect(screen.getByRole("img", { name: "Nutella" })).toBeInTheDocument();
  });

  it("links to the localized product detail page", () => {
    renderWithProviders(<ProductCard product={buildProduct()} />);

    expect(screen.getByRole("link")).toHaveAttribute("href", "/en/products/3017620422003");
  });

  it("renders every fallback at once for a product with no data", () => {
    renderWithProviders(
      <ProductCard
        product={buildProduct({ name: null, brand: null, imageUrl: null, quantity: null })}
      />
    );

    expect(screen.getByText(dictionary.product.unknownName)).toBeInTheDocument();
    expect(screen.getByText(dictionary.product.unknownBrand)).toBeInTheDocument();
    expect(screen.getByText(dictionary.product.noImage)).toBeInTheDocument();
  });
});
