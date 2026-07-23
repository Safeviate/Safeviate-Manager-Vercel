import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/auth';
import { listTrackedSessions, revokeTrackedSession, revokeUserSessions } from '@/lib/server/user-sessions';

async function getCurrentUser() {
  const session = await getServerSession(authOptions);
  const userId = session?.user?.id;
  const tenantId = session?.user?.tenantId;
  const email = session?.user?.email?.trim().toLowerCase();
  if (!userId || !tenantId || !email) return null;
  return { userId, tenantId, email, sessionId: session.user?.sessionId };
}

export async function GET() {
  const currentUser = await getCurrentUser();
  if (!currentUser) return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 });

  const sessions = await listTrackedSessions({
    tenantId: currentUser.tenantId,
    userId: currentUser.userId,
    currentSessionId: currentUser.sessionId,
  });
  return NextResponse.json({ sessions });
}

export async function POST(request: Request) {
  const currentUser = await getCurrentUser();
  if (!currentUser) return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 });

  const body = await request.json().catch(() => null);
  const action = String(body?.action || '');
  if (action === 'revoke-others') {
    await revokeUserSessions({
      tenantId: currentUser.tenantId,
      userId: currentUser.userId,
      excludeSessionId: currentUser.sessionId,
      reason: 'user_revoked_other_devices',
      actorUserId: currentUser.userId,
      actorEmail: currentUser.email,
    });
    return NextResponse.json({ ok: true });
  }

  const sessionId = String(body?.sessionId || '').trim();
  if (action !== 'revoke' || !sessionId) {
    return NextResponse.json({ error: 'A session to revoke is required.' }, { status: 400 });
  }

  await revokeTrackedSession({
    tenantId: currentUser.tenantId,
    userId: currentUser.userId,
    sessionId,
    reason: 'user_revoked_device',
    actorUserId: currentUser.userId,
    actorEmail: currentUser.email,
  });
  return NextResponse.json({ ok: true, currentSessionRevoked: sessionId === currentUser.sessionId });
}
