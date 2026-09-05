import type { NextFunction, Request, Response } from "express";

import { UnauthorizedError } from "../../errors";
import type { ApiResponse } from "../../types/api";
import type { CreateCheckoutBody } from "./subscription.schema";
import { subscriptionService } from "./subscription.service";
import type { CheckoutSessionResult, SubscriptionSummary } from "./subscription.types";

export const subscriptionController = {
  async get(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const user = req.user;
      if (!user) throw new UnauthorizedError();

      const summary = await subscriptionService.getSummary(user.id);

      const body: ApiResponse<SubscriptionSummary> = { success: true, data: summary };
      res.status(200).json(body);
    } catch (error) {
      next(error);
    }
  },

  async createCheckoutSession(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const user = req.user;
      if (!user) throw new UnauthorizedError();

      const { returnPath } = (req.body ?? {}) as CreateCheckoutBody;
      const result = await subscriptionService.createCheckoutSession(user, returnPath);

      const body: ApiResponse<CheckoutSessionResult> = { success: true, data: result };
      res.status(201).json(body);
    } catch (error) {
      next(error);
    }
  },
};
