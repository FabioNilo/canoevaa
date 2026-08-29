import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@prisma/client";

const globalForPrisma = globalThis as unknown as {
  prisma?: PrismaClient;
};

export const databaseUrl = process.env.DATABASE_URL;
export const isDatabaseConfigured = Boolean(databaseUrl);

function createPrismaClient() {
  const adapter = new PrismaPg({ connectionString: databaseUrl as string });
  return new PrismaClient({ adapter });
}

export const prisma = isDatabaseConfigured
  ? (globalForPrisma.prisma ?? createPrismaClient())
  : null;

if (process.env.NODE_ENV !== "production" && prisma) {
  globalForPrisma.prisma = prisma;
}
