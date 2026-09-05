import { Router } from "express";

import { withDemoUser } from "../../middleware/demo-user.middleware";
import { checkoutRateLimiter } from "../../middleware/rate-limit.middleware";
import { validate } from "../../middleware/validation.middleware";
import { subscriptionController } from "./subscription.controller";
import { createCheckoutBodySchema } from "./subscription.schema";

export const subscriptionRoutes = Router();

subscriptionRoutes.get("/", withDemoUser, subscriptionController.get);

subscriptionRoutes.post(
  "/checkout",
  checkoutRateLimiter,
  withDemoUser,
  validate({ body: createCheckoutBodySchema }),
  subscriptionController.createCheckoutSession
);
