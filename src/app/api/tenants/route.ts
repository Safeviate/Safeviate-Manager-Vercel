import { authOptions } from '@/auth';
import { prisma } from '@/lib/prisma';
import { getServerSession } from 'next-auth';
import { NextResponse } from 'next/server';

async function getTenantId() {
  const session = await getServerSession(authOptions);
  const email = session?.user?.email?.trim().toLowerCase();
  if (!email) return null;
  const currentUser = await prisma.user.findUnique({ where: { email }, select: { tenantId: true } });
  return currentUser?.tenantId || 'safeviate';
}

export async function GET() {
  const tenantId = await getTenantId();
  if (!tenantId) {
    return NextResponse.json({ tenants: [] }, { status: 200 });
  }

  const tenants = await prisma.tenant.findMany({ orderBy: { name: 'asc' } }).catch(() => []);
  return NextResponse.json({ tenants }, { status: 200 });
}

export async function PUT(request: Request) {
  const tenantId = await getTenantId();
  if (!tenantId) {
    return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 });
  }

  const body = await request.json().catch(() => null);
  const tenant = body?.tenant;
  if (!tenant || !tenant.id || !tenant.name) {
    return NextResponse.json({ error: 'Invalid tenant payload.' }, { status: 400 });
  }

  await prisma.tenant.upsert({
    where: { id: tenant.id },
    update: {
      name: tenant.name,
      updatedAt: new Date(),
    },
    create: {
      id: tenant.id,
      name: tenant.name,
    },
  });

  return NextResponse.json({ ok: true }, { status: 200 });
}
