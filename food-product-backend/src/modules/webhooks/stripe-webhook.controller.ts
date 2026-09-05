import type { NextFunction, Request, Response } from "express";

import { BadRequestError } from "../../errors";
import type { ApiResponse } from "../../types/api";
import { logger } from "../../utils/logger";
import { stripeWebhookService } from "./stripe-webhook.service";

export const stripeWebhookController = {
  async handle(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!Buffer.isBuffer(req.body)) {
        throw new BadRequestError(
          "Stripe webhook payload must be sent as a raw body.",
          "STRIPE_RAW_BODY_REQUIRED"
        );
      }

      const event = stripeWebhookService.constructEvent(
        req.body,
        req.header("stripe-signature")
      );

      await stripeWebhookService.handleEvent(event);

      const body: ApiResponse<{ received: true }> = {
        success: true,
        data: { received: true },
      };

      res.status(200).json(body);
    } catch (error) {
      if (!(error instanceof BadRequestError)) {
        logger.error("Stripe webhook processing failed", {
          reason: error instanceof Error ? error.message : "unknown",
        });
      }

      next(error);
    }
  },
};
