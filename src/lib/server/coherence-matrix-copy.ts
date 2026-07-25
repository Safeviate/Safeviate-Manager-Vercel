import { randomUUID } from 'crypto';
import { prisma } from '@/lib/prisma';
import { ensureTenantConfigSchema } from '@/lib/server/bootstrap-db';
import { invalidateRouteCache } from '@/lib/server/route-cache';
import { MASTER_TENANT_ID } from '@/lib/server/tenant-access';

const MATRIX_CONFIG_KEY = 'compliance-matrix';

type JsonValue = string | number | boolean | null | JsonObject | JsonValue[];
type JsonObject = { [key: string]: JsonValue };
type MatrixEntry = JsonObject & {
  id?: JsonValue;
  organizationId?: JsonValue;
};

export class CoherenceMatrixCopyError extends Error {
  constructor(message: string, readonly status: number) {
    super(message);
    this.name = 'CoherenceMatrixCopyError';
  }
}

export function readCoherenceMatrixEntries(data: unknown): MatrixEntry[] {
  if (!data || typeof data !== 'object' || Array.isArray(data)) return [];
  const entries = (data as Record<string, unknown>)[MATRIX_CONFIG_KEY];
  return Array.isArray(entries)
    ? entries.filter(
        (entry): entry is MatrixEntry =>
          Boolean(entry) &&
          typeof entry === 'object' &&
          !Array.isArray(entry)
      )
    : [];
}

export async function createMasterCoherenceMatrixSnapshot(): Promise<MatrixEntry[]> {
  await ensureTenantConfigSchema();

  const masterConfig = await prisma.tenantConfig.findUnique({
    where: { tenantId: MASTER_TENANT_ID },
    select: { data: true },
  });

  return readCoherenceMatrixEntries(masterConfig?.data)
    .filter((entry) => {
      const organizationId = typeof entry.organizationId === 'string' ? entry.organizationId.trim() : '';
      return !organizationId;
    })
    .map((entry) => {
      const snapshot = structuredClone(entry);
      delete snapshot.tenantId;
      delete snapshot.sourceTenantId;
      delete snapshot.externalOrganizationId;
      return {
        ...snapshot,
        id: randomUUID(),
        organizationId: null,
      };
    });
}

export async function copyMasterCoherenceMatrixToTenant(
  targetTenantId: string,
  options: { replaceExisting?: boolean } = {}
) {
  const normalizedTargetTenantId = targetTenantId.trim();
  if (!normalizedTargetTenantId) {
    throw new CoherenceMatrixCopyError('A destination tenant is required.', 400);
  }
  if (normalizedTargetTenantId === MASTER_TENANT_ID) {
    throw new CoherenceMatrixCopyError('The Safeviate master coherence matrix cannot be a copy destination.', 400);
  }

  await ensureTenantConfigSchema();

  const [targetTenant, targetConfig, snapshot] = await Promise.all([
    prisma.tenant.findUnique({
      where: { id: normalizedTargetTenantId },
      select: { id: true },
    }),
    prisma.tenantConfig.findUnique({
      where: { tenantId: normalizedTargetTenantId },
      select: { data: true },
    }),
    createMasterCoherenceMatrixSnapshot(),
  ]);

  if (!targetTenant) {
    throw new CoherenceMatrixCopyError('The destination tenant does not exist.', 404);
  }

  const existingData = targetConfig?.data && typeof targetConfig.data === 'object' && !Array.isArray(targetConfig.data)
    ? (targetConfig.data as Record<string, unknown>)
    : {};
  const existingEntries = readCoherenceMatrixEntries(existingData);
  if (existingEntries.length > 0 && !options.replaceExisting) {
    throw new CoherenceMatrixCopyError(
      'The destination tenant already has coherence matrix data. Confirm replacement before copying.',
      409
    );
  }

  const nextData = {
    ...existingData,
    [MATRIX_CONFIG_KEY]: snapshot,
  };

  await prisma.tenantConfig.upsert({
    where: { tenantId: normalizedTargetTenantId },
    create: {
      tenantId: normalizedTargetTenantId,
      data: nextData,
    },
    update: {
      data: nextData,
      updatedAt: new Date(),
    },
  });

  invalidateRouteCache(`tenant-config:${normalizedTargetTenantId}`);

  return {
    copied: snapshot.length,
    replaced: existingEntries.length,
    targetTenantId: normalizedTargetTenantId,
  };
}
