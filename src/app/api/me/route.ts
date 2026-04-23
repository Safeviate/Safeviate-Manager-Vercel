import { authOptions } from '@/auth';
import { isDatabaseAvailable, prisma } from '@/lib/prisma';
import { resolveTenantOverride, isMasterTenantEmail, MASTER_TENANT_ID } from '@/lib/server/tenant-access';
import { getServerSession } from 'next-auth';
import { NextResponse } from 'next/server';
import { randomUUID } from 'crypto';

const buildSuperUserProfile = (
  sessionUser: { id?: string | null; email?: string | null; name?: string | null },
  tenantId: string
) => ({
  id: sessionUser.id || sessionUser.email || 'safeviate-super-user',
  tenantId,
  email: sessionUser.email?.trim().toLowerCase() || '',
  firstName: sessionUser.name?.split(' ')[0] ?? 'User',
  lastName: sessionUser.name?.split(' ').slice(1).join(' ') || '',
  role: 'developer',
  permissions: ['*'],
  accessOverrides: {},
});

const buildFallbackUserIdCandidates = (email: string, authUserId?: string | null) => {
  const normalizedEmailSlug = email.replace(/[^a-z0-9]+/g, '_');
  const candidates = [
    authUserId?.trim(),
    `user_${normalizedEmailSlug}`,
    `user_${normalizedEmailSlug}_${randomUUID().slice(0, 8)}`,
  ].filter((value): value is string => Boolean(value));

  return [...new Set(candidates)];
};

export async function GET(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    const email = session?.user?.email?.trim().toLowerCase();
    const authUserId = session?.user?.id?.trim();

    if (!email) {
      return NextResponse.json({ profile: null }, { status: 200 });
    }

    if (isMasterTenantEmail(email)) {
      const selectedTenantId = await resolveTenantOverride(request, email, MASTER_TENANT_ID);
      return NextResponse.json(
        {
          profile: buildSuperUserProfile({
            id: session?.user?.id,
            email,
            name: session?.user?.name,
          }, selectedTenantId),
          tenant: { id: selectedTenantId, name: selectedTenantId === MASTER_TENANT_ID ? 'Safeviate' : selectedTenantId },
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
      const firstName = session?.user?.name?.split(' ')[0] ?? 'User';
      const lastName = session?.user?.name?.split(' ').slice(1).join(' ') || '';

      for (const candidateId of buildFallbackUserIdCandidates(email, authUserId)) {
        const existingById = await prisma.user.findUnique({
          where: { id: candidateId },
          select: { email: true },
        });

        if (existingById && existingById.email !== email) {
          continue;
        }

        profile = await prisma.user.upsert({
          where: { email },
          update: {
            tenantId: 'safeviate',
            firstName,
            lastName,
            role: 'developer',
            updatedAt: new Date(),
          },
          create: {
            id: candidateId,
            tenantId: 'safeviate',
            email,
            firstName,
            lastName,
            role: 'developer',
          },
        });
        break;
      }
    }

    if (!profile) {
      return NextResponse.json({ profile: null }, { status: 200 });
    }

    if (profile.suspendedAt) {
      return NextResponse.json({ profile: null }, { status: 200 });
    }

    const selectedTenantId = await resolveTenantOverride(request, email, profile.tenantId);
    const tenant = await prisma.tenant.findUnique({ where: { id: selectedTenantId } }).catch(() => null);
    const personnelProfile = await prisma.personnel.findFirst({
      where: {
        tenantId: selectedTenantId,
        email,
      },
      select: {
        permissions: true,
        accessOverrides: true,
      },
    }).catch(() => null);
    const role = await prisma.role.findFirst({
      where: {
        tenantId: selectedTenantId,
        OR: [
          { id: profile.role },
          { name: profile.role },
        ],
      },
    }).catch(() => null);

    return NextResponse.json(
      {
        profile: {
          ...profile,
          permissions: Array.isArray(personnelProfile?.permissions) ? (personnelProfile.permissions as string[]) : [],
          accessOverrides: personnelProfile?.accessOverrides ?? {},
        },
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
