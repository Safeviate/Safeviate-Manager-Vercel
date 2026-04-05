import { authOptions } from '@/auth';
import { prisma } from '@/lib/prisma';
import { getServerSession } from 'next-auth';
import { NextResponse } from 'next/server';
import { randomUUID } from 'node:crypto';

async function getTenantId() {
  const session = await getServerSession(authOptions);
  const email = session?.user?.email?.trim().toLowerCase();
  if (!email) return null;
  const currentUser = await prisma.user.findUnique({ where: { email }, select: { tenantId: true } });
  return currentUser?.tenantId || 'safeviate';
}

async function getConfig(tenantId: string) {
  const rows = await prisma.$queryRawUnsafe<{ data: unknown }[]>(
    `SELECT data FROM tenant_configs WHERE tenant_id = $1 LIMIT 1`,
    tenantId
  );
  return (rows[0]?.data as any) || {};
}

export async function GET() {
  const tenantId = await getTenantId();
  if (!tenantId) return NextResponse.json({ items: [] }, { status: 200 });
  const config = await getConfig(tenantId);
  return NextResponse.json({ items: Array.isArray(config['compliance-matrix']) ? config['compliance-matrix'] : [] }, { status: 200 });
}

export async function POST(request: Request) {
  const tenantId = await getTenantId();
  if (!tenantId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const body = await request.json().catch(() => null);
  const item = body?.item;
  if (!item || typeof item !== 'object') return NextResponse.json({ error: 'Invalid item payload' }, { status: 400 });
  const incoming = { ...item, id: item.id || randomUUID() };
  const config = await getConfig(tenantId);
  const items = Array.isArray(config['compliance-matrix']) ? config['compliance-matrix'] : [];
  const nextItems = items.some((entry: any) => entry.id === incoming.id)
    ? items.map((entry: any) => (entry.id === incoming.id ? incoming : entry))
    : [...items, incoming];
  const nextConfig = { ...config, 'compliance-matrix': nextItems };
  await prisma.$executeRawUnsafe(
    `INSERT INTO tenant_configs (tenant_id, data, created_at, updated_at) VALUES ($1, $2::jsonb, NOW(), NOW()) ON CONFLICT (tenant_id) DO UPDATE SET data = EXCLUDED.data, updated_at = NOW()`,
    tenantId,
    JSON.stringify(nextConfig)
  );
  return NextResponse.json({ item: incoming }, { status: 200 });
}

export async function DELETE(request: Request) {
  const tenantId = await getTenantId();
  if (!tenantId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const { searchParams } = new URL(request.url);
  const id = searchParams.get('id');
  if (!id) return NextResponse.json({ error: 'Missing id' }, { status: 400 });
  const config = await getConfig(tenantId);
  const items = Array.isArray(config['compliance-matrix']) ? config['compliance-matrix'] : [];
  const nextItems = items.filter((entry: any) => entry.id !== id);
  const nextConfig = { ...config, 'compliance-matrix': nextItems };
  await prisma.$executeRawUnsafe(
    `INSERT INTO tenant_configs (tenant_id, data, created_at, updated_at) VALUES ($1, $2::jsonb, NOW(), NOW()) ON CONFLICT (tenant_id) DO UPDATE SET data = EXCLUDED.data, updated_at = NOW()`,
    tenantId,
    JSON.stringify(nextConfig)
  );
  return NextResponse.json({ ok: true }, { status: 200 });
}
