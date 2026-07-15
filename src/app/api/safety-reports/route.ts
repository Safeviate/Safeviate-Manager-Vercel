import { authOptions } from '@/auth';
import { prisma } from '@/lib/prisma';
import { getTenantIdForRoute } from '@/lib/server/session-tenant';
import { ensureSafetyReportsSchema } from '@/lib/server/bootstrap-db';
import { recordSimulationRouteMetric } from '@/lib/server/simulation-telemetry';
import { allocateNextSafetyReportNumber } from '@/lib/server/safety-report-sequence';
import { getServerSession } from 'next-auth';
import { NextResponse } from 'next/server';
import { randomUUID } from 'node:crypto';
import { markRecoveryArchivesRestoredForEntity, recordRecoveryArchive } from '@/lib/server/recovery-vault';

async function getTenantId(request: Request) {
  return getTenantIdForRoute(request);
}

export async function GET(request: Request) {
  const startedAt = Date.now();
  let tenantId: string | null = null;
  try {
    tenantId = await getTenantId(request);
    if (!tenantId) return NextResponse.json({ reports: [] }, { status: 200 });
    await ensureSafetyReportsSchema();

    const rows = await prisma.$queryRawUnsafe<{ data: unknown; created_at: Date }[]>(
      `SELECT data, created_at FROM safety_reports WHERE tenant_id = $1 ORDER BY created_at ASC`,
      tenantId
    );

    await recordSimulationRouteMetric({
      tenantId,
      routeKey: 'safety-reports.GET',
      reads: 1,
      writes: 0,
      durationMs: Date.now() - startedAt,
    });
    return NextResponse.json(
      {
        reports: rows.map((row) => ({
          ...(row.data as Record<string, unknown>),
          createdAt: row.created_at.toISOString(),
          tenantId,
        })),
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('[safety-reports] fallback to empty list:', error);
    await recordSimulationRouteMetric({
      tenantId,
      routeKey: 'safety-reports.GET',
      reads: 0,
      writes: 0,
      durationMs: Date.now() - startedAt,
      isError: true,
    });
    return NextResponse.json({ reports: [] }, { status: 200 });
  }
}

export async function POST(request: Request) {
  const startedAt = Date.now();
  let tenantId: string | null = null;
  try {
    tenantId = await getTenantId(request);
    if (!tenantId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    await ensureSafetyReportsSchema();

    const body = await request.json();
    const incoming = body?.report ?? {};
    const data = await prisma.$transaction(async (tx) => {
      const id = incoming.id || randomUUID();
      const existingRows = await tx.$queryRawUnsafe<{ data: Record<string, unknown> }[]>(
        `SELECT data FROM safety_reports WHERE id = $1 AND tenant_id = $2 LIMIT 1`,
        id,
        tenantId,
      );
      const existingReportNumber = existingRows[0]?.data?.reportNumber;
      const reportNumber =
        typeof existingReportNumber === 'string' && existingReportNumber.trim().length > 0
          ? existingReportNumber.trim()
          : (await allocateNextSafetyReportNumber(tx, tenantId!)).reportNumber;
      const nextData = { ...incoming, id, reportNumber };

      await tx.$executeRawUnsafe(
        `INSERT INTO safety_reports (id, tenant_id, data, created_at, updated_at)
         VALUES ($1, $2, $3::jsonb, NOW(), NOW())
         ON CONFLICT (id) DO UPDATE SET data = EXCLUDED.data, updated_at = NOW()`,
        id,
        tenantId,
        JSON.stringify(nextData)
      );

      return nextData;
    });

    await recordSimulationRouteMetric({
      tenantId,
      routeKey: 'safety-reports.POST',
      reads: 0,
      writes: 1,
      durationMs: Date.now() - startedAt,
    });
    return NextResponse.json({ report: { ...data, tenantId } }, { status: 201 });
  } catch (error) {
    console.error('[safety-reports] write failed:', error);
    await recordSimulationRouteMetric({
      tenantId,
      routeKey: 'safety-reports.POST',
      reads: 0,
      writes: 0,
      durationMs: Date.now() - startedAt,
      isError: true,
    });
    return NextResponse.json({ error: 'Failed to submit report.' }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  const startedAt = Date.now();
  let tenantId: string | null = null;
  try {
    tenantId = await getTenantId(request);
    if (!tenantId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    const activeTenantId = tenantId;
    await ensureSafetyReportsSchema();

    const body = await request.json();
    const reportId = body?.reportId;
    if (!reportId) return NextResponse.json({ error: 'Missing report id.' }, { status: 400 });

    const session = await getServerSession(authOptions);
    const actorEmail = session?.user?.email?.trim().toLowerCase();
    const existingRows = await prisma.$queryRawUnsafe<{ data: Record<string, unknown> }[]>(
      `SELECT data FROM safety_reports WHERE id = $1 AND tenant_id = $2 LIMIT 1`,
      reportId,
      tenantId,
    );
    const existing = existingRows[0]?.data;
    if (!existing) return NextResponse.json({ error: 'Safety report not found.' }, { status: 404 });

    await prisma.$transaction(async (tx) => {
      await recordRecoveryArchive({
        tenantId: activeTenantId,
        entityType: 'safety-report',
        entityId: reportId,
        entityLabel: String(existing.reportNumber || existing.title || reportId),
        snapshot: { report: existing },
        actorUserId: session?.user?.id || null,
        actorEmail: actorEmail || 'unknown',
      }, tx);
      await tx.$executeRawUnsafe(
        `UPDATE safety_reports SET data = jsonb_set(data, '{status}', '"Archived"'::jsonb), updated_at = NOW()
         WHERE id = $1 AND tenant_id = $2`,
        reportId,
        activeTenantId
      );
    });
    await recordSimulationRouteMetric({
      tenantId,
      routeKey: 'safety-reports.ARCHIVE',
      reads: 0,
      writes: 1,
      durationMs: Date.now() - startedAt,
    });
    return NextResponse.json({ ok: true }, { status: 200 });
  } catch (error) {
    console.error('[safety-reports] delete failed:', error);
    await recordSimulationRouteMetric({
      tenantId,
      routeKey: 'safety-reports.DELETE',
      reads: 0,
      writes: 0,
      durationMs: Date.now() - startedAt,
      isError: true,
    });
    return NextResponse.json({ error: 'Failed to archive report.' }, { status: 500 });
  }
}

export async function PATCH(request: Request) {
  const startedAt = Date.now();
  let tenantId: string | null = null;
  try {
    tenantId = await getTenantId(request);
    if (!tenantId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    await ensureSafetyReportsSchema();
    const body = await request.json();
    const reportId = body?.reportId;
    const status = body?.status;
    if (!reportId || !['Open', 'Closed', 'Under Review'].includes(status)) {
      return NextResponse.json({ error: 'Invalid report restore request.' }, { status: 400 });
    }
    await prisma.$executeRawUnsafe(
      `UPDATE safety_reports SET data = jsonb_set(data, '{status}', to_jsonb($3::text)), updated_at = NOW()
       WHERE id = $1 AND tenant_id = $2 AND data->>'status' = 'Archived'`,
      reportId,
      tenantId,
      status
    );
    const session = await getServerSession(authOptions);
    const actorEmail = session?.user?.email?.trim().toLowerCase();
    if (actorEmail) {
      await markRecoveryArchivesRestoredForEntity(
        { tenantId, entityType: 'safety-report', entityId: reportId },
        { userId: session?.user?.id || null, email: actorEmail },
      );
    }
    await recordSimulationRouteMetric({ tenantId, routeKey: 'safety-reports.RESTORE', reads: 0, writes: 1, durationMs: Date.now() - startedAt });
    return NextResponse.json({ ok: true }, { status: 200 });
  } catch (error) {
    console.error('[safety-reports] restore failed:', error);
    await recordSimulationRouteMetric({ tenantId, routeKey: 'safety-reports.RESTORE', reads: 0, writes: 0, durationMs: Date.now() - startedAt, isError: true });
    return NextResponse.json({ error: 'Failed to restore report.' }, { status: 500 });
  }
}
