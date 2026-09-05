import { apiRequest } from "@/lib/api-client";
import type { RecentSearch } from "@/types/search";

export const searchService = {
  getRecentSearches(signal?: AbortSignal): Promise<RecentSearch[]> {
    return apiRequest<RecentSearch[]>("/api/searches", { signal });
  },
};
