import "dotenv/config";

import { PrismaMariaDb } from "@prisma/adapter-mariadb";
import { PrismaClient } from "@prisma/client";

const databaseUrl = process.env.DATABASE_URL;

if (!databaseUrl) {
  throw new Error("DATABASE_URL is required to seed the database");
}

const prisma = new PrismaClient({ adapter: new PrismaMariaDb(databaseUrl) });

const DEMO_USER_EMAIL = process.env.DEMO_USER_EMAIL ?? "demo@example.com";

async function main(): Promise<void> {
  const user = await prisma.user.upsert({
    where: { email: DEMO_USER_EMAIL },
    update: {},
    create: { email: DEMO_USER_EMAIL },
    select: { id: true, email: true },
  });

  console.log(`Seeded demo user ${user.email} (${user.id})`);
}

function isDatabaseUnreachable(error: unknown): boolean {
  const message = error instanceof Error ? error.message : String(error);

  return (
    message.includes("pool failed to retrieve a connection") ||
    message.includes("ECONNREFUSED") ||
    message.includes("Can't reach database server")
  );
}

main()
  .catch((error: unknown) => {
    if (isDatabaseUnreachable(error)) {
      console.error(
        [
          "Seeding failed: could not connect to the database.",
          "",
          "  Is MySQL running and ready?",
          "    docker compose up -d",
          "    docker compose ps          # wait for status 'healthy'",
          "",
          `  Connection string: ${databaseUrl.replace(/:\/\/[^@]*@/, "://***@")}`,
        ].join("\n")
      );
    } else {
      console.error("Seeding failed:", error);
    }

    process.exitCode = 1;
  })
  .finally(() => void prisma.$disconnect());
