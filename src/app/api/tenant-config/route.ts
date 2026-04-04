import { NextResponse } from 'next/server';
import { getDb } from '@/db';
import { tenantConfigs } from '@/db/schema';
import { eq } from 'drizzle-orm';
import { authenticateAiRequest } from '@/lib/server/ai-auth';

export async function GET() {
  const auth = await authenticateAiRequest();
  if (!auth.ok) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  const db = getDb();
  const [configRow] = await db
    .select()
    .from(tenantConfigs)
    .where(eq(tenantConfigs.tenantId, auth.tenantId))
    .limit(1);

  return NextResponse.json({ config: configRow?.data ?? null }, { status: 200 });
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

  const db = getDb();
  await db
    .insert(tenantConfigs)
    .values({
      tenantId: auth.tenantId,
      data: config,
      updatedAt: new Date(),
    })
    .onConflictDoUpdate({
      target: tenantConfigs.tenantId,
      set: {
        data: config,
        updatedAt: new Date(),
      },
    });

  return NextResponse.json({ ok: true }, { status: 200 });
}
