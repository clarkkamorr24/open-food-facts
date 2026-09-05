"use client";

import { useQuery } from "@tanstack/react-query";

import type { Locale } from "@/i18n/config";
import { queryKeys } from "@/lib/query-keys";
import { productService } from "@/services/product.service";

interface UseProductOptions {
  barcode: string;
  locale: Locale;
}

export function useProduct({ barcode, locale }: UseProductOptions) {
  const result = useQuery({
    queryKey: queryKeys.product(barcode, locale),
    queryFn: ({ signal }) => productService.getProduct({ barcode, locale, signal }),
  });

  return {
    product: result.data ?? null,
    isLoading: result.isLoading,
    isError: result.isError,
    error: result.error,
    refetch: result.refetch,
  };
}
