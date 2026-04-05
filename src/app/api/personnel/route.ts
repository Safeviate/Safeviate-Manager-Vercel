import { authOptions } from '@/auth';
import { prisma } from '@/lib/prisma';
import { ensurePersonnelSchema } from '@/lib/server/bootstrap-db';
import { getServerSession } from 'next-auth';
import { NextResponse } from 'next/server';

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    const email = session?.user?.email?.trim().toLowerCase();

    if (!email) {
      return NextResponse.json({ roles: [], departments: [], personnel: [] }, { status: 200 });
    }

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

    await ensurePersonnelSchema();
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
  } catch (error) {
    console.error('[personnel] fallback to empty payload:', error);
    return NextResponse.json({ roles: [], departments: [], personnel: [] }, { status: 200 });
  }
}
