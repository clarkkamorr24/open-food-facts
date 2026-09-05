import "server-only";

import { DEFAULT_LOCALE, type Locale } from "./config";
import type { Dictionary } from "./types";

const loaders: Record<Locale, () => Promise<{ default: Dictionary }>> = {
  en: () => import("./dictionaries/en.json"),
  nl: () => import("./dictionaries/nl.json"),
  de: () => import("./dictionaries/de.json"),
  fr: () => import("./dictionaries/fr.json"),
};

export async function getDictionary(locale: Locale): Promise<Dictionary> {
  const load = loaders[locale] ?? loaders[DEFAULT_LOCALE];
  const dictionary = await load();
  return dictionary.default;
}
