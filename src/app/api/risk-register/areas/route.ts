import { authOptions } from '@/auth';
import { prisma } from '@/lib/prisma';
import { getServerSession } from 'next-auth';
import { NextResponse } from 'next/server';

const DEFAULT_HAZARD_AREAS = [
  'Flight Operations',
  'Ground Operations',
  'Maintenance',
  'Cabin Safety',
  'Occupational Safety',
  'Security',
  'Administration & Management',
];

async function getTenantId() {
  const session = await getServerSession(authOptions);
  const email = session?.user?.email?.trim().toLowerCase();
  if (!email) return null;
  const currentUser = await prisma.user.findUnique({ where: { email }, select: { tenantId: true } });
  return currentUser?.tenantId || 'safeviate';
}

export async function GET() {
  try {
    const tenantId = await getTenantId();
    if (!tenantId) return NextResponse.json({ areas: DEFAULT_HAZARD_AREAS }, { status: 200 });

    const rows = await prisma.$queryRawUnsafe<{ data: unknown }[]>(
      `SELECT data FROM tenant_configs WHERE tenant_id = $1 LIMIT 1`,
      tenantId
    );
    const data = (rows[0]?.data as any) || {};
    const areas = Array.isArray(data['risk-register-areas']) && data['risk-register-areas'].length
      ? data['risk-register-areas']
      : DEFAULT_HAZARD_AREAS;

    return NextResponse.json({ areas }, { status: 200 });
  } catch (error) {
    console.error('[risk-register/areas] fallback to defaults:', error);
    return NextResponse.json({ areas: DEFAULT_HAZARD_AREAS }, { status: 200 });
  }
}

export async function POST(request: Request) {
  const tenantId = await getTenantId();
  if (!tenantId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const body = await request.json().catch(() => null);
  const areas = Array.isArray(body?.areas) ? body.areas.filter((area) => typeof area === 'string' && area.trim()) : DEFAULT_HAZARD_AREAS;
  const rows = await prisma.$queryRawUnsafe<{ data: unknown }[]>(
    `SELECT data FROM tenant_configs WHERE tenant_id = $1 LIMIT 1`,
    tenantId
  );
  const existing = (rows[0]?.data as any) || {};
  const next = { ...existing, 'risk-register-areas': areas };

  await prisma.$executeRawUnsafe(
    `INSERT INTO tenant_configs (tenant_id, data, created_at, updated_at) VALUES ($1, $2::jsonb, NOW(), NOW()) ON CONFLICT (tenant_id) DO UPDATE SET data = EXCLUDED.data, updated_at = NOW()`,
    tenantId,
    JSON.stringify(next)
  );

  return NextResponse.json({ areas }, { status: 200 });
}
