import { randomUUID } from 'crypto';
import { prisma } from '@/lib/prisma';
import { ensureUserSessionsSchema } from '@/lib/server/bootstrap-db';
import { recordActivityLog } from '@/lib/server/activity-log';
import { getRequestClientIp } from '@/lib/server/request-security';
import { isMasterTenantEmail } from '@/lib/server/tenant-access';

const SESSION_MAX_AGE_MS = 30 * 24 * 60 * 60 * 1000;
const LAST_SEEN_UPDATE_MS = 5 * 60 * 1000;

export type TrackedSession = {
  id: string;
  userAgent: string | null;
  ipAddress: string | null;
  createdAt: string;
  lastSeenAt: string;
  current: boolean;
};

type HeaderRequest = { headers?: Headers | Record<string, unknown> };

function getUserAgent(request?: HeaderRequest) {
  const headers = request?.headers;
  const value = headers && typeof (headers as Headers).get === 'function'
    ? (headers as Headers).get('user-agent')
    : headers && typeof (headers as Record<string, unknown>)['user-agent'] === 'string'
      ? String((headers as Record<string, unknown>)['user-agent'])
      : '';
  return value?.trim().slice(0, 512) || null;
}

function isPrivilegedUser(email: string, role: string) {
  return isMasterTenantEmail(email) || /(^|[\s_-])(admin(istrator)?|developer|owner|super\s*user)([\s_-]|$)/i.test(role);
}

async function revokeSessionIds(input: {
  tenantId: string;
  userId: string;
  sessionIds: string[];
  reason: string;
  actorEmail: string;
  actorUserId?: string | null;
}) {
  const sessionIds = [...new Set(input.sessionIds.filter(Boolean))];
  if (!sessionIds.length) return;

  await prisma.$executeRawUnsafe(
    `UPDATE user_sessions
     SET revoked_at = NOW(), revoked_reason = $1
     WHERE tenant_id = $2 AND user_id = $3 AND id = ANY($4::text[]) AND revoked_at IS NULL`,
    input.reason,
    input.tenantId,
    input.userId,
    sessionIds,
  );

  await Promise.all(sessionIds.map((sessionId) => recordActivityLog({
    tenantId: input.tenantId,
    scope: 'security',
    action: 'session_revoked',
    entityType: 'user-session',
    entityId: sessionId,
    entityLabel: 'Active device session',
    actorUserId: input.actorUserId || input.userId,
    actorEmail: input.actorEmail,
    details: { event: 'SESSION_REVOKED', reason: input.reason, targetUserId: input.userId },
  }).catch(() => undefined)));
}

export async function createTrackedSession(input: {
  userId: string;
  tenantId: string;
  email: string;
  role: string;
  request?: HeaderRequest;
}) {
  await ensureUserSessionsSchema();
  const sessionId = randomUUID();
  const maxDevices = isPrivilegedUser(input.email, input.role) ? 1 : 2;
  const now = new Date();
  const expiresAt = new Date(now.getTime() + SESSION_MAX_AGE_MS);
  const activeRows = await prisma.$queryRawUnsafe<{ id: string }[]>(
    `SELECT id FROM user_sessions
     WHERE tenant_id = $1 AND user_id = $2 AND revoked_at IS NULL AND expires_at > NOW()
     ORDER BY last_seen_at ASC, created_at ASC`,
    input.tenantId,
    input.userId,
  );
  // Make room for the new session by revoking the oldest active devices first.
  const toRevoke = activeRows
    .slice(0, Math.max(0, activeRows.length - maxDevices + 1))
    .map((row) => row.id);

  if (toRevoke.length) {
    await revokeSessionIds({
      tenantId: input.tenantId,
      userId: input.userId,
      sessionIds: toRevoke,
      reason: 'device_limit',
      actorEmail: input.email,
    });
  }

  await prisma.$executeRawUnsafe(
    `INSERT INTO user_sessions (id, tenant_id, user_id, email, role_at_login, user_agent, ip_address, created_at, last_seen_at, expires_at)
     VALUES ($1, $2, $3, $4, $5, $6, $7, NOW(), NOW(), $8)`,
    sessionId,
    input.tenantId,
    input.userId,
    input.email,
    input.role,
    getUserAgent(input.request),
    input.request ? getRequestClientIp(input.request) : null,
    expiresAt,
  );
  await recordActivityLog({
    tenantId: input.tenantId,
    scope: 'security',
    action: 'session_created',
    entityType: 'user-session',
    entityId: sessionId,
    entityLabel: 'Active device session',
    actorUserId: input.userId,
    actorEmail: input.email,
    details: { event: 'SESSION_CREATED', deviceLimit: maxDevices, sourceIp: input.request ? getRequestClientIp(input.request) : 'unknown' },
  }).catch(() => undefined);

  return sessionId;
}

export async function isTrackedSessionActive(input: { sessionId?: string; userId?: string; tenantId?: string }) {
  if (!input.sessionId || !input.userId || !input.tenantId) return false;
  await ensureUserSessionsSchema();
  const rows = await prisma.$queryRawUnsafe<{ lastSeenAt: Date }[]>(
    `SELECT last_seen_at AS "lastSeenAt" FROM user_sessions
     WHERE id = $1 AND user_id = $2 AND tenant_id = $3 AND revoked_at IS NULL AND expires_at > NOW()`,
    input.sessionId,
    input.userId,
    input.tenantId,
  );
  if (!rows.length) return false;
  if (Date.now() - new Date(rows[0].lastSeenAt).getTime() >= LAST_SEEN_UPDATE_MS) {
    await prisma.$executeRawUnsafe('UPDATE user_sessions SET last_seen_at = NOW() WHERE id = $1', input.sessionId).catch(() => undefined);
  }
  return true;
}

export async function revokeUserSessions(input: {
  tenantId: string;
  userId: string;
  reason: string;
  actorEmail: string;
  actorUserId?: string | null;
  excludeSessionId?: string;
}) {
  await ensureUserSessionsSchema();
  const rows = await prisma.$queryRawUnsafe<{ id: string }[]>(
    `SELECT id FROM user_sessions
     WHERE tenant_id = $1 AND user_id = $2 AND revoked_at IS NULL AND expires_at > NOW()
       AND ($3::text IS NULL OR id <> $3)`,
    input.tenantId,
    input.userId,
    input.excludeSessionId || null,
  );
  await revokeSessionIds({ ...input, sessionIds: rows.map((row) => row.id) });
}

export async function listTrackedSessions(input: { tenantId: string; userId: string; currentSessionId?: string }) {
  await ensureUserSessionsSchema();
  const rows = await prisma.$queryRawUnsafe<Array<Omit<TrackedSession, 'current'>>>(
    `SELECT id, user_agent AS "userAgent", ip_address AS "ipAddress", created_at AS "createdAt", last_seen_at AS "lastSeenAt"
     FROM user_sessions
     WHERE tenant_id = $1 AND user_id = $2 AND revoked_at IS NULL AND expires_at > NOW()
     ORDER BY last_seen_at DESC`,
    input.tenantId,
    input.userId,
  );
  return rows.map((row) => ({
    ...row,
    createdAt: new Date(row.createdAt).toISOString(),
    lastSeenAt: new Date(row.lastSeenAt).toISOString(),
    current: row.id === input.currentSessionId,
  }));
}

export async function revokeTrackedSession(input: {
  tenantId: string;
  userId: string;
  sessionId: string;
  reason: string;
  actorEmail: string;
  actorUserId?: string | null;
}) {
  await ensureUserSessionsSchema();
  await revokeSessionIds({ ...input, sessionIds: [input.sessionId] });
}
