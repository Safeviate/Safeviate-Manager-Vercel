import { authOptions } from '@/auth';
import { hasHierarchicalPermission, normalizePermissionIds } from '@/lib/permission-model';
import { prisma } from '@/lib/prisma';
import { recordActivityLog, type ActivityLogAction } from '@/lib/server/activity-log';
import { ensureActivityLogsSchema } from '@/lib/server/bootstrap-db';
import { getTenantIdFromSession } from '@/lib/server/session-tenant';
import { isMasterTenantEmail } from '@/lib/server/tenant-access';
import { markRecoveryArchivesRestoredForEntity, recordRecoveryArchive, type RecoveryEntityType } from '@/lib/server/recovery-vault';
import { getServerSession } from 'next-auth';
import { NextResponse } from 'next/server';
import type { AuditScheduleItem, AuditScheduleStatus } from '@/types/quality';

const AUDIT_SCHEDULE_SCOPE = 'audit-schedule';

type SessionContext = {
  tenantId: string | null;
  actorUserId: string | null;
  actorEmail: string | null;
  canCreate: boolean;
  canEdit: boolean;
  canArchive: boolean;
  canApprove: boolean;
};

type ScheduleAction = 'add-area' | 'rename-area' | 'set-status' | 'archive-area' | 'restore-area';
type ScheduleDecision = 'approve-change' | 'reject-change';
type ScheduleChangeRequest = {
  id: string;
  action: ScheduleAction;
  payload: Record<string, unknown>;
  requestedByUserId: string | null;
  requestedByEmail: string;
  requestedAt: string;
  status: 'pending' | 'approved' | 'rejected';
  decidedByUserId?: string | null;
  decidedByEmail?: string | null;
  decidedAt?: string | null;
  decisionReason?: string;
};
type DatabaseExecutor = Pick<typeof prisma, '$queryRawUnsafe' | '$executeRawUnsafe'>;

async function getSessionContext(request: Request): Promise<SessionContext> {
  const session = await getServerSession(authOptions);
  const actorEmail = session?.user?.email?.trim().toLowerCase() || null;
  const actorUserId = session?.user?.id?.trim() || null;
  const denied = { tenantId: null, actorUserId, actorEmail, canCreate: false, canEdit: false, canArchive: false, canApprove: false };
  if (!actorEmail) return denied;

  const tenantId = (await getTenantIdFromSession(request)) || session?.user?.tenantId?.trim() || null;
  if (!tenantId) return denied;

  // Full access is scoped to the currently selected tenant; it does not read another tenant's schedule.
  if (isMasterTenantEmail(actorEmail) || ['developer', 'dev'].includes(session?.user?.role?.trim().toLowerCase() || '')) {
    return { tenantId, actorUserId, actorEmail, canCreate: true, canEdit: true, canArchive: true, canApprove: true };
  }

  const personnelProfile = await prisma.personnel.findFirst({
    where: { tenantId, email: actorEmail },
    select: { permissions: true, role: true },
  }).catch(() => null);
  const roleId = personnelProfile?.role?.trim() || session?.user?.role?.trim() || '';
  const role = roleId
    ? await prisma.role.findFirst({ where: { tenantId, OR: [{ id: roleId }, { name: roleId }] }, select: { permissions: true } }).catch(() => null)
    : null;
  const inherited = Array.isArray(role?.permissions) ? role.permissions.filter((value): value is string => typeof value === 'string') : [];
  const overrides = Array.isArray(personnelProfile?.permissions) ? personnelProfile.permissions.filter((value): value is string => typeof value === 'string') : [];
  const deniedPermissions = new Set(normalizePermissionIds(overrides.filter((value) => value.startsWith('!')).map((value) => value.slice(1))));
  const granted = new Set<string>();
  normalizePermissionIds(inherited).forEach((value) => { if (!deniedPermissions.has(value)) granted.add(value); });
  normalizePermissionIds(overrides.filter((value) => !value.startsWith('!'))).forEach((value) => granted.add(value));
  const has = (permission: string) => granted.has('*') || hasHierarchicalPermission(granted, permission, deniedPermissions);

  return {
    tenantId,
    actorUserId,
    actorEmail,
    canCreate: has('quality-audit-schedule-create'),
    canEdit: has('quality-audit-schedule-edit'),
    // Legacy delete permission remains a compatibility grant; schedule operations never hard-delete data.
    canArchive: has('quality-audit-schedule-archive') || has('quality-audit-schedule-delete'),
    canApprove: has('quality-audit-schedule-approve'),
  };
}

async function getConfig(tenantId: string, executor: DatabaseExecutor = prisma, lock = false) {
  const rows = await executor.$queryRawUnsafe<{ data: unknown }[]>(
    `SELECT data FROM tenant_configs WHERE tenant_id = $1 LIMIT 1${lock ? ' FOR UPDATE' : ''}`,
    tenantId,
  );
  return (rows[0]?.data as Record<string, unknown>) || {};
}

function toAreas(value: unknown) {
  return Array.isArray(value) ? value.filter((area): area is string => typeof area === 'string').map((area) => area.trim()).filter(Boolean) : [];
}

function toItems(value: unknown) {
  return Array.isArray(value)
    ? value.filter((item): item is AuditScheduleItem => Boolean(item) && typeof item === 'object').map((item) => ({
        ...item,
        id: typeof item.id === 'string' && item.id.trim() ? item.id.trim() : crypto.randomUUID(),
        area: typeof item.area === 'string' ? item.area.trim() : '',
        month: typeof item.month === 'string' ? item.month.trim() : '',
        year: Number.isFinite(Number(item.year)) ? Number(item.year) : new Date().getFullYear(),
        status: ['Scheduled', 'Completed', 'Pending', 'Not Scheduled'].includes(item.status) ? item.status : 'Not Scheduled',
      })).filter((item) => item.area && item.month)
    : [];
}

function getRevision(config: Record<string, unknown>) {
  const revision = Number(config['audit-schedule-revision']);
  return Number.isSafeInteger(revision) && revision > 0 ? revision : 1;
}

function itemLabel(item: AuditScheduleItem) {
  return `${item.area} - ${item.month} ${item.year}`;
}

function cleanReason(value: unknown) {
  return typeof value === 'string' ? value.trim().slice(0, 1000) : '';
}

function requiredString(value: unknown, label: string) {
  const result = typeof value === 'string' ? value.trim() : '';
  if (!result) throw new Error(`${label} is required.`);
  return result;
}

function getAction(value: unknown): ScheduleAction | null {
  return value === 'add-area' || value === 'rename-area' || value === 'set-status' || value === 'archive-area' || value === 'restore-area' ? value : null;
}

function getDecision(value: unknown): ScheduleDecision | null {
  return value === 'approve-change' || value === 'reject-change' ? value : null;
}

function toChangeRequests(value: unknown): ScheduleChangeRequest[] {
  if (!Array.isArray(value)) return [];
  return value.filter((request): request is ScheduleChangeRequest => {
    if (!request || typeof request !== 'object') return false;
    const candidate = request as Partial<ScheduleChangeRequest>;
    return typeof candidate.id === 'string' && Boolean(getAction(candidate.action)) && candidate.status !== undefined && typeof candidate.requestedByEmail === 'string';
  });
}

function changeRequestPayload(action: ScheduleAction, body: Record<string, unknown>) {
  return {
    action,
    area: typeof body.area === 'string' ? body.area : undefined,
    newArea: typeof body.newArea === 'string' ? body.newArea : undefined,
    month: typeof body.month === 'string' ? body.month : undefined,
    year: Number.isFinite(Number(body.year)) ? Number(body.year) : undefined,
    status: typeof body.status === 'string' ? body.status : undefined,
    reason: cleanReason(body.reason),
  };
}

function assertActionPermission(context: SessionContext, action: ScheduleAction) {
  if (action === 'add-area' && !context.canCreate) throw new Error('You do not have permission to create audit schedule entries.');
  if (action === 'rename-area' && !context.canEdit) throw new Error('You do not have permission to edit audit schedule entries.');
  if ((action === 'archive-area' || action === 'restore-area') && !context.canArchive) throw new Error('You do not have permission to archive or restore audit schedule entries.');
  if (action === 'set-status' && !context.canCreate && !context.canEdit) throw new Error('You do not have permission to change audit schedule entries.');
}

function buildNextConfig(config: Record<string, unknown>, action: ScheduleAction, body: Record<string, unknown>) {
  const areas = toAreas(config['audit-areas']);
  const items = toItems(config['audit-schedule-items']);
  const archivedAreas = toAreas(config['archived-audit-areas']);
  const archivedItems = toItems(config['archived-audit-schedule-items']);
  const reason = cleanReason(body.reason);
  let activity: { action: ActivityLogAction; entityType: string; entityId: string; entityLabel: string; details: Record<string, unknown> };
  let recovery: { entityType: RecoveryEntityType; entityId: string; entityLabel: string; snapshot: Record<string, unknown> } | null = null;
  let restore: { entityType: RecoveryEntityType; entityId: string } | null = null;

  if (action === 'add-area') {
    const area = requiredString(body.area, 'Audit area');
    if (areas.includes(area)) throw new Error('An audit area with this name already exists.');
    areas.push(area);
    activity = { action: 'created', entityType: 'audit-area', entityId: area, entityLabel: `Audit area "${area}"`, details: { area, reason } };
  } else if (action === 'rename-area') {
    const area = requiredString(body.area, 'Current audit area');
    const newArea = requiredString(body.newArea, 'New audit area');
    if (!reason) throw new Error('A reason is required when renaming an audit area.');
    if (!areas.includes(area)) throw new Error('The audit area no longer exists. Reload and try again.');
    if (area !== newArea && areas.includes(newArea)) throw new Error('An audit area with this name already exists.');
    const areaIndex = areas.indexOf(area);
    areas[areaIndex] = newArea;
    items.forEach((item) => { if (item.area === area) item.area = newArea; });
    activity = { action: 'updated', entityType: 'audit-area', entityId: area, entityLabel: `Audit area "${newArea}"`, details: { before: { area }, after: { area: newArea }, reason } };
  } else if (action === 'set-status') {
    const area = requiredString(body.area, 'Audit area');
    const month = requiredString(body.month, 'Month');
    const year = Number(body.year);
    const status = body.status as AuditScheduleStatus;
    if (!areas.includes(area)) throw new Error('The audit area no longer exists. Reload and try again.');
    if (!Number.isSafeInteger(year) || !['Scheduled', 'Completed', 'Pending', 'Not Scheduled'].includes(status)) throw new Error('Invalid schedule status.');
    const existing = items.find((item) => item.area === area && item.month === month && item.year === year);
    if (existing) {
      const before = { status: existing.status };
      existing.status = status;
      activity = { action: 'updated', entityType: 'schedule-item', entityId: existing.id, entityLabel: itemLabel(existing), details: { before, after: { status }, reason } };
    } else {
      const item: AuditScheduleItem = { id: crypto.randomUUID(), area, month, year, status };
      items.push(item);
      activity = { action: 'created', entityType: 'schedule-item', entityId: item.id, entityLabel: itemLabel(item), details: { area, month, year, status, reason } };
    }
  } else if (action === 'archive-area') {
    const area = requiredString(body.area, 'Audit area');
    if (!reason) throw new Error('A reason is required when archiving an audit area.');
    if (!areas.includes(area)) throw new Error('The audit area no longer exists. Reload and try again.');
    const archivedAreaItems = items.filter((item) => item.area === area);
    areas.splice(areas.indexOf(area), 1);
    const activeItems = items.filter((item) => item.area !== area);
    archivedAreas.push(area);
    archivedItems.push(...archivedAreaItems);
    activity = { action: 'archived', entityType: 'audit-area', entityId: area, entityLabel: `Audit area "${area}"`, details: { area, itemCount: archivedAreaItems.length, reason } };
    recovery = { entityType: 'audit-schedule-area', entityId: area, entityLabel: `Audit area "${area}"`, snapshot: { area, items: archivedAreaItems } };
    return { next: { ...config, 'audit-areas': areas, 'audit-schedule-items': activeItems, 'archived-audit-areas': Array.from(new Set(archivedAreas)), 'archived-audit-schedule-items': archivedItems }, activity, recovery, restore };
  } else {
    const area = requiredString(body.area, 'Audit area');
    if (!reason) throw new Error('A reason is required when restoring an audit area.');
    if (!archivedAreas.includes(area)) throw new Error('The archived audit area no longer exists. Reload and try again.');
    const restoredItems = archivedItems.filter((item) => item.area === area);
    areas.push(area);
    items.push(...restoredItems.filter((candidate) => !items.some((item) => item.id === candidate.id)));
    activity = { action: 'restored', entityType: 'audit-area', entityId: area, entityLabel: `Audit area "${area}"`, details: { area, itemCount: restoredItems.length, reason } };
    restore = { entityType: 'audit-schedule-area', entityId: area };
    return { next: { ...config, 'audit-areas': Array.from(new Set(areas)), 'audit-schedule-items': items, 'archived-audit-areas': archivedAreas.filter((candidate) => candidate !== area), 'archived-audit-schedule-items': archivedItems.filter((item) => item.area !== area) }, activity, recovery, restore };
  }

  return { next: { ...config, 'audit-areas': areas, 'audit-schedule-items': items, 'archived-audit-areas': Array.from(new Set(archivedAreas)), 'archived-audit-schedule-items': archivedItems }, activity, recovery, restore };
}

async function persistScheduleChange(context: SessionContext, body: Record<string, unknown>) {
  const action = getAction(body.action);
  if (!action || !context.tenantId || !context.actorEmail) throw new Error('Invalid schedule action.');
  assertActionPermission(context, action);
  const expectedRevision = Number(body.revision);
  if (!Number.isSafeInteger(expectedRevision) || expectedRevision < 1) throw new Error('This schedule version is invalid. Reload and try again.');

  const tenantId = context.tenantId;
  const actorEmail = context.actorEmail;
  await ensureActivityLogsSchema();
  return prisma.$transaction(async (tx) => {
    const config = await getConfig(tenantId, tx, true);
    const revision = getRevision(config);
    if (revision !== expectedRevision) {
      const error = new Error('The audit schedule was changed by another user. Reload before making your change.');
      (error as Error & { code?: string }).code = 'STALE_SCHEDULE';
      throw error;
    }
    if (action === 'set-status') {
      const preview = buildNextConfig(config, action, body);
      if (preview.activity.action === 'created' && !context.canCreate) throw new Error('You do not have permission to create audit schedule entries.');
      if (preview.activity.action === 'updated' && !context.canEdit) throw new Error('You do not have permission to edit audit schedule entries.');
    }

    if (!context.canApprove) {
      const request: ScheduleChangeRequest = {
        id: crypto.randomUUID(),
        action,
        payload: changeRequestPayload(action, body),
        requestedByUserId: context.actorUserId,
        requestedByEmail: actorEmail,
        requestedAt: new Date().toISOString(),
        status: 'pending',
      };
      const requests = toChangeRequests(config['audit-schedule-change-requests']);
      const next: Record<string, unknown> = { ...config, 'audit-schedule-change-requests': [...requests, request] };
      await tx.$executeRawUnsafe(
        `INSERT INTO tenant_configs (tenant_id, data, created_at, updated_at) VALUES ($1, $2::jsonb, NOW(), NOW()) ON CONFLICT (tenant_id) DO UPDATE SET data = EXCLUDED.data, updated_at = NOW()`,
        tenantId,
        JSON.stringify(next),
      );
      await recordActivityLog({
        tenantId,
        scope: AUDIT_SCHEDULE_SCOPE,
        action: 'submitted',
        entityType: 'schedule-change-request',
        entityId: request.id,
        entityLabel: `${action.replace(/-/g, ' ')} request`,
        actorUserId: context.actorUserId,
        actorEmail,
        details: { action, ...request.payload },
      }, tx);
      return { areas: toAreas(next['audit-areas']), items: toItems(next['audit-schedule-items']), archivedAreas: toAreas(next['archived-audit-areas']), archivedItems: toItems(next['archived-audit-schedule-items']), revision, pending: true, requestId: request.id };
    }
    const result = buildNextConfig(config, action, body);
    const nextRevision = revision + 1;
    const next = { ...result.next, 'audit-schedule-revision': nextRevision };
    if (result.recovery) {
      await recordRecoveryArchive({ tenantId, ...result.recovery, actorUserId: context.actorUserId, actorEmail }, tx);
    }
    await tx.$executeRawUnsafe(
      `INSERT INTO tenant_configs (tenant_id, data, created_at, updated_at) VALUES ($1, $2::jsonb, NOW(), NOW()) ON CONFLICT (tenant_id) DO UPDATE SET data = EXCLUDED.data, updated_at = NOW()`,
      tenantId,
      JSON.stringify(next),
    );
    if (result.restore) {
      await markRecoveryArchivesRestoredForEntity({ tenantId, ...result.restore }, { userId: context.actorUserId, email: actorEmail }, tx);
    }
    await recordActivityLog({ tenantId, scope: AUDIT_SCHEDULE_SCOPE, actorUserId: context.actorUserId, actorEmail, ...result.activity }, tx);
    return { areas: toAreas(next['audit-areas']), items: toItems(next['audit-schedule-items']), archivedAreas: toAreas(next['archived-audit-areas']), archivedItems: toItems(next['archived-audit-schedule-items']), revision: nextRevision, pending: false };
  });
}

async function decideScheduleChange(context: SessionContext, body: Record<string, unknown>) {
  const decision = getDecision(body.action);
  const requestId = requiredString(body.requestId, 'Change request');
  if (!decision || !context.tenantId || !context.actorEmail || !context.canApprove) throw new Error('You do not have permission to approve schedule changes.');
  const decisionReason = cleanReason(body.reason);
  if (decision === 'reject-change' && !decisionReason) throw new Error('A reason is required when rejecting a change request.');
  const tenantId = context.tenantId;
  const actorEmail = context.actorEmail;
  await ensureActivityLogsSchema();
  return prisma.$transaction(async (tx) => {
    const config = await getConfig(tenantId, tx, true);
    const requests = toChangeRequests(config['audit-schedule-change-requests']);
    const requestIndex = requests.findIndex((request) => request.id === requestId && request.status === 'pending');
    if (requestIndex < 0) throw new Error('This change request is no longer pending. Reload and try again.');
    const request = requests[requestIndex];
    const decidedRequest: ScheduleChangeRequest = {
      ...request,
      status: decision === 'approve-change' ? 'approved' : 'rejected',
      decidedByUserId: context.actorUserId,
      decidedByEmail: actorEmail,
      decidedAt: new Date().toISOString(),
      decisionReason,
    };
    requests[requestIndex] = decidedRequest;

    if (decision === 'reject-change') {
      const next = { ...config, 'audit-schedule-change-requests': requests };
      await tx.$executeRawUnsafe(`INSERT INTO tenant_configs (tenant_id, data, created_at, updated_at) VALUES ($1, $2::jsonb, NOW(), NOW()) ON CONFLICT (tenant_id) DO UPDATE SET data = EXCLUDED.data, updated_at = NOW()`, tenantId, JSON.stringify(next));
      await recordActivityLog({ tenantId, scope: AUDIT_SCHEDULE_SCOPE, action: 'rejected', entityType: 'schedule-change-request', entityId: request.id, entityLabel: `${request.action.replace(/-/g, ' ')} request`, actorUserId: context.actorUserId, actorEmail, details: { requestedBy: request.requestedByEmail, reason: decisionReason } }, tx);
      return { revision: getRevision(next), pending: false };
    }

    const result = buildNextConfig(config, request.action, request.payload);
    const nextRevision = getRevision(config) + 1;
    const next = { ...result.next, 'audit-schedule-revision': nextRevision, 'audit-schedule-change-requests': requests };
    if (result.recovery) await recordRecoveryArchive({ tenantId, ...result.recovery, actorUserId: context.actorUserId, actorEmail }, tx);
    await tx.$executeRawUnsafe(`INSERT INTO tenant_configs (tenant_id, data, created_at, updated_at) VALUES ($1, $2::jsonb, NOW(), NOW()) ON CONFLICT (tenant_id) DO UPDATE SET data = EXCLUDED.data, updated_at = NOW()`, tenantId, JSON.stringify(next));
    if (result.restore) await markRecoveryArchivesRestoredForEntity({ tenantId, ...result.restore }, { userId: context.actorUserId, email: actorEmail }, tx);
    await recordActivityLog({ tenantId, scope: AUDIT_SCHEDULE_SCOPE, action: 'approved', entityType: 'schedule-change-request', entityId: request.id, entityLabel: `${request.action.replace(/-/g, ' ')} request`, actorUserId: context.actorUserId, actorEmail, details: { requestedBy: request.requestedByEmail, reason: decisionReason } }, tx);
    await recordActivityLog({ tenantId, scope: AUDIT_SCHEDULE_SCOPE, actorUserId: context.actorUserId, actorEmail, ...result.activity }, tx);
    return { areas: toAreas(next['audit-areas']), items: toItems(next['audit-schedule-items']), archivedAreas: toAreas(next['archived-audit-areas']), archivedItems: toItems(next['archived-audit-schedule-items']), revision: nextRevision, pending: false };
  });
}

export async function GET(request: Request) {
  try {
    const context = await getSessionContext(request);
    const { tenantId } = context;
    if (!tenantId) return NextResponse.json({ areas: [], items: [], archivedAreas: [], archivedItems: [], revision: 1 });
    const config = await getConfig(tenantId);
    const requests = toChangeRequests(config['audit-schedule-change-requests']);
    return NextResponse.json({
      areas: toAreas(config['audit-areas']),
      items: toItems(config['audit-schedule-items']),
      archivedAreas: toAreas(config['archived-audit-areas']),
      archivedItems: toItems(config['archived-audit-schedule-items']),
      revision: getRevision(config),
      pendingChanges: context.canApprove ? requests.filter((change) => change.status === 'pending') : [],
    });
  } catch (error) {
    console.error('[audit-schedule] returning empty tenant schedule:', error);
    return NextResponse.json({ areas: [], items: [], archivedAreas: [], archivedItems: [], revision: 1 });
  }
}

export async function POST(request: Request) {
  try {
    const context = await getSessionContext(request);
    if (!context.tenantId || !context.actorEmail) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    const body = await request.json().catch(() => null);
    if (!body || typeof body !== 'object') return NextResponse.json({ error: 'Invalid request.' }, { status: 400 });
    const payload = getDecision((body as Record<string, unknown>).action)
      ? await decideScheduleChange(context, body as Record<string, unknown>)
      : await persistScheduleChange(context, body as Record<string, unknown>);
    return NextResponse.json(payload);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unable to update the audit schedule.';
    const code = (error as { code?: string } | null)?.code;
    return NextResponse.json({ error: message, code }, { status: code === 'STALE_SCHEDULE' ? 409 : 400 });
  }
}
