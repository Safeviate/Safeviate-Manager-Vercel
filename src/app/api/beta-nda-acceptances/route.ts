import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/auth';
import { prisma } from '@/lib/prisma';
import { isMasterTenantEmail, resolveTenantOverride, MASTER_TENANT_ID } from '@/lib/server/tenant-access';

export async function GET(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    const email = session?.user?.email?.trim().toLowerCase();
    if (!email) {
      return NextResponse.json({ acceptances: [] }, { status: 200 });
    }

    const user = await prisma.user.findUnique({
      where: { email },
      select: { tenantId: true, role: true },
    }).catch(() => null);

    if (!isMasterTenantEmail(email) && user?.role?.toLowerCase() !== 'developer') {
      return NextResponse.json({ error: 'Unauthorized.' }, { status: 403 });
    }

    const url = new URL(request.url);
    const requestedTenantId = url.searchParams.get('tenantId')?.trim() || '';
    const baseTenantId = user?.tenantId || MASTER_TENANT_ID;
    const tenantId = isMasterTenantEmail(email)
      ? requestedTenantId || (await resolveTenantOverride(request, email, baseTenantId))
      : baseTenantId;

    const tenant = await prisma.tenant.findUnique({
      where: { id: tenantId },
      select: { id: true, name: true },
    }).catch(() => null);

    if (!tenant) {
      return NextResponse.json({
        tenantId,
        acceptances: [],
      }, { status: 200 });
    }

    const acceptances = await prisma.betaNdaAcceptance.findMany({
      where: { tenantId: tenant.id },
      orderBy: [{ acceptedAt: 'desc' }, { createdAt: 'desc' }],
      select: {
        id: true,
        email: true,
        name: true,
        ndaVersion: true,
        acceptedAt: true,
        ipAddress: true,
        userAgent: true,
      },
    }).catch(() => []);

    return NextResponse.json({
      tenantId: tenant.id,
      tenantName: tenant.name,
      acceptances,
    }, { status: 200 });
  } catch (error: any) {
    console.error('[beta-nda-acceptances] failed:', error);
    return NextResponse.json({ error: error.message || 'Internal server error.' }, { status: 500 });
  }
}
