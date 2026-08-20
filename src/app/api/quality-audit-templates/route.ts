import { authOptions } from '@/auth';
import { prisma } from '@/lib/prisma';
import { getTenantIdFromSession } from '@/lib/server/session-tenant';
import { getServerSession } from 'next-auth';
import { NextResponse } from 'next/server';
import { randomUUID } from 'node:crypto';
import { markRecoveryArchivesRestoredForEntity, recordRecoveryArchive } from '@/lib/server/recovery-vault';

async function getTenantId(request: Request) {
  const session = await getServerSession(authOptions);
  const email = session?.user?.email?.trim().toLowerCase();
  if (!email) return null;
  return getTenantIdFromSession(request);
}

async function getConfig(tenantId: string) {
  const rows = await prisma.$queryRawUnsafe<{ data: unknown }[]>(
    `SELECT data FROM tenant_configs WHERE tenant_id = $1 LIMIT 1`,
    tenantId
  );
  return (rows[0]?.data as Record<string, unknown>) || {};
}

export async function GET(request: Request) {
  try {
    const tenantId = await getTenantId(request);
    if (!tenantId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    const config = await getConfig(tenantId);
    const archived = new URL(request.url).searchParams.get('view') === 'archived';
    const key = archived ? 'archived-quality-audit-templates' : 'quality-audit-templates';
    const templates = Array.isArray(config[key]) ? config[key] : [];
    return NextResponse.json({ templates }, { status: 200 });
  } catch (error) {
    console.error('[quality-audit-templates] failed to load tenant templates:', error);
    return NextResponse.json({ error: 'Unable to load audit templates.' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  const tenantId = await getTenantId(request);
  if (!tenantId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const body = await request.json().catch(() => null);
  const template = body?.template;
  if (!template || typeof template !== 'object') return NextResponse.json({ error: 'Invalid template payload' }, { status: 400 });
  const incoming = { ...template, id: (template as { id?: string }).id || randomUUID() };
  const config = await getConfig(tenantId);
  const templates = Array.isArray(config['quality-audit-templates']) ? (config['quality-audit-templates'] as Array<{ id: string } & Record<string, unknown>>) : [];
  const nextTemplates = templates.some((t) => t.id === incoming.id)
    ? templates.map((t) => (t.id === incoming.id ? incoming : t))
    : [incoming, ...templates];
  const nextConfig = { ...config, 'quality-audit-templates': nextTemplates };
  await prisma.$executeRawUnsafe(
    `INSERT INTO tenant_configs (tenant_id, data, created_at, updated_at) VALUES ($1, $2::jsonb, NOW(), NOW()) ON CONFLICT (tenant_id) DO UPDATE SET data = EXCLUDED.data, updated_at = NOW()`,
    tenantId,
    JSON.stringify(nextConfig)
  );
  return NextResponse.json({ template: incoming }, { status: 200 });
}

export async function DELETE(request: Request) {
  const tenantId = await getTenantId(request);
  if (!tenantId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const { searchParams } = new URL(request.url);
  const id = searchParams.get('id');
  if (!id) return NextResponse.json({ error: 'Missing id' }, { status: 400 });
  const config = await getConfig(tenantId);
  const templates = Array.isArray(config['quality-audit-templates']) ? (config['quality-audit-templates'] as Array<{ id: string } & Record<string, unknown>>) : [];
  const existing = templates.find((template) => template.id === id);
  if (!existing) return NextResponse.json({ error: 'Audit template not found.' }, { status: 404 });
  const session = await getServerSession(authOptions);
  const archivedTemplates = Array.isArray(config['archived-quality-audit-templates'])
    ? (config['archived-quality-audit-templates'] as Array<{ id: string } & Record<string, unknown>>)
    : [];
  const nextTemplates = templates.filter((t) => t.id !== id);
  const archivedTemplate = { ...existing, archivedAt: new Date().toISOString() };
  const nextArchivedTemplates = archivedTemplates.some((template) => template.id === id)
    ? archivedTemplates.map((template) => template.id === id ? archivedTemplate : template)
    : [archivedTemplate, ...archivedTemplates];
  const nextConfig = {
    ...config,
    'quality-audit-templates': nextTemplates,
    'archived-quality-audit-templates': nextArchivedTemplates,
  };
  await prisma.$transaction(async (tx) => {
    await recordRecoveryArchive({
      tenantId,
      entityType: 'audit-checklist',
      entityId: id,
      entityLabel: String(existing.title || id),
      snapshot: { template: existing },
      actorUserId: session?.user?.id || null,
      actorEmail: session?.user?.email?.trim().toLowerCase() || 'unknown',
    }, tx);
    await tx.$executeRawUnsafe(
      `INSERT INTO tenant_configs (tenant_id, data, created_at, updated_at) VALUES ($1, $2::jsonb, NOW(), NOW()) ON CONFLICT (tenant_id) DO UPDATE SET data = EXCLUDED.data, updated_at = NOW()`,
      tenantId,
      JSON.stringify(nextConfig)
    );
  });
  return NextResponse.json({ ok: true }, { status: 200 });
}

export async function PATCH(request: Request) {
  const tenantId = await getTenantId(request);
  if (!tenantId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const body = await request.json().catch(() => null);
  const id = typeof body?.id === 'string' ? body.id : '';
  if (!id) return NextResponse.json({ error: 'Missing id' }, { status: 400 });

  const config = await getConfig(tenantId);
  const templates = Array.isArray(config['quality-audit-templates'])
    ? (config['quality-audit-templates'] as Array<{ id: string } & Record<string, unknown>>)
    : [];
  const archivedTemplates = Array.isArray(config['archived-quality-audit-templates'])
    ? (config['archived-quality-audit-templates'] as Array<{ id: string } & Record<string, unknown>>)
    : [];
  const archivedTemplate = archivedTemplates.find((template) => template.id === id);
  if (!archivedTemplate) return NextResponse.json({ error: 'Archived audit template not found.' }, { status: 404 });
  const { archivedAt: _archivedAt, ...restoredTemplate } = archivedTemplate;
  const nextTemplates = templates.some((template) => template.id === id)
    ? templates.map((template) => template.id === id ? restoredTemplate : template)
    : [restoredTemplate, ...templates];
  const nextConfig = {
    ...config,
    'quality-audit-templates': nextTemplates,
    'archived-quality-audit-templates': archivedTemplates.filter((template) => template.id !== id),
  };
  const session = await getServerSession(authOptions);
  const actorEmail = session?.user?.email?.trim().toLowerCase();
  await prisma.$transaction(async (tx) => {
    await tx.$executeRawUnsafe(
      `INSERT INTO tenant_configs (tenant_id, data, created_at, updated_at) VALUES ($1, $2::jsonb, NOW(), NOW()) ON CONFLICT (tenant_id) DO UPDATE SET data = EXCLUDED.data, updated_at = NOW()`,
      tenantId,
      JSON.stringify(nextConfig)
    );
    if (actorEmail) {
      await markRecoveryArchivesRestoredForEntity(
        { tenantId, entityType: 'audit-checklist', entityId: id },
        { userId: session?.user?.id || null, email: actorEmail },
        tx,
      );
    }
  });
  return NextResponse.json({ template: restoredTemplate }, { status: 200 });
}
