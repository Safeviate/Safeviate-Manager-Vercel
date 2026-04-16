import { authOptions } from '@/auth';
import { isDatabaseAvailable, prisma } from '@/lib/prisma';
import {
  ensureAircraftSchema,
  ensureBookingsSchema,
  ensureCorrectiveActionPlansSchema,
  ensureManagementOfChangeSchema,
  ensurePersonnelSchema,
  ensureQualityAuditsSchema,
  ensureRisksSchema,
  ensureSafetyReportsSchema,
} from '@/lib/server/bootstrap-db';
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
};

async function safeFindMany<T>(label: string, task: Promise<T[]>): Promise<T[]> {
  try {
    return await task;
  } catch (error) {
    console.error(`[dashboard-summary] fallback for ${label}:`, error);
    return [];
  }
}

export async function GET() {
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
    const tenantId = currentUser?.tenantId || 'safeviate';

    await Promise.all([
      ensureAircraftSchema(),
      ensureBookingsSchema(),
      ensureManagementOfChangeSchema(),
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
    ] = await Promise.all([
      safeFindMany('bookings', prisma.bookingRecord.findMany({ where: { tenantId }, select: { data: true } })),
      safeFindMany('aircrafts', prisma.aircraftRecord.findMany({ where: { tenantId }, select: { data: true } })),
      safeFindMany('personnel', prisma.personnel.findMany({ where: { tenantId } })),
      safeFindMany('management_of_change', prisma.managementOfChange.findMany({ where: { tenantId }, select: { data: true } })),
      safeFindMany('quality_audits', prisma.qualityAudit.findMany({ where: { tenantId }, select: { data: true } })),
      safeFindMany('safety_reports', prisma.safetyReport.findMany({ where: { tenantId }, select: { data: true } })),
      safeFindMany('corrective_action_plans', prisma.correctiveActionPlan.findMany({ where: { tenantId }, select: { data: true } })),
      safeFindMany('risks', prisma.risk.findMany({ where: { tenantId }, select: { data: true } })),
    ]);

    const personnelList = [];
    const instructorList = [];
    const studentList = [];
    const privatePilotList = [];

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
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('[dashboard-summary] fallback to empty payload:', error);
    return NextResponse.json(EMPTY_SUMMARY, { status: 200 });
  }
}
