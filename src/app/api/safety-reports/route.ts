import { authOptions } from '@/auth';
import { prisma } from '@/lib/prisma';
import { ensureCoreSchema, getBootstrapDbState } from '@/lib/server/bootstrap-db';
import { getServerSession } from 'next-auth';
import { NextResponse } from 'next/server';
import { randomUUID } from 'node:crypto';

async function getTenantId() {
  const { bootstrapMode } = await getBootstrapDbState();
  if (bootstrapMode) {
    await ensureCoreSchema();
    return 'safeviate';
  }

  const session = await getServerSession(authOptions);
  const email = session?.user?.email?.trim().toLowerCase();
  if (!email) return null;

  await ensureCoreSchema();

  await prisma.tenant.upsert({
    where: { id: 'safeviate' },
    update: { updatedAt: new Date() },
    create: { id: 'safeviate', name: 'Safeviate' },
  });
  const currentUser = await prisma.user.findUnique({ where: { email }, select: { tenantId: true } });
  return currentUser?.tenantId || 'safeviate';
}

export async function GET() {
  const tenantId = await getTenantId();
  if (!tenantId) return NextResponse.json({ reports: [] }, { status: 200 });

  const rows = await prisma.$queryRawUnsafe<{ data: unknown }[]>(
    `SELECT data FROM safety_reports WHERE tenant_id = $1 ORDER BY created_at ASC`,
    tenantId
  );

  return NextResponse.json({ reports: rows.map((row) => row.data) }, { status: 200 });
}

export async function POST(request: Request) {
  const tenantId = await getTenantId();
  if (!tenantId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const body = await request.json();
  const incoming = body?.report ?? {};
  const id = incoming.id || randomUUID();

  const data = { ...incoming, id };

  await prisma.$executeRawUnsafe(
    `INSERT INTO safety_reports (id, tenant_id, data, created_at, updated_at)
     VALUES ($1, $2, $3::jsonb, NOW(), NOW())
     ON CONFLICT (id) DO UPDATE SET data = EXCLUDED.data, updated_at = NOW()`,
    id,
    tenantId,
    JSON.stringify(data)
  );

  return NextResponse.json({ report: data }, { status: 201 });
}

export async function DELETE(request: Request) {
  const tenantId = await getTenantId();
  if (!tenantId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const body = await request.json();
  const reportId = body?.reportId;
  if (!reportId) return NextResponse.json({ error: 'Missing report id.' }, { status: 400 });

  await prisma.$executeRawUnsafe(`DELETE FROM safety_reports WHERE id = $1 AND tenant_id = $2`, reportId, tenantId);
  return NextResponse.json({ ok: true }, { status: 200 });
}
