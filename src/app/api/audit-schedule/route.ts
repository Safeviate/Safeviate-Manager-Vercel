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
const CHECKLIST_SCHEDULE_SCOPE = 'checklist-schedule';
const TASK_SCHEDULE_SCOPE = 'task-schedule';
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

type ScheduleScope = 'audits' | 'checklists' | 'tasks';

type ScheduleStorage = {
  activityScope: string;
  label: string;
  areaEntityType: string;
  recoveryEntityType: RecoveryEntityType;
  areas: string;
  items: string;
  archivedAreas: string;
  archivedItems: string;
  revision: string;
  requests: string;
};

function getScheduleStorage(scope: ScheduleScope): ScheduleStorage {
  if (scope === 'tasks') {
    return {
      activityScope: TASK_SCHEDULE_SCOPE,
      label: 'task',
      areaEntityType: 'task-schedule-area',
      recoveryEntityType: 'task-schedule-area',
      areas: 'task-schedule-areas',
      items: 'task-schedule-items',
      archivedAreas: 'archived-task-schedule-areas',
      archivedItems: 'archived-task-schedule-items',
      revision: 'task-schedule-revision',
      requests: 'task-schedule-change-requests',
    };
  }
  if (scope === 'checklists') {
    return {
      activityScope: CHECKLIST_SCHEDULE_SCOPE,
      label: 'checklist',
      areaEntityType: 'checklist-schedule-area',
      recoveryEntityType: 'checklist-schedule-area',
      areas: 'checklist-schedule-areas',
      items: 'checklist-schedule-items',
      archivedAreas: 'archived-checklist-schedule-areas',
      archivedItems: 'archived-checklist-schedule-items',
      revision: 'checklist-schedule-revision',
      requests: 'checklist-schedule-change-requests',
    };
  }
  return {
    activityScope: AUDIT_SCHEDULE_SCOPE,
    label: 'audit',
    areaEntityType: 'audit-area',
    recoveryEntityType: 'audit-schedule-area',
    areas: 'audit-areas',
    items: 'audit-schedule-items',
    archivedAreas: 'archived-audit-areas',
    archivedItems: 'archived-audit-schedule-items',
    revision: 'audit-schedule-revision',
    requests: 'audit-schedule-change-requests',
  };
}

function getScheduleScope(request: Request, body?: Record<string, unknown>): ScheduleScope {
  const requested = body?.scope ?? new URL(request.url).searchParams.get('scope');
  if (requested === 'checklists' || requested === 'tasks') return requested;
  return 'audits';
}

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

async function getSessionContext(request: Request, scope: ScheduleScope): Promise<SessionContext> {
  const session = await getServerSession(authOptions);
  const actorEmail = session?.user?.email?.trim().toLowerCase() || null;
  const actorUserId = session?.user?.id?.trim() || null;
  const denied = { tenantId: null, actorUserId, actorEmail, canCreate: false, canEdit: false, canArchive: false, canApprove: false };
  if (!actorEmail) return denied;

  const tenantId = await getTenantIdFromSession(request);
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

  // Tasks are scheduled work items on this screen, so they use the existing
  // Quality Schedule permissions until a separate task-scheduling permission
  // is introduced.
  const resource = scope === 'checklists' ? 'quality-checklists' : 'quality-audit-schedule';
  return {
    tenantId,
    actorUserId,
    actorEmail,
    canCreate: has(`${resource}-create`),
    canEdit: has(`${resource}-edit`),
    // Legacy delete permission remains a compatibility grant; schedule operations never hard-delete data.
    canArchive: has(`${resource}-archive`) || has(`${resource}-delete`),
    canApprove: scope === 'audits' && has('quality-audit-schedule-approve'),
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

function isValidIsoDate(value: unknown): value is string {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const date = new Date(`${value}T00:00:00Z`);
  return !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === value;
}

function toItems(value: unknown) {
  return Array.isArray(value)
    ? value.filter((item): item is AuditScheduleItem => Boolean(item) && typeof item === 'object').map((item): AuditScheduleItem => ({
        ...item,
        id: typeof item.id === 'string' && item.id.trim() ? item.id.trim() : crypto.randomUUID(),
        area: typeof item.area === 'string' ? item.area.trim() : '',
        month: typeof item.month === 'string' ? item.month.trim() : '',
        year: Number.isFinite(Number(item.year)) ? Number(item.year) : new Date().getFullYear(),
        status: ['Scheduled', 'Completed', 'Pending', 'Not Scheduled'].includes(item.status) ? item.status : 'Not Scheduled',
        plannedDate: isValidIsoDate(item.plannedDate) ? item.plannedDate : undefined,
      })).filter((item) => item.area && item.month)
    : [];
}

function getRevision(config: Record<string, unknown>, storage: ScheduleStorage) {
  const revision = Number(config[storage.revision]);
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
    plannedDate: typeof body.plannedDate === 'string' ? body.plannedDate : undefined,
    reason: cleanReason(body.reason),
  };
}

function assertActionPermission(context: SessionContext, action: ScheduleAction, storage: ScheduleStorage) {
  if (action === 'add-area' && !context.canCreate) throw new Error(`You do not have permission to create ${storage.label} schedule entries.`);
  if (action === 'rename-area' && !context.canEdit) throw new Error(`You do not have permission to edit ${storage.label} schedule entries.`);
  if ((action === 'archive-area' || action === 'restore-area') && !context.canArchive) throw new Error(`You do not have permission to archive or restore ${storage.label} schedule entries.`);
  if (action === 'set-status' && !context.canCreate && !context.canEdit) throw new Error(`You do not have permission to change ${storage.label} schedule entries.`);
}

function buildNextConfig(config: Record<string, unknown>, action: ScheduleAction, body: Record<string, unknown>, storage: ScheduleStorage) {
  const areas = toAreas(config[storage.areas]);
  const items = toItems(config[storage.items]);
  const archivedAreas = toAreas(config[storage.archivedAreas]);
  const archivedItems = toItems(config[storage.archivedItems]);
  const reason = cleanReason(body.reason);
  let activity: { action: ActivityLogAction; entityType: string; entityId: string; entityLabel: string; details: Record<string, unknown> };
  let recovery: { entityType: RecoveryEntityType; entityId: string; entityLabel: string; snapshot: Record<string, unknown> } | null = null;
  let restore: { entityType: RecoveryEntityType; entityId: string } | null = null;

  if (action === 'add-area') {
    const area = requiredString(body.area, `${storage.label[0].toUpperCase()}${storage.label.slice(1)} area`);
    if (areas.includes(area)) throw new Error(`A ${storage.label} area with this name already exists.`);
    areas.push(area);
    activity = { action: 'created', entityType: storage.areaEntityType, entityId: area, entityLabel: `${storage.label[0].toUpperCase()}${storage.label.slice(1)} area "${area}"`, details: { area, reason } };
  } else if (action === 'rename-area') {
    const area = requiredString(body.area, `Current ${storage.label} area`);
    const newArea = requiredString(body.newArea, `New ${storage.label} area`);
    if (!reason) throw new Error(`A reason is required when renaming a ${storage.label} area.`);
    if (!areas.includes(area)) throw new Error(`The ${storage.label} area no longer exists. Reload and try again.`);
    if (area !== newArea && areas.includes(newArea)) throw new Error(`A ${storage.label} area with this name already exists.`);
    const areaIndex = areas.indexOf(area);
    areas[areaIndex] = newArea;
    items.forEach((item) => { if (item.area === area) item.area = newArea; });
    activity = { action: 'updated', entityType: storage.areaEntityType, entityId: area, entityLabel: `${storage.label[0].toUpperCase()}${storage.label.slice(1)} area "${newArea}"`, details: { before: { area }, after: { area: newArea }, reason } };
  } else if (action === 'set-status') {
    const area = requiredString(body.area, `${storage.label[0].toUpperCase()}${storage.label.slice(1)} area`);
    const month = requiredString(body.month, 'Month');
    const year = Number(body.year);
    const status = body.status as AuditScheduleStatus;
    const plannedDate = isValidIsoDate(body.plannedDate) ? body.plannedDate : undefined;
    if (!areas.includes(area)) throw new Error(`The ${storage.label} area no longer exists. Reload and try again.`);
    if (!Number.isSafeInteger(year) || !['Scheduled', 'Completed', 'Pending', 'Not Scheduled'].includes(status)) throw new Error('Invalid schedule status.');
    const monthIndex = MONTHS.indexOf(month);
    if (monthIndex < 0) throw new Error('Invalid schedule month.');
    const expectedMonth = `${year}-${String(monthIndex + 1).padStart(2, '0')}`;
    if (plannedDate && !plannedDate.startsWith(`${expectedMonth}-`)) throw new Error('The planned date must fall within the selected schedule month.');
    const existing = items.find((item) => item.area === area && item.month === month && item.year === year);
    if (existing) {
      const before = { status: existing.status, plannedDate: existing.plannedDate };
      existing.status = status;
      existing.plannedDate = status === 'Not Scheduled' ? undefined : plannedDate;
      activity = { action: 'updated', entityType: 'schedule-item', entityId: existing.id, entityLabel: itemLabel(existing), details: { before, after: { status, plannedDate: existing.plannedDate }, reason } };
    } else {
      const item: AuditScheduleItem = { id: crypto.randomUUID(), area, month, year, status, plannedDate: status === 'Not Scheduled' ? undefined : plannedDate };
      items.push(item);
      activity = { action: 'created', entityType: 'schedule-item', entityId: item.id, entityLabel: itemLabel(item), details: { area, month, year, status, plannedDate: item.plannedDate, reason } };
    }
  } else if (action === 'archive-area') {
    const area = requiredString(body.area, `${storage.label[0].toUpperCase()}${storage.label.slice(1)} area`);
    if (!reason) throw new Error(`A reason is required when archiving a ${storage.label} area.`);
    if (!areas.includes(area)) throw new Error(`The ${storage.label} area no longer exists. Reload and try again.`);
    const archivedAreaItems = items.filter((item) => item.area === area);
    areas.splice(areas.indexOf(area), 1);
    const activeItems = items.filter((item) => item.area !== area);
    archivedAreas.push(area);
    archivedItems.push(...archivedAreaItems);
    activity = { action: 'archived', entityType: storage.areaEntityType, entityId: area, entityLabel: `${storage.label[0].toUpperCase()}${storage.label.slice(1)} area "${area}"`, details: { area, itemCount: archivedAreaItems.length, reason } };
    recovery = { entityType: storage.recoveryEntityType, entityId: area, entityLabel: `${storage.label[0].toUpperCase()}${storage.label.slice(1)} area "${area}"`, snapshot: { area, items: archivedAreaItems } };
    return { next: { ...config, [storage.areas]: areas, [storage.items]: activeItems, [storage.archivedAreas]: Array.from(new Set(archivedAreas)), [storage.archivedItems]: archivedItems }, activity, recovery, restore };
  } else {
    const area = requiredString(body.area, `${storage.label[0].toUpperCase()}${storage.label.slice(1)} area`);
    if (!reason) throw new Error(`A reason is required when restoring a ${storage.label} area.`);
    if (!archivedAreas.includes(area)) throw new Error(`The archived ${storage.label} area no longer exists. Reload and try again.`);
    const restoredItems = archivedItems.filter((item) => item.area === area);
    areas.push(area);
    items.push(...restoredItems.filter((candidate) => !items.some((item) => item.id === candidate.id)));
    activity = { action: 'restored', entityType: storage.areaEntityType, entityId: area, entityLabel: `${storage.label[0].toUpperCase()}${storage.label.slice(1)} area "${area}"`, details: { area, itemCount: restoredItems.length, reason } };
    restore = { entityType: storage.recoveryEntityType, entityId: area };
    return { next: { ...config, [storage.areas]: Array.from(new Set(areas)), [storage.items]: items, [storage.archivedAreas]: archivedAreas.filter((candidate) => candidate !== area), [storage.archivedItems]: archivedItems.filter((item) => item.area !== area) }, activity, recovery, restore };
  }

  return { next: { ...config, [storage.areas]: areas, [storage.items]: items, [storage.archivedAreas]: Array.from(new Set(archivedAreas)), [storage.archivedItems]: archivedItems }, activity, recovery, restore };
}

async function persistScheduleChange(context: SessionContext, body: Record<string, unknown>, scope: ScheduleScope) {
  const storage = getScheduleStorage(scope);
  const action = getAction(body.action);
  if (!action || !context.tenantId || !context.actorEmail) throw new Error('Invalid schedule action.');
  assertActionPermission(context, action, storage);
  const expectedRevision = Number(body.revision);
  if (!Number.isSafeInteger(expectedRevision) || expectedRevision < 1) throw new Error('This schedule version is invalid. Reload and try again.');

  const tenantId = context.tenantId;
  const actorEmail = context.actorEmail;
  await ensureActivityLogsSchema();
  return prisma.$transaction(async (tx) => {
    const config = await getConfig(tenantId, tx, true);
    const revision = getRevision(config, storage);
    if (revision !== expectedRevision) {
      const error = new Error(`The ${storage.label} schedule was changed by another user. Reload before making your change.`);
      (error as Error & { code?: string }).code = 'STALE_SCHEDULE';
      throw error;
    }
    if (action === 'set-status') {
      const preview = buildNextConfig(config, action, body, storage);
      if (preview.activity.action === 'created' && !context.canCreate) throw new Error(`You do not have permission to create ${storage.label} schedule entries.`);
      if (preview.activity.action === 'updated' && !context.canEdit) throw new Error(`You do not have permission to edit ${storage.label} schedule entries.`);
    }

    // Checklist scheduling uses the existing Checklist create/edit/archive permissions
    // and applies directly. Audit changes retain their approval workflow.
    if (scope === 'audits' && !context.canApprove) {
      const request: ScheduleChangeRequest = {
        id: crypto.randomUUID(),
        action,
        payload: changeRequestPayload(action, body),
        requestedByUserId: context.actorUserId,
        requestedByEmail: actorEmail,
        requestedAt: new Date().toISOString(),
        status: 'pending',
      };
      const requests = toChangeRequests(config[storage.requests]);
      const next: Record<string, unknown> = { ...config, [storage.requests]: [...requests, request] };
      await tx.$executeRawUnsafe(
        `INSERT INTO tenant_configs (tenant_id, data, created_at, updated_at) VALUES ($1, $2::jsonb, NOW(), NOW()) ON CONFLICT (tenant_id) DO UPDATE SET data = EXCLUDED.data, updated_at = NOW()`,
        tenantId,
        JSON.stringify(next),
      );
      await recordActivityLog({
        tenantId,
        scope: storage.activityScope,
        action: 'submitted',
        entityType: 'schedule-change-request',
        entityId: request.id,
        entityLabel: `${action.replace(/-/g, ' ')} request`,
        actorUserId: context.actorUserId,
        actorEmail,
        details: { action, ...request.payload },
      }, tx);
      return { areas: toAreas(next[storage.areas]), items: toItems(next[storage.items]), archivedAreas: toAreas(next[storage.archivedAreas]), archivedItems: toItems(next[storage.archivedItems]), revision, pending: true, requestId: request.id };
    }
    const result = buildNextConfig(config, action, body, storage);
    const nextRevision = revision + 1;
    const next = { ...result.next, [storage.revision]: nextRevision };
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
    await recordActivityLog({ tenantId, scope: storage.activityScope, actorUserId: context.actorUserId, actorEmail, ...result.activity }, tx);
    return { areas: toAreas(next[storage.areas]), items: toItems(next[storage.items]), archivedAreas: toAreas(next[storage.archivedAreas]), archivedItems: toItems(next[storage.archivedItems]), revision: nextRevision, pending: false };
  });
}

async function decideScheduleChange(context: SessionContext, body: Record<string, unknown>, scope: ScheduleScope) {
  const storage = getScheduleStorage(scope);
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
    const requests = toChangeRequests(config[storage.requests]);
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
      const next = { ...config, [storage.requests]: requests };
      await tx.$executeRawUnsafe(`INSERT INTO tenant_configs (tenant_id, data, created_at, updated_at) VALUES ($1, $2::jsonb, NOW(), NOW()) ON CONFLICT (tenant_id) DO UPDATE SET data = EXCLUDED.data, updated_at = NOW()`, tenantId, JSON.stringify(next));
      await recordActivityLog({ tenantId, scope: storage.activityScope, action: 'rejected', entityType: 'schedule-change-request', entityId: request.id, entityLabel: `${request.action.replace(/-/g, ' ')} request`, actorUserId: context.actorUserId, actorEmail, details: { requestedBy: request.requestedByEmail, reason: decisionReason } }, tx);
      return { revision: getRevision(next, storage), pending: false };
    }

    const result = buildNextConfig(config, request.action, request.payload, storage);
    const nextRevision = getRevision(config, storage) + 1;
    const next = { ...result.next, [storage.revision]: nextRevision, [storage.requests]: requests };
    if (result.recovery) await recordRecoveryArchive({ tenantId, ...result.recovery, actorUserId: context.actorUserId, actorEmail }, tx);
    await tx.$executeRawUnsafe(`INSERT INTO tenant_configs (tenant_id, data, created_at, updated_at) VALUES ($1, $2::jsonb, NOW(), NOW()) ON CONFLICT (tenant_id) DO UPDATE SET data = EXCLUDED.data, updated_at = NOW()`, tenantId, JSON.stringify(next));
    if (result.restore) await markRecoveryArchivesRestoredForEntity({ tenantId, ...result.restore }, { userId: context.actorUserId, email: actorEmail }, tx);
    await recordActivityLog({ tenantId, scope: storage.activityScope, action: 'approved', entityType: 'schedule-change-request', entityId: request.id, entityLabel: `${request.action.replace(/-/g, ' ')} request`, actorUserId: context.actorUserId, actorEmail, details: { requestedBy: request.requestedByEmail, reason: decisionReason } }, tx);
    await recordActivityLog({ tenantId, scope: storage.activityScope, actorUserId: context.actorUserId, actorEmail, ...result.activity }, tx);
    return { areas: toAreas(next[storage.areas]), items: toItems(next[storage.items]), archivedAreas: toAreas(next[storage.archivedAreas]), archivedItems: toItems(next[storage.archivedItems]), revision: nextRevision, pending: false };
  });
}

export async function GET(request: Request) {
  try {
    const scope = getScheduleScope(request);
    const storage = getScheduleStorage(scope);
    const context = await getSessionContext(request, scope);
    const { tenantId } = context;
    if (!tenantId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    const config = await getConfig(tenantId);
    const requests = toChangeRequests(config[storage.requests]);
    return NextResponse.json({
      areas: toAreas(config[storage.areas]),
      items: toItems(config[storage.items]),
      archivedAreas: toAreas(config[storage.archivedAreas]),
      archivedItems: toItems(config[storage.archivedItems]),
      revision: getRevision(config, storage),
      pendingChanges: context.canApprove ? requests.filter((change) => change.status === 'pending') : [],
    });
  } catch (error) {
    console.error('[audit-schedule] failed to load tenant schedule:', error);
    return NextResponse.json({ error: 'Unable to load the audit schedule.' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => null);
    if (!body || typeof body !== 'object') return NextResponse.json({ error: 'Invalid request.' }, { status: 400 });
    const scope = getScheduleScope(request, body as Record<string, unknown>);
    const context = await getSessionContext(request, scope);
    if (!context.tenantId || !context.actorEmail) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    const payload = getDecision((body as Record<string, unknown>).action)
      ? await decideScheduleChange(context, body as Record<string, unknown>, scope)
      : await persistScheduleChange(context, body as Record<string, unknown>, scope);
    return NextResponse.json(payload);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unable to update the audit schedule.';
    const code = (error as { code?: string } | null)?.code;
    return NextResponse.json({ error: message, code }, { status: code === 'STALE_SCHEDULE' ? 409 : 400 });
  }
}
