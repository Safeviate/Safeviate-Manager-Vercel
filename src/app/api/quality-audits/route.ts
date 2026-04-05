import { authOptions } from '@/auth';
import { prisma } from '@/lib/prisma';
import { getServerSession } from 'next-auth';
import { NextResponse } from 'next/server';
import { randomUUID } from 'node:crypto';

async function getTenantId() {
  const session = await getServerSession(authOptions);
  const email = session?.user?.email?.trim().toLowerCase();
  if (!email) return null;
  const currentUser = await prisma.user.findUnique({ where: { email }, select: { tenantId: true } });
  return currentUser?.tenantId || 'safeviate';
}

async function getConfig(tenantId: string) {
  const rows = await prisma.$queryRawUnsafe<{ data: unknown }[]>(
    `SELECT data FROM tenant_configs WHERE tenant_id = $1 LIMIT 1`,
    tenantId
  );
  return (rows[0]?.data as any) || {};
}

async function loadAudits(tenantId: string) {
  const rows = await prisma.$queryRawUnsafe<{ id: string; data: unknown }[]>(
    `SELECT id, data FROM quality_audits WHERE tenant_id = $1 ORDER BY created_at DESC`,
    tenantId
  );
  return rows.map((row) => row.data);
}

async function loadCaps(tenantId: string) {
  const rows = await prisma.$queryRawUnsafe<{ id: string; data: unknown }[]>(
    `SELECT id, data FROM corrective_action_plans WHERE tenant_id = $1 ORDER BY created_at DESC`,
    tenantId
  );
  return rows.map((row) => row.data);
}

export async function GET() {
  try {
    const tenantId = await getTenantId();
    if (!tenantId) return NextResponse.json({ audits: [], templates: [], personnel: [], departments: [], organizations: [], caps: [], findingLevels: [] }, { status: 200 });

    const [audits, caps, config] = await Promise.all([loadAudits(tenantId), loadCaps(tenantId), getConfig(tenantId)]);
    return NextResponse.json({
      audits,
      caps,
      templates: Array.isArray(config['quality-audit-templates']) ? config['quality-audit-templates'] : [],
      personnel: Array.isArray(config['personnel']) ? config['personnel'] : [],
      departments: Array.isArray(config['departments']) ? config['departments'] : [],
      organizations: Array.isArray(config['external-organizations']) ? config['external-organizations'] : [],
      findingLevels: Array.isArray(config['finding-levels']) ? config['finding-levels'] : [],
    }, { status: 200 });
  } catch (error) {
    console.error('[quality-audits] fallback to empty payload:', error);
    return NextResponse.json({ audits: [], templates: [], personnel: [], departments: [], organizations: [], caps: [], findingLevels: [] }, { status: 200 });
  }
}

export async function POST(request: Request) {
  const tenantId = await getTenantId();
  if (!tenantId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const body = await request.json().catch(() => null);
  const audit = body?.audit;
  if (!audit || typeof audit !== 'object') return NextResponse.json({ error: 'Invalid audit payload' }, { status: 400 });
  const id = audit.id || randomUUID();
  const data = { ...audit, id };
  await prisma.$executeRawUnsafe(
    `INSERT INTO quality_audits (id, tenant_id, data, created_at, updated_at) VALUES ($1, $2, $3::jsonb, NOW(), NOW()) ON CONFLICT (id) DO UPDATE SET data = EXCLUDED.data, updated_at = NOW()`,
    id,
    tenantId,
    JSON.stringify(data)
  );
  return NextResponse.json({ audit: data }, { status: 200 });
}

export async function DELETE(request: Request) {
  const tenantId = await getTenantId();
  if (!tenantId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const { searchParams } = new URL(request.url);
  const id = searchParams.get('id');
  if (!id) return NextResponse.json({ error: 'Missing id' }, { status: 400 });
  await prisma.$executeRawUnsafe(`DELETE FROM quality_audits WHERE id = $1 AND tenant_id = $2`, id, tenantId);
  return NextResponse.json({ ok: true }, { status: 200 });
}
