import { authOptions } from '@/auth';
import type { Prisma } from '@/generated/prisma/client';
import { prisma } from '@/lib/prisma';
import { getTenantIdForRoute } from '@/lib/server/session-tenant';
import { ensureAircraftSchema } from '@/lib/server/bootstrap-db';
import { invalidateRouteCache } from '@/lib/server/route-cache';
import { normalizeAircraftRecord } from '@/lib/server/aircraft-normalize';
import { getServerSession } from 'next-auth';
import { NextResponse } from 'next/server';
import { markRecoveryArchivesRestoredForEntity, recordRecoveryArchive } from '@/lib/server/recovery-vault';

async function getTenantId(request: Request) {
  return getTenantIdForRoute(request);
}

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    await ensureAircraftSchema();
    const tenantId = await getTenantId(request);
    if (!tenantId) return NextResponse.json({ aircraft: null }, { status: 200 });

    const { id } = await params;
    const row = await prisma.aircraftRecord.findFirst({
      where: { id, tenantId },
    });

    return NextResponse.json({ aircraft: normalizeAircraftRecord(row?.data ?? null) }, { status: 200 });
  } catch (error) {
    console.error('[aircraft/[id]] fallback to null:', error);
    return NextResponse.json({ aircraft: null }, { status: 200 });
  }
}

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    await ensureAircraftSchema();
    const tenantId = await getTenantId(request);
    if (!tenantId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { id } = await params;
    const body = await request.json().catch(() => null);
    if (body?.action === 'restore') {
      const session = await getServerSession(authOptions);
      const actorEmail = session?.user?.email?.trim().toLowerCase();
      const existing = await prisma.aircraftRecord.findFirst({ where: { id, tenantId } });
      if (!existing) return NextResponse.json({ error: 'Archived aircraft not found.' }, { status: 404 });
      const archivedData = existing.data as Record<string, unknown>;
      const { archiveStatus: _archiveStatus, archivedAt: _archivedAt, ...restoredData } = archivedData;
      await prisma.$transaction(async (tx) => {
        await tx.aircraftRecord.update({
          where: { id },
          data: { data: restoredData as Prisma.InputJsonValue, updatedAt: new Date() },
        });
        if (actorEmail) {
          await markRecoveryArchivesRestoredForEntity(
            { tenantId, entityType: 'aircraft', entityId: id },
            { userId: session?.user?.id || null, email: actorEmail },
            tx,
          );
        }
      });
      invalidateRouteCache(`aircraft:${tenantId}`);
      invalidateRouteCache(`dashboard-summary:${tenantId}`);
      invalidateRouteCache(`schedule-data:${tenantId}`);
      return NextResponse.json({ ok: true }, { status: 200 });
    }
    const incoming = body?.aircraft;
    if (!incoming || typeof incoming !== 'object') {
      return NextResponse.json({ error: 'Missing aircraft payload.' }, { status: 400 });
    }

    const data = normalizeAircraftRecord({
      ...incoming,
      id,
      tailNumber: incoming.tailNumber || incoming.registration || incoming.registrationNumber,
      registration: incoming.registration || incoming.tailNumber || incoming.registrationNumber,
      registrationNumber: incoming.registrationNumber || incoming.tailNumber || incoming.registration,
    }) as unknown as Prisma.InputJsonValue;

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

    invalidateRouteCache(`aircraft:${tenantId}`);
    invalidateRouteCache(`dashboard-summary:${tenantId}`);
    invalidateRouteCache(`schedule-data:${tenantId}`);

    return NextResponse.json({ ok: true }, { status: 200 });
  } catch (error) {
    console.error('[aircraft/[id]] failed to update aircraft:', error);
    return NextResponse.json({ error: 'Failed to update aircraft.' }, { status: 500 });
  }
}

export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    await ensureAircraftSchema();
    const tenantId = await getTenantId(request);
    if (!tenantId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { id } = await params;
    const [session, aircraft] = await Promise.all([
      getServerSession(authOptions),
      prisma.aircraftRecord.findFirst({ where: { id, tenantId } }),
    ]);
    if (!aircraft) return NextResponse.json({ error: 'Aircraft not found.' }, { status: 404 });

    await prisma.$transaction(async (tx) => {
      const data = aircraft.data as Record<string, unknown>;
      await recordRecoveryArchive({
        tenantId,
        entityType: 'aircraft',
        entityId: id,
        entityLabel: String(data.tailNumber || data.registration || data.registrationNumber || id),
        snapshot: { aircraft: data },
        actorUserId: session?.user?.id || null,
        actorEmail: session?.user?.email?.trim().toLowerCase() || 'unknown',
      }, tx);
      await tx.aircraftRecord.update({
        where: { id },
        data: {
          data: {
            ...data,
            archiveStatus: 'Archived',
            archivedAt: new Date().toISOString(),
          } as Prisma.InputJsonValue,
          updatedAt: new Date(),
        },
      });
    });
    invalidateRouteCache(`aircraft:${tenantId}`);
    invalidateRouteCache(`dashboard-summary:${tenantId}`);
    invalidateRouteCache(`schedule-data:${tenantId}`);
    return NextResponse.json({ ok: true }, { status: 200 });
  } catch (error) {
    console.error('[aircraft/[id]] failed to delete aircraft:', error);
    return NextResponse.json({ error: 'Failed to delete aircraft.' }, { status: 500 });
  }
}
