import { jsonb, pgTable, text, timestamp, varchar, boolean } from 'drizzle-orm/pg-core';

export const tenants = pgTable('tenants', {
  id: varchar('id', { length: 128 }).primaryKey(),
  name: text('name').notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
});

export const tenantConfigs = pgTable('tenant_configs', {
  tenantId: varchar('tenant_id', { length: 128 }).primaryKey().references(() => tenants.id, { onDelete: 'cascade' }),
  data: jsonb('data').notNull().default({}),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
});

export const users = pgTable('users', {
  id: varchar('id', { length: 128 }).primaryKey(),
  tenantId: varchar('tenant_id', { length: 128 }).notNull().references(() => tenants.id, { onDelete: 'cascade' }),
  email: text('email').notNull().unique(),
  passwordHash: text('password_hash'),
  firstName: text('first_name').notNull().default(''),
  lastName: text('last_name').notNull().default(''),
  role: text('role').notNull().default('developer'),
  profilePath: text('profile_path'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
});

export const roles = pgTable('roles', {
  id: varchar('id', { length: 128 }).primaryKey(),
  tenantId: varchar('tenant_id', { length: 128 }).notNull().references(() => tenants.id, { onDelete: 'cascade' }),
  name: text('name').notNull(),
  category: text('category').notNull().default('Personnel'),
  permissions: jsonb('permissions').notNull().default([]),
  requiredDocuments: jsonb('required_documents'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
});

export const departments = pgTable('departments', {
  id: varchar('id', { length: 128 }).primaryKey(),
  tenantId: varchar('tenant_id', { length: 128 }).notNull().references(() => tenants.id, { onDelete: 'cascade' }),
  name: text('name').notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
});

export const personnel = pgTable('personnel', {
  id: varchar('id', { length: 128 }).primaryKey(),
  tenantId: varchar('tenant_id', { length: 128 }).notNull().references(() => tenants.id, { onDelete: 'cascade' }),
  userNumber: text('user_number'),
  firstName: text('first_name').notNull(),
  lastName: text('last_name').notNull(),
  email: text('email').notNull(),
  contactNumber: text('contact_number'),
  organizationId: text('organization_id'),
  department: text('department'),
  role: text('role').notNull(),
  permissions: jsonb('permissions').notNull().default([]),
  accessOverrides: jsonb('access_overrides'),
  userType: text('user_type').notNull().default('Personnel'),
  isErpIncerfaContact: boolean('is_erp_incerfa_contact').notNull().default(false),
  isErpAlerfaContact: boolean('is_erp_alerfa_contact').notNull().default(false),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
});

export const managementOfChange = pgTable('management_of_change', {
  id: varchar('id', { length: 128 }).primaryKey(),
  tenantId: varchar('tenant_id', { length: 128 }).notNull().references(() => tenants.id, { onDelete: 'cascade' }),
  data: jsonb('data').notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
});

export const qualityAudits = pgTable('quality_audits', {
  id: varchar('id', { length: 128 }).primaryKey(),
  tenantId: varchar('tenant_id', { length: 128 }).notNull().references(() => tenants.id, { onDelete: 'cascade' }),
  data: jsonb('data').notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
});

export const safetyReports = pgTable('safety_reports', {
  id: varchar('id', { length: 128 }).primaryKey(),
  tenantId: varchar('tenant_id', { length: 128 }).notNull().references(() => tenants.id, { onDelete: 'cascade' }),
  data: jsonb('data').notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
});

export const correctiveActionPlans = pgTable('corrective_action_plans', {
  id: varchar('id', { length: 128 }).primaryKey(),
  tenantId: varchar('tenant_id', { length: 128 }).notNull().references(() => tenants.id, { onDelete: 'cascade' }),
  data: jsonb('data').notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
});

export const risks = pgTable('risks', {
  id: varchar('id', { length: 128 }).primaryKey(),
  tenantId: varchar('tenant_id', { length: 128 }).notNull().references(() => tenants.id, { onDelete: 'cascade' }),
  data: jsonb('data').notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
});

export const aircrafts = pgTable('aircrafts', {
  id: varchar('id', { length: 128 }).primaryKey(),
  tenantId: varchar('tenant_id', { length: 128 }).notNull().references(() => tenants.id, { onDelete: 'cascade' }),
  data: jsonb('data').notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
});

export const vehicles = pgTable('vehicles', {
  id: varchar('id', { length: 128 }).primaryKey(),
  tenantId: varchar('tenant_id', { length: 128 }).notNull().references(() => tenants.id, { onDelete: 'cascade' }),
  data: jsonb('data').notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
});

export const bookings = pgTable('bookings', {
  id: varchar('id', { length: 128 }).primaryKey(),
  tenantId: varchar('tenant_id', { length: 128 }).notNull().references(() => tenants.id, { onDelete: 'cascade' }),
  data: jsonb('data').notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
});

export const vehicleUsageRecords = pgTable('vehicle_usage_records', {
  id: varchar('id', { length: 128 }).primaryKey(),
  tenantId: varchar('tenant_id', { length: 128 }).notNull().references(() => tenants.id, { onDelete: 'cascade' }),
  data: jsonb('data').notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
});

export const trainingRoutes = pgTable('training_routes', {
  id: varchar('id', { length: 128 }).primaryKey(),
  tenantId: varchar('tenant_id', { length: 128 }).notNull().references(() => tenants.id, { onDelete: 'cascade' }),
  data: jsonb('data').notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
});

export const companyDocuments = pgTable('company_documents', {
  id: varchar('id', { length: 128 }).primaryKey(),
  tenantId: varchar('tenant_id', { length: 128 }).notNull().references(() => tenants.id, { onDelete: 'cascade' }),
  name: text('name').notNull(),
  url: text('url').notNull(),
  uploadDate: timestamp('upload_date', { withTimezone: true }).notNull().defaultNow(),
  expirationDate: timestamp('expiration_date', { withTimezone: true }),
  docType: text('doc_type').notNull().default('file'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
});

export const externalOrganizations = pgTable('external_organizations', {
  id: varchar('id', { length: 128 }).primaryKey(),
  tenantId: varchar('tenant_id', { length: 128 }).notNull().references(() => tenants.id, { onDelete: 'cascade' }),
  data: jsonb('data').notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
});

export const erpState = pgTable('erp_state', {
  id: varchar('id', { length: 128 }).primaryKey(),
  tenantId: varchar('tenant_id', { length: 128 }).notNull().references(() => tenants.id, { onDelete: 'cascade' }),
  category: text('category').notNull(),
  data: jsonb('data').notNull().default([]),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
});

export const workpacks = pgTable('workpacks', {
  id: varchar('id', { length: 128 }).primaryKey(),
  tenantId: varchar('tenant_id', { length: 128 }).notNull().references(() => tenants.id, { onDelete: 'cascade' }),
  data: jsonb('data').notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
});

export const maintenanceTaskCards = pgTable('maintenance_task_cards', {
  id: varchar('id', { length: 128 }).primaryKey(),
  tenantId: varchar('tenant_id', { length: 128 }).notNull().references(() => tenants.id, { onDelete: 'cascade' }),
  data: jsonb('data').notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
});

export const tools = pgTable('tools', {
  id: varchar('id', { length: 128 }).primaryKey(),
  tenantId: varchar('tenant_id', { length: 128 }).notNull().references(() => tenants.id, { onDelete: 'cascade' }),
  data: jsonb('data').notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
});

export type TenantRow = typeof tenants.$inferSelect;
export type NewTenantRow = typeof tenants.$inferInsert;
export type UserRow = typeof users.$inferSelect;
export type NewUserRow = typeof users.$inferInsert;

export const activeFlightSessions = pgTable('active_flight_sessions', {
  id: varchar('id', { length: 128 }).primaryKey(),
  tenantId: varchar('tenant_id', { length: 128 }).notNull().references(() => tenants.id, { onDelete: 'cascade' }),
  data: jsonb('data').notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
});

export const alerts = pgTable('alerts', {
  id: varchar('id', { length: 128 }).primaryKey(),
  tenantId: varchar('tenant_id', { length: 128 }).notNull().references(() => tenants.id, { onDelete: 'cascade' }),
  data: jsonb('data').notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
});
