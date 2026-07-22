import { prisma } from '@/lib/prisma';

type TenantSecurityConfig = {
  mfaRequired?: unknown;
};

const getSecurityConfig = (data: unknown): TenantSecurityConfig | null => {
  if (!data || typeof data !== 'object') return null;

  const security = (data as Record<string, unknown>).security;
  return security && typeof security === 'object'
    ? (security as TenantSecurityConfig)
    : null;
};

/**
 * MFA is a tenant policy. A temporary database problem must not lock every
 * signed-in user out of the application, so a failed policy lookup is treated
 * as not required and is logged for investigation.
 */
export async function isTenantMfaRequired(tenantId: string) {
  try {
    const config = await prisma.tenantConfig.findUnique({
      where: { tenantId },
      select: { data: true },
    });

    return getSecurityConfig(config?.data)?.mfaRequired === true;
  } catch (error) {
    console.error('[MFA policy] Could not read tenant MFA policy.', { tenantId, error });
    return false;
  }
}
