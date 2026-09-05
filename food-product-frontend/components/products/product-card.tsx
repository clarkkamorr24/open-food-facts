"use client";

import Image from "next/image";
import Link from "next/link";

import { useTranslation } from "@/components/providers/translation-provider";
import { Card, CardContent, CardFooter } from "@/components/ui/card";
import type { Product } from "@/types/product";

interface ProductCardProps {
  product: Product;
}

export function ProductCard({ product }: ProductCardProps) {
  const { dictionary, locale } = useTranslation();

  const name = product.name ?? dictionary.product.unknownName;
  const brand = product.brand ?? dictionary.product.unknownBrand;

  return (
    <Card className="group h-full gap-3 py-3 transition-colors hover:border-foreground/20">
      <CardContent className="px-3">
        <div className="relative flex aspect-square items-center justify-center overflow-hidden rounded-lg bg-muted">
          {product.imageUrl ? (
            <Image
              src={product.imageUrl}
              alt={name}
              fill
              sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
              className="object-contain p-2"
            />
          ) : (
            <span className="px-3 text-center text-xs text-muted-foreground">
              {dictionary.product.noImage}
            </span>
          )}
        </div>
      </CardContent>

      <CardFooter className="flex flex-1 flex-col items-start gap-1 px-3">
        <h3 className="line-clamp-2 text-sm font-medium leading-snug">{name}</h3>
        <p className="line-clamp-1 text-xs text-muted-foreground">{brand}</p>

        <Link
          href={`/${locale}/products/${product.id}`}
          className="mt-auto rounded-4xl pt-2 text-xs font-medium text-primary outline-none group-hover:underline focus-visible:ring-[3px] focus-visible:ring-ring/50"
        >
          {dictionary.product.viewNutrition}
          <span aria-hidden="true"> →</span>
          {/* Distinguishes otherwise identical links for screen reader users. */}
          <span className="sr-only">: {name}</span>
        </Link>
      </CardFooter>
    </Card>
  );
}
