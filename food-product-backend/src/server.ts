import { createApp } from "./app";
import { env } from "./config/env";
import { prisma } from "./lib/prisma";
import { logger } from "./utils/logger";

const app = createApp();

const server = app.listen(env.PORT, () => {
  logger.info("Backend server started", { port: env.PORT, env: env.NODE_ENV });
});

async function verifyDatabaseConnection(): Promise<void> {
  try {
    await prisma.$queryRaw`SELECT 1`;
    logger.info("Database connection established");
  } catch (error) {
    logger.error("Database is not reachable", {
      reason: error instanceof Error ? error.message : "unknown",
      hint: "Is MySQL running? Try `docker compose up -d` and wait for it to report healthy.",
    });
  }
}

void verifyDatabaseConnection();

async function shutdown(signal: string): Promise<void> {
  logger.info("Shutting down", { signal });

  server.close(() => {
    void prisma.$disconnect().finally(() => process.exit(0));
  });
}

process.on("SIGINT", () => void shutdown("SIGINT"));
process.on("SIGTERM", () => void shutdown("SIGTERM"));
