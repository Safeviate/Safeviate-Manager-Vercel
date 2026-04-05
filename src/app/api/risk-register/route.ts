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

export async function GET() {
  try {
    const tenantId = await getTenantId();
    if (!tenantId) return NextResponse.json({ risks: [] }, { status: 200 });
    const rows = await prisma.$queryRawUnsafe<{ data: unknown }[]>(`SELECT data FROM risks WHERE tenant_id = $1 ORDER BY created_at ASC`, tenantId);
    return NextResponse.json({ risks: rows.map((row) => row.data) }, { status: 200 });
  } catch (error) {
    console.error('[risk-register] fallback to empty list:', error);
    return NextResponse.json({ risks: [] }, { status: 200 });
  }
}

export async function POST(request: Request) {
  const tenantId = await getTenantId();
  if (!tenantId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const body = await request.json();
  const incoming = body?.risk ?? {};
  const id = incoming.id || randomUUID();
  const data = { ...incoming, id };
  await prisma.$executeRawUnsafe(
    `INSERT INTO risks (id, tenant_id, data, created_at, updated_at) VALUES ($1, $2, $3::jsonb, NOW(), NOW()) ON CONFLICT (id) DO UPDATE SET data = EXCLUDED.data, updated_at = NOW()`,
    id, tenantId, JSON.stringify(data)
  );
  return NextResponse.json({ risk: data }, { status: 200 });
}
