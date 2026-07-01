import { prisma } from '@/lib/prisma';
import type { Prisma } from '@/generated/prisma/client';
import { ensureTenantConfigSchema } from '@/lib/server/bootstrap-db';

export const TECHNICAL_REPORT_SEQUENCE_CONFIG_KEY = 'technical-report-sequence-settings';
export const TECHNICAL_REPORT_SEQUENCE_DEFAULT_NEXT = 1;

export type TechnicalReportSequenceSettings = {
  id: 'technical-report-sequence';
  nextReportNumber: number;
};

const coercePositiveInteger = (value: unknown, fallback: number) => {
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed < 1) return fallback;
  return Math.floor(parsed);
};

export const formatTechnicalReportSequenceNumber = (value: number) => `TECH-${String(value).padStart(6, '0')}`;

const getTechnicalReportSequenceSettings = (data: unknown): TechnicalReportSequenceSettings | null => {
  if (!data || typeof data !== 'object') return null;
  const candidate = (data as Record<string, unknown>)[TECHNICAL_REPORT_SEQUENCE_CONFIG_KEY];
  if (!candidate || typeof candidate !== 'object') return null;

  return {
    id: 'technical-report-sequence',
    nextReportNumber: coercePositiveInteger(
      (candidate as Record<string, unknown>).nextReportNumber,
      TECHNICAL_REPORT_SEQUENCE_DEFAULT_NEXT
    ),
  };
};

const extractTechnicalSequenceNumber = (reportNumber: unknown) => {
  if (typeof reportNumber !== 'string') return 0;
  const match = reportNumber.trim().match(/^TECH-(\d+)$/i);
  if (!match) return 0;
  const parsed = Number(match[1]);
  return Number.isFinite(parsed) ? parsed : 0;
};

const getHighestTechnicalReportNumber = async (tenantId: string) => {
  const rows = await prisma.$queryRawUnsafe<{ data: unknown }[]>(
    `SELECT data FROM technical_reports WHERE tenant_id = $1`,
    tenantId
  );

  return rows.reduce((highest, row) => {
    const candidate = extractTechnicalSequenceNumber((row.data as Record<string, unknown> | null)?.reportNumber);
    return Math.max(highest, candidate);
  }, 0);
};

export async function loadTechnicalReportSequenceSettings(tenantId: string) {
  await ensureTenantConfigSchema();

  const configRow = await prisma.tenantConfig.findUnique({
    where: { tenantId },
    select: { data: true },
  });

  const existingSettings = getTechnicalReportSequenceSettings(configRow?.data);
  if (existingSettings) return existingSettings;

  const highestReportNumber = await getHighestTechnicalReportNumber(tenantId);
  return {
    id: 'technical-report-sequence' as const,
    nextReportNumber: Math.max(highestReportNumber + 1, TECHNICAL_REPORT_SEQUENCE_DEFAULT_NEXT),
  };
}

export async function allocateNextTechnicalReportNumber(tx: Prisma.TransactionClient, tenantId: string) {
  await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${`${tenantId}:technical-reports`}))`;

  const existingRow = await tx.tenantConfig.findUnique({
    where: { tenantId },
    select: { data: true },
  });

  const currentSettings = getTechnicalReportSequenceSettings(existingRow?.data);
  const nextReportNumber = currentSettings?.nextReportNumber ?? SAFETY_FALLBACK_NEXT(tx, tenantId);
  const resolvedNextReportNumber =
    typeof nextReportNumber === 'number' ? nextReportNumber : await nextReportNumber;
  const nextSettings: TechnicalReportSequenceSettings = {
    id: 'technical-report-sequence',
    nextReportNumber: resolvedNextReportNumber + 1,
  };

  const existingData = (existingRow?.data as Record<string, unknown>) || {};
  const mergedData = {
    ...existingData,
    [TECHNICAL_REPORT_SEQUENCE_CONFIG_KEY]: nextSettings,
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
    reportNumber: formatTechnicalReportSequenceNumber(resolvedNextReportNumber),
    nextReportNumber: nextSettings.nextReportNumber,
  };
}

async function SAFETY_FALLBACK_NEXT(tx: Prisma.TransactionClient, tenantId: string) {
  const rows = await tx.$queryRawUnsafe<{ data: unknown }[]>(
    `SELECT data FROM technical_reports WHERE tenant_id = $1`,
    tenantId
  );

  return (
    rows.reduce((highest, row) => {
      const candidate = extractTechnicalSequenceNumber((row.data as Record<string, unknown> | null)?.reportNumber);
      return Math.max(highest, candidate);
    }, 0) + 1
  );
}
