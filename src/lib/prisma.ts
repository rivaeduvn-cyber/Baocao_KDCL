import { PrismaClient } from "@prisma/client";

const globalForPrisma = globalThis as unknown as { _prisma: PrismaClient | undefined };

// Local dev: use standard Prisma with SQLite
// Production (Vercel): use turso.ts directly - this file is only for local dev
function createPrismaClient(): PrismaClient {
  return new PrismaClient();
}

if (!globalForPrisma._prisma) {
  globalForPrisma._prisma = createPrismaClient();
}

export const prisma = globalForPrisma._prisma;
