import { authOptions } from '@/auth';
import { isDatabaseAvailable, prisma } from '@/lib/prisma';
import { ensureAircraftSchema, ensureBookingsSchema, ensurePersonnelSchema } from '@/lib/server/bootstrap-db';
import { getServerSession } from 'next-auth';
import { NextResponse } from 'next/server';

type ScheduleInstructorDuty = {
  id: string;
  name: string;
  bookingCount: number;
  instructionHours: number;
  dutyPressure: number;
  status: 'ok' | 'pressure' | 'busy';
};

const buildInstructorDutyModel = (
  bookings: Array<{
    instructorId?: string | null;
    preFlightData?: { hobbs?: number };
    postFlightData?: { hobbs?: number };
  }>,
  instructors: Array<{ id: string; firstName?: string; lastName?: string }>
) => {
  const bookingCountByInstructor = new Map<string, number>();
  const hoursByInstructor = new Map<string, number>();

  bookings.forEach((booking) => {
    if (!booking.instructorId) return;
    bookingCountByInstructor.set(booking.instructorId, (bookingCountByInstructor.get(booking.instructorId) || 0) + 1);

    if (booking.postFlightData?.hobbs !== undefined && booking.preFlightData?.hobbs !== undefined) {
      const duration = Math.max(0, booking.postFlightData.hobbs - booking.preFlightData.hobbs);
      hoursByInstructor.set(booking.instructorId, (hoursByInstructor.get(booking.instructorId) || 0) + duration);
    }
  });

  return instructors.map((instructor) => {
    const bookingCount = bookingCountByInstructor.get(instructor.id) || 0;
    const instructionHours = hoursByInstructor.get(instructor.id) || 0;
    const dutyPressure = bookingCount + instructionHours;
    const status: ScheduleInstructorDuty['status'] =
      dutyPressure >= 12 ? 'busy' : dutyPressure >= 6 ? 'pressure' : 'ok';

    return {
      id: instructor.id,
      name: `${instructor.firstName || ''} ${instructor.lastName || ''}`.trim() || instructor.id,
      bookingCount,
      instructionHours: parseFloat(instructionHours.toFixed(1)),
      dutyPressure: parseFloat(dutyPressure.toFixed(1)),
      status,
    };
  });
};

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    const email = session?.user?.email?.trim().toLowerCase();

    if (!email) {
      return NextResponse.json({ aircraft: [], bookings: [], instructors: [], instructorDuty: [] }, { status: 200 });
    }

    if (!(await isDatabaseAvailable())) {
      return NextResponse.json({ aircraft: [], bookings: [], instructors: [], instructorDuty: [] }, { status: 200 });
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

    await Promise.all([ensureAircraftSchema(), ensureBookingsSchema(), ensurePersonnelSchema()]);
    const [aircraftRows, bookingRows, personnelRows] = await Promise.all([
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
      prisma.personnel.findMany({
        where: { tenantId },
      }),
    ]);
    const instructors = personnelRows.filter((person) => person.canBeInstructor || person.userType === 'Instructor');
    const instructorDuty = buildInstructorDutyModel(
      bookingRows.map((row) => row.data as {
        instructorId?: string | null;
        preFlightData?: { hobbs?: number };
        postFlightData?: { hobbs?: number };
      }),
      instructors.map((person) => ({
        id: person.id,
        firstName: person.firstName,
        lastName: person.lastName,
      }))
    );

    return NextResponse.json(
      {
        aircraft: aircraftRows.map((row) => row.data),
        bookings: bookingRows.map((row) => row.data),
        instructors,
        instructorDuty,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('[schedule-data] fallback to empty payload:', error);
    return NextResponse.json({ aircraft: [], bookings: [], instructors: [], instructorDuty: [] }, { status: 200 });
  }
}
