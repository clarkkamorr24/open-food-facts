import { notFound } from "next/navigation";

import { ProductSearchView } from "@/components/search/product-search-view";
import { getDictionary } from "@/i18n/dictionaries";
import { isSupportedLocale } from "@/i18n/config";

function parseCheckoutOutcome(value: string | string[] | undefined) {
  return value === "success" || value === "cancelled" ? value : undefined;
}

export default async function HomePage({ params, searchParams }: PageProps<"/[locale]">) {
  const [{ locale }, query] = await Promise.all([params, searchParams]);

  if (!isSupportedLocale(locale)) {
    notFound();
  }

  const dictionary = await getDictionary(locale);

  return (
    <div className="flex flex-col gap-8">
      <div className="space-y-2">
        <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">
          {dictionary.app.title}
        </h1>
        <p className="text-sm text-muted-foreground sm:text-base">{dictionary.app.tagline}</p>
      </div>

      <ProductSearchView
        locale={locale}
        checkoutOutcome={parseCheckoutOutcome(query.checkout)}
      />
    </div>
  );
}
