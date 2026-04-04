import { authOptions } from '@/auth';
import { prisma } from '@/lib/prisma';
import { ensureCoreSchema, getBootstrapDbState } from '@/lib/server/bootstrap-db';
import { getServerSession } from 'next-auth';
import { NextResponse } from 'next/server';

export async function GET() {
  const session = await getServerSession(authOptions);
  const email = session?.user?.email?.trim().toLowerCase();
  const { bootstrapMode } = await getBootstrapDbState();

  if (!email && !bootstrapMode) {
    return NextResponse.json({ routes: [] }, { status: 200 });
  }

  if (bootstrapMode) {
    return NextResponse.json({ routes: [] }, { status: 200 });
  }

  await ensureCoreSchema();

  await prisma.tenant.upsert({
    where: { id: 'safeviate' },
    update: { updatedAt: new Date() },
    create: { id: 'safeviate', name: 'Safeviate' },
  });

  const currentUser = await prisma.user.findUnique({ where: { email }, select: { tenantId: true } });
  const tenantId = currentUser?.tenantId || 'safeviate';

  const rows = await prisma.$queryRawUnsafe<{ data: unknown }[]>(
    `SELECT data FROM training_routes WHERE tenant_id = $1 ORDER BY created_at ASC`,
    tenantId
  );

  return NextResponse.json({ routes: rows.map((row) => row.data) }, { status: 200 });
}
