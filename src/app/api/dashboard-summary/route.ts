import { authOptions } from '@/auth';
import { prisma } from '@/lib/prisma';
import { ensureCoreSchema, getBootstrapDbState } from '@/lib/server/bootstrap-db';
import { getServerSession } from 'next-auth';
import { NextResponse } from 'next/server';

const PERSONNEL_TYPES = new Set(['Personnel', 'External']);
const INSTRUCTOR_TYPES = new Set(['Instructor']);
const STUDENT_TYPES = new Set(['Student']);
const PRIVATE_PILOT_TYPES = new Set(['Private Pilot']);

export async function GET() {
  const session = await getServerSession(authOptions);
  const email = session?.user?.email?.trim().toLowerCase();
  const { bootstrapMode } = await getBootstrapDbState();

  if (!email && !bootstrapMode) {
    return NextResponse.json(
      { bookings: [], aircrafts: [], personnel: [], instructors: [], students: [], privatePilots: [], mocs: [], audits: [], reports: [], caps: [], risks: [] },
      { status: 200 }
    );
  }

  if (bootstrapMode) {
    return NextResponse.json(
      { bookings: [], aircrafts: [], personnel: [], instructors: [], students: [], privatePilots: [], mocs: [], audits: [], reports: [], caps: [], risks: [] },
      { status: 200 }
    );
  }

  await ensureCoreSchema();

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
    prisma.$queryRawUnsafe<{ data: unknown }[]>(`SELECT data FROM bookings WHERE tenant_id = $1`, tenantId),
    prisma.$queryRawUnsafe<{ data: unknown }[]>(`SELECT data FROM aircrafts WHERE tenant_id = $1`, tenantId),
    prisma.$queryRawUnsafe<{ userType: string | null }[]>(
      `SELECT user_type AS "userType" FROM personnel WHERE tenant_id = $1`,
      tenantId
    ),
    prisma.$queryRawUnsafe<{ data: unknown }[]>(`SELECT data FROM management_of_change WHERE tenant_id = $1`, tenantId),
    prisma.$queryRawUnsafe<{ data: unknown }[]>(`SELECT data FROM quality_audits WHERE tenant_id = $1`, tenantId),
    prisma.$queryRawUnsafe<{ data: unknown }[]>(`SELECT data FROM safety_reports WHERE tenant_id = $1`, tenantId),
    prisma.$queryRawUnsafe<{ data: unknown }[]>(`SELECT data FROM corrective_action_plans WHERE tenant_id = $1`, tenantId),
    prisma.$queryRawUnsafe<{ data: unknown }[]>(`SELECT data FROM risks WHERE tenant_id = $1`, tenantId),
  ]);

  const personnelList = [];
  const instructorList = [];
  const studentList = [];
  const privatePilotList = [];

  for (const row of personnelRows) {
    const type = row.userType || 'Personnel';
    if (INSTRUCTOR_TYPES.has(type)) {
      instructorList.push(row);
    } else if (STUDENT_TYPES.has(type)) {
      studentList.push(row);
    } else if (PRIVATE_PILOT_TYPES.has(type)) {
      privatePilotList.push(row);
    } else if (PERSONNEL_TYPES.has(type)) {
      personnelList.push(row);
    } else {
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
}
