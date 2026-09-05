import type { NextFunction, Request, Response } from "express";

import { UnauthorizedError } from "../../errors";
import type { ApiResponse } from "../../types/api";
import type { CreateSearchBody, ListSearchesQuery } from "./search.schema";
import { searchService } from "./search.service";
import type { RecentSearch } from "./search.types";

export const searchController = {
  async list(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const user = req.user;
      if (!user) throw new UnauthorizedError();

      const { limit } = req.query as unknown as ListSearchesQuery;
      const searches = await searchService.getRecent(user.id, limit);

      const body: ApiResponse<RecentSearch[]> = { success: true, data: searches };
      res.status(200).json(body);
    } catch (error) {
      next(error);
    }
  },

  async create(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const user = req.user;
      if (!user) throw new UnauthorizedError();

      const { query } = req.body as CreateSearchBody;
      const search = await searchService.record(user.id, query);

      const body: ApiResponse<RecentSearch> = { success: true, data: search };
      res.status(201).json(body);
    } catch (error) {
      next(error);
    }
  },
};
