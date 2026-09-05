import { logger } from "../../utils/logger";
import { searchRepository } from "./search.repository";
import type { RecentSearch } from "./search.types";

export const RECENT_SEARCH_LIMIT = 8;

function toRecentSearch(record: {
  id: string;
  query: string;
  createdAt: Date;
}): RecentSearch {
  return {
    id: record.id,
    query: record.query,
    createdAt: record.createdAt.toISOString(),
  };
}

export const searchService = {
  async record(userId: string, query: string): Promise<RecentSearch> {
    const record = await searchRepository.create(userId, query);
    return toRecentSearch(record);
  },

  async recordSafely(userId: string, query: string): Promise<void> {
    try {
      await searchRepository.create(userId, query);
    } catch (error) {
      logger.error("Failed to persist search history", {
        userId,
        reason: error instanceof Error ? error.message : "unknown",
      });
    }
  },

  async getRecent(userId: string, limit = RECENT_SEARCH_LIMIT): Promise<RecentSearch[]> {
    const records = await searchRepository.findRecentByUser(userId, limit);
    return records.map(toRecentSearch);
  },
};
