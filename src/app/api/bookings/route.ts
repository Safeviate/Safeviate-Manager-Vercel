import { authOptions } from '@/auth';
import { prisma } from '@/lib/prisma';
import { getServerSession } from 'next-auth';
import { NextResponse } from 'next/server';
import { randomUUID } from 'node:crypto';

async function getTenantId() {
  const session = await getServerSession(authOptions);
  const email = session?.user?.email?.trim().toLowerCase();
  if (!email) return null;

  await prisma.tenant.upsert({
    where: { id: 'safeviate' },
    update: { updatedAt: new Date() },
    create: { id: 'safeviate', name: 'Safeviate' },
  });

  const currentUser = await prisma.user.findUnique({
    where: { email },
    select: { tenantId: true },
  });
  return currentUser?.tenantId || 'safeviate';
}

export async function POST(request: Request) {
  const tenantId = await getTenantId();
  if (!tenantId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const body = await request.json();
  const incoming = body?.booking ?? {};
  const id = incoming.id || randomUUID();

  const countRows = await prisma.$queryRawUnsafe<{ count: number }[]>(
    `SELECT COUNT(*)::int AS count FROM bookings WHERE tenant_id = $1`,
    tenantId
  );
  const bookingNumber = String((countRows[0]?.count ?? 0) + 1).padStart(5, '0');

  const data = {
    ...incoming,
    id,
    bookingNumber,
  };

  await prisma.$executeRawUnsafe(
    `INSERT INTO bookings (id, tenant_id, data, created_at, updated_at)
     VALUES ($1, $2, $3::jsonb, NOW(), NOW())
     ON CONFLICT (id) DO NOTHING`,
    id,
    tenantId,
    JSON.stringify(data)
  );

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

  await prisma.$executeRawUnsafe(
    `UPDATE bookings SET data = $2::jsonb, updated_at = NOW() WHERE id = $1 AND tenant_id = $3`,
    bookingId,
    JSON.stringify(incoming),
    tenantId
  );

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

  await prisma.$executeRawUnsafe(`DELETE FROM bookings WHERE id = $1 AND tenant_id = $2`, bookingId, tenantId);

  return NextResponse.json({ ok: true }, { status: 200 });
}
