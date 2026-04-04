import { authOptions } from '@/auth';
import { getDb } from '@/db';
import { roles, tenants, users } from '@/db/schema';
import { and, eq } from 'drizzle-orm';
import { getServerSession } from 'next-auth';
import { NextResponse } from 'next/server';

export async function GET() {
  const session = await getServerSession(authOptions);
  const email = session?.user?.email?.trim().toLowerCase();
  const authUserId = session?.user?.id?.trim();

  if (!email) {
    return NextResponse.json({ profile: null }, { status: 200 });
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
          id: authUserId || `user_${email.replace(/[^a-z0-9]+/g, '_')}`,
          tenantId: 'safeviate',
          firstName: session?.user?.name?.split(' ')[0] ?? 'User',
          lastName: session?.user?.name?.split(' ').slice(1).join(' ') || '',
          role: 'developer',
          updatedAt: new Date(),
        },
      })
      .returning();
  }

  const [tenant] = await db.select().from(tenants).where(eq(tenants.id, profile.tenantId)).limit(1);
  const [role] = await db
    .select()
    .from(roles)
    .where(and(eq(roles.tenantId, profile.tenantId), eq(roles.id, profile.role)))
    .limit(1);

  return NextResponse.json(
    {
      profile,
      tenant: tenant ?? null,
      rolePermissions: (role?.permissions as string[] | null) ?? [],
    },
    { status: 200 }
  );
}
