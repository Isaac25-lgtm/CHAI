import path from 'path';
import { PrismaClient } from '@/generated/prisma/client';
import { PrismaBetterSqlite3 } from '@prisma/adapter-better-sqlite3';

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

function resolveDbUrl(): string {
  const url = process.env.DATABASE_URL || 'file:./prisma/dev.db';
  const filePath = url.replace(/^file:/, '');
  return 'file:' + path.resolve(process.cwd(), filePath);
}

function createPrisma(): PrismaClient {
  const adapter = new PrismaBetterSqlite3({ url: resolveDbUrl() });
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return new (PrismaClient as any)({ adapter });
}

export const db = globalForPrisma.prisma ?? createPrisma();

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = db;

export default db;
