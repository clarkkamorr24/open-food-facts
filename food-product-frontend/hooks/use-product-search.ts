"use client";

import { useInfiniteQuery } from "@tanstack/react-query";

import type { Locale } from "@/i18n/config";
import { queryKeys } from "@/lib/query-keys";
import { productService } from "@/services/product.service";
import type { PaginatedResult } from "@/types/api";
import type { Product } from "@/types/product";

interface UseProductSearchOptions {
  query: string;
  locale: Locale;
}

export function useProductSearch({ query, locale }: UseProductSearchOptions) {
  const trimmedQuery = query.trim();
  const isEnabled = trimmedQuery.length >= 2;

  const result = useInfiniteQuery({
    queryKey: queryKeys.productSearch(trimmedQuery, locale),
    enabled: isEnabled,
    initialPageParam: 1,
    queryFn: ({ pageParam, signal }) =>
      productService.searchProducts({
        query: trimmedQuery,
        page: pageParam,
        locale,
        signal,
      }),
    getNextPageParam: (lastPage: PaginatedResult<Product>) =>
      lastPage.hasNextPage ? lastPage.page + 1 : undefined,
    staleTime: 5 * 60 * 1000,
  });

  const products: Product[] = result.data?.pages.flatMap((page) => page.items) ?? [];
  const total = result.data?.pages[0]?.total ?? 0;

  return {
    products,
    total,
    isEnabled,
    isLoading: result.isLoading,
    isFetchingNextPage: result.isFetchingNextPage,
    hasNextPage: result.hasNextPage,
    fetchNextPage: result.fetchNextPage,
    isError: result.isError,
    error: result.error,
    refetch: result.refetch,
  };
}
