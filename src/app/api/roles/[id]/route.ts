import { prisma } from '@/lib/prisma';
import { getTenantIdForRoute } from '@/lib/server/session-tenant';
import { ensureRolesSchema } from '@/lib/server/bootstrap-db';
import { NextRequest, NextResponse } from 'next/server';
import { invalidatePersonnelDirectoryCaches } from '@/lib/server/route-cache';
import { authenticateAiRequest } from '@/lib/server/ai-auth';
import { hasHierarchicalPermission } from '@/lib/permission-model';

async function getTenantId(request: Request) {
  return getTenantIdForRoute(request);
}

async function authorizeRoleManagement(request: Request) {
  const authResult = await authenticateAiRequest(request);
  if (!authResult.ok) {
    return NextResponse.json({ error: authResult.error }, { status: authResult.status });
  }

  const canManageRoles =
    hasHierarchicalPermission(authResult.effectivePermissions, 'admin-permissions-edit', authResult.deniedPermissions) ||
    authResult.userProfile.role?.toLowerCase() === 'developer';

  if (!canManageRoles) {
    return NextResponse.json({ error: 'You do not have permission to edit roles.' }, { status: 403 });
  }

  return null;
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const authorizationError = await authorizeRoleManagement(request);
  if (authorizationError) return authorizationError;

  await ensureRolesSchema();
  const { id } = await params;
  const tenantId = await getTenantId(request);
  if (!tenantId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  await prisma.role.deleteMany({
    where: { id, tenantId },
  });

  invalidatePersonnelDirectoryCaches(tenantId);

  return NextResponse.json({ ok: true }, { status: 200 });
}

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const authorizationError = await authorizeRoleManagement(request);
  if (authorizationError) return authorizationError;

  await ensureRolesSchema();
  const { id } = await params;
  const tenantId = await getTenantId(request);
  if (!tenantId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const body = await request.json();
  if (!body || typeof body !== 'object') {
    return NextResponse.json({ error: 'Invalid role payload.' }, { status: 400 });
  }
  const name = String(body.name || '').trim();
  const permissions = Array.isArray(body.permissions) ? body.permissions.filter((permission: unknown) => typeof permission === 'string') : [];
  const requiredDocuments = Array.isArray(body.requiredDocuments) ? body.requiredDocuments.filter((document: unknown) => typeof document === 'string') : [];
  const hiddenMenus = Array.isArray(body.accessOverrides?.hiddenMenus)
    ? body.accessOverrides.hiddenMenus.filter((value: unknown) => typeof value === 'string')
    : [];

  if (!name) {
    return NextResponse.json({ error: 'Role name is required.' }, { status: 400 });
  }

  const role = await prisma.$transaction(async (transaction) => {
    const updatedRole = await transaction.role.updateMany({
      where: { id, tenantId },
      data: {
        name,
        permissions,
        requiredDocuments,
        updatedAt: new Date(),
      },
    });

    if (updatedRole.count === 0) return updatedRole;

    // Keep role-level menu visibility in the same transaction as role permissions.
    await transaction.$executeRawUnsafe(
      `UPDATE roles
       SET access_overrides = $3::jsonb,
           updated_at = NOW()
       WHERE id = $1 AND tenant_id = $2`,
      id,
      tenantId,
      JSON.stringify({ hiddenMenus }),
    );

    return updatedRole;
  });

  if (role.count === 0) {
    return NextResponse.json({ error: 'Role not found.' }, { status: 404 });
  }

  invalidatePersonnelDirectoryCaches(tenantId);

  return NextResponse.json({ ok: true, role: { ...role, accessOverrides: { hiddenMenus } } }, { status: 200 });
}

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  await ensureRolesSchema();
  const { id } = await params;
  const tenantId = await getTenantId(request);
  if (!tenantId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const role = await prisma.role.findFirst({
    where: { id, tenantId },
  });

  if (!role) {
    return NextResponse.json({ error: 'Role not found.' }, { status: 404 });
  }

  return NextResponse.json({
    role: {
      ...role,
      accessOverrides: Array.isArray(((role as unknown as { accessOverrides?: { hiddenMenus?: unknown } | null }).accessOverrides)?.hiddenMenus)
        ? {
            hiddenMenus: ((role as unknown as { accessOverrides?: { hiddenMenus?: string[] } | null }).accessOverrides?.hiddenMenus || []),
          }
        : { hiddenMenus: [] as string[] },
    },
  });
}
