import { authOptions } from '@/auth';
import { getDb } from '@/db';
import { departments, personnel, roles, tenants, users } from '@/db/schema';
import { eq } from 'drizzle-orm';
import { getServerSession } from 'next-auth';
import { NextResponse } from 'next/server';

export async function GET() {
  const session = await getServerSession(authOptions);
  const email = session?.user?.email?.trim().toLowerCase();

  if (!email) {
    return NextResponse.json({ roles: [], departments: [], personnel: [] }, { status: 200 });
  }

  const db = getDb();
  await db.insert(tenants).values({ id: 'safeviate', name: 'Safeviate', updatedAt: new Date() }).onConflictDoNothing();

  const [currentUser] = await db.select().from(users).where(eq(users.email, email)).limit(1);
  const tenantId = currentUser?.tenantId || 'safeviate';

  const [roleRows, departmentRows, personnelRows] = await Promise.all([
    db.select().from(roles).where(eq(roles.tenantId, tenantId)),
    db.select().from(departments).where(eq(departments.tenantId, tenantId)),
    db.select().from(personnel).where(eq(personnel.tenantId, tenantId)),
  ]);

  return NextResponse.json(
    {
      roles: roleRows,
      departments: departmentRows,
      personnel: personnelRows,
    },
    { status: 200 }
  );
}
