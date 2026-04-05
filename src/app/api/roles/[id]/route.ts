import { authOptions } from '@/auth';
import { prisma } from '@/lib/prisma';
import { getServerSession } from 'next-auth';
import { NextRequest, NextResponse } from 'next/server';

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

export async function DELETE(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const tenantId = await getTenantId();
  if (!tenantId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  await prisma.role.deleteMany({
    where: { id, tenantId },
  });

  return NextResponse.json({ ok: true }, { status: 200 });
}

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const tenantId = await getTenantId();
  if (!tenantId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const body = await request.json();
  if (!body || typeof body !== 'object') {
    return NextResponse.json({ error: 'Invalid role payload.' }, { status: 400 });
  }
  const name = String(body.name || '').trim();
  const permissions = Array.isArray(body.permissions) ? body.permissions.filter((permission) => typeof permission === 'string') : [];
  const requiredDocuments = Array.isArray(body.requiredDocuments) ? body.requiredDocuments.filter((document) => typeof document === 'string') : [];

  if (!name) {
    return NextResponse.json({ error: 'Role name is required.' }, { status: 400 });
  }

  const role = await prisma.role.updateMany({
    where: { id, tenantId },
    data: {
      name,
      permissions,
      requiredDocuments,
      updatedAt: new Date(),
    },
  });

  if (role.count === 0) {
    return NextResponse.json({ error: 'Role not found.' }, { status: 404 });
  }

  return NextResponse.json({ ok: true, role }, { status: 200 });
}
