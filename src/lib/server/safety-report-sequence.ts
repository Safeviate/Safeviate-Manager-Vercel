import type { Prisma } from '@/generated/prisma/client';
import { prisma } from '@/lib/prisma';
import { ensureTenantConfigSchema } from '@/lib/server/bootstrap-db';

export const SAFETY_REPORT_SEQUENCE_CONFIG_KEY = 'safety-report-sequence-settings';
export const SAFETY_REPORT_SEQUENCE_DEFAULT_NEXT = 1;

export type SafetyReportSequenceSettings = {
  id: 'safety-report-sequence';
  nextReportNumber: number;
};

const coercePositiveInteger = (value: unknown, fallback: number) => {
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed < 1) return fallback;
  return Math.floor(parsed);
};

export const formatSafetyReportSequenceNumber = (value: number) => `SR-${String(value).padStart(6, '0')}`;

const getSafetyReportSequenceSettings = (data: unknown): SafetyReportSequenceSettings | null => {
  if (!data || typeof data !== 'object') return null;
  const candidate = (data as Record<string, unknown>)[SAFETY_REPORT_SEQUENCE_CONFIG_KEY];
  if (!candidate || typeof candidate !== 'object') return null;

  return {
    id: 'safety-report-sequence',
    nextReportNumber: coercePositiveInteger(
      (candidate as Record<string, unknown>).nextReportNumber,
      SAFETY_REPORT_SEQUENCE_DEFAULT_NEXT
    ),
  };
};

const extractTrailingSequenceNumber = (reportNumber: unknown) => {
  if (typeof reportNumber !== 'string') return 0;
  const match = reportNumber.match(/(\d+)$/);
  if (!match) return 0;
  const parsed = Number(match[1]);
  return Number.isFinite(parsed) ? parsed : 0;
};

const getHighestSafetyReportNumber = async (tenantId: string) => {
  const rows = await prisma.safetyReport.findMany({
    where: { tenantId },
    select: { data: true },
  });

  return rows.reduce((highest, row) => {
    const candidate = extractTrailingSequenceNumber((row.data as Record<string, unknown> | null)?.reportNumber);
    return Math.max(highest, candidate);
  }, 0);
};

export async function loadSafetyReportSequenceSettings(tenantId: string) {
  await ensureTenantConfigSchema();

  const configRow = await prisma.tenantConfig.findUnique({
    where: { tenantId },
    select: { data: true },
  });

  const existingSettings = getSafetyReportSequenceSettings(configRow?.data);
  if (existingSettings) return existingSettings;

  const highestReportNumber = await getHighestSafetyReportNumber(tenantId);
  return {
    id: 'safety-report-sequence' as const,
    nextReportNumber: Math.max(highestReportNumber + 1, SAFETY_REPORT_SEQUENCE_DEFAULT_NEXT),
  };
}

export async function allocateNextSafetyReportNumber(tx: Prisma.TransactionClient, tenantId: string) {
  await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${`${tenantId}:safety-reports`}))`;

  const existingRow = await tx.tenantConfig.findUnique({
    where: { tenantId },
    select: { data: true },
  });

  const currentSettings = getSafetyReportSequenceSettings(existingRow?.data);
  const nextReportNumber = currentSettings?.nextReportNumber ?? SAFETY_REPORT_SEQUENCE_DEFAULT_NEXT;
  const nextSettings: SafetyReportSequenceSettings = {
    id: 'safety-report-sequence',
    nextReportNumber: nextReportNumber + 1,
  };

  const existingData = (existingRow?.data as Record<string, unknown>) || {};
  const mergedData = {
    ...existingData,
    [SAFETY_REPORT_SEQUENCE_CONFIG_KEY]: nextSettings,
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
    reportNumber: formatSafetyReportSequenceNumber(nextReportNumber),
    nextReportNumber: nextSettings.nextReportNumber,
  };
}
