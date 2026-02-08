import { PrismaMariaDb } from "@prisma/adapter-mariadb";
import { PrismaClient } from "@prisma/client";

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

function createPrismaClient() {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    throw new Error(
      "DATABASE_URL is not set. Set it in apps/dashboard/.env (local dev) or configure it in your deployment environment."
    );
  }

  const connectionUrl = new URL(databaseUrl);

  const adapter = new PrismaMariaDb({
    host: connectionUrl.hostname,
    port: parseInt(connectionUrl.port) || 3306,
    user: connectionUrl.username,
    password: connectionUrl.password,
    database: connectionUrl.pathname.slice(1), // Remove leading '/'
    connectionLimit: 5,
  });

  return new PrismaClient({ adapter });
}

let prismaClient: PrismaClient | undefined;

function getPrismaClient(): PrismaClient {
  if (prismaClient) return prismaClient;

  const cached = globalForPrisma.prisma;
  if (cached) {
    prismaClient = cached;
    return cached;
  }

  prismaClient = createPrismaClient();
  if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prismaClient;
  return prismaClient;
}

// Lazy proxy so `next build` can import route modules even when DATABASE_URL is
// not configured (common in CI for PR builds). The first actual DB access will
// still throw with a clear error.
export const prisma = new Proxy({} as PrismaClient, {
  get(_target, prop, receiver) {
    const client = getPrismaClient() as unknown as Record<PropertyKey, unknown>;
    const value = Reflect.get(client, prop, receiver);
    if (typeof value === "function") {
      return (value as (...args: unknown[]) => unknown).bind(client);
    }
    return value;
  },
}) as PrismaClient;
