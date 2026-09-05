import { screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { NutritionSection } from "@/components/subscription/nutrition-section";
import type { Product } from "@/types/product";

import { dictionary, renderWithProviders } from "./helpers/render";

function buildProduct(overrides: Partial<Product> = {}): Product {
  return {
    id: "3017620422003",
    name: "Nutella",
    brand: "Ferrero",
    imageUrl: null,
    quantity: null,
    nutrition: null,
    nutritionLocked: false,
    ...overrides,
  };
}

const fullNutrition = {
  energyKcal: 539,
  fat: 30.9,
  saturatedFat: 10.6,
  carbohydrates: 57.5,
  sugars: 56.3,
  fiber: null,
  protein: 6.3,
  salt: 0.107,
};

describe("NutritionSection", () => {
  it("shows the subscribe CTA when the backend withheld nutrition", () => {
    renderWithProviders(
      <NutritionSection product={buildProduct({ nutritionLocked: true })} />
    );

    expect(screen.getByText(dictionary.subscription.lockedTitle)).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: dictionary.subscription.subscribe })
    ).toBeInTheDocument();
    expect(screen.queryByRole("table")).not.toBeInTheDocument();
  });

  it("renders the nutrition table when the backend returned nutrition", () => {
    renderWithProviders(
      <NutritionSection product={buildProduct({ nutrition: fullNutrition })} />
    );

    expect(screen.getByRole("table")).toBeInTheDocument();
    expect(screen.getByText("539 kcal")).toBeInTheDocument();
    expect(screen.getByText("30.9 g")).toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: dictionary.subscription.subscribe })
    ).not.toBeInTheDocument();
  });

  it("marks individual missing nutriments as not provided", () => {
    renderWithProviders(
      <NutritionSection product={buildProduct({ nutrition: fullNutrition })} />
    );

    // `fiber` is null in the fixture.
    expect(screen.getByText(dictionary.nutrition.notProvided)).toBeInTheDocument();
  });

  it("reports genuinely unavailable nutrition without offering a subscription", () => {
    renderWithProviders(
      <NutritionSection product={buildProduct({ nutrition: null, nutritionLocked: false })} />
    );

    expect(screen.getByText(dictionary.nutrition.unavailable)).toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: dictionary.subscription.subscribe })
    ).not.toBeInTheDocument();
  });

  it("labels every nutriment row with a row header", () => {
    renderWithProviders(
      <NutritionSection product={buildProduct({ nutrition: fullNutrition })} />
    );

    expect(
      screen.getByRole("rowheader", { name: dictionary.nutrition.energy })
    ).toBeInTheDocument();
    expect(
      screen.getByRole("rowheader", { name: dictionary.nutrition.salt })
    ).toBeInTheDocument();
  });
});
