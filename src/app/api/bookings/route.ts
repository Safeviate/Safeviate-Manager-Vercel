import { authOptions } from '@/auth';
import { getDb } from '@/db';
import { bookings, tenants, users } from '@/db/schema';
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

export async function POST(request: Request) {
  const tenantId = await getTenantId();
  if (!tenantId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const body = await request.json();
  const incoming = body?.booking ?? {};
  const id = incoming.id || randomUUID();

  const db = getDb();
  const existingCount = await db.select().from(bookings).where(eq(bookings.tenantId, tenantId));
  const bookingNumber = String(existingCount.length + 1).padStart(5, '0');

  const data = {
    ...incoming,
    id,
    bookingNumber,
  };

  await db
    .insert(bookings)
    .values({ id, tenantId, data, updatedAt: new Date() })
    .onConflictDoNothing();

  return NextResponse.json({ booking: data }, { status: 201 });
}

export async function PUT(request: Request) {
  const tenantId = await getTenantId();
  if (!tenantId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const body = await request.json();
  const incoming = body?.booking ?? {};
  const bookingId = incoming.id;

  if (!bookingId) {
    return NextResponse.json({ error: 'Missing booking id.' }, { status: 400 });
  }

  const db = getDb();
  await db
    .update(bookings)
    .set({ data: incoming, updatedAt: new Date() })
    .where(eq(bookings.id, bookingId));

  return NextResponse.json({ booking: incoming }, { status: 200 });
}

export async function DELETE(request: Request) {
  const tenantId = await getTenantId();
  if (!tenantId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const body = await request.json();
  const bookingId = body?.bookingId;

  if (!bookingId) {
    return NextResponse.json({ error: 'Missing booking id.' }, { status: 400 });
  }

  const db = getDb();
  await db.delete(bookings).where(eq(bookings.id, bookingId));

  return NextResponse.json({ ok: true }, { status: 200 });
}
