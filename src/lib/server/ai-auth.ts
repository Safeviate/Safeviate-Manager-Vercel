import { authOptions } from '@/auth';
import { isDatabaseAvailable, prisma } from '@/lib/prisma';
import { ensureRolesSchema } from '@/lib/server/bootstrap-db';
import { resolveTenantOverride } from '@/lib/server/tenant-access';
import { normalizePermissionIds } from '@/lib/permission-model';
import { getServerSession } from 'next-auth';

type DbUserProfile = {
  id: string;
  role: string;
  permissions?: string[];
};

type FlowPermissionRule = {
  anyOf: string[];
};

export const aiFlowPermissions: Record<string, FlowPermissionRule> = {
  analyzeMoc: { anyOf: ['moc-manage'] },
  generateChecklist: { anyOf: ['quality-templates-manage', 'quality-audits-manage'] },
  generateExam: { anyOf: ['training-exams-manage'] },
  generateSafetyProtocolRecommendations: { anyOf: ['safety-view', 'safety-reports-manage'] },
  parseLogbook: { anyOf: ['development-view'] },
  summarizeDocument: { anyOf: ['operations-documents-manage', 'quality-view', 'safety-view'] },
  summarizeMaintenanceLogs: { anyOf: ['assets-view', 'assets-edit'] },
};

const SUPER_USERS = ['deanebolton@gmail.com', 'barry@safeviate.com'];

export async function authenticateAiRequest(request?: Request) {
  const session = await getServerSession(authOptions);
  const email = session?.user?.email?.trim().toLowerCase();

  if (!email) {
    return { ok: false as const, status: 401, error: 'You must be signed in to use AI tools.' };
  }

  if (SUPER_USERS.includes(email)) {
    const tenantId = request ? await resolveTenantOverride(request, email, 'safeviate') : 'safeviate';
    return {
      ok: true as const,
      tenantId,
      userProfile: { id: session?.user?.id || email, role: 'developer', permissions: ['*'] },
      effectivePermissions: new Set(['*']),
      deniedPermissions: new Set<string>(),
    };
  }

  if (!(await isDatabaseAvailable())) {
    return {
      ok: false as const,
      status: 503,
      error: 'Database is unavailable.',
    };
  }

  await prisma.tenant.upsert({
    where: { id: 'safeviate' },
    update: { updatedAt: new Date() },
    create: { id: 'safeviate', name: 'Safeviate' },
  });

  await ensureRolesSchema();

  const currentUser = await prisma.user.findUnique({
    where: { email },
  });

  if (!currentUser) {
    return { ok: false as const, status: 403, error: 'No profile is linked to this account.' };
  }

  const selectedTenantId = request
    ? await resolveTenantOverride(request, email, currentUser.tenantId)
    : currentUser.tenantId;

  const personnelProfile = await prisma.personnel.findFirst({
    where: {
      tenantId: selectedTenantId,
      email,
    },
    select: {
      role: true,
      permissions: true,
    },
  });

  const selectedRoleId = personnelProfile?.role?.trim() || currentUser.role;
  const roleRows = await prisma.role.findMany({ where: { tenantId: selectedTenantId } });
  const roleRow =
    roleRows.find((role) => role.id === selectedRoleId || role.name === selectedRoleId) ||
    roleRows.find((role) => role.id === currentUser.role || role.name === currentUser.role) ||
    roleRows[0] ||
    null;
  const inheritedPermissions = normalizePermissionIds(
    Array.isArray(roleRow?.permissions) ? (roleRow.permissions as string[]) : []
  );
  const overridePermissions = normalizePermissionIds(
    Array.isArray(personnelProfile?.permissions) ? (personnelProfile.permissions as string[]) : []
  );
  const deniedPermissions = new Set(
    overridePermissions.filter((permission) => permission.startsWith('!')).map((permission) => permission.slice(1))
  );
  const effectivePermissions = new Set<string>();

  inheritedPermissions.forEach((permission) => {
    if (!deniedPermissions.has(permission)) {
      effectivePermissions.add(permission);
    }
  });

  overridePermissions
    .filter((permission) => !permission.startsWith('!'))
    .forEach((permission) => {
      effectivePermissions.add(permission);
    });

  return {
    ok: true as const,
    tenantId: selectedTenantId,
    userProfile: { id: currentUser.id, role: selectedRoleId, permissions: Array.from(effectivePermissions) } satisfies DbUserProfile,
    effectivePermissions,
    deniedPermissions,
  };
}

export function isAuthorizedForAiFlow(flow: string, userProfile: DbUserProfile, effectivePermissions: Set<string>) {
  if (effectivePermissions.has('*')) return true;

  const role = userProfile.role?.toLowerCase();
  if (role === 'dev' || role === 'developer') {
    return true;
  }

  const rule = aiFlowPermissions[flow];
  if (!rule) return false;

  return rule.anyOf.some((permission) => effectivePermissions.has(permission));
}
