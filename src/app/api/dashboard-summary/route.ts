import { authOptions } from '@/auth';
import { isDatabaseAvailable, prisma } from '@/lib/prisma';
import {
  ensureAttendanceRecordsSchema,
  ensureAircraftSchema,
  ensureBookingsSchema,
  ensureCorrectiveActionPlansSchema,
  ensureManagementOfChangeSchema,
  ensureMeetingsSchema,
  ensurePersonnelSchema,
  ensureQualityAuditsSchema,
  ensureRisksSchema,
  ensureSafetyReportsSchema,
} from '@/lib/server/bootstrap-db';
import { getOrSetRouteCache } from '@/lib/server/route-cache';
import { recordSimulationRouteMetric } from '@/lib/server/simulation-telemetry';
import { getServerSession } from 'next-auth';
import { NextResponse } from 'next/server';

const PERSONNEL_TYPES = new Set(['Personnel', 'External']);
const INSTRUCTOR_TYPES = new Set(['Instructor']);
const STUDENT_TYPES = new Set(['Student']);
const PRIVATE_PILOT_TYPES = new Set(['Private Pilot']);
const EMPTY_SUMMARY = {
  bookings: [],
  aircrafts: [],
  personnel: [],
  instructors: [],
  students: [],
  privatePilots: [],
  mocs: [],
  audits: [],
  reports: [],
  caps: [],
  risks: [],
  attendanceRecords: [],
  meetings: [],
  clockedInCount: 0,
  openAttendanceSessions: 0,
  totalDutyMinutes: 0,
  totalDutyHours: 0,
  studentProgressReports: [],
  studentMilestones: null,
  instructorDuty: [],
};

async function safeFindMany<T>(label: string, task: Promise<T[]>): Promise<T[]> {
  try {
    return await task;
  } catch (error) {
    console.error(`[dashboard-summary] fallback for ${label}:`, error);
    return [];
  }
}

async function readTenantConfig(tenantId: string) {
  return getOrSetRouteCache(`dashboard-summary:tenant-config:${tenantId}`, 30_000, async () => {
    try {
      const rows = await prisma.$queryRawUnsafe<{ data: unknown }[]>(
        `SELECT data FROM tenant_configs WHERE tenant_id = $1 LIMIT 1`,
        tenantId
      );
      return (rows[0]?.data as Record<string, unknown> | null) || {};
    } catch (error) {
      console.error('[dashboard-summary] fallback for tenant config:', error);
      return {};
    }
  });
}

export async function GET() {
  const startedAt = Date.now();
  let tenantId: string | null = null;
  try {
    const session = await getServerSession(authOptions);
    const email = session?.user?.email?.trim().toLowerCase();

    if (!email) {
      return NextResponse.json(EMPTY_SUMMARY, { status: 200 });
    }

    if (!(await isDatabaseAvailable())) {
      return NextResponse.json(EMPTY_SUMMARY, { status: 200 });
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
    tenantId = currentUser?.tenantId || 'safeviate';
    const resolvedTenantId = tenantId;
    const tenantConfig = await readTenantConfig(resolvedTenantId);

    await Promise.all([
      ensureAttendanceRecordsSchema(),
      ensureAircraftSchema(),
      ensureBookingsSchema(),
      ensureManagementOfChangeSchema(),
      ensureMeetingsSchema(),
      ensurePersonnelSchema(),
      ensureQualityAuditsSchema(),
      ensureCorrectiveActionPlansSchema(),
      ensureRisksSchema(),
      ensureSafetyReportsSchema(),
    ]);
    const [
      bookingRows,
      aircraftRows,
      personnelRows,
      mocRows,
      auditRows,
      reportRows,
      capRows,
      riskRows,
      attendanceRows,
      meetingRows,
    ] = await getOrSetRouteCache(`dashboard-summary:${resolvedTenantId}`, 30_000, async () => Promise.all([
      safeFindMany('bookings', prisma.bookingRecord.findMany({ where: { tenantId: resolvedTenantId }, select: { data: true } })),
      safeFindMany('aircrafts', prisma.aircraftRecord.findMany({ where: { tenantId: resolvedTenantId }, select: { data: true } })),
      safeFindMany('personnel', prisma.personnel.findMany({ where: { tenantId: resolvedTenantId } })),
      safeFindMany('management_of_change', prisma.managementOfChange.findMany({ where: { tenantId: resolvedTenantId }, select: { data: true } })),
      safeFindMany('quality_audits', prisma.qualityAudit.findMany({ where: { tenantId: resolvedTenantId }, select: { data: true } })),
      safeFindMany('safety_reports', prisma.safetyReport.findMany({ where: { tenantId: resolvedTenantId }, select: { data: true } })),
      safeFindMany('corrective_action_plans', prisma.correctiveActionPlan.findMany({ where: { tenantId: resolvedTenantId }, select: { data: true } })),
      safeFindMany('risks', prisma.risk.findMany({ where: { tenantId: resolvedTenantId }, select: { data: true } })),
      safeFindMany(
        'attendance_records',
        prisma.$queryRawUnsafe<{ data: unknown }[]>(
          `SELECT data FROM attendance_records WHERE tenant_id = $1 ORDER BY created_at DESC`,
          resolvedTenantId
        )
      ),
      safeFindMany(
        'meetings',
        prisma.$queryRawUnsafe<{ data: unknown }[]>(
          `SELECT data FROM meetings WHERE tenant_id = $1 ORDER BY created_at DESC`,
          resolvedTenantId
        )
      ),
    ]));

    const personnelList: Array<{ id: string; firstName?: string; lastName?: string; userType?: string; canBeInstructor?: boolean | null; canBeStudent?: boolean | null }> = [];
    const instructorList: Array<{ id: string; firstName?: string; lastName?: string; userType?: string; canBeInstructor?: boolean | null; canBeStudent?: boolean | null }> = [];
    const studentList: Array<{ id: string; firstName?: string; lastName?: string; userType?: string; canBeInstructor?: boolean | null; canBeStudent?: boolean | null }> = [];
    const privatePilotList: Array<{ id: string; firstName?: string; lastName?: string; userType?: string; canBeInstructor?: boolean | null; canBeStudent?: boolean | null }> = [];
    const studentTrainingReports = Array.isArray(tenantConfig['student-progress-reports'])
      ? (tenantConfig['student-progress-reports'] as unknown[])
      : [];
    const studentMilestones = tenantConfig['student-milestones'] ?? null;
    const attendanceRecords = attendanceRows.map((row) => row.data as {
      id: string;
      status?: 'clocked_in' | 'clocked_out';
      clockIn?: string;
      clockOut?: string | null;
    });
    const clockedInCount = attendanceRecords.filter((record) => record.status === 'clocked_in' && !record.clockOut).length;
    const openAttendanceSessions = clockedInCount;
    const totalDutyMinutes = attendanceRecords.reduce((sum, record) => {
      if (!record.clockIn) return sum;
      const start = new Date(record.clockIn).getTime();
      const end = record.clockOut ? new Date(record.clockOut).getTime() : Date.now();
      if (Number.isNaN(start) || Number.isNaN(end) || end < start) return sum;
      return sum + Math.max(0, Math.round((end - start) / 60000));
    }, 0);
    const totalDutyHours = parseFloat((totalDutyMinutes / 60).toFixed(1));
    for (const row of personnelRows) {
      const type = row.userType || 'Personnel';
      if (row.canBeInstructor || INSTRUCTOR_TYPES.has(type)) {
        instructorList.push(row);
      }
      if (row.canBeStudent || STUDENT_TYPES.has(type)) {
        studentList.push(row);
      }
      if (PRIVATE_PILOT_TYPES.has(type)) {
        privatePilotList.push(row);
      }
      if (PERSONNEL_TYPES.has(type)) {
        personnelList.push(row);
      } else if (!row.canBeInstructor && !row.canBeStudent && !PRIVATE_PILOT_TYPES.has(type)) {
        personnelList.push(row);
      }
    }

    const instructorDuty = instructorList.map((instructor) => {
      const instructorBookings = bookingRows
        .map((row) => row.data as { instructorId?: string | null; preFlightData?: { hobbs?: number }; postFlightData?: { hobbs?: number } })
        .filter((booking) => booking.instructorId === instructor.id);
      const bookingCount = instructorBookings.length;
      const instructionHours = instructorBookings.reduce((sum, booking) => {
        if (booking.postFlightData?.hobbs === undefined || booking.preFlightData?.hobbs === undefined) return sum;
        return sum + Math.max(0, booking.postFlightData.hobbs - booking.preFlightData.hobbs);
      }, 0);
      const dutyPressure = bookingCount + instructionHours;
      const status = dutyPressure >= 12 ? 'busy' : dutyPressure >= 6 ? 'pressure' : 'ok';

      return {
        id: instructor.id,
        name: `${instructor.firstName || ''} ${instructor.lastName || ''}`.trim() || instructor.id,
        bookingCount,
        instructionHours: parseFloat(instructionHours.toFixed(1)),
        dutyPressure: parseFloat(dutyPressure.toFixed(1)),
        status,
      };
    });

    await recordSimulationRouteMetric({
      tenantId,
      routeKey: 'dashboard-summary.GET',
      reads: 11,
      writes: 0,
      durationMs: Date.now() - startedAt,
    });

    return NextResponse.json(
      {
        bookings: bookingRows.map((row) => row.data),
        aircrafts: aircraftRows.map((row) => row.data),
        personnel: personnelList,
        instructors: instructorList,
        students: studentList,
        privatePilots: privatePilotList,
        mocs: mocRows.map((row) => row.data),
        audits: auditRows.map((row) => row.data),
        reports: reportRows.map((row) => row.data),
        caps: capRows.map((row) => row.data),
        risks: riskRows.map((row) => row.data),
        attendanceRecords,
        meetings: meetingRows.map((row) => row.data),
        clockedInCount,
        openAttendanceSessions,
        totalDutyMinutes,
        totalDutyHours,
        studentProgressReports: studentTrainingReports,
        studentMilestones,
        instructorDuty,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('[dashboard-summary] fallback to empty payload:', error);
    await recordSimulationRouteMetric({
      tenantId,
      routeKey: 'dashboard-summary.GET',
      reads: 0,
      writes: 0,
      durationMs: Date.now() - startedAt,
      isError: true,
    });
    return NextResponse.json(EMPTY_SUMMARY, { status: 200 });
  }
}
