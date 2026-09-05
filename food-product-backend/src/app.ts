import cors from "cors";
import express, { type Express } from "express";
import helmet from "helmet";

import { env } from "./config/env";
import { errorHandler, notFoundHandler } from "./middleware/error.middleware";
import { stripeWebhookRoutes } from "./modules/webhooks/stripe-webhook.routes";
import { apiRoutes } from "./routes";

export function createApp(): Express {
  const app = express();

  app.disable("x-powered-by");
  app.use(helmet());

  app.use(
    cors({
      origin: env.CORS_ALLOWED_ORIGINS,
      methods: ["GET", "POST"],
      credentials: true,
    })
  );

  app.use("/api/webhooks", stripeWebhookRoutes);

  app.use(express.json({ limit: "100kb" }));

  app.get("/health", (_req, res) => {
    res.status(200).json({ success: true, data: { status: "ok" } });
  });

  app.use("/api", apiRoutes);

  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}
