import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { authenticateAiRequest } from '@/lib/server/ai-auth';
import { ensureTenantConfigSchema } from '@/lib/server/bootstrap-db';

export async function GET() {
  try {
    const auth = await authenticateAiRequest();
    if (!auth.ok) {
      return NextResponse.json({ config: null }, { status: 200 });
    }

    await ensureTenantConfigSchema();
    const configRow = await prisma.tenantConfig.findUnique({
      where: { tenantId: auth.tenantId },
      select: { data: true },
    });

    return NextResponse.json({ config: configRow?.data ?? null }, { status: 200 });
  } catch (error) {
    console.error('[tenant-config] fallback to empty config:', error);
    return NextResponse.json({ config: null }, { status: 200 });
  }
}

export async function PUT(request: Request) {
  try {
    const auth = await authenticateAiRequest();
    if (!auth.ok) {
      return NextResponse.json({ error: auth.error }, { status: auth.status });
    }

    const role = auth.userProfile.role?.toLowerCase();
    const isDeveloper = role === 'dev' || role === 'developer';
    if (!isDeveloper && !auth.effectivePermissions.has('admin-settings-manage')) {
      return NextResponse.json({ error: 'Unauthorized to update tenant configuration.' }, { status: 403 });
    }

    const body = await request.json().catch(() => null);
    const config = body?.config;
    if (!config || typeof config !== 'object') {
      return NextResponse.json({ error: 'Invalid config payload.' }, { status: 400 });
    }

    await ensureTenantConfigSchema();

    // Fetch existing config to avoid wiping out other settings (e.g. enabledMenus)
    const existingRow = await prisma.tenantConfig.findUnique({
      where: { tenantId: auth.tenantId },
      select: { data: true },
    });
    
    // Perform a shallow merge of the config data
    const existingData = (existingRow?.data as Record<string, unknown>) || {};
    const mergedData = {
      ...existingData,
      ...config,
    };

    await prisma.tenantConfig.upsert({
      where: { tenantId: auth.tenantId },
      create: {
        tenantId: auth.tenantId,
        data: mergedData,
      },
      update: {
        data: mergedData,
        updatedAt: new Date(),
      },
    });

    return NextResponse.json({ ok: true }, { status: 200 });
  } catch (error) {
    console.error('[tenant-config] failed to save config:', error);
    return NextResponse.json(
      { error: 'Failed to save tenant configuration.' },
      { status: 500 }
    );
  }
}
