import { Router } from "express";

import { withDemoUser } from "../../middleware/demo-user.middleware";
import { validate } from "../../middleware/validation.middleware";
import { searchController } from "./search.controller";
import { createSearchBodySchema, listSearchesQuerySchema } from "./search.schema";

export const searchRoutes = Router();

searchRoutes.get(
  "/",
  withDemoUser,
  validate({ query: listSearchesQuerySchema }),
  searchController.list
);

searchRoutes.post(
  "/",
  withDemoUser,
  validate({ body: createSearchBodySchema }),
  searchController.create
);
