"use client";

import Image from "next/image";
import { useEffect } from "react";
import Link from "next/link";

import { useTranslation } from "@/components/providers/translation-provider";
import { StatusMessage } from "@/components/states/status-message";
import { NutritionSection } from "@/components/subscription/nutrition-section";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useProduct } from "@/hooks/use-product";
import { useSubscription } from "@/hooks/use-subscription";
import { ApiError } from "@/lib/api-error";
import type { Locale } from "@/i18n/config";

interface ProductDetailViewProps {
  barcode: string;
  locale: Locale;
  checkoutOutcome?: "success" | "cancelled";
}

function ProductDetailSkeleton() {
  return (
    <div className="grid gap-8 sm:grid-cols-2" aria-hidden="true">
      <Skeleton className="aspect-square w-full rounded-xl" />
      <div className="space-y-4">
        <Skeleton className="h-8 w-3/4" />
        <Skeleton className="h-4 w-1/2" />
        <Skeleton className="h-40 w-full" />
      </div>
    </div>
  );
}

export function ProductDetailView({
  barcode,
  locale,
  checkoutOutcome,
}: ProductDetailViewProps) {
  const { dictionary } = useTranslation();
  const { product, isLoading, isError, error, refetch } = useProduct({ barcode, locale });

  const isAwaitingCheckout = checkoutOutcome === "success";
  const { isActive } = useSubscription({ awaitingActivation: isAwaitingCheckout });

  useEffect(() => {
    if (!isAwaitingCheckout || !isActive || product?.nutrition) return;

    void refetch();
  }, [isAwaitingCheckout, isActive, product?.nutrition, refetch]);

  const backLink = (
    <Link
      href={`/${locale}`}
      className="inline-flex w-fit items-center gap-1 rounded-4xl text-sm text-muted-foreground outline-none hover:text-foreground focus-visible:ring-[3px] focus-visible:ring-ring/50"
    >
      <span aria-hidden="true">←</span>
      {dictionary.product.backToResults}
    </Link>
  );

  if (isLoading) {
    return (
      <div className="flex flex-col gap-6">
        {backLink}
        <ProductDetailSkeleton />
      </div>
    );
  }

  if (isError || !product) {
    const isNotFound = error instanceof ApiError && error.status === 404;

    return (
      <div className="flex flex-col gap-6">
        {backLink}
        <StatusMessage
          tone={isNotFound ? "neutral" : "error"}
          title={isNotFound ? dictionary.states.emptyTitle : dictionary.states.errorTitle}
          body={isNotFound ? dictionary.states.emptyBody : dictionary.states.errorBody}
          action={
            isNotFound ? null : (
              <Button type="button" variant="outline" onClick={() => void refetch()}>
                {dictionary.states.retry}
              </Button>
            )
          }
        />
      </div>
    );
  }

  const name = product.name ?? dictionary.product.unknownName;
  const brand = product.brand ?? dictionary.product.unknownBrand;

  return (
    <article className="flex flex-col gap-6">
      {backLink}

      <div className="grid gap-8 sm:grid-cols-2">
        <div className="relative flex aspect-square items-center justify-center overflow-hidden rounded-xl border border-border bg-muted">
          {product.imageUrl ? (
            <Image
              src={product.imageUrl}
              alt={name}
              fill
              sizes="(max-width: 640px) 100vw, 50vw"
              className="object-contain p-4"
              priority
            />
          ) : (
            <span className="px-4 text-center text-sm text-muted-foreground">
              {dictionary.product.noImage}
            </span>
          )}
        </div>

        <div className="flex flex-col gap-6">
          <header className="space-y-1">
            <h1 className="text-2xl font-semibold tracking-tight">{name}</h1>
            <p className="text-muted-foreground">{brand}</p>
            {product.quantity ? (
              <p className="text-sm text-muted-foreground">{product.quantity}</p>
            ) : null}
            <p className="pt-2 text-xs text-muted-foreground">
              {dictionary.product.barcode}: <span className="tabular-nums">{product.id}</span>
            </p>
          </header>

          <NutritionSection
            product={product}
            isAwaitingActivation={isAwaitingCheckout && !product.nutrition}
          />
        </div>
      </div>
    </article>
  );
}
