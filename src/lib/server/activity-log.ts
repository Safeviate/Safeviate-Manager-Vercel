import { prisma } from '@/lib/prisma';
import { ensureActivityLogsSchema } from '@/lib/server/bootstrap-db';

export type ActivityLogAction = 'created' | 'updated' | 'deleted' | 'archived' | 'restored' | 'submitted' | 'approved' | 'rejected' | 'published' | 'overridden' | 'mfa_reset';

export type ActivityLogEntry = {
  tenantId: string;
  scope: string;
  action: ActivityLogAction;
  entityType: string;
  entityId: string;
  entityLabel: string;
  actorUserId?: string | null;
  actorEmail: string;
  details?: Record<string, unknown>;
};

export type ActivityLogRow = {
  id: string;
  tenantId: string;
  scope: string;
  action: ActivityLogAction;
  entityType: string;
  entityId: string;
  entityLabel: string;
  actorUserId: string | null;
  actorEmail: string;
  details: Record<string, unknown> | null;
  createdAt: string;
};

export async function recordActivityLog(
  entry: ActivityLogEntry,
  executor: Pick<typeof prisma, '$executeRawUnsafe'> = prisma
) {
  await ensureActivityLogsSchema();

  await executor.$executeRawUnsafe(
    `
      INSERT INTO activity_logs (
        id,
        tenant_id,
        scope,
        action,
        entity_type,
        entity_id,
        entity_label,
        actor_user_id,
        actor_email,
        details,
        created_at,
        updated_at
      ) VALUES (
        $1, $2, $3, $4, $5, $6, $7, $8, $9, $10::jsonb, NOW(), NOW()
      )
    `,
    crypto.randomUUID(),
    entry.tenantId,
    entry.scope,
    entry.action,
    entry.entityType,
    entry.entityId,
    entry.entityLabel,
    entry.actorUserId || null,
    entry.actorEmail,
    JSON.stringify(entry.details || {})
  );
}

export async function listActivityLogs(
  tenantId: string,
  options?: {
    scope?: string;
    action?: string;
    limit?: number;
  }
) {
  await ensureActivityLogsSchema();

  const limit = Math.max(1, Math.min(options?.limit ?? 100, 500));
  const scope = options?.scope?.trim() || null;
  const action = options?.action?.trim() || null;

  const rows = await prisma.$queryRawUnsafe<ActivityLogRow[]>(
    `
      SELECT
        id,
        tenant_id AS "tenantId",
        scope,
        action,
        entity_type AS "entityType",
        entity_id AS "entityId",
        entity_label AS "entityLabel",
        actor_user_id AS "actorUserId",
        actor_email AS "actorEmail",
        details,
        created_at AS "createdAt"
      FROM activity_logs
      WHERE tenant_id = $1
        AND ($2::text IS NULL OR scope = $2)
        AND ($3::text IS NULL OR action = $3)
      ORDER BY created_at DESC
      LIMIT $4
    `,
    tenantId,
    scope,
    action,
    limit
  );

  return rows.map((row) => ({
    ...row,
    details: row.details && typeof row.details === 'object' ? row.details : null,
  }));
}
