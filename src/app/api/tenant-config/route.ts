import { authOptions } from '@/auth';
import { hasHierarchicalPermission, normalizePermissionIds } from '@/lib/permission-model';
import { isDatabaseAvailable, prisma } from '@/lib/prisma';
import { ensureTenantConfigSchema } from '@/lib/server/bootstrap-db';
import {
  createMasterCoherenceMatrixSnapshot,
  readCoherenceMatrixEntries,
} from '@/lib/server/coherence-matrix-copy';
import { getOrSetRouteCache, invalidateRouteCache } from '@/lib/server/route-cache';
import { MASTER_TENANT_ID, isMasterTenantEmail } from '@/lib/server/tenant-access';
import { getTenantIdFromSession } from '@/lib/server/session-tenant';
import { getServerSession } from 'next-auth';
import { NextResponse } from 'next/server';

const MASTER_TENANT_NAME = 'Safeviate';

async function canManageTenantSettings(tenantId: string, email: string, sessionRole?: string) {
  const personnelProfile = await prisma.personnel.findFirst({
    where: { tenantId, email },
    select: { permissions: true, role: true },
  }).catch(() => null);

  const roleId = personnelProfile?.role?.trim() || sessionRole?.trim() || '';
  const role = roleId
    ? await prisma.role.findFirst({
        where: {
          tenantId,
          OR: [{ id: roleId }, { name: roleId }],
        },
        select: { permissions: true },
      }).catch(() => null)
    : null;

  const inheritedPermissions = Array.isArray(role?.permissions)
    ? role.permissions.filter((permission): permission is string => typeof permission === 'string')
    : [];
  const overridePermissions = Array.isArray(personnelProfile?.permissions)
    ? personnelProfile.permissions.filter((permission): permission is string => typeof permission === 'string')
    : [];
  const deniedPermissions = new Set(
    normalizePermissionIds(
      overridePermissions
        .filter((permission) => permission.startsWith('!'))
        .map((permission) => permission.slice(1))
    )
  );
  const grantedPermissions = new Set<string>();

  normalizePermissionIds(inheritedPermissions).forEach((permission) => {
    if (!deniedPermissions.has(permission)) grantedPermissions.add(permission);
  });
  normalizePermissionIds(overridePermissions.filter((permission) => !permission.startsWith('!')))
    .forEach((permission) => grantedPermissions.add(permission));

  return grantedPermissions.has('*')
    || hasHierarchicalPermission(grantedPermissions, 'admin-settings-edit', deniedPermissions)
    || hasHierarchicalPermission(grantedPermissions, 'settings-edit', deniedPermissions);
}

export async function GET(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    const email = session?.user?.email?.trim().toLowerCase();
    const role = session?.user?.role?.trim().toLowerCase() || '';
    const tenantIdFromQuery = new URL(request.url).searchParams.get('tenantId')?.trim() || null;
    if (!email) {
      return NextResponse.json({ config: null }, { status: 200 });
    }

    const isDeveloper = role === 'dev' || role === 'developer';
    const isMaster = isMasterTenantEmail(email);
    const tenantId = tenantIdFromQuery && (isDeveloper || isMaster)
      ? tenantIdFromQuery
      : (await getTenantIdFromSession(request, MASTER_TENANT_ID)) || MASTER_TENANT_ID;

    if (!(await isDatabaseAvailable())) {
      return NextResponse.json({ config: null }, { status: 200 });
    }

    const configRow = await getOrSetRouteCache(
      `tenant-config:${tenantId}`,
      60_000,
      () => prisma.tenantConfig.findUnique({
        where: { tenantId },
        select: { data: true },
      })
    );

    return NextResponse.json({ config: configRow?.data ?? null }, { status: 200 });
  } catch (error) {
    console.error('[tenant-config] fallback to empty config:', error);
    return NextResponse.json({ config: null }, { status: 200 });
  }
}

export async function PUT(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    const email = session?.user?.email?.trim().toLowerCase();
    const role = session?.user?.role?.trim().toLowerCase() || '';
    const tenantIdFromQuery = new URL(request.url).searchParams.get('tenantId')?.trim() || null;
    if (!email) {
      return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 });
    }

    const isDeveloper = role === 'dev' || role === 'developer';
    const isMaster = isMasterTenantEmail(email);
    const resolvedTenantId = tenantIdFromQuery && (isDeveloper || isMaster)
      ? tenantIdFromQuery
      : (await getTenantIdFromSession(request, MASTER_TENANT_ID)) || MASTER_TENANT_ID;

    if (!(await isDatabaseAvailable())) {
      return NextResponse.json({ error: 'Database is unavailable.' }, { status: 503 });
    }

    if (!isDeveloper && !isMaster && !(await canManageTenantSettings(resolvedTenantId, email, session?.user?.role))) {
      return NextResponse.json({ error: 'You do not have permission to update tenant configuration.' }, { status: 403 });
    }

    const body = await request.json().catch(() => null);
    const config = body?.config;
    const copyMasterCoherenceMatrix = body?.copyMasterCoherenceMatrix === true;
    const replaceExistingCoherenceMatrix = body?.replaceExistingCoherenceMatrix === true;
    if (!config || typeof config !== 'object') {
      return NextResponse.json({ error: 'Invalid config payload.' }, { status: 400 });
    }
    if (copyMasterCoherenceMatrix && !isDeveloper && !isMaster) {
      return NextResponse.json(
        { error: 'Only Safeviate master administrators can copy the master coherence matrix.' },
        { status: 403 }
      );
    }
    if (copyMasterCoherenceMatrix && resolvedTenantId === MASTER_TENANT_ID) {
      return NextResponse.json(
        { error: 'The Safeviate master coherence matrix cannot be a copy destination.' },
        { status: 400 }
      );
    }

    await ensureTenantConfigSchema();

    const existingRow = await prisma.tenantConfig.findUnique({
      where: { tenantId: resolvedTenantId },
      select: { data: true },
    });

    const existingData = (existingRow?.data as Record<string, unknown>) || {};
    const existingMatrixEntries = readCoherenceMatrixEntries(existingData);
    if (copyMasterCoherenceMatrix && existingMatrixEntries.length > 0 && !replaceExistingCoherenceMatrix) {
      return NextResponse.json(
        { error: 'This tenant already has coherence matrix data. Confirm replacement before copying.' },
        { status: 409 }
      );
    }
    const matrixSnapshot = copyMasterCoherenceMatrix
      ? await createMasterCoherenceMatrixSnapshot()
      : null;
    const mergedData = {
      ...existingData,
      ...config,
      ...(matrixSnapshot ? { 'compliance-matrix': matrixSnapshot } : {}),
      ...(resolvedTenantId === MASTER_TENANT_ID ? { name: MASTER_TENANT_NAME } : {}),
    };

    await prisma.tenantConfig.upsert({
      where: { tenantId: resolvedTenantId },
      create: {
        tenantId: resolvedTenantId,
        data: mergedData,
      },
      update: {
        data: mergedData,
        updatedAt: new Date(),
      },
    });

    invalidateRouteCache(`tenant-config:${resolvedTenantId}`);

    return NextResponse.json({
      ok: true,
      config: mergedData,
      coherenceMatrixCopied: matrixSnapshot?.length ?? 0,
    }, { status: 200 });
  } catch (error) {
    console.error('[tenant-config] failed to save config:', error);
    return NextResponse.json(
      { error: 'Failed to save tenant configuration.' },
      { status: 500 }
    );
  }
}
