import type { PaginatedResult } from "../types/api";

export const DEFAULT_PAGE = 1;
export const DEFAULT_PAGE_SIZE = 12;
export const MAX_PAGE_SIZE = 50;

interface BuildPaginatedResultInput<T> {
  items: T[];
  page: number;
  pageSize: number;
  total: number;
}

export function buildPaginatedResult<T>({
  items,
  page,
  pageSize,
  total,
}: BuildPaginatedResultInput<T>): PaginatedResult<T> {
  const totalPages = pageSize > 0 ? Math.ceil(total / pageSize) : 0;

  return {
    items,
    page,
    pageSize,
    total,
    totalPages,
    hasNextPage: page < totalPages,
  };
}
