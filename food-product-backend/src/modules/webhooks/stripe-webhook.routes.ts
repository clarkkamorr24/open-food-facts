import express, { Router } from "express";

import { stripeWebhookController } from "./stripe-webhook.controller";

export const stripeWebhookRoutes = Router();

stripeWebhookRoutes.post(
  "/stripe",
  express.raw({ type: "application/json", limit: "1mb" }),
  stripeWebhookController.handle
);
