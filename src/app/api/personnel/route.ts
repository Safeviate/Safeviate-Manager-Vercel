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
    return NextResponse.json({ roles: [], departments: [], personnel: [] }, { status: 200 });
  }

  if (bootstrapMode) {
    return NextResponse.json({ roles: [], departments: [], personnel: [] }, { status: 200 });
  }

  await ensureCoreSchema();

  await prisma.tenant.upsert({
    where: { id: 'safeviate' },
    update: { updatedAt: new Date() },
    create: { id: 'safeviate', name: 'Safeviate' },
  });

  const currentUser = await prisma.user.findUnique({
    where: { email },
    select: { tenantId: true },
  });
  const tenantId = currentUser?.tenantId || 'safeviate';

  const [roleRows, departmentRows, personnelRows] = await Promise.all([
    prisma.role.findMany({ where: { tenantId } }),
    prisma.department.findMany({ where: { tenantId } }),
    prisma.personnel.findMany({ where: { tenantId } }),
  ]);

  return NextResponse.json(
    {
      roles: roleRows,
      departments: departmentRows,
      personnel: personnelRows,
    },
    { status: 200 }
  );
}
