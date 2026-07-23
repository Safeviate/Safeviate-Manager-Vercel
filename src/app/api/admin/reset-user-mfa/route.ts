import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/auth';
import { authenticateAiRequest } from '@/lib/server/ai-auth';
import { recordActivityLog } from '@/lib/server/activity-log';
import { getRequestClientIp, enforceRateLimit } from '@/lib/server/request-security';
import { isMasterTenantEmail } from '@/lib/server/tenant-access';
import { hasHierarchicalPermission } from '@/lib/permission-model';
import { prisma } from '@/lib/prisma';
import { revokeUserSessions } from '@/lib/server/user-sessions';

const MFA_SECURITY_SCOPE = 'security';

export async function POST(request: Request) {
  const sourceIp = getRequestClientIp(request);
  const authResult = await authenticateAiRequest(request);

  if (!authResult.ok) {
    return NextResponse.json({ error: authResult.error }, { status: authResult.status });
  }

  const session = await getServerSession(authOptions);
  const actorEmail = session?.user?.email?.trim().toLowerCase() || 'unknown';
  const actorIsMasterSupport = isMasterTenantEmail(actorEmail);
  const canResetMfa = actorIsMasterSupport || hasHierarchicalPermission(
    authResult.effectivePermissions,
    'users-reset-mfa',
    authResult.deniedPermissions
  );

  const body = await request.json().catch(() => null);
  const userId = String(body?.userId || '').trim();
  const requestedTenantId = String(body?.tenantId || authResult.tenantId || '').trim();

  const rateLimit = enforceRateLimit({
    request,
    key: 'admin-reset-user-mfa',
    limit: 8,
    identity: authResult.userProfile.id,
  });
  if (rateLimit) {
    return NextResponse.json(
      { error: rateLimit.message },
      { status: 429, headers: { 'Retry-After': String(rateLimit.retryAfterSeconds) } }
    );
  }

  if (!userId || !requestedTenantId) {
    return NextResponse.json({ error: 'A user and tenant are required.' }, { status: 400 });
  }

  if (!canResetMfa) {
    await recordActivityLog({
      tenantId: requestedTenantId,
      scope: MFA_SECURITY_SCOPE,
      action: 'mfa_reset',
      entityType: 'user-mfa',
      entityId: userId,
      entityLabel: userId,
      actorUserId: authResult.userProfile.id,
      actorEmail,
      details: { event: 'MFA_RESET', outcome: 'denied', sourceIp, reason: 'missing_permission' },
    }).catch(() => undefined);
    return NextResponse.json({ error: 'Unauthorized to reset MFA.' }, { status: 403 });
  }

  if (!actorIsMasterSupport && requestedTenantId !== authResult.tenantId) {
    await recordActivityLog({
      tenantId: requestedTenantId,
      scope: MFA_SECURITY_SCOPE,
      action: 'mfa_reset',
      entityType: 'user-mfa',
      entityId: userId,
      entityLabel: userId,
      actorUserId: authResult.userProfile.id,
      actorEmail,
      details: { event: 'MFA_RESET', outcome: 'denied', sourceIp, reason: 'cross_tenant_attempt' },
    }).catch(() => undefined);
    return NextResponse.json({ error: 'You can only reset MFA for users in your current tenant.' }, { status: 403 });
  }

  const targetUser = await prisma.user.findFirst({
    where: { id: userId, tenantId: requestedTenantId },
    select: { id: true, email: true, firstName: true, lastName: true, tenantId: true },
  });

  if (!targetUser) {
    await recordActivityLog({
      tenantId: requestedTenantId,
      scope: MFA_SECURITY_SCOPE,
      action: 'mfa_reset',
      entityType: 'user-mfa',
      entityId: userId,
      entityLabel: userId,
      actorUserId: authResult.userProfile.id,
      actorEmail,
      details: { event: 'MFA_RESET', outcome: 'failed', sourceIp, reason: 'target_not_found' },
    }).catch(() => undefined);
    return NextResponse.json({ error: 'User not found in this tenant.' }, { status: 404 });
  }

  const targetLabel = [targetUser.firstName, targetUser.lastName].filter(Boolean).join(' ') || targetUser.email;

  await prisma.$transaction(async (tx) => {
    await tx.user.update({
      where: { id: targetUser.id },
      data: {
        mfaSecretEncrypted: null,
        mfaPendingSecretEncrypted: null,
        mfaPendingExpiresAt: null,
        mfaEnabledAt: null,
        mfaRecoveryCodeHashes: [],
        updatedAt: new Date(),
      },
    });

    await recordActivityLog(
      {
        tenantId: targetUser.tenantId,
        scope: MFA_SECURITY_SCOPE,
        action: 'mfa_reset',
        entityType: 'user-mfa',
        entityId: targetUser.id,
        entityLabel: targetLabel,
        actorUserId: authResult.userProfile.id,
        actorEmail,
        details: {
          event: 'MFA_RESET',
          outcome: 'success',
          targetEmail: targetUser.email,
          sourceIp,
        },
      },
      tx
    );
  });

  await revokeUserSessions({
    tenantId: targetUser.tenantId,
    userId: targetUser.id,
    reason: 'mfa_reset',
    actorUserId: authResult.userProfile.id,
    actorEmail,
  });

  return NextResponse.json({
    ok: true,
    message: `${targetLabel}'s MFA setup was reset. They must enroll again at their next sign-in.`,
  });
}
