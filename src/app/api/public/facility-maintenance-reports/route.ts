import { prisma } from '@/lib/prisma';
import { resolveQuickReportContext } from '@/lib/server/quick-report-context';
import { NextResponse } from 'next/server';
import { randomUUID } from 'node:crypto';

function text(value: unknown) {
  return typeof value === 'string' ? value.trim() : '';
}

export async function POST(request: Request) {
  try {
    const payload = await request.json().catch(() => null);
    const input = payload?.report as Record<string, unknown> | undefined;
    const context = await resolveQuickReportContext({ request, publicTenantId: text(input?.tenantId) || null });
    if (!context) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const facilityId = text(input?.facilityId);
    const title = text(input?.title);
    const description = text(input?.description);
    if (!facilityId || !title || !description) return NextResponse.json({ error: 'Facility, issue title, and description are required.' }, { status: 400 });

    const rows = await prisma.$queryRawUnsafe<{ data: Record<string, unknown> }[]>(
      'SELECT data FROM tenant_configs WHERE tenant_id = $1 LIMIT 1', context.tenantId,
    );
    const config = rows[0]?.data || {};
    const facilities = Array.isArray(config.facilities) ? config.facilities as Record<string, unknown>[] : [];
    if (!facilities.some((facility) => text(facility.id) === facilityId)) return NextResponse.json({ error: 'Facility not found.' }, { status: 404 });

    const now = new Date().toISOString();
    const report = {
      id: randomUUID(),
      facilityId,
      title,
      category: text(input?.category) || 'General facility',
      description,
      priority: ['Low', 'Medium', 'High', 'Critical'].includes(text(input?.priority)) ? text(input?.priority) : 'Medium',
      operationalImpact: ['Serviceable', 'Restricted', 'Out of service'].includes(text(input?.operationalImpact)) ? text(input?.operationalImpact) : 'Serviceable',
      status: 'Open',
      reportedBy: text(input?.reportedBy) || context.userName,
      reportedByEmail: text(input?.reportedByEmail) || context.email || '',
      createdAt: now,
      updatedAt: now,
    };
    const existing = Array.isArray(config.facilityMaintenanceReports) ? config.facilityMaintenanceReports : [];
    await prisma.$executeRawUnsafe(
      'INSERT INTO tenant_configs (tenant_id, data, created_at, updated_at) VALUES ($1, $2::jsonb, NOW(), NOW()) ON CONFLICT (tenant_id) DO UPDATE SET data = EXCLUDED.data, updated_at = NOW()',
      context.tenantId,
      JSON.stringify({ ...config, facilityMaintenanceReports: [report, ...existing] }),
    );
    return NextResponse.json({ report }, { status: 201 });
  } catch (error) {
    console.error('[public-facility-maintenance-reports] submit failed:', error);
    return NextResponse.json({ error: 'Could not submit the facility report.' }, { status: 500 });
  }
}
