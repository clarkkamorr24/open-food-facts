"use client";

import { useTranslation } from "@/components/providers/translation-provider";
import { ProductGrid } from "@/components/products/product-grid";
import { ProductGridSkeleton } from "@/components/products/product-grid-skeleton";
import { RecentSearches } from "@/components/search/recent-searches";
import { SearchForm } from "@/components/search/search-form";
import { StatusMessage } from "@/components/states/status-message";
import { SubscriptionBanner } from "@/components/subscription/subscription-banner";
import { Button } from "@/components/ui/button";
import { useProductSearch } from "@/hooks/use-product-search";
import { useSearchStore } from "@/store/search-store";
import { useQueryClient } from "@tanstack/react-query";
import { queryKeys } from "@/lib/query-keys";
import type { Locale } from "@/i18n/config";

interface ProductSearchViewProps {
  locale: Locale;
  checkoutOutcome?: "success" | "cancelled";
}

export function ProductSearchView({ locale, checkoutOutcome }: ProductSearchViewProps) {
  const { dictionary, format } = useTranslation();
  const queryClient = useQueryClient();

  const submittedQuery = useSearchStore((state) => state.submittedQuery);
  const submitQuery = useSearchStore((state) => state.submitQuery);

  const {
    products,
    total,
    isEnabled,
    isLoading,
    isFetchingNextPage,
    hasNextPage,
    fetchNextPage,
    isError,
    refetch,
  } = useProductSearch({ query: submittedQuery, locale });

  const handleSearch = (query: string) => {
    submitQuery(query);
    void queryClient.invalidateQueries({ queryKey: queryKeys.recentSearches });
  };

  return (
    <div className="flex flex-col gap-8">
      <SearchForm
        initialQuery={submittedQuery}
        isSearching={isLoading}
        onSubmit={handleSearch}
      />

      <SubscriptionBanner checkoutOutcome={checkoutOutcome} />

      <RecentSearches onSelect={handleSearch} />

      <section aria-labelledby="results-heading" aria-busy={isLoading}>
        <h2 id="results-heading" className="sr-only">
          {isEnabled
            ? format(dictionary.search.resultsFor, { query: submittedQuery })
            : dictionary.states.initialTitle}
        </h2>

        {!isEnabled ? (
          <StatusMessage
            title={dictionary.states.initialTitle}
            body={dictionary.states.initialBody}
          />
        ) : isLoading ? (
          <ProductGridSkeleton />
        ) : isError ? (
          <StatusMessage
            tone="error"
            title={dictionary.states.errorTitle}
            body={dictionary.states.errorBody}
            action={
              <Button type="button" variant="outline" onClick={() => void refetch()}>
                {dictionary.states.retry}
              </Button>
            }
          />
        ) : products.length === 0 ? (
          <StatusMessage
            title={dictionary.states.emptyTitle}
            body={dictionary.states.emptyBody}
          />
        ) : (
          <div className="flex flex-col gap-6">
            <p className="text-sm text-muted-foreground">
              {format(dictionary.search.resultCount, { count: total })}
            </p>

            <ProductGrid products={products} />

            {hasNextPage ? (
              <div className="flex justify-center">
                <Button
                  type="button"
                  variant="outline"
                  size="lg"
                  onClick={() => void fetchNextPage()}
                  disabled={isFetchingNextPage}
                >
                  {isFetchingNextPage
                    ? dictionary.search.loadingMore
                    : dictionary.search.loadMore}
                </Button>
              </div>
            ) : null}
          </div>
        )}
      </section>
    </div>
  );
}
