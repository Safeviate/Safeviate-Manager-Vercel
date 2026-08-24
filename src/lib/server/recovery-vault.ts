import { prisma } from '@/lib/prisma';
import { ensureRecoveryArchivesSchema } from '@/lib/server/bootstrap-db';

export type RecoveryEntityType =
  | 'safety-report'
  | 'quality-audit'
  | 'personnel-account'
  | 'aircraft'
  | 'audit-checklist'
  | 'audit-schedule-area'
  | 'checklist-schedule-area'
  | 'task-schedule-area'
  | 'audit-schedule-item';

type RecoveryExecutor = Pick<typeof prisma, '$executeRawUnsafe'>;

export type RecoveryArchiveEntry = {
  tenantId: string;
  entityType: RecoveryEntityType;
  entityId: string;
  entityLabel: string;
  snapshot: Record<string, unknown>;
  actorUserId?: string | null;
  actorEmail: string;
};

export type RecoveryArchiveRow = {
  id: string;
  tenantId: string;
  entityType: RecoveryEntityType;
  entityId: string;
  entityLabel: string;
  snapshot: Record<string, unknown>;
  archivedByUserId: string | null;
  archivedByEmail: string;
  archivedAt: string;
  restoredByUserId: string | null;
  restoredByEmail: string | null;
  restoredAt: string | null;
  status: 'archived' | 'restored';
};

export async function recordRecoveryArchive(entry: RecoveryArchiveEntry, executor: RecoveryExecutor = prisma) {
  await ensureRecoveryArchivesSchema();
  const id = crypto.randomUUID();
  await executor.$executeRawUnsafe(
    `INSERT INTO recovery_archives (
      id, tenant_id, entity_type, entity_id, entity_label, snapshot,
      archived_by_user_id, archived_by_email, status, created_at, updated_at
    ) VALUES ($1, $2, $3, $4, $5, $6::jsonb, $7, $8, 'archived', NOW(), NOW())`,
    id,
    entry.tenantId,
    entry.entityType,
    entry.entityId,
    entry.entityLabel,
    JSON.stringify(entry.snapshot),
    entry.actorUserId || null,
    entry.actorEmail,
  );
  return id;
}

export async function listRecoveryArchives(options?: { tenantId?: string; limit?: number }) {
  await ensureRecoveryArchivesSchema();
  const limit = Math.max(1, Math.min(options?.limit ?? 200, 500));
  const rows = await prisma.$queryRawUnsafe<RecoveryArchiveRow[]>(
    `SELECT
      id,
      tenant_id AS "tenantId",
      entity_type AS "entityType",
      entity_id AS "entityId",
      entity_label AS "entityLabel",
      snapshot,
      archived_by_user_id AS "archivedByUserId",
      archived_by_email AS "archivedByEmail",
      archived_at AS "archivedAt",
      restored_by_user_id AS "restoredByUserId",
      restored_by_email AS "restoredByEmail",
      restored_at AS "restoredAt",
      status
    FROM recovery_archives
    WHERE ($1::text IS NULL OR tenant_id = $1)
    ORDER BY archived_at DESC
    LIMIT $2`,
    options?.tenantId || null,
    limit,
  );
  return rows;
}

export async function markRecoveryArchiveRestored(
  id: string,
  actor: { userId?: string | null; email: string }
) {
  await ensureRecoveryArchivesSchema();
  await prisma.$executeRawUnsafe(
    `UPDATE recovery_archives
     SET status = 'restored', restored_by_user_id = $2, restored_by_email = $3,
         restored_at = NOW(), updated_at = NOW()
     WHERE id = $1 AND status = 'archived'`,
    id,
    actor.userId || null,
    actor.email,
  );
}

export async function markRecoveryArchivesRestoredForEntity(
  entry: Pick<RecoveryArchiveEntry, 'tenantId' | 'entityType' | 'entityId'>,
  actor: { userId?: string | null; email: string },
  executor: RecoveryExecutor = prisma,
) {
  await ensureRecoveryArchivesSchema();
  await executor.$executeRawUnsafe(
    `UPDATE recovery_archives
     SET status = 'restored', restored_by_user_id = $4, restored_by_email = $5,
         restored_at = NOW(), updated_at = NOW()
     WHERE tenant_id = $1 AND entity_type = $2 AND entity_id = $3 AND status = 'archived'`,
    entry.tenantId,
    entry.entityType,
    entry.entityId,
    actor.userId || null,
    actor.email,
  );
}
