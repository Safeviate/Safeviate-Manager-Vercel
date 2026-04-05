import { authOptions } from '@/auth';
import { prisma } from '@/lib/prisma';
import { ensureAircraftSchema } from '@/lib/server/bootstrap-db';
import { getServerSession } from 'next-auth';
import { NextResponse } from 'next/server';
import { randomUUID } from 'node:crypto';

async function getTenantId() {
  const session = await getServerSession(authOptions);
  const email = session?.user?.email?.trim().toLowerCase();
  if (!email) return null;

  const currentUser = await prisma.user.findUnique({
    where: { email },
    select: { tenantId: true },
  });

  return currentUser?.tenantId || 'safeviate';
}

export async function GET() {
  try {
    await ensureAircraftSchema();
    const tenantId = await getTenantId();
    if (!tenantId) return NextResponse.json({ aircraft: [] }, { status: 200 });

    const aircraft = await prisma.aircraftRecord.findMany({
      where: { tenantId },
      orderBy: { createdAt: 'asc' },
    });

    return NextResponse.json({ aircraft: aircraft.map((row) => row.data) }, { status: 200 });
  } catch (error) {
    console.error('[aircraft] fallback to empty list:', error);
    return NextResponse.json({ aircraft: [] }, { status: 200 });
  }
}

export async function POST(request: Request) {
  try {
    await ensureAircraftSchema();
    const tenantId = await getTenantId();
    if (!tenantId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await request.json().catch(() => null);
    const incoming = body?.aircraft ?? {};
    const id = incoming.id || randomUUID();
    const data = {
      ...incoming,
      id,
      organizationId: incoming.organizationId || tenantId,
      components: Array.isArray(incoming.components) ? incoming.components : [],
      documents: Array.isArray(incoming.documents) ? incoming.documents : [],
    };

    await prisma.aircraftRecord.upsert({
      where: { id },
      update: {
        tenantId,
        data,
        updatedAt: new Date(),
      },
      create: {
        id,
        tenantId,
        data,
      },
    });

    return NextResponse.json({ aircraft: data }, { status: 200 });
  } catch (error) {
    console.error('[aircraft] failed to save aircraft:', error);
    return NextResponse.json({ error: 'Failed to save aircraft.' }, { status: 500 });
  }
}
