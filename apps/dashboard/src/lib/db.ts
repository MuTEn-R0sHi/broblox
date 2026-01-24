import { PrismaMariaDb } from "@prisma/adapter-mariadb";
import { PrismaClient } from "@prisma/client";

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

function createPrismaClient() {
  const connectionUrl = new URL(process.env.DATABASE_URL!);

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

export const prisma = globalForPrisma.prisma ?? createPrismaClient();

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;
