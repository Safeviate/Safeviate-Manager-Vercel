import { authOptions } from '@/auth';
import { prisma } from '@/lib/prisma';
import { MASTER_TENANT_ID, isMasterTenantEmail, resolveTenantOverride } from '@/lib/server/tenant-access';
import { getServerSession } from 'next-auth';

export async function getTenantIdFromSession(request: Request, fallbackTenantId?: string | null) {
  const session = await getServerSession(authOptions);
  const email = session?.user?.email?.trim().toLowerCase();

  if (!email) {
    return null;
  }

  if (isMasterTenantEmail(email)) {
    const baseTenantId = session?.user?.tenantId?.trim() || fallbackTenantId || null;
    if (!baseTenantId) {
      return null;
    }
    return resolveTenantOverride(request, email, baseTenantId);
  }

  try {
    const user = await prisma.user.findUnique({
      where: { email },
      select: { tenantId: true },
    });

    return user?.tenantId?.trim() || null;
  } catch (error) {
    console.error('[tenant] Failed to resolve the signed-in user tenant:', { email, error });
    return null;
  }
}

export async function getTenantIdForRoute(
  request: Request,
  options?: {
    allowDevelopmentFallback?: boolean;
    fallbackTenantId?: string | null;
  }
) {
  const fallbackTenantId = options?.fallbackTenantId ?? null;
  const tenantId = await getTenantIdFromSession(request, fallbackTenantId);

  if (tenantId) {
    return tenantId;
  }

  if (options?.allowDevelopmentFallback && process.env.NODE_ENV === 'development') {
    return fallbackTenantId || MASTER_TENANT_ID;
  }

  return null;
}
