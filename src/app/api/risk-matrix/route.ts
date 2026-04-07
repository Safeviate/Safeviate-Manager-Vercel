import { authOptions } from '@/auth';
import { prisma } from '@/lib/prisma';
import { ensureTenantConfigSchema } from '@/lib/server/bootstrap-db';
import { getServerSession } from 'next-auth';
import { NextResponse } from 'next/server';

async function getTenantId() {
  const session = await getServerSession(authOptions);
  const email = session?.user?.email?.trim().toLowerCase();
  if (!email) return null;
  const currentUser = await prisma.user.findUnique({ where: { email }, select: { tenantId: true } });
  return currentUser?.tenantId || 'safeviate';
}

export async function GET() {
  try {
    const tenantId = await getTenantId();
    if (!tenantId) return NextResponse.json({ configuration: null }, { status: 200 });
    await ensureTenantConfigSchema();
    const configRow = await prisma.tenantConfig.findUnique({
      where: { tenantId },
      select: { data: true },
    });
    const data = (configRow?.data as Record<string, unknown>) || {};
    return NextResponse.json({ configuration: data['risk-matrix'] ?? null }, { status: 200 });
  } catch (error) {
    console.error('[risk-matrix] fallback to null configuration:', error);
    return NextResponse.json({ configuration: null }, { status: 200 });
  }
}

export async function POST(request: Request) {
  try {
    const tenantId = await getTenantId();
    if (!tenantId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await request.json().catch(() => null);
    const configuration = body?.configuration ?? null;

    await ensureTenantConfigSchema();

    const existingRow = await prisma.tenantConfig.findUnique({
      where: { tenantId },
      select: { data: true },
    });
    const existing = (existingRow?.data as Record<string, unknown>) || {};
    const next = { ...existing, 'risk-matrix': configuration };

    await prisma.tenantConfig.upsert({
      where: { tenantId },
      create: {
        tenantId,
        data: next,
      },
      update: {
        data: next,
        updatedAt: new Date(),
      },
    });

    return NextResponse.json({ configuration }, { status: 200 });
  } catch (error) {
    console.error('[risk-matrix] failed to save configuration:', error);
    return NextResponse.json({ error: 'Failed to save risk matrix configuration.' }, { status: 500 });
  }
}
