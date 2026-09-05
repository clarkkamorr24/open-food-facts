"use client";

import { useQuery } from "@tanstack/react-query";

import { queryKeys } from "@/lib/query-keys";
import { searchService } from "@/services/search.service";

export function useRecentSearches() {
  const result = useQuery({
    queryKey: queryKeys.recentSearches,
    queryFn: ({ signal }) => searchService.getRecentSearches(signal),
  });

  return {
    searches: result.data ?? [],
    isLoading: result.isLoading,
    isError: result.isError,
  };
}
