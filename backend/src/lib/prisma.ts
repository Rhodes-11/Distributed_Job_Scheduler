import { PrismaClient } from '@prisma/client';

process.env.DATABASE_PROVIDER ||= 'sqlite';
process.env.DATABASE_URL ||= 'file:./dev.db';

declare global {
  // eslint-disable-next-line no-var
  var __prisma: PrismaClient | undefined;
}

export const prisma =
  global.__prisma ??
  new PrismaClient({
    log: ['error', 'warn'],
  });

if (process.env.NODE_ENV !== 'production') {
  global.__prisma = prisma;
}

export default prisma;
