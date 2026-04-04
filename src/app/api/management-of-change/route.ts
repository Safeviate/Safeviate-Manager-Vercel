import { authOptions } from '@/auth';
import { getDb } from '@/db';
import { managementOfChange, tenants, users } from '@/db/schema';
import { and, eq } from 'drizzle-orm';
import { getServerSession } from 'next-auth';
import { NextResponse } from 'next/server';
import { randomUUID } from 'node:crypto';

async function getTenantId() {
  const session = await getServerSession(authOptions);
  const email = session?.user?.email?.trim().toLowerCase();
  if (!email) return null;

  const db = getDb();
  await db.insert(tenants).values({ id: 'safeviate', name: 'Safeviate', updatedAt: new Date() }).onConflictDoNothing();
  const [currentUser] = await db.select().from(users).where(eq(users.email, email)).limit(1);
  return currentUser?.tenantId || 'safeviate';
}

export async function GET(request: Request) {
  const tenantId = await getTenantId();
  if (!tenantId) return NextResponse.json({ mocs: [] }, { status: 200 });

  const db = getDb();
  const mocId = new URL(request.url).searchParams.get('mocId');
  if (mocId) {
    const [row] = await db
      .select()
      .from(managementOfChange)
      .where(and(eq(managementOfChange.tenantId, tenantId), eq(managementOfChange.id, mocId)));
    return NextResponse.json({ moc: row?.data ?? null }, { status: 200 });
  }

  const rows = await db.select().from(managementOfChange).where(eq(managementOfChange.tenantId, tenantId));

  return NextResponse.json({ mocs: rows.map((row) => row.data) }, { status: 200 });
}

export async function POST(request: Request) {
  const tenantId = await getTenantId();
  if (!tenantId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const body = await request.json();
  const incoming = body?.moc ?? {};
  const id = incoming.id || randomUUID();

  const db = getDb();
  const existing = await db.select().from(managementOfChange).where(eq(managementOfChange.tenantId, tenantId));
  const mocNumber = incoming.mocNumber || `MOC-${String(existing.length + 1).padStart(3, '0')}`;

  const data = {
    ...incoming,
    id,
    mocNumber,
  };

  await db
    .insert(managementOfChange)
    .values({ id, tenantId, data, updatedAt: new Date() })
    .onConflictDoUpdate({ target: managementOfChange.id, set: { data, updatedAt: new Date() } });

  return NextResponse.json({ moc: data }, { status: 201 });
}

export async function PUT(request: Request) {
  const tenantId = await getTenantId();
  if (!tenantId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const url = new URL(request.url);
  const mocId = url.searchParams.get('mocId');
  if (!mocId) return NextResponse.json({ error: 'Missing MOC id.' }, { status: 400 });

  const body = await request.json();
  const incoming = body?.moc;
  if (!incoming) return NextResponse.json({ error: 'Missing MOC payload.' }, { status: 400 });

  const db = getDb();
  await db
    .update(managementOfChange)
    .set({ data: incoming, updatedAt: new Date() })
    .where(and(eq(managementOfChange.tenantId, tenantId), eq(managementOfChange.id, mocId)));

  return NextResponse.json({ moc: incoming }, { status: 200 });
}

export async function DELETE(request: Request) {
  const tenantId = await getTenantId();
  if (!tenantId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const body = await request.json();
  const mocId = body?.mocId;
  if (!mocId) return NextResponse.json({ error: 'Missing MOC id.' }, { status: 400 });

  const db = getDb();
  await db.delete(managementOfChange).where(eq(managementOfChange.id, mocId));
  return NextResponse.json({ ok: true }, { status: 200 });
}
