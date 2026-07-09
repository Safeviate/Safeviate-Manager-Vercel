import { authOptions } from '@/auth';
import { prisma } from '@/lib/prisma';
import { recordActivityLog } from '@/lib/server/activity-log';
import { getTenantIdFromSession } from '@/lib/server/session-tenant';
import { getServerSession } from 'next-auth';
import { NextResponse } from 'next/server';
import type { AuditScheduleItem } from '@/types/quality';

const AUDIT_SCHEDULE_SCOPE = 'audit-schedule';

type SessionContext = {
  tenantId: string | null;
  actorUserId: string | null;
  actorEmail: string | null;
};

async function getSessionContext(request: Request): Promise<SessionContext> {
  const session = await getServerSession(authOptions);
  const actorEmail = session?.user?.email?.trim().toLowerCase() || null;
  const actorUserId = session?.user?.id?.trim() || null;

  if (!actorEmail) {
    return { tenantId: null, actorUserId, actorEmail };
  }

  const tenantId = (await getTenantIdFromSession(request)) || session?.user?.tenantId?.trim() || null;

  return {
    tenantId,
    actorUserId,
    actorEmail,
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
    });
  } catch (error) {
    console.error('[audit-schedule] returning empty tenant schedule:', error);
    return NextResponse.json({ areas: [], items: [] }, { status: 200 });
  }
}

export async function POST(request: Request) {
  const { tenantId, actorUserId, actorEmail } = await getSessionContext(request);
  if (!tenantId || !actorEmail) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const body = await request.json().catch(() => null);
  const areas = toAuditAreas(body?.areas);
  const items = toAuditItems(body?.items);
  const config = await getConfig(tenantId);
  const next = {
    ...config,
    'audit-areas': areas,
    'audit-schedule-items': items,
  };

  await prisma.$executeRawUnsafe(
    `INSERT INTO tenant_configs (tenant_id, data, created_at, updated_at) VALUES ($1, $2::jsonb, NOW(), NOW()) ON CONFLICT (tenant_id) DO UPDATE SET data = EXCLUDED.data, updated_at = NOW()`,
    tenantId,
    JSON.stringify(next)
  );

  try {
    const changes = diffAuditSchedule(config, areas, items);
    if (changes.addedAreas.length || changes.removedAreas.length || changes.itemLogs.length) {
      await writeAuditScheduleActivityLogs(tenantId, actorUserId, actorEmail, changes);
    }
  } catch (error) {
    console.error('[audit-schedule] failed to write activity logs:', error);
  }

  return NextResponse.json({ areas, items }, { status: 200 });
}
