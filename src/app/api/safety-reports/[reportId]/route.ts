import { authOptions } from '@/auth';
import { getDb } from '@/db';
import { safetyReports, tenants, users } from '@/db/schema';
import { eq } from 'drizzle-orm';
import { getServerSession } from 'next-auth';
import { NextResponse } from 'next/server';

async function getTenantId() {
  const session = await getServerSession(authOptions);
  const email = session?.user?.email?.trim().toLowerCase();
  if (!email) return null;

  const db = getDb();
  await db.insert(tenants).values({ id: 'safeviate', name: 'Safeviate', updatedAt: new Date() }).onConflictDoNothing();
  const [currentUser] = await db.select().from(users).where(eq(users.email, email)).limit(1);
  return currentUser?.tenantId || 'safeviate';
}

export async function PUT(request: Request, context: { params: Promise<{ reportId: string }> }) {
  const tenantId = await getTenantId();
  if (!tenantId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { reportId } = await context.params;
  const body = await request.json();
  const data = body?.report;

  if (!reportId || !data) {
    return NextResponse.json({ error: 'Missing report data.' }, { status: 400 });
  }

  const db = getDb();
  await db.update(safetyReports).set({ data, updatedAt: new Date() }).where(eq(safetyReports.id, reportId));

  return NextResponse.json({ report: data }, { status: 200 });
}

export async function GET(_request: Request, context: { params: Promise<{ reportId: string }> }) {
  const tenantId = await getTenantId();
  if (!tenantId) return NextResponse.json({ report: null }, { status: 200 });

  const { reportId } = await context.params;
  if (!reportId) return NextResponse.json({ report: null }, { status: 400 });

  const db = getDb();
  const [row] = await db
    .select()
    .from(safetyReports)
    .where(eq(safetyReports.id, reportId));

  if (!row || row.tenantId !== tenantId) {
    return NextResponse.json({ report: null }, { status: 404 });
  }

  return NextResponse.json({ report: row.data }, { status: 200 });
}
