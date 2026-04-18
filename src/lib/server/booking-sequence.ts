import type { Prisma } from '@prisma/client';
import { formatBookingSequenceNumber } from '@/lib/booking-sequence';
import { prisma } from '@/lib/prisma';
import { ensureTenantConfigSchema } from '@/lib/server/bootstrap-db';

export const BOOKING_SEQUENCE_CONFIG_KEY = 'booking-sequence-settings';
export const BOOKING_SEQUENCE_DEFAULT_NEXT = 1;

export type BookingSequenceSettings = {
  id: 'booking-sequence';
  nextBookingNumber: number;
  lastResetAt?: string;
};

const coercePositiveInteger = (value: unknown, fallback: number) => {
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed < 1) return fallback;
  return Math.floor(parsed);
};

const getBookingSequenceSettings = (data: unknown): BookingSequenceSettings | null => {
  if (!data || typeof data !== 'object') return null;
  const candidate = (data as Record<string, unknown>)[BOOKING_SEQUENCE_CONFIG_KEY];
  if (!candidate || typeof candidate !== 'object') return null;

  return {
    id: 'booking-sequence',
    nextBookingNumber: coercePositiveInteger((candidate as Record<string, unknown>).nextBookingNumber, BOOKING_SEQUENCE_DEFAULT_NEXT),
    lastResetAt: typeof (candidate as Record<string, unknown>).lastResetAt === 'string'
      ? (candidate as Record<string, unknown>).lastResetAt as string
      : undefined,
  };
};

const getHighestBookingNumber = async (tenantId: string) => {
  const rows = await prisma.bookingRecord.findMany({
    where: { tenantId },
    select: { data: true },
  });

  return rows.reduce((highest, row) => {
    const bookingNumber = Number((row.data as Record<string, unknown> | null)?.bookingNumber || 0);
    if (!Number.isFinite(bookingNumber)) return highest;
    return Math.max(highest, bookingNumber);
  }, 0);
};

export async function loadBookingSequenceSettings(tenantId: string) {
  await ensureTenantConfigSchema();

  const configRow = await prisma.tenantConfig.findUnique({
    where: { tenantId },
    select: { data: true },
  });

  const existingSettings = getBookingSequenceSettings(configRow?.data);
  if (existingSettings) return existingSettings;

  const highestBookingNumber = await getHighestBookingNumber(tenantId);
  return {
    id: 'booking-sequence',
    nextBookingNumber: Math.max(highestBookingNumber + 1, BOOKING_SEQUENCE_DEFAULT_NEXT),
  };
}

export async function allocateNextBookingNumber(tx: Prisma.TransactionClient, tenantId: string) {
  await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${tenantId}))`;

  const existingRow = await tx.tenantConfig.findUnique({
    where: { tenantId },
    select: { data: true },
  });

  const currentSettings = getBookingSequenceSettings(existingRow?.data);
  const nextBookingNumber = currentSettings?.nextBookingNumber ?? BOOKING_SEQUENCE_DEFAULT_NEXT;
  const nextSettings: BookingSequenceSettings = {
    id: 'booking-sequence',
    nextBookingNumber: nextBookingNumber + 1,
    lastResetAt: currentSettings?.lastResetAt,
  };

  const existingData = (existingRow?.data as Record<string, unknown>) || {};
  const mergedData = {
    ...existingData,
    [BOOKING_SEQUENCE_CONFIG_KEY]: nextSettings,
  };

  await tx.tenantConfig.upsert({
    where: { tenantId },
    create: {
      tenantId,
      data: mergedData,
    },
    update: {
      data: mergedData,
      updatedAt: new Date(),
    },
  });

  return {
    bookingNumber: formatBookingSequenceNumber(nextBookingNumber),
    nextBookingNumber: nextSettings.nextBookingNumber,
  };
}

export async function saveBookingSequenceSettings(tenantId: string, settings: BookingSequenceSettings) {
  await ensureTenantConfigSchema();

  const existingRow = await prisma.tenantConfig.findUnique({
    where: { tenantId },
    select: { data: true },
  });

  const existingData = (existingRow?.data as Record<string, unknown>) || {};
  const mergedData = {
    ...existingData,
    [BOOKING_SEQUENCE_CONFIG_KEY]: {
      id: 'booking-sequence',
      nextBookingNumber: coercePositiveInteger(settings.nextBookingNumber, BOOKING_SEQUENCE_DEFAULT_NEXT),
      lastResetAt: settings.lastResetAt,
    },
  };

  await prisma.tenantConfig.upsert({
    where: { tenantId },
    create: {
      tenantId,
      data: mergedData,
    },
    update: {
      data: mergedData,
      updatedAt: new Date(),
    },
  });
}

export async function resetBookingSequence(tenantId: string) {
  const settings: BookingSequenceSettings = {
    id: 'booking-sequence',
    nextBookingNumber: BOOKING_SEQUENCE_DEFAULT_NEXT,
    lastResetAt: new Date().toISOString(),
  };

  await saveBookingSequenceSettings(tenantId, settings);
  return settings;
}
