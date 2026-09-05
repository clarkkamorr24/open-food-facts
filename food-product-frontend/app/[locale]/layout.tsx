import type { Metadata } from "next";
import { Figtree, Geist, Geist_Mono } from "next/font/google";
import { notFound } from "next/navigation";

import "../globals.css";

import { SiteHeader } from "@/components/layout/site-header";
import { QueryProvider } from "@/components/providers/query-provider";
import { TranslationProvider } from "@/components/providers/translation-provider";
import { SUPPORTED_LOCALES, isSupportedLocale } from "@/i18n/config";
import { getDictionary } from "@/i18n/dictionaries";
import { cn } from "@/lib/utils";

const figtree = Figtree({ subsets: ["latin"], variable: "--font-sans" });

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export function generateStaticParams() {
  return SUPPORTED_LOCALES.map((locale) => ({ locale }));
}

export async function generateMetadata({
  params,
}: LayoutProps<"/[locale]">): Promise<Metadata> {
  const { locale } = await params;

  if (!isSupportedLocale(locale)) {
    return { title: "Food Product Search" };
  }

  const dictionary = await getDictionary(locale);

  return {
    title: dictionary.app.title,
    description: dictionary.app.tagline,
  };
}

export default async function LocaleLayout({ children, params }: LayoutProps<"/[locale]">) {
  const { locale } = await params;

  if (!isSupportedLocale(locale)) {
    notFound();
  }

  const dictionary = await getDictionary(locale);

  return (
    <html
      lang={locale}
      className={cn(
        "h-full",
        "antialiased",
        geistSans.variable,
        geistMono.variable,
        "font-sans",
        figtree.variable
      )}
    >
      <body className="flex min-h-full flex-col">
        <QueryProvider>
          <TranslationProvider dictionary={dictionary} locale={locale}>
            <SiteHeader />
            <main className="mx-auto w-full max-w-5xl flex-1 px-4 py-8 sm:px-6 sm:py-10">
              {children}
            </main>
            <footer className="border-t border-border py-6">
              <p className="mx-auto max-w-5xl px-4 text-xs text-muted-foreground sm:px-6">
                {dictionary.app.tagline}
              </p>
            </footer>
          </TranslationProvider>
        </QueryProvider>
      </body>
    </html>
  );
}
