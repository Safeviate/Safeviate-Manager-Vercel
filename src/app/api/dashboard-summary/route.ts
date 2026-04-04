import { authOptions } from '@/auth';
import { getDb } from '@/db';
import {
  correctiveActionPlans,
  aircrafts,
  bookings,
  managementOfChange,
  personnel,
  qualityAudits,
  risks,
  safetyReports,
  tenants,
  users,
} from '@/db/schema';
import { eq } from 'drizzle-orm';
import { getServerSession } from 'next-auth';
import { NextResponse } from 'next/server';

const PERSONNEL_TYPES = new Set(['Personnel', 'External']);
const INSTRUCTOR_TYPES = new Set(['Instructor']);
const STUDENT_TYPES = new Set(['Student']);
const PRIVATE_PILOT_TYPES = new Set(['Private Pilot']);

export async function GET() {
  const session = await getServerSession(authOptions);
  const email = session?.user?.email?.trim().toLowerCase();

  if (!email) {
    return NextResponse.json(
      { bookings: [], aircrafts: [], personnel: [], instructors: [], students: [], privatePilots: [], mocs: [], audits: [], reports: [], caps: [], risks: [] },
      { status: 200 }
    );
  }

  const db = getDb();
  await db.insert(tenants).values({ id: 'safeviate', name: 'Safeviate', updatedAt: new Date() }).onConflictDoNothing();

  const [currentUser] = await db.select().from(users).where(eq(users.email, email)).limit(1);
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
    db.select().from(bookings).where(eq(bookings.tenantId, tenantId)),
    db.select().from(aircrafts).where(eq(aircrafts.tenantId, tenantId)),
    db.select().from(personnel).where(eq(personnel.tenantId, tenantId)),
    db.select().from(managementOfChange).where(eq(managementOfChange.tenantId, tenantId)),
    db.select().from(qualityAudits).where(eq(qualityAudits.tenantId, tenantId)),
    db.select().from(safetyReports).where(eq(safetyReports.tenantId, tenantId)),
    db.select().from(correctiveActionPlans).where(eq(correctiveActionPlans.tenantId, tenantId)),
    db.select().from(risks).where(eq(risks.tenantId, tenantId)),
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
