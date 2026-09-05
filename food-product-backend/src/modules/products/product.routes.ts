import { Router } from "express";

import { withDemoUser } from "../../middleware/demo-user.middleware";
import { searchRateLimiter } from "../../middleware/rate-limit.middleware";
import { validate } from "../../middleware/validation.middleware";
import { productController } from "./product.controller";
import {
  productParamsSchema,
  productQuerySchema,
  searchProductsQuerySchema,
} from "./product.schema";

export const productRoutes = Router();

productRoutes.get(
  "/search",
  searchRateLimiter,
  withDemoUser,
  validate({ query: searchProductsQuerySchema }),
  productController.search
);

productRoutes.get(
  "/:barcode",
  searchRateLimiter,
  withDemoUser,
  validate({ params: productParamsSchema, query: productQuerySchema }),
  productController.getByBarcode
);
