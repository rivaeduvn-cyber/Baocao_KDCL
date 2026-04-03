import { PrismaClient } from "@prisma/client";

const globalForPrisma = globalThis as unknown as { _prisma: PrismaClient | undefined };

function createPrismaClient(): PrismaClient {
  if (process.env.TURSO_DATABASE_URL && process.env.TURSO_AUTH_TOKEN) {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { PrismaLibSql } = require("@prisma/adapter-libsql");
    const adapter = new PrismaLibSql({
      url: process.env.TURSO_DATABASE_URL,
      authToken: process.env.TURSO_AUTH_TOKEN,
    });
    return new PrismaClient({ adapter } as never);
  }
  return new PrismaClient();
}

// Lazy singleton via Proxy - delays creation until first property access at runtime
export const prisma = new Proxy({} as PrismaClient, {
  get(_target, prop, receiver) {
    if (!globalForPrisma._prisma) {
      globalForPrisma._prisma = createPrismaClient();
    }
    const value = Reflect.get(globalForPrisma._prisma, prop, globalForPrisma._prisma);
    if (typeof value === "function") {
      return value.bind(globalForPrisma._prisma);
    }
    return value;
  },
});
