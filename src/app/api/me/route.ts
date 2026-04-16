import { authOptions } from '@/auth';
import { isDatabaseAvailable, prisma } from '@/lib/prisma';
import { getServerSession } from 'next-auth';
import { NextResponse } from 'next/server';

const SUPER_USERS = ['deanebolton@gmail.com', 'barry@safeviate.com'];

const buildSuperUserProfile = (sessionUser: { id?: string | null; email?: string | null; name?: string | null }) => ({
  id: sessionUser.id || sessionUser.email || 'safeviate-super-user',
  tenantId: 'safeviate',
  email: sessionUser.email?.trim().toLowerCase() || '',
  firstName: sessionUser.name?.split(' ')[0] ?? 'User',
  lastName: sessionUser.name?.split(' ').slice(1).join(' ') || '',
  role: 'developer',
  permissions: ['*'],
});

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    const email = session?.user?.email?.trim().toLowerCase();
    const authUserId = session?.user?.id?.trim();

    if (!email) {
      return NextResponse.json({ profile: null }, { status: 200 });
    }

    if (SUPER_USERS.includes(email)) {
      return NextResponse.json(
        {
          profile: buildSuperUserProfile({
            id: session?.user?.id,
            email,
            name: session?.user?.name,
          }),
          tenant: { id: 'safeviate', name: 'Safeviate' },
          rolePermissions: ['*'],
        },
        { status: 200 }
      );
    }

    if (!(await isDatabaseAvailable())) {
      return NextResponse.json({ profile: null }, { status: 200 });
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

    if (!profile) {
      return NextResponse.json({ profile: null }, { status: 200 });
    }

    const tenant = await prisma.tenant.findUnique({ where: { id: profile.tenantId } }).catch(() => null);
    const role = await prisma.role.findFirst({
      where: {
        tenantId: profile.tenantId,
        OR: [
          { id: profile.role },
          { name: profile.role },
        ],
      },
    }).catch(() => null);

    return NextResponse.json(
      {
        profile,
        tenant: tenant ?? null,
        rolePermissions: (role?.permissions as string[] | null) ?? [],
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('[me] fallback to empty profile:', error);
    return NextResponse.json({ profile: null }, { status: 200 });
  }
}
