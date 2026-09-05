import { z } from "zod";

import { searchQuerySchema } from "../products/product.schema";
import { RECENT_SEARCH_LIMIT } from "./search.service";

export const createSearchBodySchema = z.object({
  query: searchQuerySchema,
});

export const listSearchesQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(50).default(RECENT_SEARCH_LIMIT),
});

export type CreateSearchBody = z.infer<typeof createSearchBodySchema>;
export type ListSearchesQuery = z.infer<typeof listSearchesQuerySchema>;
