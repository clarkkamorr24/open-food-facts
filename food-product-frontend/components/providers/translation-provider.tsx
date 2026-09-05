"use client";

import { createContext, useContext, useMemo, type ReactNode } from "react";

import type { Locale } from "@/i18n/config";
import { formatMessage } from "@/i18n/format";
import type { Dictionary } from "@/i18n/types";

interface TranslationContextValue {
  dictionary: Dictionary;
  locale: Locale;
  format: (template: string, values?: Record<string, string | number>) => string;
}

const TranslationContext = createContext<TranslationContextValue | null>(null);

interface TranslationProviderProps {
  dictionary: Dictionary;
  locale: Locale;
  children: ReactNode;
}

export function TranslationProvider({
  dictionary,
  locale,
  children,
}: TranslationProviderProps) {
  const value = useMemo<TranslationContextValue>(
    () => ({ dictionary, locale, format: formatMessage }),
    [dictionary, locale]
  );

  return <TranslationContext.Provider value={value}>{children}</TranslationContext.Provider>;
}

export function useTranslation(): TranslationContextValue {
  const context = useContext(TranslationContext);

  if (!context) {
    throw new Error("useTranslation must be used within a TranslationProvider");
  }

  return context;
}
