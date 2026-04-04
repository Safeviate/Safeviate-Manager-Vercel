import { authOptions } from '@/auth';
import { prisma } from '@/lib/prisma';
import { getServerSession } from 'next-auth';
import { NextResponse } from 'next/server';

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    const email = session?.user?.email?.trim().toLowerCase();

    if (!email) {
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

    const [aircraftRows, bookingRows] = await Promise.all([
      prisma.$queryRawUnsafe<{ data: unknown }[]>(
        `SELECT data FROM aircrafts WHERE tenant_id = $1 ORDER BY created_at ASC`,
        tenantId
      ),
      prisma.$queryRawUnsafe<{ data: unknown }[]>(
        `SELECT data FROM bookings WHERE tenant_id = $1 ORDER BY created_at ASC`,
        tenantId
      ),
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
