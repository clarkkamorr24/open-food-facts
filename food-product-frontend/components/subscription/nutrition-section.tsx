"use client";

import { useTranslation } from "@/components/providers/translation-provider";
import { NutritionTable } from "@/components/subscription/nutrition-table";
import { SubscribeCta } from "@/components/subscription/subscribe-cta";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import type { Product } from "@/types/product";

interface NutritionSectionProps {
  product: Product;
  isAwaitingActivation?: boolean;
}

export function NutritionSection({
  product,
  isAwaitingActivation = false,
}: NutritionSectionProps) {
  const { dictionary } = useTranslation();

  return (
    <section aria-labelledby="nutrition-heading" className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 id="nutrition-heading" className="text-base font-medium">
          {dictionary.nutrition.title}
        </h2>

        {product.nutrition ? (
          <Badge variant="success">
            <span aria-hidden="true">✓ </span>
            {dictionary.subscription.activeTitle}
          </Badge>
        ) : null}
      </div>

      {product.nutrition ? (
        <NutritionTable nutrition={product.nutrition} />
      ) : isAwaitingActivation ? (
        <div
          role="status"
          className="space-y-3 rounded-xl border border-border bg-muted/40 p-4"
        >
          <div className="space-y-1">
            <p className="text-sm font-medium">{dictionary.subscription.checkoutSuccess}</p>
            <p className="text-sm text-muted-foreground">
              {dictionary.subscription.pendingActivation}
            </p>
          </div>
          <div aria-hidden="true" className="space-y-2">
            {Array.from({ length: 4 }, (_, index) => (
              <Skeleton key={index} className="h-6 w-full" />
            ))}
          </div>
        </div>
      ) : product.nutritionLocked ? (
        <SubscribeCta />
      ) : (
        <p className="text-sm text-muted-foreground">{dictionary.nutrition.unavailable}</p>
      )}
    </section>
  );
}
