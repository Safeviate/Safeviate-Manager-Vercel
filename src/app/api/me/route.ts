import { authOptions } from '@/auth';
import { prisma } from '@/lib/prisma';
import { getServerSession } from 'next-auth';
import { NextResponse } from 'next/server';

async function hasUsersTable() {
  try {
    const rows = await prisma.$queryRawUnsafe<{ exists: string | null }[]>(
      `SELECT to_regclass('public.users') AS exists`
    );
    return Boolean(rows[0]?.exists);
  } catch {
    return false;
  }
}

export async function GET() {
  const session = await getServerSession(authOptions);
  const email = session?.user?.email?.trim().toLowerCase();
  const authUserId = session?.user?.id?.trim();
  const bootstrapMode = !(await hasUsersTable());

  if (!email && !bootstrapMode) {
    return NextResponse.json({ profile: null }, { status: 200 });
  }

  if (bootstrapMode) {
    return NextResponse.json(
      {
        profile: {
          id: 'bootstrap-admin',
          tenantId: 'safeviate',
          email: email || 'bootstrap@safeviate.local',
          firstName: 'Bootstrap',
          lastName: 'Admin',
          role: 'developer',
          profilePath: null,
          passwordHash: null,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        tenant: { id: 'safeviate', name: 'Safeviate', createdAt: new Date(), updatedAt: new Date() },
        rolePermissions: ['*'],
      },
      { status: 200 }
    );
  }

  await prisma.tenant.upsert({
    where: { id: 'safeviate' },
    update: { updatedAt: new Date() },
    create: { id: 'safeviate', name: 'Safeviate' },
  });

  let profile = email ? await prisma.user.findUnique({ where: { email } }) : null;

  if (!profile && email) {
    profile = await prisma.user.upsert({
      where: { email },
      update: {
        id: authUserId || `user_${email.replace(/[^a-z0-9]+/g, '_')}`,
        tenantId: 'safeviate',
        firstName: session?.user?.name?.split(' ')[0] ?? 'User',
        lastName: session?.user?.name?.split(' ').slice(1).join(' ') || '',
        role: 'developer',
        updatedAt: new Date(),
      },
      create: {
        id: authUserId || `user_${email.replace(/[^a-z0-9]+/g, '_')}`,
        tenantId: 'safeviate',
        email,
        firstName: session?.user?.name?.split(' ')[0] ?? 'User',
        lastName: session?.user?.name?.split(' ').slice(1).join(' ') || '',
        role: 'developer',
      },
    });
  }

  const tenant = await prisma.tenant.findUnique({ where: { id: profile.tenantId } }).catch(() => null);
  const role = await prisma.role.findFirst({
    where: { tenantId: profile.tenantId, id: profile.role },
  }).catch(() => null);

  return NextResponse.json(
    {
      profile,
      tenant: tenant ?? null,
      rolePermissions: (role?.permissions as string[] | null) ?? [],
    },
    { status: 200 }
  );
}
