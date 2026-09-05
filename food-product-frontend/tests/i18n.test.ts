import { describe, expect, it } from "vitest";

import de from "@/i18n/dictionaries/de.json";
import en from "@/i18n/dictionaries/en.json";
import fr from "@/i18n/dictionaries/fr.json";
import nl from "@/i18n/dictionaries/nl.json";
import { formatMessage } from "@/i18n/format";
import { SUPPORTED_LOCALES, isSupportedLocale } from "@/i18n/config";

type Translations = Record<string, unknown>;

function collectKeys(source: Translations, prefix = ""): string[] {
  return Object.entries(source).flatMap(([key, value]) =>
    typeof value === "object" && value !== null
      ? collectKeys(value as Translations, `${prefix}${key}.`)
      : [`${prefix}${key}`]
  );
}

describe("dictionaries", () => {
  const englishKeys = collectKeys(en).sort();

  it.each([
    ["nl", nl],
    ["de", de],
    ["fr", fr],
  ])("%s defines exactly the same keys as English", (_locale, dictionary) => {
    expect(collectKeys(dictionary as Translations).sort()).toEqual(englishKeys);
  });

  it.each([
    ["nl", nl],
    ["de", de],
    ["fr", fr],
  ])("%s is actually translated rather than copied from English", (_locale, dictionary) => {
    expect((dictionary as typeof en).search.submit).not.toBe(en.search.submit);
    expect((dictionary as typeof en).product.unknownBrand).not.toBe(en.product.unknownBrand);
  });

  it("keeps the {query} placeholder in every language", () => {
    for (const dictionary of [en, nl, de, fr]) {
      expect(dictionary.search.resultsFor).toContain("{query}");
      expect(dictionary.search.resultCount).toContain("{count}");
    }
  });
});

describe("isSupportedLocale", () => {
  it("accepts every supported locale", () => {
    for (const locale of SUPPORTED_LOCALES) {
      expect(isSupportedLocale(locale)).toBe(true);
    }
  });

  it("rejects unsupported or malformed values", () => {
    expect(isSupportedLocale("es")).toBe(false);
    expect(isSupportedLocale("EN")).toBe(false);
    expect(isSupportedLocale(undefined)).toBe(false);
    expect(isSupportedLocale(42)).toBe(false);
  });
});

describe("formatMessage", () => {
  it("substitutes named placeholders", () => {
    expect(formatMessage("Results for {query}", { query: "nutella" })).toBe(
      "Results for nutella"
    );
  });

  it("formats numbers as well as strings", () => {
    expect(formatMessage("{count} products found", { count: 12 })).toBe(
      "12 products found"
    );
  });

  it("leaves an unknown placeholder untouched rather than printing undefined", () => {
    expect(formatMessage("Hello {name}")).toBe("Hello {name}");
  });
});
