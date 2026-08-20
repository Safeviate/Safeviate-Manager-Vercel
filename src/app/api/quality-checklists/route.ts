import { prisma } from '@/lib/prisma';
import { getTenantIdFromSession } from '@/lib/server/session-tenant';
import { NextResponse } from 'next/server';
import { randomUUID } from 'node:crypto';

async function getConfig(tenantId: string) {
  const rows = await prisma.$queryRawUnsafe<{ data: unknown }[]>(
    `SELECT data FROM tenant_configs WHERE tenant_id = $1 LIMIT 1`, tenantId,
  );
  return (rows[0]?.data as Record<string, unknown>) || {};
}

async function saveConfig(tenantId: string, data: Record<string, unknown>) {
  await prisma.$executeRawUnsafe(
    `INSERT INTO tenant_configs (tenant_id, data, created_at, updated_at) VALUES ($1, $2::jsonb, NOW(), NOW()) ON CONFLICT (tenant_id) DO UPDATE SET data = EXCLUDED.data, updated_at = NOW()`,
    tenantId, JSON.stringify(data),
  );
}

export async function GET(request: Request) {
  const tenantId = await getTenantIdFromSession(request);
  if (!tenantId) return NextResponse.json({ templates: [], checklists: [] }, { status: 200 });
  const config = await getConfig(tenantId);
  return NextResponse.json({
    templates: Array.isArray(config['quality-checklist-templates']) ? config['quality-checklist-templates'] : [],
    checklists: Array.isArray(config['quality-checklist-runs']) ? config['quality-checklist-runs'] : [],
  });
}

export async function POST(request: Request) {
  const tenantId = await getTenantIdFromSession(request);
  if (!tenantId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const body = await request.json().catch(() => null);
  const config = await getConfig(tenantId);

  if (body?.template && typeof body.template === 'object') {
    const template = { ...body.template, id: body.template.id || randomUUID() };
    const templates = Array.isArray(config['quality-checklist-templates']) ? config['quality-checklist-templates'] as Array<{ id: string }> : [];
    const next = templates.some((item) => item.id === template.id) ? templates.map((item) => item.id === template.id ? template : item) : [template, ...templates];
    await saveConfig(tenantId, { ...config, 'quality-checklist-templates': next });
    return NextResponse.json({ template });
  }

  if (body?.checklist && typeof body.checklist === 'object') {
    const checklist = { ...body.checklist, id: body.checklist.id || randomUUID() };
    const checklists = Array.isArray(config['quality-checklist-runs']) ? config['quality-checklist-runs'] as Array<{ id: string }> : [];
    const next = checklists.some((item) => item.id === checklist.id) ? checklists.map((item) => item.id === checklist.id ? checklist : item) : [checklist, ...checklists];
    await saveConfig(tenantId, { ...config, 'quality-checklist-runs': next });
    return NextResponse.json({ checklist });
  }

  return NextResponse.json({ error: 'A checklist template or checklist run is required.' }, { status: 400 });
}

export async function PATCH(request: Request) {
  const tenantId = await getTenantIdFromSession(request);
  if (!tenantId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const body = await request.json().catch(() => null);
  const id = typeof body?.id === 'string' ? body.id : '';
  const entity = body?.entity === 'run' ? 'run' : body?.entity === 'template' ? 'template' : null;
  const action = body?.action === 'restore' ? 'restore' : body?.action === 'archive' ? 'archive' : null;
  if (!id || !entity || !action) return NextResponse.json({ error: 'Checklist archive request is incomplete.' }, { status: 400 });

  const config = await getConfig(tenantId);
  const key = entity === 'template' ? 'quality-checklist-templates' : 'quality-checklist-runs';
  const records = Array.isArray(config[key]) ? config[key] as Array<Record<string, unknown>> : [];
  if (!records.some((record) => record.id === id)) return NextResponse.json({ error: 'Checklist record not found.' }, { status: 404 });
  const nextRecords = records.map((record) => {
    if (record.id !== id) return record;
    if (entity === 'template') {
      const { archivedAt: _archivedAt, ...activeTemplate } = record;
      return action === 'archive' ? { ...record, archivedAt: new Date().toISOString() } : activeTemplate;
    }
    return { ...record, status: action === 'archive' ? 'Archived' : 'In Progress' };
  });
  await saveConfig(tenantId, { ...config, [key]: nextRecords });
  return NextResponse.json({ ok: true });
}
