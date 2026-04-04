import { prisma } from '@/lib/prisma';

type TableName =
  | 'users'
  | 'tenants'
  | 'roles'
  | 'departments'
  | 'personnel'
  | 'tenant_configs'
  | 'company_documents'
  | 'training_routes'
  | 'bookings'
  | 'aircrafts'
  | 'safety_reports'
  | 'quality_audits'
  | 'corrective_action_plans'
  | 'risks'
  | 'management_of_change'
  | 'erp_state';

const tableCache = new Map<TableName, boolean>();

async function hasTable(tableName: TableName) {
  if (tableCache.has(tableName)) {
    return tableCache.get(tableName)!;
  }

  try {
    const rows = await prisma.$queryRawUnsafe<{ exists: string | null }[]>(
      `SELECT to_regclass('public.${tableName}') AS exists`
    );
    const exists = Boolean(rows[0]?.exists);
    tableCache.set(tableName, exists);
    return exists;
  } catch {
    tableCache.set(tableName, false);
    return false;
  }
}

export async function getBootstrapDbState() {
  const [hasUsers, hasTenants, hasRoles, hasPersonnel] = await Promise.all([
    hasTable('users'),
    hasTable('tenants'),
    hasTable('roles'),
    hasTable('personnel'),
  ]);

  return {
    hasUsers,
    hasTenants,
    hasRoles,
    hasPersonnel,
    bootstrapMode: !hasUsers || !hasTenants,
  };
}

export function getBootstrapProfile(email?: string | null) {
  return {
    id: 'bootstrap-admin',
    tenantId: 'safeviate',
    email: email || 'bootstrap@safeviate.local',
    firstName: 'Bootstrap',
    lastName: 'Admin',
    role: 'developer',
    profilePath: null,
    passwordHash: null,
    createdAt: new Date(),
    updatedAt: new Date(),
  };
}

export async function ensureCoreSchema() {
  // Intentionally no-op in production hot paths.
  // Schema provisioning should happen out-of-band to avoid connection spikes.
  return;
}
