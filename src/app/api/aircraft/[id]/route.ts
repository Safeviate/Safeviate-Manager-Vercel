import { authOptions } from '@/auth';
import { prisma } from '@/lib/prisma';
import { ensureAircraftSchema } from '@/lib/server/bootstrap-db';
import { getServerSession } from 'next-auth';
import { NextResponse } from 'next/server';

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

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    await ensureAircraftSchema();
    const tenantId = await getTenantId();
    if (!tenantId) return NextResponse.json({ aircraft: null }, { status: 200 });

    const { id } = await params;
    const row = await prisma.aircraftRecord.findFirst({
      where: { id, tenantId },
    });

    return NextResponse.json({ aircraft: row?.data ?? null }, { status: 200 });
  } catch (error) {
    console.error('[aircraft/[id]] fallback to null:', error);
    return NextResponse.json({ aircraft: null }, { status: 200 });
  }
}

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    await ensureAircraftSchema();
    const tenantId = await getTenantId();
    if (!tenantId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { id } = await params;
    const body = await request.json().catch(() => null);
    const incoming = body?.aircraft;
    if (!incoming || typeof incoming !== 'object') {
      return NextResponse.json({ error: 'Missing aircraft payload.' }, { status: 400 });
    }

    await prisma.aircraftRecord.upsert({
      where: { id },
      update: {
        tenantId,
        data: { ...incoming, id },
        updatedAt: new Date(),
      },
      create: {
        id,
        tenantId,
        data: { ...incoming, id },
      },
    });

    return NextResponse.json({ ok: true }, { status: 200 });
  } catch (error) {
    console.error('[aircraft/[id]] failed to update aircraft:', error);
    return NextResponse.json({ error: 'Failed to update aircraft.' }, { status: 500 });
  }
}

export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    await ensureAircraftSchema();
    const tenantId = await getTenantId();
    if (!tenantId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { id } = await params;
    await prisma.aircraftRecord.deleteMany({ where: { id, tenantId } });
    return NextResponse.json({ ok: true }, { status: 200 });
  } catch (error) {
    console.error('[aircraft/[id]] failed to delete aircraft:', error);
    return NextResponse.json({ error: 'Failed to delete aircraft.' }, { status: 500 });
  }
}
