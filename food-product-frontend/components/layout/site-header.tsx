"use client";

import Link from "next/link";

import { DemoUserBadge } from "@/components/layout/demo-user-badge";
import { LanguageSelector } from "@/components/layout/language-selector";
import { useTranslation } from "@/components/providers/translation-provider";

export function SiteHeader() {
  const { dictionary, locale } = useTranslation();

  return (
    <header className="sticky top-0 z-10 border-b border-border bg-background/80 backdrop-blur">
      <div className="mx-auto flex w-full max-w-5xl flex-wrap items-center justify-between gap-3 px-4 py-3 sm:px-6">
        <Link
          href={`/${locale}`}
          className="rounded-4xl text-base font-semibold tracking-tight outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50"
        >
          {dictionary.app.title}
        </Link>

        <div className="flex items-center gap-3">
          <DemoUserBadge />
          <LanguageSelector />
        </div>
      </div>
    </header>
  );
}
