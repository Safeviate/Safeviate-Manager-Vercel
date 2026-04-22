import { prisma } from '@/lib/prisma';
import { MASTER_TENANT_EMAILS, MASTER_TENANT_ID, TENANT_OVERRIDE_COOKIE } from '@/lib/tenant-constants';

export { MASTER_TENANT_EMAILS, MASTER_TENANT_ID, TENANT_OVERRIDE_COOKIE } from '@/lib/tenant-constants';

const COOKIE_SPLIT = /;\s*/;

export const isMasterTenantEmail = (email?: string | null) => {
  const normalized = email?.trim().toLowerCase();
  if (!normalized) return false;
  return MASTER_TENANT_EMAILS.includes(normalized);
};

export const isMasterTenantId = (tenantId?: string | null) => {
  return (tenantId || '').trim().toLowerCase() === MASTER_TENANT_ID;
};

export function readCookie(headerValue: string | null, name: string) {
  if (!headerValue) return null;
  const segments = headerValue.split(COOKIE_SPLIT);
  for (const segment of segments) {
    const [key, ...rest] = segment.split('=');
    if (key?.trim() === name) {
      return decodeURIComponent(rest.join('=').trim());
    }
  }
  return null;
}

export async function resolveTenantOverride(request: Request, email?: string | null, fallbackTenantId = MASTER_TENANT_ID) {
  const normalizedEmail = email?.trim().toLowerCase() || '';
  const isMaster = isMasterTenantEmail(normalizedEmail) || isMasterTenantId(fallbackTenantId);
  if (!isMaster) {
    return fallbackTenantId;
  }

  const requestedTenantId = readCookie(request.headers.get('cookie'), TENANT_OVERRIDE_COOKIE)?.trim() || fallbackTenantId;
  if (!requestedTenantId || requestedTenantId === fallbackTenantId) {
    return fallbackTenantId;
  }

  const tenant = await prisma.tenant.findUnique({
    where: { id: requestedTenantId },
    select: { id: true },
  }).catch(() => null);

  return tenant?.id || fallbackTenantId;
}
