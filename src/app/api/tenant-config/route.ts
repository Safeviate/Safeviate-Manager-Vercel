import { authOptions } from '@/auth';
import { prisma } from '@/lib/prisma';
import { ensureTenantConfigSchema } from '@/lib/server/bootstrap-db';
import { getOrSetRouteCache, invalidateRouteCache } from '@/lib/server/route-cache';
import { MASTER_TENANT_ID, isMasterTenantEmail, resolveTenantOverride } from '@/lib/server/tenant-access';
import { getServerSession } from 'next-auth';
import { NextResponse } from 'next/server';

export async function GET(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    const email = session?.user?.email?.trim().toLowerCase();
    if (!email) {
      return NextResponse.json({ config: null }, { status: 200 });
    }

    await ensureTenantConfigSchema();

    const baseTenantId = (await prisma.user.findUnique({ where: { email }, select: { tenantId: true } }))?.tenantId || MASTER_TENANT_ID;
    const tenantId = isMasterTenantEmail(email)
      ? await resolveTenantOverride(request, email, baseTenantId)
      : baseTenantId;

    const configRow = await getOrSetRouteCache(
      `tenant-config:${tenantId}`,
      60_000,
      () => prisma.tenantConfig.findUnique({
        where: { tenantId },
        select: { data: true },
      })
    );

    return NextResponse.json({ config: configRow?.data ?? null }, { status: 200 });
  } catch (error) {
    console.error('[tenant-config] fallback to empty config:', error);
    return NextResponse.json({ config: null }, { status: 200 });
  }
}

export async function PUT(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    const email = session?.user?.email?.trim().toLowerCase();
    if (!email) {
      return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 });
    }

    const currentUser = await prisma.user.findUnique({ where: { email } });
    if (!currentUser) {
      return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 });
    }

    const role = currentUser.role?.toLowerCase();
    const isDeveloper = role === 'dev' || role === 'developer';
    const isMaster = isMasterTenantEmail(email) || currentUser.tenantId === MASTER_TENANT_ID;
    if (!isDeveloper && !isMaster) {
      return NextResponse.json({ error: 'Unauthorized to update tenant configuration.' }, { status: 403 });
    }

    const body = await request.json().catch(() => null);
    const config = body?.config;
    if (!config || typeof config !== 'object') {
      return NextResponse.json({ error: 'Invalid config payload.' }, { status: 400 });
    }

    await ensureTenantConfigSchema();

    const resolvedTenantId = isMaster
      ? await resolveTenantOverride(request, email, currentUser.tenantId || MASTER_TENANT_ID)
      : currentUser.tenantId;

    const existingRow = await prisma.tenantConfig.findUnique({
      where: { tenantId: resolvedTenantId },
      select: { data: true },
    });

    const existingData = (existingRow?.data as Record<string, unknown>) || {};
    const mergedData = {
      ...existingData,
      ...config,
    };

    await prisma.tenantConfig.upsert({
      where: { tenantId: resolvedTenantId },
      create: {
        tenantId: resolvedTenantId,
        data: mergedData,
      },
      update: {
        data: mergedData,
        updatedAt: new Date(),
      },
    });

    invalidateRouteCache(`tenant-config:${resolvedTenantId}`);

    return NextResponse.json({ ok: true }, { status: 200 });
  } catch (error) {
    console.error('[tenant-config] failed to save config:', error);
    return NextResponse.json(
      { error: 'Failed to save tenant configuration.' },
      { status: 500 }
    );
  }
}
