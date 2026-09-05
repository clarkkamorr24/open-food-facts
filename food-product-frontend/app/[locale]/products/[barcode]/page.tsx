import { notFound } from "next/navigation";

import { ProductDetailView } from "@/components/products/product-detail-view";
import { isSupportedLocale } from "@/i18n/config";

function parseCheckoutOutcome(value: string | string[] | undefined) {
  return value === "success" || value === "cancelled" ? value : undefined;
}

export default async function ProductPage({
  params,
  searchParams,
}: PageProps<"/[locale]/products/[barcode]">) {
  const [{ locale, barcode }, query] = await Promise.all([params, searchParams]);

  if (!isSupportedLocale(locale)) {
    notFound();
  }

  return (
    <ProductDetailView
      barcode={barcode}
      locale={locale}
      checkoutOutcome={parseCheckoutOutcome(query.checkout)}
    />
  );
}
