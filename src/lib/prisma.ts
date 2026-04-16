import { PrismaClient } from '@prisma/client';
import { assertRequiredEnv } from '@/lib/server/env';

const isProduction = process.env.NODE_ENV === 'production';

if (isProduction) {
  if (!process.env.DATABASE_URL && process.env.DATABASE_URL_UNPOOLED) {
    process.env.DATABASE_URL = process.env.DATABASE_URL_UNPOOLED.trim();
  }

  if (!process.env.DATABASE_URL && process.env.NEON2_DATABASE_URL) {
    process.env.DATABASE_URL = process.env.NEON2_DATABASE_URL.trim();
  }

  if (!process.env.DATABASE_URL && process.env.POSTGRES_URL) {
    process.env.DATABASE_URL = process.env.POSTGRES_URL.trim();
  }
} else {
  if (!process.env.DATABASE_URL && process.env.SAFEVIATE_DATABASE_URL_UNPOOLED) {
    process.env.DATABASE_URL = process.env.SAFEVIATE_DATABASE_URL_UNPOOLED.trim();
  }

  if (!process.env.DATABASE_URL && process.env.SAFEVIATE_DATABASE_URL) {
    process.env.DATABASE_URL = process.env.SAFEVIATE_DATABASE_URL.trim();
  }

  if (!process.env.DATABASE_URL && process.env.DATABASE_URL_UNPOOLED) {
    process.env.DATABASE_URL = process.env.DATABASE_URL_UNPOOLED.trim();
  }

  if (!process.env.DATABASE_URL && process.env.NEON2_DATABASE_URL) {
    process.env.DATABASE_URL = process.env.NEON2_DATABASE_URL.trim();
  }
}

assertRequiredEnv(
  isProduction
    ? [['DATABASE_URL', 'DATABASE_URL_UNPOOLED', 'NEON2_DATABASE_URL', 'POSTGRES_URL']]
    : [[
        'DATABASE_URL',
        'DATABASE_URL_UNPOOLED',
        'SAFEVIATE_DATABASE_URL',
        'SAFEVIATE_DATABASE_URL_UNPOOLED',
        'NEON2_DATABASE_URL',
      ]],
  'database client'
);

declare global {
  // eslint-disable-next-line no-var
  var __prisma: PrismaClient | undefined;
}

type DatabaseAvailabilityCache = {
  checkedAt: number;
  available: boolean;
};

const DATABASE_AVAILABILITY_TTL_MS = 15_000;
let databaseAvailabilityCache: DatabaseAvailabilityCache | null = null;

export const prisma =
  global.__prisma ??
  new PrismaClient({
    log: process.env.NODE_ENV === 'development' ? ['error', 'warn'] : ['error'],
  });

if (process.env.NODE_ENV !== 'production') {
  global.__prisma = prisma;
}

export async function isDatabaseAvailable(forceRefresh = false) {
  const now = Date.now();
  if (
    !forceRefresh &&
    databaseAvailabilityCache &&
    now - databaseAvailabilityCache.checkedAt < DATABASE_AVAILABILITY_TTL_MS
  ) {
    return databaseAvailabilityCache.available;
  }

  try {
    await prisma.$queryRawUnsafe('SELECT 1');
    databaseAvailabilityCache = { checkedAt: now, available: true };
    return true;
  } catch {
    databaseAvailabilityCache = { checkedAt: now, available: false };
    return false;
  }
}
