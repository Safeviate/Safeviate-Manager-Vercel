import { authOptions } from '@/auth';
import { getDb } from '@/db';
import { tenants, trainingRoutes, users } from '@/db/schema';
import { eq } from 'drizzle-orm';
import { getServerSession } from 'next-auth';
import { NextResponse } from 'next/server';

export async function GET() {
  const session = await getServerSession(authOptions);
  const email = session?.user?.email?.trim().toLowerCase();

  if (!email) {
    return NextResponse.json({ routes: [] }, { status: 200 });
  }

  const db = getDb();
  await db.insert(tenants).values({ id: 'safeviate', name: 'Safeviate', updatedAt: new Date() }).onConflictDoNothing();

  const [currentUser] = await db.select().from(users).where(eq(users.email, email)).limit(1);
  const tenantId = currentUser?.tenantId || 'safeviate';

  const rows = await db.select().from(trainingRoutes).where(eq(trainingRoutes.tenantId, tenantId));

  return NextResponse.json({ routes: rows.map((row) => row.data) }, { status: 200 });
}
