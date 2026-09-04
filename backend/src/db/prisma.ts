import { PrismaClient } from "@prisma/client";

// Single shared Prisma instance (avoids exhausting Postgres connections
// under ts-node/tsx watch reloads in dev).
export const prisma = new PrismaClient({
  log: process.env.NODE_ENV === "development" ? ["warn", "error"] : ["error"],
});
