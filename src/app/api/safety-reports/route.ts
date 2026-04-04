import { authOptions } from '@/auth';
import { getDb } from '@/db';
import { safetyReports, tenants, users } from '@/db/schema';
import { eq } from 'drizzle-orm';
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

export async function GET() {
  const tenantId = await getTenantId();
  if (!tenantId) return NextResponse.json({ reports: [] }, { status: 200 });

  const db = getDb();
  const rows = await db.select().from(safetyReports).where(eq(safetyReports.tenantId, tenantId));

  return NextResponse.json({ reports: rows.map((row) => row.data) }, { status: 200 });
}

export async function POST(request: Request) {
  const tenantId = await getTenantId();
  if (!tenantId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const body = await request.json();
  const incoming = body?.report ?? {};
  const id = incoming.id || randomUUID();

  const db = getDb();
  const data = { ...incoming, id };

  await db
    .insert(safetyReports)
    .values({ id, tenantId, data, updatedAt: new Date() })
    .onConflictDoUpdate({ target: safetyReports.id, set: { data, updatedAt: new Date() } });

  return NextResponse.json({ report: data }, { status: 201 });
}

export async function DELETE(request: Request) {
  const tenantId = await getTenantId();
  if (!tenantId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const body = await request.json();
  const reportId = body?.reportId;
  if (!reportId) return NextResponse.json({ error: 'Missing report id.' }, { status: 400 });

  const db = getDb();
  await db.delete(safetyReports).where(eq(safetyReports.id, reportId));
  return NextResponse.json({ ok: true }, { status: 200 });
}
