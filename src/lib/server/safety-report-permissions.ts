import { authOptions } from '@/auth';
import { hasHierarchicalPermission, normalizePermissionIds } from '@/lib/permission-model';
import { prisma } from '@/lib/prisma';
import { isMasterTenantEmail } from '@/lib/server/tenant-access';
import { getServerSession } from 'next-auth';

function mergePermissions(rolePermissions: unknown, userPermissions: unknown) {
  const inherited = Array.isArray(rolePermissions)
    ? rolePermissions.filter((permission): permission is string => typeof permission === 'string')
    : [];
  const overrides = Array.isArray(userPermissions)
    ? userPermissions.filter((permission): permission is string => typeof permission === 'string')
    : [];
  const deniedPermissions = new Set(
    normalizePermissionIds(overrides.filter((permission) => permission.startsWith('!')).map((permission) => permission.slice(1))),
  );
  const grantedPermissions = new Set<string>();

  normalizePermissionIds(inherited).forEach((permission) => {
    if (!deniedPermissions.has(permission)) grantedPermissions.add(permission);
  });
  normalizePermissionIds(overrides.filter((permission) => !permission.startsWith('!'))).forEach((permission) => {
    grantedPermissions.add(permission);
  });

  return { grantedPermissions, deniedPermissions };
}

/** Resolves Safety Report edit access within the current tenant only. */
export async function canEditSafetyReportsForTenant(tenantId: string) {
  const session = await getServerSession(authOptions);
  const email = session?.user?.email?.trim().toLowerCase();
  if (!email) return false;

  // The Safeviate master account must retain full tenant-wide access.
  if (isMasterTenantEmail(email)) return true;

  const personnel = await prisma.personnel.findFirst({
    where: { tenantId, email: { equals: email, mode: 'insensitive' } },
    select: { role: true, permissions: true },
  });
  if (!personnel) return false;

  const roleIdentifier = personnel.role?.trim();
  const role = roleIdentifier
    ? await prisma.role.findFirst({
        where: { tenantId, OR: [{ id: roleIdentifier }, { name: roleIdentifier }] },
        select: { permissions: true },
      })
    : null;
  const { grantedPermissions, deniedPermissions } = mergePermissions(role?.permissions, personnel.permissions);

  return grantedPermissions.has('*')
    || hasHierarchicalPermission(grantedPermissions, 'admin-view', deniedPermissions)
    || hasHierarchicalPermission(grantedPermissions, 'safety-reports-edit', deniedPermissions);
}
