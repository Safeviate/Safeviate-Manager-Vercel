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

export async function GET() {
  const tenantId = await getTenantId();
  if (!tenantId) {
    return NextResponse.json({ roles: [] }, { status: 200 });
  }

  const roles = await prisma.role.findMany({
    where: { tenantId },
    orderBy: { name: 'asc' },
  });

  return NextResponse.json({ roles }, { status: 200 });
}

export async function POST(request: Request) {
  const tenantId = await getTenantId();
  if (!tenantId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const body = await request.json().catch(() => null);
  if (!body || typeof body !== 'object') {
    return NextResponse.json({ error: 'Invalid role payload.' }, { status: 400 });
  }
  const id = body.id || crypto.randomUUID();
  const name = String(body.name || '').trim();
  const category = String(body.category || 'Personnel').trim() || 'Personnel';
  const permissions = Array.isArray(body.permissions) ? body.permissions.filter((permission) => typeof permission === 'string') : [];
  const requiredDocuments = Array.isArray(body.requiredDocuments) ? body.requiredDocuments.filter((document) => typeof document === 'string') : [];

  if (!name) {
    return NextResponse.json({ error: 'Role name is required.' }, { status: 400 });
  }

  const role = await prisma.role.upsert({
    where: { id },
    update: {
      tenantId,
      name,
      category,
      permissions,
      requiredDocuments,
      updatedAt: new Date(),
    },
    create: {
      id,
      tenantId,
      name,
      category,
      permissions,
      requiredDocuments,
    },
  });

  return NextResponse.json({ role }, { status: 200 });
}
