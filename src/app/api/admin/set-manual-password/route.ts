import { NextResponse } from 'next/server';
import { hash } from 'bcryptjs';
import { authenticateAiRequest } from '@/lib/server/ai-auth';
import { prisma } from '@/lib/prisma';
import { enforceRateLimit } from '@/lib/server/request-security';
import { hasHierarchicalPermission } from '@/lib/permission-model';

export async function POST(request: Request) {
  try {
    const rateLimit = enforceRateLimit({
      request,
      key: 'admin-set-manual-password',
      limit: 12,
    });
    if (rateLimit) {
      return NextResponse.json(
        { error: rateLimit.message },
        {
          status: 429,
          headers: { 'Retry-After': String(rateLimit.retryAfterSeconds) },
        }
      );
    }

    const authResult = await authenticateAiRequest(request);
    if (!authResult.ok) {
      return NextResponse.json({ error: authResult.error }, { status: authResult.status });
    }

    if (
      !hasHierarchicalPermission(authResult.effectivePermissions, 'users-edit', authResult.deniedPermissions) &&
      authResult.userProfile.role?.toLowerCase() !== 'developer'
    ) {
      return NextResponse.json({ error: 'Unauthorized to set a manual password.' }, { status: 403 });
    }

    const { userId, tenantId, password } = await request.json();

    if (!userId || typeof userId !== 'string') {
      return NextResponse.json({ error: 'User ID is required.' }, { status: 400 });
    }

    if (!password || typeof password !== 'string' || password.length < 8) {
      return NextResponse.json({ error: 'Manual passwords must be at least 8 characters long.' }, { status: 400 });
    }

    const targetTenantId = String(tenantId || authResult.tenantId || 'safeviate').trim();
    if (authResult.userProfile.role?.toLowerCase() !== 'developer' && targetTenantId !== authResult.tenantId) {
      return NextResponse.json({ error: 'You can only update users in your current tenant.' }, { status: 403 });
    }

    const existingUser = await prisma.user.findFirst({
      where: { id: userId, tenantId: targetTenantId },
      select: { id: true, email: true, tenantId: true },
    });

    if (!existingUser) {
      return NextResponse.json({ error: 'No matching tenant user was found for this password update.' }, { status: 404 });
    }

    const passwordHash = await hash(password, 12);

    await prisma.$transaction(async (tx) => {
      await tx.user.update({
        where: { id: existingUser.id },
        data: {
          passwordHash,
          updatedAt: new Date(),
        },
      });

      await tx.passwordSetupInvite.updateMany({
        where: {
          tenantId: existingUser.tenantId,
          usedAt: null,
          OR: [
            { userId: existingUser.id },
            { email: existingUser.email.trim().toLowerCase() },
          ],
        },
        data: { usedAt: new Date() },
      });

      const personnelProfile = await tx.personnel.findFirst({
        where: {
          tenantId: existingUser.tenantId,
          email: existingUser.email.trim().toLowerCase(),
        },
        select: {
          id: true,
          accessOverrides: true,
        },
      });

      if (personnelProfile?.id) {
        const currentOverrides =
          personnelProfile.accessOverrides && typeof personnelProfile.accessOverrides === 'object'
            ? (personnelProfile.accessOverrides as Record<string, unknown>)
            : {};

        await tx.personnel.update({
          where: { id: personnelProfile.id },
          data: {
            accessOverrides: {
              ...currentOverrides,
              mustChangeManualPassword: true,
            },
            updatedAt: new Date(),
          },
        });
      }
    });

    return NextResponse.json({
      ok: true,
      message: 'Manual password saved.',
      diagnostics: {
        manualPasswordSet: true,
      },
    });
  } catch (error: any) {
    console.error('Manual password update failed:', error);
    return NextResponse.json({ error: error.message || 'Internal server error.' }, { status: 500 });
  }
}
