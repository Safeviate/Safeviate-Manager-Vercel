import { NextResponse } from 'next/server';
import { authenticateAiRequest } from '@/lib/server/ai-auth';
import { prisma } from '@/lib/prisma';

export async function POST(request: Request) {
  try {
    const authResult = await authenticateAiRequest();
    if (!authResult.ok) {
      return NextResponse.json({ error: authResult.error }, { status: authResult.status });
    }

    if (!authResult.effectivePermissions.has('users-edit') && authResult.userProfile.role?.toLowerCase() !== 'developer') {
      return NextResponse.json({ error: 'Unauthorized to update account status.' }, { status: 403 });
    }

    const body = await request.json().catch(() => null);
    const userId = String(body?.userId || '').trim();
    const email = String(body?.email || '').trim().toLowerCase();
    const suspended = Boolean(body?.suspended);
    const tenantId = String(body?.tenantId || authResult.tenantId || 'safeviate');
    if (!userId && !email) {
      return NextResponse.json({ error: 'User id or email is required.' }, { status: 400 });
    }

    const existingUser = userId
      ? await prisma.user.findFirst({ where: { id: userId, tenantId } })
      : await prisma.user.findFirst({ where: { email, tenantId } });

    if (!existingUser) {
      return NextResponse.json({ error: 'User not found.' }, { status: 404 });
    }

    await prisma.user.update({
      where: { id: existingUser.id },
      data: {
        suspendedAt: suspended ? new Date() : null,
        updatedAt: new Date(),
      },
    });

    return NextResponse.json({
      ok: true,
      suspended,
      message: suspended ? 'Account suspended.' : 'Account unsuspended.',
    });
  } catch (error: any) {
    console.error('Account suspension update failed:', error);
    return NextResponse.json({ error: error.message || 'Internal server error.' }, { status: 500 });
  }
}
