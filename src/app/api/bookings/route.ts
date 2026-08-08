import { authOptions } from '@/auth';
import { getAircraftBookingBlockState } from '@/lib/aircraft-inspection';
import { prisma } from '@/lib/prisma';
import { normalizeAircraftRecord } from '@/lib/server/aircraft-normalize';
import { getTenantIdForRoute } from '@/lib/server/session-tenant';
import { getCompletedAircraftHourPatch } from '@/lib/aircraft-hours';
import { ensureBookingsSchema } from '@/lib/server/bootstrap-db';
import { allocateNextBookingNumber } from '@/lib/server/booking-sequence';
import { invalidateRouteCache } from '@/lib/server/route-cache';
import { recordSimulationRouteMetric } from '@/lib/server/simulation-telemetry';
import { getServerSession } from 'next-auth';
import { NextResponse } from 'next/server';
import { randomUUID } from 'node:crypto';
import type { AircraftInspectionWarningSettings } from '@/types/inspection';
import { isCommercialBooking } from '@/lib/booking-profile';

const SUPER_USERS = ['deanebolton@gmail.com', 'barry@safeviate.com'];

function isCompletedStatus(status: unknown) {
  return status === 'Completed';
}

function toStableJson(value: unknown) {
  return JSON.stringify(value ?? null);
}

function getBookingFinalAmount(data: Record<string, any>) {
  const costing = data.commercialDetails?.charterCosting;
  const finalAmount = typeof costing?.finalAmount === 'number' ? costing.finalAmount : data.totalCost;
  return typeof finalAmount === 'number' && Number.isFinite(finalAmount) && finalAmount > 0 ? finalAmount : null;
}

function createInvoiceReference(data: Record<string, any>) {
  const source = String(data.bookingNumber || data.id || 'booking').replace(/[^A-Za-z0-9-]/g, '').slice(-24);
  return `INV-${new Date().getFullYear()}-${source}`;
}

function hasBookingSignatureMutation(existingData: Record<string, any> | null, incoming: Record<string, any>) {
  if ('checkApprovals' in incoming && toStableJson(incoming.checkApprovals) !== toStableJson(existingData?.checkApprovals)) {
    return true;
  }

  if ('workflowApprovals' in incoming && toStableJson(incoming.workflowApprovals) !== toStableJson(existingData?.workflowApprovals)) {
    return true;
  }

  if ('approvedById' in incoming && incoming.approvedById !== existingData?.approvedById) {
    return true;
  }

  if ('approvedByName' in incoming && incoming.approvedByName !== existingData?.approvedByName) {
    return true;
  }

  if ('approvedAt' in incoming && incoming.approvedAt !== existingData?.approvedAt) {
    return true;
  }
  if ('instructorSignOff' in incoming && toStableJson(incoming.instructorSignOff) !== toStableJson(existingData?.instructorSignOff)) {
    return true;
  }

  if (incoming.status === 'Approved' && existingData?.status !== 'Approved') {
    return true;
  }

  return false;
}

async function getTenantId(request: Request) {
  return getTenantIdForRoute(request, { allowDevelopmentFallback: true });
}

export async function GET(request: Request) {
  const startedAt = Date.now();
  let tenantId: string | null = null;
  try {
    tenantId = await getTenantId(request);
    if (!tenantId) return NextResponse.json({ bookings: [] }, { status: 200 });

    await ensureBookingsSchema();
    const bookings = await prisma.bookingRecord.findMany({
      where: { tenantId },
      orderBy: { createdAt: 'asc' },
      select: { data: true },
    });

    await recordSimulationRouteMetric({
      tenantId,
      routeKey: 'bookings.GET',
      reads: 1,
      writes: 0,
      durationMs: Date.now() - startedAt,
    });

    return NextResponse.json(
      {
        bookings: bookings.map((row) => row.data),
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('[bookings] failed to load bookings:', error);
    await recordSimulationRouteMetric({
      tenantId,
      routeKey: 'bookings.GET',
      reads: 0,
      writes: 0,
      durationMs: Date.now() - startedAt,
      isError: true,
    });
    return NextResponse.json({ bookings: [] }, { status: 200 });
  }
}

export async function POST(request: Request) {
  const startedAt = Date.now();
  let tenantId: string | null = null;
  try {
    tenantId = await getTenantId(request);
    if (!tenantId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    const resolvedTenantId = tenantId;

    const body = await request.json().catch(() => null);
    const incoming = body?.booking ?? {};
    const requestedBookingId = typeof incoming.id === 'string' ? incoming.id.trim() : '';
    const id = requestedBookingId || randomUUID();

    if (requestedBookingId) {
      const existingBooking = await prisma.bookingRecord.findUnique({
        where: { id },
        select: { tenantId: true },
      });

      if (existingBooking && existingBooking.tenantId !== resolvedTenantId) {
        return NextResponse.json({ error: 'Booking not found in the active tenant.' }, { status: 404 });
      }
    }

    if (incoming.aircraftId && incoming.type !== 'Maintenance') {
      const [aircraftRow, configRow] = await Promise.all([
        prisma.aircraftRecord.findFirst({
          where: { id: incoming.aircraftId, tenantId: resolvedTenantId },
          select: { data: true },
        }),
        prisma.tenantConfig.findUnique({
          where: { tenantId: resolvedTenantId },
          select: { data: true },
        }),
      ]);

      const aircraft = aircraftRow?.data ? normalizeAircraftRecord(aircraftRow.data) : null;
      const inspectionSettings = (
        (configRow?.data as Record<string, unknown> | null | undefined)?.['inspection-warning-settings']
      ) as AircraftInspectionWarningSettings | undefined;
      const documentExpirySettings = (
        (configRow?.data as Record<string, unknown> | null | undefined)?.['document-expiry-settings']
      ) as Record<string, unknown> | undefined;

      const bookingBlockState = aircraft
        ? getAircraftBookingBlockState(
            aircraft,
            inspectionSettings || null,
            (documentExpirySettings as Parameters<typeof getAircraftBookingBlockState>[2]) || null
          )
        : { isBlocked: false, reason: null };

      if (bookingBlockState.isBlocked) {
        return NextResponse.json(
          {
            error:
              bookingBlockState.reason === 'document'
                ? 'Aircraft documents have expired and must be updated before new bookings can be created.'
                : 'Aircraft service hours must be updated before new bookings can be created.',
          },
          { status: 409 }
        );
      }
    }

    await ensureBookingsSchema();

    const data = await prisma.$transaction(async (tx) => {
      const sequence = await allocateNextBookingNumber(tx, resolvedTenantId);
      const nextData = {
        ...incoming,
        id,
        bookingNumber: sequence.bookingNumber,
      };

      await tx.bookingRecord.upsert({
        where: { id },
        create: {
          id,
          tenantId: resolvedTenantId,
          data: nextData,
        },
        update: {
          data: nextData,
        },
      });

      const postFlightData = incoming.postFlightData;
      const shouldMirrorAircraftHours =
        nextData.status === 'Completed' &&
        nextData.aircraftId &&
        postFlightData &&
        typeof postFlightData.hobbs === 'number' &&
        typeof postFlightData.tacho === 'number';

      if (shouldMirrorAircraftHours) {
        const aircraftRow = await tx.aircraftRecord.findFirst({
          where: { id: nextData.aircraftId, tenantId: resolvedTenantId },
          select: { data: true },
        });

        const existingAircraft = (aircraftRow?.data as Record<string, unknown> | null) || { id: nextData.aircraftId };
        const completedPatch = getCompletedAircraftHourPatch(postFlightData.hobbs, postFlightData.tacho);

        await tx.aircraftRecord.upsert({
          where: { id: nextData.aircraftId },
          create: {
            id: nextData.aircraftId,
            tenantId: resolvedTenantId,
            data: {
              ...existingAircraft,
              ...completedPatch,
            },
          },
          update: {
            tenantId: resolvedTenantId,
            data: {
              ...existingAircraft,
              ...completedPatch,
            },
            updatedAt: new Date(),
          },
        });
      }

      return nextData;
    });

    invalidateRouteCache(`dashboard-summary:${tenantId}`);
    invalidateRouteCache(`schedule-data:${tenantId}`);
    invalidateRouteCache(`aircraft:${tenantId}`);

    await recordSimulationRouteMetric({
      tenantId,
      routeKey: 'bookings.POST',
      reads: 2,
      writes: 2,
      durationMs: Date.now() - startedAt,
    });
    return NextResponse.json({ booking: data }, { status: 201 });
  } catch (error) {
    console.error('[bookings] failed to save booking:', error);
    await recordSimulationRouteMetric({
      tenantId,
      routeKey: 'bookings.POST',
      reads: 0,
      writes: 0,
      durationMs: Date.now() - startedAt,
      isError: true,
    });
    return NextResponse.json({ error: 'Failed to save booking.' }, { status: 500 });
  }
}

export async function PUT(request: Request) {
  try {
    const tenantId = await getTenantId(request);
    if (!tenantId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    const session = await getServerSession(authOptions);
    const actorId = session?.user?.id?.trim() || '';

    const body = await request.json().catch(() => null);
    const incoming = body?.booking ?? {};
    const bookingId = incoming.id;

    if (!bookingId) {
      return NextResponse.json({ error: 'Missing booking id.' }, { status: 400 });
    }

    await ensureBookingsSchema();

    const existing = await prisma.bookingRecord.findUnique({
      where: { id: bookingId },
      select: { data: true, tenantId: true },
    });

    if (!existing || existing.tenantId !== tenantId) {
      return NextResponse.json({ error: 'Booking not found in the active tenant.' }, { status: 404 });
    }

    const existingData = (existing.data as Record<string, any> | null) || null;
    const assignedInstructorId = typeof existingData?.instructorId === 'string' ? existingData.instructorId.trim() : '';
    if (hasBookingSignatureMutation(existingData, incoming)) {
      if (!actorId) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
      }
      if (!assignedInstructorId || actorId !== assignedInstructorId) {
        return NextResponse.json(
          { error: 'Only the assigned instructor can record booking approvals or instructor sign-off.' },
          { status: 403 }
        );
      }
    }

    const incomingStatus = incoming.status ?? existingData?.status;
    const incomingAircraftId = incoming.aircraftId ?? existingData?.aircraftId;
    const incomingStart = incoming.start ?? existingData?.start;

    if (isCompletedStatus(incomingStatus) && incomingAircraftId && incomingStart) {
      const earlierBookings = await prisma.bookingRecord.findMany({
        where: {
          tenantId,
          id: { not: bookingId },
        },
        select: { data: true },
      });

      const blockingBooking = earlierBookings
        .map((record) => record.data as Record<string, any>)
        .filter((booking) => booking?.aircraftId === incomingAircraftId)
        .filter((booking) => typeof booking.start === 'string' && booking.start < incomingStart)
        .filter((booking) => booking.status !== 'Cancelled' && booking.status !== 'Cancelled with Reason')
        .find((booking) => booking.status !== 'Completed');

    if (blockingBooking) {
        return NextResponse.json(
          {
            error: 'This flight cannot be marked completed until all earlier non-cancelled bookings for the same aircraft are completed.',
          },
          { status: 409 },
        );
      }
    }

    let mergedData = {
      ...existingData,
      ...incoming,
    };

    const finalAmount = getBookingFinalAmount(mergedData);
    const shouldCreateInvoice = mergedData.status === 'Completed'
      && isCommercialBooking({ type: mergedData.type, operationProfile: mergedData.operationProfile })
      && typeof mergedData.organizationId === 'string'
      && mergedData.organizationId.trim()
      && finalAmount !== null
      && !String(mergedData.invoiceReference || '').trim();

    if (shouldCreateInvoice) {
      mergedData = {
        ...mergedData,
        invoiceReference: createInvoiceReference(mergedData),
        accountingStatus: 'Invoiced',
        invoiceIssuedAt: new Date().toISOString(),
      };
    }

    await prisma.bookingRecord.update({
      where: { id: bookingId },
      data: { data: mergedData },
    });

    invalidateRouteCache(`dashboard-summary:${tenantId}`);
    invalidateRouteCache(`schedule-data:${tenantId}`);

    return NextResponse.json({ booking: mergedData }, { status: 200 });
  } catch (error) {
    console.error('[bookings] failed to update booking:', error);
    return NextResponse.json({ error: 'Failed to update booking.' }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  try {
    const tenantId = await getTenantId(request);
    if (!tenantId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await request.json().catch(() => null);
    const bookingId = body?.bookingId;

    if (!bookingId) {
      return NextResponse.json({ error: 'Missing booking id.' }, { status: 400 });
    }

    await ensureBookingsSchema();

    await prisma.bookingRecord.deleteMany({ where: { id: bookingId, tenantId } });

    invalidateRouteCache(`dashboard-summary:${tenantId}`);
    invalidateRouteCache(`schedule-data:${tenantId}`);

    return NextResponse.json({ ok: true }, { status: 200 });
  } catch (error) {
    console.error('[bookings] failed to delete booking:', error);
    return NextResponse.json({ error: 'Failed to delete booking.' }, { status: 500 });
  }
}
