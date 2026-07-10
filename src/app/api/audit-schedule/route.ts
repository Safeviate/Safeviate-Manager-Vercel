import { authOptions } from '@/auth';
import { hasHierarchicalPermission, normalizePermissionIds } from '@/lib/permission-model';
import { prisma } from '@/lib/prisma';
import { recordActivityLog } from '@/lib/server/activity-log';
import { getTenantIdFromSession } from '@/lib/server/session-tenant';
import { isMasterTenantEmail } from '@/lib/server/tenant-access';
import { markRecoveryArchivesRestoredForEntity, recordRecoveryArchive } from '@/lib/server/recovery-vault';
import { getServerSession } from 'next-auth';
import { NextResponse } from 'next/server';
import type { AuditScheduleItem } from '@/types/quality';

const AUDIT_SCHEDULE_SCOPE = 'audit-schedule';

type SessionContext = {
  tenantId: string | null;
  actorUserId: string | null;
  actorEmail: string | null;
  canCreate: boolean;
  canEdit: boolean;
  canDelete: boolean;
};

async function getSessionContext(request: Request): Promise<SessionContext> {
  const session = await getServerSession(authOptions);
  const actorEmail = session?.user?.email?.trim().toLowerCase() || null;
  const actorUserId = session?.user?.id?.trim() || null;

  if (!actorEmail) {
    return { tenantId: null, actorUserId, actorEmail, canCreate: false, canEdit: false, canDelete: false };
  }

  const tenantId = (await getTenantIdFromSession(request)) || session?.user?.tenantId?.trim() || null;

  if (!tenantId) {
    return { tenantId: null, actorUserId, actorEmail, canCreate: false, canEdit: false, canDelete: false };
  }

  if (isMasterTenantEmail(actorEmail) || session?.user?.role?.trim().toLowerCase() === 'developer' || session?.user?.role?.trim().toLowerCase() === 'dev') {
    return { tenantId, actorUserId, actorEmail, canCreate: true, canEdit: true, canDelete: true };
  }

  const personnelProfile = await prisma.personnel.findFirst({
    where: {
      tenantId,
      email: actorEmail,
    },
    select: { permissions: true, role: true },
  }).catch(() => null);

  const roleId = personnelProfile?.role?.trim() || session?.user?.role?.trim() || '';
  const role = roleId
    ? await prisma.role.findFirst({
        where: {
          tenantId,
          OR: [
            { id: roleId },
            { name: roleId },
          ],
        },
        select: { permissions: true },
      }).catch(() => null)
    : null;

  const inheritedPermissions = Array.isArray(role?.permissions) ? role.permissions.filter((permission): permission is string => typeof permission === 'string') : [];
  const overridePermissions = Array.isArray(personnelProfile?.permissions) ? personnelProfile.permissions.filter((permission): permission is string => typeof permission === 'string') : [];
  const deniedPermissions = new Set(
    normalizePermissionIds(overridePermissions.filter((permission) => permission.startsWith('!')).map((permission) => permission.slice(1)))
  );
  const grantedPermissions = new Set<string>();

  normalizePermissionIds(inheritedPermissions).forEach((permission) => {
    if (!deniedPermissions.has(permission)) {
      grantedPermissions.add(permission);
    }
  });

  normalizePermissionIds(overridePermissions.filter((permission) => !permission.startsWith('!'))).forEach((permission) => {
    grantedPermissions.add(permission);
  });

  const canCreate = grantedPermissions.has('*')
    || hasHierarchicalPermission(grantedPermissions, 'quality-audit-schedule-create', deniedPermissions);
  const canEdit = grantedPermissions.has('*')
    || hasHierarchicalPermission(grantedPermissions, 'quality-audit-schedule-edit', deniedPermissions);
  const canDelete = grantedPermissions.has('*')
    || hasHierarchicalPermission(grantedPermissions, 'quality-audit-schedule-delete', deniedPermissions);

  return {
    tenantId,
    actorUserId,
    actorEmail,
    canCreate,
    canEdit,
    canDelete,
  };
}

async function getConfig(tenantId: string) {
  const rows = await prisma.$queryRawUnsafe<{ data: unknown }[]>(
    `SELECT data FROM tenant_configs WHERE tenant_id = $1 LIMIT 1`,
    tenantId
  );
  return (rows[0]?.data as Record<string, unknown>) || {};
}

function toAuditAreas(value: unknown) {
  return Array.isArray(value)
    ? value
        .filter((area): area is string => typeof area === 'string')
        .map((area) => area.trim())
        .filter(Boolean)
    : [];
}

function toAuditItems(value: unknown) {
  return Array.isArray(value)
    ? value
        .filter((item): item is AuditScheduleItem => Boolean(item) && typeof item === 'object')
        .map((item) => ({
          ...item,
          id: typeof item.id === 'string' && item.id.trim() ? item.id.trim() : crypto.randomUUID(),
          area: typeof item.area === 'string' ? item.area.trim() : '',
          month: typeof item.month === 'string' ? item.month.trim() : '',
          year: Number.isFinite(Number(item.year)) ? Number(item.year) : new Date().getFullYear(),
          status:
            item.status === 'Scheduled' ||
            item.status === 'Completed' ||
            item.status === 'Pending' ||
            item.status === 'Not Scheduled'
              ? item.status
              : 'Not Scheduled',
        }))
        .filter((item) => item.area && item.month)
    : [];
}

function summariseAreaChange(area: string) {
  return `Audit area "${area}"`;
}

function summariseItem(item: AuditScheduleItem) {
  return `${item.area} · ${item.month} ${item.year}`;
}

type AuditScheduleChangeLogEntry =
  | {
      action: 'created' | 'deleted';
      entityType: string;
      entityId: string;
      entityLabel: string;
      details: Record<string, unknown>;
    }
  | {
      action: 'updated';
      entityType: string;
      entityId: string;
      entityLabel: string;
      details: {
        before: Record<string, unknown>;
        after: Record<string, unknown>;
      };
    };

function diffAuditSchedule(
  oldConfig: Record<string, unknown>,
  nextAreas: string[],
  nextItems: AuditScheduleItem[]
) {
  const oldAreas = toAuditAreas(oldConfig['audit-areas']);
  const oldItems = toAuditItems(oldConfig['audit-schedule-items']);

  const oldAreaSet = new Set(oldAreas);
  const nextAreaSet = new Set(nextAreas);

  const addedAreas = nextAreas.filter((area) => !oldAreaSet.has(area));
  const removedAreas = oldAreas.filter((area) => !nextAreaSet.has(area));

  const oldItemMap = new Map(oldItems.map((item) => [item.id, item]));
  const nextItemMap = new Map(nextItems.map((item) => [item.id, item]));

  const itemLogs: AuditScheduleChangeLogEntry[] = [
    ...nextItems
      .filter((item) => !oldItemMap.has(item.id))
      .map(
        (item) =>
          ({
            action: 'created',
            entityType: 'schedule-item',
            entityId: item.id,
            entityLabel: summariseItem(item),
            details: {
              month: item.month,
              year: item.year,
              area: item.area,
              status: item.status,
            },
          }) satisfies AuditScheduleChangeLogEntry
      ),
    ...oldItems
      .filter((item) => !nextItemMap.has(item.id))
      .map(
        (item) =>
          ({
            action: 'deleted',
            entityType: 'schedule-item',
            entityId: item.id,
            entityLabel: summariseItem(item),
            details: {
              month: item.month,
              year: item.year,
              area: item.area,
              status: item.status,
            },
          }) satisfies AuditScheduleChangeLogEntry
      ),
    ...nextItems
      .filter((item) => {
        const before = oldItemMap.get(item.id);
        if (!before) return false;
        return (
          before.area !== item.area ||
          before.month !== item.month ||
          before.year !== item.year ||
          before.status !== item.status
        );
      })
      .map(
        (item) =>
          ({
            action: 'updated',
            entityType: 'schedule-item',
            entityId: item.id,
            entityLabel: summariseItem(item),
            details: {
              before: {
                area: oldItemMap.get(item.id)!.area,
                month: oldItemMap.get(item.id)!.month,
                year: oldItemMap.get(item.id)!.year,
                status: oldItemMap.get(item.id)!.status,
              },
              after: {
                area: item.area,
                month: item.month,
                year: item.year,
                status: item.status,
              },
            },
          }) satisfies AuditScheduleChangeLogEntry
      ),
  ];

  return {
    addedAreas,
    removedAreas,
    itemLogs,
  };
}

async function writeAuditScheduleActivityLogs(
  tenantId: string,
  actorUserId: string | null,
  actorEmail: string,
  changes: ReturnType<typeof diffAuditSchedule>
) {
  const entries: AuditScheduleChangeLogEntry[] = [
    ...changes.addedAreas.map((area) => ({
      action: 'created' as const,
      entityType: 'audit-area',
      entityId: area,
      entityLabel: summariseAreaChange(area),
      details: { area },
    })),
    ...changes.removedAreas.map((area) => ({
      action: 'deleted' as const,
      entityType: 'audit-area',
      entityId: area,
      entityLabel: summariseAreaChange(area),
      details: { area },
    })),
    ...changes.itemLogs,
  ];

  await Promise.allSettled(
    entries.map((entry) =>
      recordActivityLog({
        tenantId,
        scope: AUDIT_SCHEDULE_SCOPE,
        action: entry.action,
        entityType: entry.entityType,
        entityId: entry.entityId,
        entityLabel: entry.entityLabel,
        actorUserId,
        actorEmail,
        details: entry.details,
      })
    )
  );
}

async function archiveRemovedScheduleEntries(
  tenantId: string,
  actorUserId: string | null,
  actorEmail: string,
  oldConfig: Record<string, unknown>,
  changes: ReturnType<typeof diffAuditSchedule>,
  executor: Pick<typeof prisma, '$executeRawUnsafe'>
) {
  const oldItems = toAuditItems(oldConfig['audit-schedule-items']);
  const removedItems = oldItems.filter((item) => changes.itemLogs.some((entry) => entry.action === 'deleted' && entry.entityId === item.id));

  await Promise.all([
    ...changes.removedAreas.map((area) =>
      recordRecoveryArchive({
        tenantId,
        entityType: 'audit-schedule-area',
        entityId: area,
        entityLabel: summariseAreaChange(area),
        snapshot: { area, items: oldItems.filter((item) => item.area === area) },
        actorUserId,
        actorEmail,
      }, executor)
    ),
    ...removedItems.map((item) =>
      recordRecoveryArchive({
        tenantId,
        entityType: 'audit-schedule-item',
        entityId: item.id,
        entityLabel: summariseItem(item),
        snapshot: { item },
        actorUserId,
        actorEmail,
      }, executor)
    ),
  ]);
}

export async function GET(request: Request) {
  try {
    const { tenantId } = await getSessionContext(request);
    if (!tenantId) {
      return NextResponse.json({ areas: [], items: [] }, { status: 200 });
    }

    const config = await getConfig(tenantId);
    return NextResponse.json({
      areas: Array.isArray(config['audit-areas']) ? config['audit-areas'] : [],
      items: Array.isArray(config['audit-schedule-items']) ? config['audit-schedule-items'] : [],
      archivedAreas: Array.isArray(config['archived-audit-areas']) ? config['archived-audit-areas'] : [],
      archivedItems: Array.isArray(config['archived-audit-schedule-items']) ? config['archived-audit-schedule-items'] : [],
    });
  } catch (error) {
    console.error('[audit-schedule] returning empty tenant schedule:', error);
    return NextResponse.json({ areas: [], items: [] }, { status: 200 });
  }
}

export async function POST(request: Request) {
  const { tenantId, actorUserId, actorEmail, canCreate, canEdit, canDelete } = await getSessionContext(request);
  if (!tenantId || !actorEmail) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  if (!canCreate && !canEdit && !canDelete) {
    return NextResponse.json({ error: 'You do not have permission to change the audit schedule.' }, { status: 403 });
  }

  const body = await request.json().catch(() => null);
  const areas = toAuditAreas(body?.areas);
  const items = toAuditItems(body?.items);
  const config = await getConfig(tenantId);
  const archivedAreas = toAuditAreas(body?.archivedAreas ?? config['archived-audit-areas']);
  const archivedItems = toAuditItems(body?.archivedItems ?? config['archived-audit-schedule-items']);
  const changes = diffAuditSchedule(config, areas, items);

  const hasCreatedItems = changes.itemLogs.some((entry) => entry.action === 'created');
  const hasUpdatedItems = changes.itemLogs.some((entry) => entry.action === 'updated');
  const hasDeletedItems = changes.itemLogs.some((entry) => entry.action === 'deleted');

  if ((changes.addedAreas.length > 0 || hasCreatedItems) && !canCreate) {
    return NextResponse.json({ error: 'You do not have permission to create audit schedule entries.' }, { status: 403 });
  }

  if (hasUpdatedItems && !canEdit) {
    return NextResponse.json({ error: 'You do not have permission to edit audit schedule entries.' }, { status: 403 });
  }

  if ((changes.removedAreas.length > 0 || hasDeletedItems) && !canDelete) {
    return NextResponse.json({ error: 'You do not have permission to delete audit schedule areas.' }, { status: 403 });
  }

  const previouslyArchivedAreas = toAuditAreas(config['archived-audit-areas']);
  const previouslyArchivedItems = toAuditItems(config['archived-audit-schedule-items']);
  const oldItems = toAuditItems(config['audit-schedule-items']);
  const removedItems = oldItems.filter((item) => changes.itemLogs.some((entry) => entry.action === 'deleted' && entry.entityId === item.id));
  const nextArchivedAreas = Array.from(new Set([...previouslyArchivedAreas, ...archivedAreas, ...changes.removedAreas]));
  const nextArchivedItemMap = new Map([...previouslyArchivedItems, ...archivedItems, ...removedItems].map((item) => [item.id, item]));
  const restoredAreaSet = new Set(areas);
  const restoredItemSet = new Set(items.map((item) => item.id));
  const restoredAreas = previouslyArchivedAreas.filter((area) => restoredAreaSet.has(area));
  const restoredItems = previouslyArchivedItems.filter((item) => restoredItemSet.has(item.id));
  const next = {
    ...config,
    'audit-areas': areas,
    'audit-schedule-items': items,
    'archived-audit-areas': nextArchivedAreas.filter((area) => !restoredAreaSet.has(area)),
    'archived-audit-schedule-items': Array.from(nextArchivedItemMap.values()).filter((item) => !restoredItemSet.has(item.id)),
  };

  await prisma.$transaction(async (tx) => {
    await archiveRemovedScheduleEntries(tenantId, actorUserId, actorEmail, config, changes, tx);
    await tx.$executeRawUnsafe(
      `INSERT INTO tenant_configs (tenant_id, data, created_at, updated_at) VALUES ($1, $2::jsonb, NOW(), NOW()) ON CONFLICT (tenant_id) DO UPDATE SET data = EXCLUDED.data, updated_at = NOW()`,
      tenantId,
      JSON.stringify(next)
    );
    await Promise.all([
      ...restoredAreas.map((area) => markRecoveryArchivesRestoredForEntity(
        { tenantId, entityType: 'audit-schedule-area', entityId: area },
        { userId: actorUserId, email: actorEmail },
        tx,
      )),
      ...restoredItems.map((item) => markRecoveryArchivesRestoredForEntity(
        { tenantId, entityType: 'audit-schedule-item', entityId: item.id },
        { userId: actorUserId, email: actorEmail },
        tx,
      )),
    ]);
  });

  try {
    if (changes.addedAreas.length || changes.removedAreas.length || changes.itemLogs.length) {
      await writeAuditScheduleActivityLogs(tenantId, actorUserId, actorEmail, changes);
    }
  } catch (error) {
    console.error('[audit-schedule] failed to write activity logs:', error);
  }

  return NextResponse.json({
    areas,
    items,
    archivedAreas: next['archived-audit-areas'],
    archivedItems: next['archived-audit-schedule-items'],
  }, { status: 200 });
}
