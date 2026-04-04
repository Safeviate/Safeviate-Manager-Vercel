import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { authenticateAiRequest } from '@/lib/server/ai-auth';

export async function GET() {
  const auth = await authenticateAiRequest();
  if (!auth.ok) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  const configRows = await prisma.$queryRawUnsafe<{ data: unknown }[]>(
    `SELECT data FROM tenant_configs WHERE tenant_id = $1 LIMIT 1`,
    auth.tenantId
  );

  return NextResponse.json({ config: configRows[0]?.data ?? null }, { status: 200 });
}

export async function PUT(request: Request) {
  const auth = await authenticateAiRequest();
  if (!auth.ok) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  const role = auth.userProfile.role?.toLowerCase();
  const isDeveloper = role === 'dev' || role === 'developer';
  if (!isDeveloper && !auth.effectivePermissions.has('admin-settings-manage')) {
    return NextResponse.json({ error: 'Unauthorized to update tenant configuration.' }, { status: 403 });
  }

  const body = await request.json().catch(() => null);
  const config = body?.config;
  if (!config || typeof config !== 'object') {
    return NextResponse.json({ error: 'Invalid config payload.' }, { status: 400 });
  }

  await prisma.$executeRawUnsafe(
    `INSERT INTO tenant_configs (tenant_id, data, created_at, updated_at)
     VALUES ($1, $2::jsonb, NOW(), NOW())
     ON CONFLICT (tenant_id) DO UPDATE SET data = EXCLUDED.data, updated_at = NOW()`,
    auth.tenantId,
    JSON.stringify(config)
  );

  return NextResponse.json({ ok: true }, { status: 200 });
}
