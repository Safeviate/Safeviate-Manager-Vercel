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

export async function GET(request: Request) {
  const tenantId = await getTenantId();
  if (!tenantId) return NextResponse.json({ taskCards: [] }, { status: 200 });
  const { searchParams } = new URL(request.url);
  const workpackId = searchParams.get('workpackId');
  const rows = workpackId
    ? await prisma.$queryRawUnsafe<{ data: unknown }[]>(
        `SELECT data FROM maintenance_task_cards WHERE tenant_id = $1 AND data->>'workpackId' = $2 ORDER BY created_at ASC`,
        tenantId,
        workpackId
      )
    : await prisma.$queryRawUnsafe<{ data: unknown }[]>(
        `SELECT data FROM maintenance_task_cards WHERE tenant_id = $1 ORDER BY created_at ASC`,
        tenantId
      );
  return NextResponse.json({ taskCards: rows.map((row) => row.data) }, { status: 200 });
}

export async function POST(request: Request) {
  const tenantId = await getTenantId();
  if (!tenantId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const body = await request.json().catch(() => null);
  const taskCard = body?.taskCard;
  if (!taskCard || typeof taskCard !== 'object') return NextResponse.json({ error: 'Invalid task card payload.' }, { status: 400 });
  const id = taskCard.id || randomUUID();
  const data = { ...taskCard, id };
  await prisma.$executeRawUnsafe(
    `INSERT INTO maintenance_task_cards (id, tenant_id, data, created_at, updated_at) VALUES ($1, $2, $3::jsonb, NOW(), NOW()) ON CONFLICT (id) DO UPDATE SET data = EXCLUDED.data, updated_at = NOW()`,
    id,
    tenantId,
    JSON.stringify(data)
  );
  return NextResponse.json({ taskCard: data }, { status: 200 });
}

