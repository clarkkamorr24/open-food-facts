import { PrismaMariaDb } from "@prisma/adapter-mariadb";
import { PrismaClient } from "@prisma/client";

import { env } from "../config/env";

const adapter = new PrismaMariaDb(env.DATABASE_URL);

const globalForPrisma = globalThis as typeof globalThis & {
  prisma?: PrismaClient;
};

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    adapter,
    log: env.NODE_ENV === "development" ? ["warn", "error"] : ["error"],
  });

if (env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}
