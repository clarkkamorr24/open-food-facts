export const SUPPORTED_LOCALES = ["en", "nl", "de", "fr"] as const;

export type Locale = (typeof SUPPORTED_LOCALES)[number];

export const DEFAULT_LOCALE: Locale = "en";

export const LOCALE_COOKIE = "NEXT_LOCALE";

export const LOCALE_COOKIE_MAX_AGE = 60 * 60 * 24 * 365;

export const LOCALE_LABELS: Record<Locale, string> = {
  en: "English",
  nl: "Nederlands",
  de: "Deutsch",
  fr: "Français",
};

export function isSupportedLocale(value: unknown): value is Locale {
  return typeof value === "string" && SUPPORTED_LOCALES.includes(value as Locale);
}
