import { prisma } from '@/lib/prisma';
import { getTenantIdFromSession } from '@/lib/server/session-tenant';
import { NextResponse } from 'next/server';
import { randomUUID } from 'node:crypto';

type FacilityMaintenanceReport = {
  id: string;
  facilityId: string;
  zoneId?: string;
  assetId?: string;
  title: string;
  category: string;
  description?: string;
  priority: 'Low' | 'Medium' | 'High' | 'Critical';
  operationalImpact: 'Serviceable' | 'Restricted' | 'Out of service';
  status: 'Open' | 'Assigned' | 'In progress' | 'Closed';
  assignedTo?: string;
  dueDate?: string;
  verificationNotes?: string;
  reportedBy?: string;
  reportedByEmail?: string;
  createdAt: string;
  updatedAt: string;
  closedAt?: string;
};

const priorities = new Set<FacilityMaintenanceReport['priority']>(['Low', 'Medium', 'High', 'Critical']);
const impacts = new Set<FacilityMaintenanceReport['operationalImpact']>(['Serviceable', 'Restricted', 'Out of service']);
const statuses = new Set<FacilityMaintenanceReport['status']>(['Open', 'Assigned', 'In progress', 'Closed']);

function text(value: unknown) {
  return typeof value === 'string' ? value.trim() : '';
}

function toDate(value: unknown) {
  const input = text(value);
  return input && !Number.isNaN(Date.parse(input)) ? input : '';
}

function sanitizeReport(value: unknown): FacilityMaintenanceReport | null {
  if (!value || typeof value !== 'object') return null;
  const input = value as Record<string, unknown>;
  const title = text(input.title);
  const facilityId = text(input.facilityId);
  if (!title || !facilityId) return null;
  const now = new Date().toISOString();
  const status = text(input.status);
  const closedAt = toDate(input.closedAt);
  return {
    id: text(input.id) || randomUUID(),
    facilityId,
    zoneId: text(input.zoneId),
    assetId: text(input.assetId),
    title,
    category: text(input.category) || 'General facility',
    description: text(input.description),
    priority: priorities.has(text(input.priority) as FacilityMaintenanceReport['priority']) ? text(input.priority) as FacilityMaintenanceReport['priority'] : 'Medium',
    operationalImpact: impacts.has(text(input.operationalImpact) as FacilityMaintenanceReport['operationalImpact']) ? text(input.operationalImpact) as FacilityMaintenanceReport['operationalImpact'] : 'Serviceable',
    status: statuses.has(status as FacilityMaintenanceReport['status']) ? status as FacilityMaintenanceReport['status'] : 'Open',
    assignedTo: text(input.assignedTo),
    dueDate: toDate(input.dueDate),
    verificationNotes: text(input.verificationNotes),
    reportedBy: text(input.reportedBy),
    reportedByEmail: text(input.reportedByEmail),
    createdAt: toDate(input.createdAt) || now,
    updatedAt: now,
    closedAt: status === 'Closed' ? closedAt || now : '',
  };
}

async function getConfig(tenantId: string) {
  const rows = await prisma.$queryRawUnsafe<{ data: Record<string, unknown> }[]>(
    'SELECT data FROM tenant_configs WHERE tenant_id = $1 LIMIT 1', tenantId,
  );
  return rows[0]?.data || {};
}

async function saveReports(tenantId: string, reports: FacilityMaintenanceReport[]) {
  const config = await getConfig(tenantId);
  await prisma.$executeRawUnsafe(
    'INSERT INTO tenant_configs (tenant_id, data, created_at, updated_at) VALUES ($1, $2::jsonb, NOW(), NOW()) ON CONFLICT (tenant_id) DO UPDATE SET data = EXCLUDED.data, updated_at = NOW()',
    tenantId,
    JSON.stringify({ ...config, facilityMaintenanceReports: reports }),
  );
}

async function loadReports(tenantId: string) {
  const config = await getConfig(tenantId);
  return Array.isArray(config.facilityMaintenanceReports)
    ? config.facilityMaintenanceReports.map(sanitizeReport).filter((report): report is FacilityMaintenanceReport => Boolean(report))
    : [];
}

export async function GET(request: Request) {
  try {
    const tenantId = await getTenantIdFromSession(request);
    if (!tenantId) return NextResponse.json({ reports: [] });
    const reports = await loadReports(tenantId);
    return NextResponse.json({ reports: reports.sort((a, b) => b.updatedAt.localeCompare(a.updatedAt)) });
  } catch (error) {
    console.error('[facility-maintenance-reports] fallback to empty list:', error);
    return NextResponse.json({ reports: [] });
  }
}

export async function POST(request: Request) {
  const tenantId = await getTenantIdFromSession(request);
  if (!tenantId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const payload = await request.json().catch(() => null);
  const report = sanitizeReport(payload?.report);
  if (!report) return NextResponse.json({ error: 'Facility and report title are required.' }, { status: 400 });

  const config = await getConfig(tenantId);
  const facilities = Array.isArray(config.facilities) ? config.facilities as { id?: unknown }[] : [];
  if (!facilities.some((facility) => text(facility.id) === report.facilityId)) {
    return NextResponse.json({ error: 'Facility not found.' }, { status: 404 });
  }

  const reports = await loadReports(tenantId);
  const saved = { ...report, updatedAt: new Date().toISOString() };
  const next = reports.some((item) => item.id === saved.id)
    ? reports.map((item) => item.id === saved.id ? saved : item)
    : [...reports, saved];
  await saveReports(tenantId, next);
  return NextResponse.json({ report: saved });
}
