export type ApiResponse<T> =
  | { success: true; data: T }
  | { success: false; error: { code: string; message: string; details?: unknown } };

export interface PaginatedResult<T> {
  items: T[];
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
  hasNextPage: boolean;
}
