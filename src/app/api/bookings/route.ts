import { authOptions } from '@/auth';
import { prisma } from '@/lib/prisma';
import { ensureBookingsSchema } from '@/lib/server/bootstrap-db';
import { getServerSession } from 'next-auth';
import { NextResponse } from 'next/server';
import { randomUUID } from 'node:crypto';

function isCompletedStatus(status: unknown) {
  return status === 'Completed';
}

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

export async function GET() {
  try {
    const tenantId = await getTenantId();
    if (!tenantId) return NextResponse.json({ bookings: [] }, { status: 200 });

    await ensureBookingsSchema();
    const bookings = await prisma.bookingRecord.findMany({
      where: { tenantId },
      orderBy: { createdAt: 'asc' },
      select: { data: true },
    });

    return NextResponse.json(
      {
        bookings: bookings.map((row) => row.data),
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('[bookings] failed to load bookings:', error);
    return NextResponse.json({ bookings: [] }, { status: 200 });
  }
}

export async function POST(request: Request) {
  try {
    const tenantId = await getTenantId();
    if (!tenantId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await request.json().catch(() => null);
    const incoming = body?.booking ?? {};
    const id = incoming.id || randomUUID();

    await ensureBookingsSchema();

    const count = await prisma.bookingRecord.count({ where: { tenantId } });
    const bookingNumber = String(count + 1).padStart(5, '0');

    const data = {
      ...incoming,
      id,
      bookingNumber,
    };

    await prisma.bookingRecord.upsert({
      where: { id },
      create: {
        id,
        tenantId,
        data,
      },
      update: {
        data,
      },
    });

    return NextResponse.json({ booking: data }, { status: 201 });
  } catch (error) {
    console.error('[bookings] failed to save booking:', error);
    return NextResponse.json({ error: 'Failed to save booking.' }, { status: 500 });
  }
}

export async function PUT(request: Request) {
  try {
    const tenantId = await getTenantId();
    if (!tenantId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await request.json().catch(() => null);
    const incoming = body?.booking ?? {};
    const bookingId = incoming.id;

    if (!bookingId) {
      return NextResponse.json({ error: 'Missing booking id.' }, { status: 400 });
    }

    await ensureBookingsSchema();

    const existing = await prisma.bookingRecord.findFirst({
      where: { id: bookingId, tenantId },
      select: { data: true },
    });

    const existingData = (existing?.data as Record<string, any> | null) || null;
    const incomingStatus = incoming.status ?? existingData?.status;
    const incomingAircraftId = incoming.aircraftId ?? existingData?.aircraftId;
    const incomingStart = incoming.start ?? existingData?.start;

    if (isCompletedStatus(incomingStatus) && incomingAircraftId && incomingStart) {
      const earlierBookings = await prisma.bookingRecord.findMany({
        where: {
          tenantId,
          id: { not: bookingId },
        },
        select: { data: true },
      });

      const blockingBooking = earlierBookings
        .map((record) => record.data as Record<string, any>)
        .filter((booking) => booking?.aircraftId === incomingAircraftId)
        .filter((booking) => typeof booking.start === 'string' && booking.start < incomingStart)
        .filter((booking) => booking.status !== 'Cancelled' && booking.status !== 'Cancelled with Reason')
        .find((booking) => booking.status !== 'Completed');

      if (blockingBooking) {
        return NextResponse.json(
          {
            error: 'This flight cannot be marked completed until all earlier non-cancelled bookings for the same aircraft are completed.',
          },
          { status: 409 },
        );
      }
    }

    await prisma.bookingRecord.upsert({
      where: { id: bookingId },
      create: {
        id: bookingId,
        tenantId,
        data: incoming,
      },
      update: {
        data: incoming,
      },
    });

    return NextResponse.json({ booking: incoming }, { status: 200 });
  } catch (error) {
    console.error('[bookings] failed to update booking:', error);
    return NextResponse.json({ error: 'Failed to update booking.' }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  try {
    const tenantId = await getTenantId();
    if (!tenantId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await request.json().catch(() => null);
    const bookingId = body?.bookingId;

    if (!bookingId) {
      return NextResponse.json({ error: 'Missing booking id.' }, { status: 400 });
    }

    await ensureBookingsSchema();

    await prisma.bookingRecord.deleteMany({ where: { id: bookingId, tenantId } });

    return NextResponse.json({ ok: true }, { status: 200 });
  } catch (error) {
    console.error('[bookings] failed to delete booking:', error);
    return NextResponse.json({ error: 'Failed to delete booking.' }, { status: 500 });
  }
}
