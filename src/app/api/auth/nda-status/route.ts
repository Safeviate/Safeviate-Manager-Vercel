import { NextResponse } from 'next/server';
import { hasAcceptedBetaNda, BETA_NDA_VERSION } from '@/lib/server/beta-nda';
import { prisma } from '@/lib/prisma';

export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const email = url.searchParams.get('email')?.trim().toLowerCase() || '';
    const tenantId = url.searchParams.get('tenantId')?.trim() || '';

    if (!email) {
      return NextResponse.json({
        ok: true,
        accepted: false,
        version: BETA_NDA_VERSION,
        tenantId: tenantId || 'safeviate',
      });
    }

    const user = await prisma.user.findUnique({ where: { email }, select: { tenantId: true } }).catch(() => null);
    const resolvedTenantId = tenantId || user?.tenantId || 'safeviate';
    const accepted = await hasAcceptedBetaNda(resolvedTenantId, email);
    return NextResponse.json({
      ok: true,
      accepted,
      version: BETA_NDA_VERSION,
      tenantId: resolvedTenantId,
    });
  } catch (error: any) {
    console.error('NDA status lookup failed:', error);
    return NextResponse.json({ error: error.message || 'Internal server error.' }, { status: 500 });
  }
}
