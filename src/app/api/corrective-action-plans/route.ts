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

async function getAllCaps(tenantId: string) {
  const rows = await prisma.$queryRawUnsafe<{ data: unknown }[]>(
    `SELECT data FROM corrective_action_plans WHERE tenant_id = $1 ORDER BY created_at DESC`,
    tenantId
  );
  return rows.map((row) => row.data);
}

export async function GET() {
  const tenantId = await getTenantId();
  if (!tenantId) return NextResponse.json({ caps: [] }, { status: 200 });
  return NextResponse.json({ caps: await getAllCaps(tenantId) }, { status: 200 });
}

export async function POST(request: Request) {
  const tenantId = await getTenantId();
  if (!tenantId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const body = await request.json().catch(() => null);
  const cap = body?.cap;
  if (!cap || typeof cap !== 'object') return NextResponse.json({ error: 'Invalid CAP payload' }, { status: 400 });
  const id = cap.id || randomUUID();
  const data = { ...cap, id };
  await prisma.$executeRawUnsafe(
    `INSERT INTO corrective_action_plans (id, tenant_id, data, created_at, updated_at) VALUES ($1, $2, $3::jsonb, NOW(), NOW()) ON CONFLICT (id) DO UPDATE SET data = EXCLUDED.data, updated_at = NOW()`,
    id,
    tenantId,
    JSON.stringify(data)
  );
  return NextResponse.json({ cap: data }, { status: 200 });
}

