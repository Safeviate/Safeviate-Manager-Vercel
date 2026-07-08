import { authOptions } from '@/auth';
import { hasHierarchicalPermission, normalizePermissionIds } from '@/lib/permission-model';
import { prisma } from '@/lib/prisma';
import { getTenantIdForRoute } from '@/lib/server/session-tenant';
import { isMasterTenantEmail } from '@/lib/server/tenant-access';
import { recordSimulationRouteMetric } from '@/lib/server/simulation-telemetry';
import { getServerSession } from 'next-auth';
import { NextResponse } from 'next/server';
import { randomUUID } from 'node:crypto';
import type { CorrectiveActionPlan } from '@/types/quality';

const PLACEHOLDER_ACTION_DESCRIPTION = 'Primary corrective action responsibility';

async function getTenantId(request: Request) {
  return getTenantIdForRoute(request);
}

function getMeaningfulCorrectiveActions(cap: CorrectiveActionPlan) {
  return (Array.isArray(cap.actions) ? cap.actions : []).filter((action) => {
    const description = action.description?.trim() || '';
    return Boolean(description && description !== PLACEHOLDER_ACTION_DESCRIPTION);
  });
}

function hasMeaningfulResponseHistory(cap: CorrectiveActionPlan) {
  return (Array.isArray(cap.responses) ? cap.responses : []).some((response) => {
    const message = response.message?.trim() || '';
    const evidenceCount = Array.isArray(response.evidence) ? response.evidence.length : 0;
    return Boolean(message) || evidenceCount > 0;
  });
}

function isMeaningfulCap(cap: CorrectiveActionPlan) {
  return Boolean(cap.rootCauseAnalysis?.trim())
    || getMeaningfulCorrectiveActions(cap).length > 0
    || hasMeaningfulResponseHistory(cap);
}

function normalizeCapPayload(cap: CorrectiveActionPlan): CorrectiveActionPlan {
  const rootCauseAnalysis = cap.rootCauseAnalysis?.trim() || '';
  const responsiblePersonId = cap.responsiblePersonId?.trim() || '';
  const dueDate = typeof cap.dueDate === 'string' ? cap.dueDate : '';
  const actions = Array.isArray(cap.actions)
    ? cap.actions.map((action) => ({
        ...action,
        description: action.description?.trim() || '',
        responsiblePersonId: action.responsiblePersonId?.trim() || '',
        deadline: action.deadline || dueDate,
      }))
      .filter((action) => Boolean(action.description && action.description !== PLACEHOLDER_ACTION_DESCRIPTION))
    : [];

  return {
    ...cap,
    rootCauseAnalysis,
    responsiblePersonId,
    dueDate,
    actions,
  };
}

async function getAllCaps(tenantId: string) {
  const rows = await prisma.$queryRawUnsafe<{ id: string; data: unknown }[]>(
    `SELECT id, data FROM corrective_action_plans WHERE tenant_id = $1 ORDER BY created_at DESC`,
    tenantId
  );
  const normalizedRows = rows.map((row) => ({
    id: row.id,
    cap: normalizeCapPayload({
      ...(row.data as Record<string, unknown>),
      id: row.id,
      tenantId,
    } as CorrectiveActionPlan),
  }));

  const invalidIds = normalizedRows
    .filter((row) => !isMeaningfulCap(row.cap))
    .map((row) => row.id);

  if (invalidIds.length > 0) {
    await prisma.correctiveActionPlan.deleteMany({
      where: {
        tenantId,
        id: { in: invalidIds },
      },
    });
  }

  return normalizedRows
    .filter((row) => !invalidIds.includes(row.id))
    .map((row) => row.cap);
}

function mergePermissions(rolePermissions: unknown, overridePermissions: unknown) {
  const inheritedPermissions = Array.isArray(rolePermissions) ? rolePermissions.filter((permission): permission is string => typeof permission === 'string') : [];
  const overrideList = Array.isArray(overridePermissions) ? overridePermissions.filter((permission): permission is string => typeof permission === 'string') : [];
  const deniedPermissions = new Set(
    normalizePermissionIds(overrideList.filter((permission) => permission.startsWith('!')).map((permission) => permission.slice(1)))
  );
  const grantedPermissions = new Set<string>();

  normalizePermissionIds(inheritedPermissions).forEach((permission) => {
    if (!deniedPermissions.has(permission)) {
      grantedPermissions.add(permission);
    }
  });

  normalizePermissionIds(overrideList.filter((permission) => !permission.startsWith('!'))).forEach((permission) => {
    grantedPermissions.add(permission);
  });

  return {
    grantedPermissions,
    deniedPermissions,
  };
}

async function resolveCapAccess(request: Request) {
  const session = await getServerSession(authOptions);
  const email = session?.user?.email?.trim().toLowerCase() || '';
  const role = session?.user?.role?.trim().toLowerCase() || '';

  if (!email) {
    return { tenantId: null as string | null, canManage: false };
  }

  const tenantId = await getTenantId(request);
  if (!tenantId) {
    return { tenantId: null as string | null, canManage: false };
  }

  if (role === 'dev' || role === 'developer' || isMasterTenantEmail(email)) {
    return { tenantId, canManage: true };
  }

  const personnelProfile = await prisma.personnel.findFirst({
    where: { tenantId, email },
    select: { permissions: true, role: true },
  }).catch(() => null);

  const resolvedRole = (personnelProfile?.role?.trim() || role || '').trim();
  const rolePermissions = resolvedRole
    ? await prisma.role.findFirst({
        where: {
          tenantId,
          OR: [
            { id: resolvedRole },
            { name: resolvedRole },
          ],
        },
        select: { permissions: true },
      }).catch(() => null)
    : null;

  const { grantedPermissions, deniedPermissions } = mergePermissions(rolePermissions?.permissions, personnelProfile?.permissions);
  const canManage = grantedPermissions.has('*')
    || hasHierarchicalPermission(grantedPermissions, 'admin-view', deniedPermissions)
    || hasHierarchicalPermission(grantedPermissions, 'quality-caps-manage', deniedPermissions);

  return { tenantId, canManage };
}

export async function GET(request: Request) {
  const startedAt = Date.now();
  let tenantId: string | null = null;
  try {
    tenantId = await getTenantId(request);
    if (!tenantId) return NextResponse.json({ caps: [] }, { status: 200 });
    const caps = await getAllCaps(tenantId);
    await recordSimulationRouteMetric({
      tenantId,
      routeKey: 'corrective-action-plans.GET',
      reads: 1,
      writes: 0,
      durationMs: Date.now() - startedAt,
    });
    return NextResponse.json({ caps }, { status: 200 });
  } catch (error) {
    console.error('[corrective-action-plans] fallback to empty list:', error);
    await recordSimulationRouteMetric({
      tenantId,
      routeKey: 'corrective-action-plans.GET',
      reads: 0,
      writes: 0,
      durationMs: Date.now() - startedAt,
      isError: true,
    });
    return NextResponse.json({ caps: [] }, { status: 200 });
  }
}

export async function POST(request: Request) {
  const startedAt = Date.now();
  const { tenantId, canManage } = await resolveCapAccess(request);
  if (!tenantId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  if (!canManage) return NextResponse.json({ error: 'You do not have permission to manage corrective action plans.' }, { status: 403 });
  const body = await request.json().catch(() => null);
  const cap = body?.cap as CorrectiveActionPlan | null | undefined;
  if (!cap || typeof cap !== 'object') return NextResponse.json({ error: 'Invalid CAP payload' }, { status: 400 });
  const id = !cap.id || cap.id === 'new' || cap.id.startsWith('draft::') ? randomUUID() : cap.id;
  const data = normalizeCapPayload({ ...cap, id });
  await prisma.$executeRawUnsafe(
    `INSERT INTO corrective_action_plans (id, tenant_id, data, created_at, updated_at) VALUES ($1, $2, $3::jsonb, NOW(), NOW()) ON CONFLICT (id) DO UPDATE SET data = EXCLUDED.data, updated_at = NOW()`,
    id,
    tenantId,
    JSON.stringify(data)
  );
  await recordSimulationRouteMetric({
    tenantId,
    routeKey: 'corrective-action-plans.POST',
    reads: 0,
    writes: 1,
    durationMs: Date.now() - startedAt,
  });
  return NextResponse.json({ cap: { ...data, tenantId } }, { status: 200 });
}

export async function DELETE(request: Request) {
  const startedAt = Date.now();
  const { tenantId, canManage } = await resolveCapAccess(request);
  if (!tenantId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  if (!canManage) return NextResponse.json({ error: 'You do not have permission to delete corrective action plans.' }, { status: 403 });

  const { searchParams } = new URL(request.url);
  const id = searchParams.get('id')?.trim();
  if (!id) return NextResponse.json({ error: 'CAP id is required' }, { status: 400 });

  const existingRows = await prisma.$queryRawUnsafe<{ id: string }[]>(
    `SELECT id FROM corrective_action_plans WHERE tenant_id = $1 AND id = $2 LIMIT 1`,
    tenantId,
    id
  );
  if (!existingRows[0]) {
    return NextResponse.json({ error: 'Corrective action plan not found in the current tenant.' }, { status: 404 });
  }

  await prisma.$executeRawUnsafe(
    `DELETE FROM corrective_action_plans WHERE tenant_id = $1 AND id = $2`,
    tenantId,
    id
  );

  await recordSimulationRouteMetric({
    tenantId,
    routeKey: 'corrective-action-plans.DELETE',
    reads: 0,
    writes: 1,
    durationMs: Date.now() - startedAt,
  });

  return NextResponse.json({ success: true }, { status: 200 });
}

