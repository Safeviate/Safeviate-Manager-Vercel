import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { hash } from 'bcryptjs';
import { authOptions } from '@/auth';
import { prisma } from '@/lib/prisma';
import { Prisma } from '@/generated/prisma/client';
import { enforceRateLimit } from '@/lib/server/request-security';

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    const email = session?.user?.email?.trim().toLowerCase();

    if (!email) {
      return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 });
    }

    const rateLimit = enforceRateLimit({
      request,
      key: 'auth-change-password',
      limit: 10,
      identity: email,
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

    const body = await request.json().catch(() => null);
    const password = String(body?.password || '');
    const confirmPassword = String(body?.confirmPassword || '');

    if (!password || password.length < 8) {
      return NextResponse.json({ error: 'Password must be at least 8 characters long.' }, { status: 400 });
    }

    if (password !== confirmPassword) {
      return NextResponse.json({ error: 'Passwords do not match.' }, { status: 400 });
    }

    const existingUser = await prisma.user.findUnique({
      where: { email },
      select: {
        id: true,
        tenantId: true,
        email: true,
      },
    });

    if (!existingUser) {
      return NextResponse.json({ error: 'User not found.' }, { status: 404 });
    }

    const nextPasswordHash = await hash(password, 12);

    await prisma.$transaction(async (tx) => {
      await tx.user.update({
        where: { id: existingUser.id },
        data: {
          passwordHash: nextPasswordHash,
          updatedAt: new Date(),
        },
      });

      const personnelProfile = await tx.personnel.findFirst({
        where: {
          tenantId: existingUser.tenantId,
          email,
        },
        select: {
          id: true,
          accessOverrides: true,
        },
      });

      if (personnelProfile?.id) {
        const currentOverrides =
          personnelProfile.accessOverrides && typeof personnelProfile.accessOverrides === 'object'
            ? ({ ...(personnelProfile.accessOverrides as Record<string, unknown>) })
            : {};

        delete currentOverrides.mustChangeManualPassword;

        await tx.personnel.update({
          where: { id: personnelProfile.id },
          data: {
            accessOverrides: Object.keys(currentOverrides).length > 0 ? currentOverrides : Prisma.JsonNull,
            updatedAt: new Date(),
          },
        });
      }
    });

    return NextResponse.json({ ok: true });
  } catch (error: any) {
    console.error('Change password failed:', error);
    return NextResponse.json({ error: error.message || 'Internal server error.' }, { status: 500 });
  }
}
