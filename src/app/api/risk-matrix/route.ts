import { authOptions } from '@/auth';
import { prisma } from '@/lib/prisma';
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
    const rows = await prisma.$queryRawUnsafe<{ data: unknown }[]>(`SELECT data FROM tenant_configs WHERE tenant_id = $1 LIMIT 1`, tenantId);
    const data = (rows[0]?.data as any) || {};
    return NextResponse.json({ configuration: data['risk-matrix'] ?? null }, { status: 200 });
  } catch (error) {
    console.error('[risk-matrix] fallback to null configuration:', error);
    return NextResponse.json({ configuration: null }, { status: 200 });
  }
}

export async function POST(request: Request) {
  const tenantId = await getTenantId();
  if (!tenantId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const body = await request.json();
  const configuration = body?.configuration ?? null;
  const rows = await prisma.$queryRawUnsafe<{ data: unknown }[]>(`SELECT data FROM tenant_configs WHERE tenant_id = $1 LIMIT 1`, tenantId);
  const existing = (rows[0]?.data as any) || {};
  const next = { ...existing, 'risk-matrix': configuration };
  await prisma.$executeRawUnsafe(
    `INSERT INTO tenant_configs (tenant_id, data, created_at, updated_at) VALUES ($1, $2::jsonb, NOW(), NOW()) ON CONFLICT (tenant_id) DO UPDATE SET data = EXCLUDED.data, updated_at = NOW()`,
    tenantId,
    JSON.stringify(next)
  );
  return NextResponse.json({ configuration }, { status: 200 });
}
