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

let schemaEnsurePromise: Promise<void> | null = null;

async function ensureTable(tableName: TableName, ddl: string) {
  const exists = await hasTable(tableName);
  if (exists) {
    return;
  }

  await prisma.$executeRawUnsafe(ddl);
  tableCache.set(tableName, true);
}

export async function ensureCoreSchema() {
  if (schemaEnsurePromise) {
    return schemaEnsurePromise;
  }

  schemaEnsurePromise = (async () => {
    await ensureTable(
      'tenants',
      `CREATE TABLE IF NOT EXISTS tenants (
        id VARCHAR(128) PRIMARY KEY,
        name TEXT NOT NULL,
        created_at TIMESTAMPTZ(6) NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ(6) NOT NULL DEFAULT NOW()
      )`
    );

    await ensureTable(
      'users',
      `CREATE TABLE IF NOT EXISTS users (
        id VARCHAR(128) PRIMARY KEY,
        tenant_id VARCHAR(128) NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
        email TEXT NOT NULL UNIQUE,
        password_hash TEXT,
        first_name TEXT NOT NULL DEFAULT '',
        last_name TEXT NOT NULL DEFAULT '',
        role TEXT NOT NULL DEFAULT 'developer',
        profile_path TEXT,
        created_at TIMESTAMPTZ(6) NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ(6) NOT NULL DEFAULT NOW()
      )`
    );

    await ensureTable(
      'roles',
      `CREATE TABLE IF NOT EXISTS roles (
        id VARCHAR(128) PRIMARY KEY,
        tenant_id VARCHAR(128) NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
        name TEXT NOT NULL,
        category TEXT NOT NULL DEFAULT 'Personnel',
        permissions JSONB NOT NULL DEFAULT '[]'::jsonb,
        required_documents JSONB,
        created_at TIMESTAMPTZ(6) NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ(6) NOT NULL DEFAULT NOW()
      )`
    );

    await ensureTable(
      'departments',
      `CREATE TABLE IF NOT EXISTS departments (
        id VARCHAR(128) PRIMARY KEY,
        tenant_id VARCHAR(128) NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
        name TEXT NOT NULL,
        created_at TIMESTAMPTZ(6) NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ(6) NOT NULL DEFAULT NOW()
      )`
    );

    await ensureTable(
      'personnel',
      `CREATE TABLE IF NOT EXISTS personnel (
        id VARCHAR(128) PRIMARY KEY,
        tenant_id VARCHAR(128) NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
        user_number TEXT,
        first_name TEXT NOT NULL,
        last_name TEXT NOT NULL,
        email TEXT NOT NULL,
        contact_number TEXT,
        department TEXT,
        role TEXT NOT NULL,
        permissions JSONB NOT NULL DEFAULT '[]'::jsonb,
        access_overrides JSONB,
        user_type TEXT NOT NULL DEFAULT 'Personnel',
        created_at TIMESTAMPTZ(6) NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ(6) NOT NULL DEFAULT NOW()
      )`
    );

    await ensureTable(
      'tenant_configs',
      `CREATE TABLE IF NOT EXISTS tenant_configs (
        id VARCHAR(128) PRIMARY KEY,
        tenant_id VARCHAR(128) NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
        data JSONB NOT NULL DEFAULT '{}'::jsonb,
        created_at TIMESTAMPTZ(6) NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ(6) NOT NULL DEFAULT NOW()
      )`
    );

    await ensureTable(
      'company_documents',
      `CREATE TABLE IF NOT EXISTS company_documents (
        id VARCHAR(128) PRIMARY KEY,
        tenant_id VARCHAR(128) NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
        name TEXT NOT NULL,
        url TEXT NOT NULL,
        upload_date TIMESTAMPTZ(6),
        expiration_date TIMESTAMPTZ(6),
        doc_type TEXT NOT NULL DEFAULT 'file',
        created_at TIMESTAMPTZ(6) NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ(6) NOT NULL DEFAULT NOW()
      )`
    );

    await ensureTable(
      'training_routes',
      `CREATE TABLE IF NOT EXISTS training_routes (
        id VARCHAR(128) PRIMARY KEY,
        tenant_id VARCHAR(128) NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
        data JSONB NOT NULL DEFAULT '{}'::jsonb,
        created_at TIMESTAMPTZ(6) NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ(6) NOT NULL DEFAULT NOW()
      )`
    );

    await ensureTable(
      'bookings',
      `CREATE TABLE IF NOT EXISTS bookings (
        id VARCHAR(128) PRIMARY KEY,
        tenant_id VARCHAR(128) NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
        data JSONB NOT NULL DEFAULT '{}'::jsonb,
        created_at TIMESTAMPTZ(6) NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ(6) NOT NULL DEFAULT NOW()
      )`
    );

    await ensureTable(
      'aircrafts',
      `CREATE TABLE IF NOT EXISTS aircrafts (
        id VARCHAR(128) PRIMARY KEY,
        tenant_id VARCHAR(128) NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
        data JSONB NOT NULL DEFAULT '{}'::jsonb,
        created_at TIMESTAMPTZ(6) NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ(6) NOT NULL DEFAULT NOW()
      )`
    );

    await ensureTable(
      'safety_reports',
      `CREATE TABLE IF NOT EXISTS safety_reports (
        id VARCHAR(128) PRIMARY KEY,
        tenant_id VARCHAR(128) NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
        data JSONB NOT NULL DEFAULT '{}'::jsonb,
        created_at TIMESTAMPTZ(6) NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ(6) NOT NULL DEFAULT NOW()
      )`
    );

    await ensureTable(
      'quality_audits',
      `CREATE TABLE IF NOT EXISTS quality_audits (
        id VARCHAR(128) PRIMARY KEY,
        tenant_id VARCHAR(128) NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
        data JSONB NOT NULL DEFAULT '{}'::jsonb,
        created_at TIMESTAMPTZ(6) NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ(6) NOT NULL DEFAULT NOW()
      )`
    );

    await ensureTable(
      'corrective_action_plans',
      `CREATE TABLE IF NOT EXISTS corrective_action_plans (
        id VARCHAR(128) PRIMARY KEY,
        tenant_id VARCHAR(128) NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
        data JSONB NOT NULL DEFAULT '{}'::jsonb,
        created_at TIMESTAMPTZ(6) NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ(6) NOT NULL DEFAULT NOW()
      )`
    );

    await ensureTable(
      'risks',
      `CREATE TABLE IF NOT EXISTS risks (
        id VARCHAR(128) PRIMARY KEY,
        tenant_id VARCHAR(128) NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
        data JSONB NOT NULL DEFAULT '{}'::jsonb,
        created_at TIMESTAMPTZ(6) NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ(6) NOT NULL DEFAULT NOW()
      )`
    );

    await ensureTable(
      'management_of_change',
      `CREATE TABLE IF NOT EXISTS management_of_change (
        id VARCHAR(128) PRIMARY KEY,
        tenant_id VARCHAR(128) NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
        data JSONB NOT NULL DEFAULT '{}'::jsonb,
        created_at TIMESTAMPTZ(6) NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ(6) NOT NULL DEFAULT NOW()
      )`
    );

    await ensureTable(
      'erp_state',
      `CREATE TABLE IF NOT EXISTS erp_state (
        id VARCHAR(128) PRIMARY KEY,
        tenant_id VARCHAR(128) NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
        category TEXT NOT NULL,
        data JSONB NOT NULL DEFAULT '[]'::jsonb,
        created_at TIMESTAMPTZ(6) NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ(6) NOT NULL DEFAULT NOW()
      )`
    );
  })().finally(() => {
    schemaEnsurePromise = null;
  });

  return schemaEnsurePromise;
}
