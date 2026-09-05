import type { NextFunction, Request, Response } from "express";

import { UnauthorizedError } from "../../errors";
import type { ApiResponse, PaginatedResult } from "../../types/api";
import type { Product } from "../../integrations/open-food-facts";
import { productService } from "./product.service";
import type { ProductParams, ProductQuery, SearchProductsQuery } from "./product.schema";

export const productController = {
  async search(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const user = req.user;
      if (!user) throw new UnauthorizedError();

      const { q, page, pageSize, locale } = req.query as unknown as SearchProductsQuery;

      const result = await productService.search({
        userId: user.id,
        query: q,
        page,
        pageSize,
        locale,
      });

      const body: ApiResponse<PaginatedResult<Product>> = { success: true, data: result };
      res.status(200).json(body);
    } catch (error) {
      next(error);
    }
  },

  async getByBarcode(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const user = req.user;
      if (!user) throw new UnauthorizedError();

      const { barcode } = req.params as unknown as ProductParams;
      const { locale } = req.query as unknown as ProductQuery;

      const product = await productService.getByBarcode({
        userId: user.id,
        barcode,
        locale,
      });

      const body: ApiResponse<Product> = { success: true, data: product };
      res.status(200).json(body);
    } catch (error) {
      next(error);
    }
  },
};
