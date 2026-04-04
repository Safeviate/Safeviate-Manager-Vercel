import { authOptions } from '@/auth';
import { prisma } from '@/lib/prisma';
import { getServerSession } from 'next-auth';
import { NextResponse } from 'next/server';

async function getTenantIdForSession() {
  const session = await getServerSession(authOptions);
  const email = session?.user?.email?.trim().toLowerCase();
  const authUserId = session?.user?.id?.trim();

  if (!email) {
    return null;
  }

  await prisma.tenant.upsert({
    where: { id: 'safeviate' },
    update: { updatedAt: new Date() },
    create: { id: 'safeviate', name: 'Safeviate' },
  });

  let profile = await prisma.user.findUnique({ where: { email } });
  if (!profile) {
    profile = await prisma.user.upsert({
      where: { email },
      update: {
        id: authUserId || `user_${email.replace(/[^a-z0-9]+/g, '_')}`,
        tenantId: 'safeviate',
        firstName: session?.user?.name?.split(' ')[0] ?? 'User',
        lastName: session?.user?.name?.split(' ').slice(1).join(' ') || '',
        role: 'developer',
        updatedAt: new Date(),
      },
      create: {
        id: authUserId || `user_${email.replace(/[^a-z0-9]+/g, '_')}`,
        tenantId: 'safeviate',
        email,
        firstName: session?.user?.name?.split(' ')[0] ?? 'User',
        lastName: session?.user?.name?.split(' ').slice(1).join(' ') || '',
        role: 'developer',
      },
    });
  }

  return profile.tenantId;
}

export async function GET(request: Request) {
  const tenantId = await getTenantIdForSession();
  const { searchParams } = new URL(request.url);
  const category = searchParams.get('category')?.trim();

  if (!tenantId || !category) {
    return NextResponse.json({ data: [] }, { status: 200 });
  }

  const rows = await prisma.$queryRawUnsafe<{ data: unknown }[]>(
    `SELECT data FROM erp_state WHERE tenant_id = $1 AND category = $2 LIMIT 1`,
    tenantId,
    category
  );
  const row = rows[0];

  return NextResponse.json({ data: row?.data ?? [] });
}

export async function PUT(request: Request) {
  const tenantId = await getTenantIdForSession();
  if (!tenantId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const payload = await request.json();
  const category = payload?.category?.toString()?.trim();
  const data = payload?.data ?? [];

  if (!category) {
    return NextResponse.json({ error: 'Missing category' }, { status: 400 });
  }

  const existing = await prisma.$queryRawUnsafe<{ id: string }[]>(
    `SELECT id FROM erp_state WHERE tenant_id = $1 AND category = $2 LIMIT 1`,
    tenantId,
    category
  );

  if (existing[0]?.id) {
    await prisma.$executeRawUnsafe(
      `UPDATE erp_state SET data = $2::jsonb, updated_at = NOW() WHERE id = $1 AND tenant_id = $3`,
      existing[0].id,
      JSON.stringify(data),
      tenantId
    );
  } else {
    await prisma.$executeRawUnsafe(
      `INSERT INTO erp_state (id, tenant_id, category, data, created_at, updated_at)
       VALUES ($1, $2, $3, $4::jsonb, NOW(), NOW())`,
      crypto.randomUUID(),
      tenantId,
      category,
      JSON.stringify(data)
    );
  }

  return NextResponse.json({ ok: true });
}
