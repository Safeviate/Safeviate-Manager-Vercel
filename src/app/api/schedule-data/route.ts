import { authOptions } from '@/auth';
import { isDatabaseAvailable, prisma } from '@/lib/prisma';
import { ensureAircraftSchema, ensureBookingsSchema } from '@/lib/server/bootstrap-db';
import { getServerSession } from 'next-auth';
import { NextResponse } from 'next/server';

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    const email = session?.user?.email?.trim().toLowerCase();

    if (!email) {
      return NextResponse.json({ aircraft: [], bookings: [] }, { status: 200 });
    }

    if (!(await isDatabaseAvailable())) {
      return NextResponse.json({ aircraft: [], bookings: [] }, { status: 200 });
    }

    await prisma.tenant.upsert({
      where: { id: 'safeviate' },
      update: { updatedAt: new Date() },
      create: { id: 'safeviate', name: 'Safeviate' },
    });

    const currentUser = await prisma.user.findUnique({
      where: { email },
      select: { tenantId: true },
    });
    const tenantId = currentUser?.tenantId || 'safeviate';

    await Promise.all([ensureAircraftSchema(), ensureBookingsSchema()]);
    const [aircraftRows, bookingRows] = await Promise.all([
      prisma.aircraftRecord.findMany({
        where: { tenantId },
        orderBy: { createdAt: 'asc' },
        select: { data: true },
      }),
      prisma.bookingRecord.findMany({
        where: { tenantId },
        orderBy: { createdAt: 'asc' },
        select: { data: true },
      }),
    ]);

    return NextResponse.json(
      {
        aircraft: aircraftRows.map((row) => row.data),
        bookings: bookingRows.map((row) => row.data),
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('[schedule-data] fallback to empty payload:', error);
    return NextResponse.json({ aircraft: [], bookings: [] }, { status: 200 });
  }
}
