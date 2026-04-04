import { authOptions } from '@/auth';
import { prisma } from '@/lib/prisma';
import { getServerSession } from 'next-auth';
import { NextResponse } from 'next/server';

async function getTenantId() {
  const session = await getServerSession(authOptions);
  const email = session?.user?.email?.trim().toLowerCase();
  if (!email) return null;

  const currentUser = await prisma.user.findUnique({
    where: { email },
    select: { tenantId: true },
  });

  return currentUser?.tenantId || 'safeviate';
}

export async function DELETE(_request: Request, { params }: { params: { id: string } }) {
  const tenantId = await getTenantId();
  if (!tenantId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  await prisma.department.deleteMany({
    where: { id: params.id, tenantId },
  });

  return NextResponse.json({ ok: true }, { status: 200 });
}

export async function PATCH(request: Request, { params }: { params: { id: string } }) {
  const tenantId = await getTenantId();
  if (!tenantId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const body = await request.json();
  const name = String(body.name || '').trim();

  if (!name) {
    return NextResponse.json({ error: 'Department name is required.' }, { status: 400 });
  }

  const department = await prisma.department.updateMany({
    where: { id: params.id, tenantId },
    data: {
      name,
      updatedAt: new Date(),
    },
  });

  return NextResponse.json({ ok: true, department }, { status: 200 });
}
