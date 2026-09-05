"use client";

import { usePathname, useRouter } from "next/navigation";
import { useTransition } from "react";

import { useTranslation } from "@/components/providers/translation-provider";
import {
  LOCALE_COOKIE,
  LOCALE_COOKIE_MAX_AGE,
  LOCALE_LABELS,
  SUPPORTED_LOCALES,
  isSupportedLocale,
  type Locale,
} from "@/i18n/config";
import { cn } from "@/lib/utils";

function buildLocalizedPath(pathname: string, nextLocale: Locale): string {
  const segments = pathname.split("/").filter(Boolean);

  if (segments.length > 0 && isSupportedLocale(segments[0])) {
    segments[0] = nextLocale;
  } else {
    segments.unshift(nextLocale);
  }

  return `/${segments.join("/")}`;
}

export function LanguageSelector() {
  const { locale, dictionary } = useTranslation();
  const router = useRouter();
  const pathname = usePathname();
  const [isPending, startTransition] = useTransition();

  const handleChange = (nextLocale: Locale) => {
    if (nextLocale === locale) return;

    document.cookie = `${LOCALE_COOKIE}=${nextLocale}; path=/; max-age=${LOCALE_COOKIE_MAX_AGE}; samesite=lax`;

    startTransition(() => {
      router.replace(buildLocalizedPath(pathname, nextLocale));
      router.refresh();
    });
  };

  return (
    <div className="flex items-center gap-2">
      <label htmlFor="language-selector" className="sr-only">
        {dictionary.nav.selectLanguage}
      </label>
      <select
        id="language-selector"
        value={locale}
        disabled={isPending}
        onChange={(event) => handleChange(event.target.value as Locale)}
        className={cn(
          "h-9 rounded-4xl border border-border bg-input/30 px-3 text-sm font-medium transition-all outline-none",
          "focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50",
          "disabled:pointer-events-none disabled:opacity-50"
        )}
      >
        {SUPPORTED_LOCALES.map((supportedLocale) => (
          <option key={supportedLocale} value={supportedLocale}>
            {LOCALE_LABELS[supportedLocale]}
          </option>
        ))}
      </select>
    </div>
  );
}
