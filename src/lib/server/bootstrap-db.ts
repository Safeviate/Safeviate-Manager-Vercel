import { prisma } from '@/lib/prisma';

type TableName =
  | 'users'
  | 'tenants'
  | 'roles'
  | 'departments'
  | 'personnel'
  | 'tenant_configs'
  | 'alerts'
  | 'company_documents'
  | 'training_routes'
  | 'bookings'
  | 'aircrafts'
  | 'active_flight_sessions'
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
      `SELECT to_regclass('public.${tableName}')::text AS exists`
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

export async function ensureAircraftSchema() {
  if (await hasTable('aircrafts')) {
    return;
  }

  await prisma.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS aircrafts (
      id VARCHAR(128) PRIMARY KEY,
      tenant_id VARCHAR(128) NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
      data JSONB NOT NULL,
      created_at TIMESTAMPTZ(6) NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ(6) NOT NULL DEFAULT NOW()
    )
  `);
  tableCache.set('aircrafts', true);
}

export async function ensureTenantConfigSchema() {
  if (await hasTable('tenant_configs')) {
    return;
  }

  await prisma.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS tenant_configs (
      tenant_id VARCHAR(128) PRIMARY KEY REFERENCES tenants(id) ON DELETE CASCADE,
      data JSONB NOT NULL DEFAULT '{}'::jsonb,
      created_at TIMESTAMPTZ(6) NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ(6) NOT NULL DEFAULT NOW()
    )
  `);
  tableCache.set('tenant_configs', true);
}

export async function ensureAlertsSchema() {
  if (await hasTable('alerts')) {
    return;
  }

  await prisma.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS alerts (
      id VARCHAR(128) PRIMARY KEY,
      tenant_id VARCHAR(128) NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
      data JSONB NOT NULL,
      created_at TIMESTAMPTZ(6) NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ(6) NOT NULL DEFAULT NOW()
    )
  `);
  tableCache.set('alerts', true);
}

export async function ensureCompanyDocumentsSchema() {
  if (await hasTable('company_documents')) {
    return;
  }

  await prisma.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS company_documents (
      id VARCHAR(128) PRIMARY KEY,
      tenant_id VARCHAR(128) NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
      name TEXT NOT NULL,
      url TEXT NOT NULL,
      upload_date TIMESTAMPTZ(6) NOT NULL DEFAULT NOW(),
      expiration_date TIMESTAMPTZ(6),
      doc_type TEXT NOT NULL DEFAULT 'file',
      created_at TIMESTAMPTZ(6) NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ(6) NOT NULL DEFAULT NOW()
    )
  `);
  tableCache.set('company_documents', true);
}

export async function ensureErpStateSchema() {
  if (await hasTable('erp_state')) {
    return;
  }

  await prisma.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS erp_state (
      id VARCHAR(128) PRIMARY KEY,
      tenant_id VARCHAR(128) NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
      category TEXT NOT NULL,
      data JSONB NOT NULL DEFAULT '[]'::jsonb,
      created_at TIMESTAMPTZ(6) NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ(6) NOT NULL DEFAULT NOW()
    )
  `);
  tableCache.set('erp_state', true);
}

export async function ensureBookingsSchema() {
  if (await hasTable('bookings')) {
    return;
  }

  await prisma.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS bookings (
      id VARCHAR(128) PRIMARY KEY,
      tenant_id VARCHAR(128) NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
      data JSONB NOT NULL,
      created_at TIMESTAMPTZ(6) NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ(6) NOT NULL DEFAULT NOW()
    )
  `);
  tableCache.set('bookings', true);
}

export async function ensureFlightSessionsSchema() {
  if (await hasTable('active_flight_sessions')) {
    return;
  }

  await prisma.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS active_flight_sessions (
      id VARCHAR(128) PRIMARY KEY,
      tenant_id VARCHAR(128) NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
      data JSONB NOT NULL,
      created_at TIMESTAMPTZ(6) NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ(6) NOT NULL DEFAULT NOW()
    )
  `);
  tableCache.set('active_flight_sessions', true);
}

export async function ensurePersonnelSchema() {
  if (!(await hasTable('personnel'))) {
    return;
  }

  const columns = await prisma.$queryRawUnsafe<{ column_name: string }[]>(
    `SELECT column_name FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'personnel'`
  );
  const columnNames = new Set(columns.map((row) => row.column_name));

  const addColumn = async (columnSql: string) => {
    await prisma.$executeRawUnsafe(`ALTER TABLE personnel ADD COLUMN IF NOT EXISTS ${columnSql}`);
  };

  if (!columnNames.has('organization_id')) {
    await addColumn('organization_id VARCHAR(128)');
    columnNames.add('organization_id');
  }

  if (!columnNames.has('is_erp_incerfa_contact')) {
    await addColumn('is_erp_incerfa_contact BOOLEAN NOT NULL DEFAULT FALSE');
    columnNames.add('is_erp_incerfa_contact');
  }

  if (!columnNames.has('is_erp_alerfa_contact')) {
    await addColumn('is_erp_alerfa_contact BOOLEAN NOT NULL DEFAULT FALSE');
    columnNames.add('is_erp_alerfa_contact');
  }

  if (!columnNames.has('access_overrides')) {
    await addColumn('access_overrides JSONB');
    columnNames.add('access_overrides');
  }

  if (!columnNames.has('permissions')) {
    await addColumn('permissions JSONB NOT NULL DEFAULT \'[]\'::jsonb');
    columnNames.add('permissions');
  }

  if (!columnNames.has('can_be_instructor')) {
    await addColumn('can_be_instructor BOOLEAN NOT NULL DEFAULT FALSE');
    columnNames.add('can_be_instructor');
  }

  if (!columnNames.has('can_be_student')) {
    await addColumn('can_be_student BOOLEAN NOT NULL DEFAULT FALSE');
    columnNames.add('can_be_student');
  }
}
