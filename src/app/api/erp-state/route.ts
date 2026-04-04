import { authOptions } from '@/auth';
import { getDb } from '@/db';
import { erpState, tenants, users } from '@/db/schema';
import { and, eq } from 'drizzle-orm';
import { getServerSession } from 'next-auth';
import { NextResponse } from 'next/server';

async function getTenantIdForSession() {
  const session = await getServerSession(authOptions);
  const email = session?.user?.email?.trim().toLowerCase();
  const authUserId = session?.user?.id?.trim();

  if (!email) {
    return null;
  }

  const db = getDb();
  await db.insert(tenants).values({ id: 'safeviate', name: 'Safeviate', updatedAt: new Date() }).onConflictDoNothing();

  let [profile] = await db.select().from(users).where(eq(users.email, email)).limit(1);
  if (!profile) {
    [profile] = await db
      .insert(users)
      .values({
        id: authUserId || `user_${email.replace(/[^a-z0-9]+/g, '_')}`,
        tenantId: 'safeviate',
        email,
        firstName: session?.user?.name?.split(' ')[0] ?? 'User',
        lastName: session?.user?.name?.split(' ').slice(1).join(' ') || '',
        role: 'developer',
      })
      .onConflictDoUpdate({
        target: users.email,
        set: {
          updatedAt: new Date(),
        },
      })
      .returning();
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

  const db = getDb();
  const [row] = await db
    .select()
    .from(erpState)
    .where(and(eq(erpState.tenantId, tenantId), eq(erpState.category, category)))
    .limit(1);

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

  const db = getDb();
  const [existing] = await db
    .select()
    .from(erpState)
    .where(and(eq(erpState.tenantId, tenantId), eq(erpState.category, category)))
    .limit(1);

  if (existing) {
    await db
      .update(erpState)
      .set({
        data,
        updatedAt: new Date(),
      })
      .where(and(eq(erpState.id, existing.id), eq(erpState.tenantId, tenantId)));
  } else {
    await db.insert(erpState).values({
      id: crypto.randomUUID(),
      tenantId,
      category,
      data,
      updatedAt: new Date(),
    });
  }

  return NextResponse.json({ ok: true });
}
