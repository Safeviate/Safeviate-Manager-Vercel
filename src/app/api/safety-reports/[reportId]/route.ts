import { authOptions } from '@/auth';
import { prisma } from '@/lib/prisma';
import { getTenantIdForRoute } from '@/lib/server/session-tenant';
import { getServerSession } from 'next-auth';
import { NextResponse } from 'next/server';
import type { SafetyReport } from '@/types/safety-report';

function toStableJson(value: unknown) {
  return JSON.stringify(value ?? null);
}

async function getTenantId(request: Request) {
  return getTenantIdForRoute(request);
}

function validateLifecycleUpdate(report: SafetyReport) {
  const status = report.status;
  const actions = report.correctiveActions || [];
  const hasOpenActions = actions.some((action) => !['Closed', 'Cancelled'].includes(action.status));
  const requiresRootCause = ['Incident', 'Serious Incident', 'Accident'].includes(report.eventClassification || '');
  const hasClosureApproval = Boolean(
    report.closure?.rationale?.trim()
    && report.closure?.approvedBy?.trim()
    && report.closure?.approvedAt,
  );
  const hasMonitoringPlan = Boolean(
    report.monitoringPlan?.indicatorName?.trim()
    && report.monitoringPlan?.reviewDate,
  );

  if (status === 'Reopened' && !report.closure?.reopenReason?.trim()) {
    return 'A reason is required before reopening a safety report.';
  }

  if (!['Closed - Monitoring', 'Closed - Effective'].includes(status)) return null;
  if (hasOpenActions) return 'All corrective actions must be closed or cancelled before the report can enter closure monitoring.';
  if (requiresRootCause && !(report.rootCauseAnalyses || []).length) {
    return 'At least one root cause analysis is required before closing an incident or accident report.';
  }
  if (!hasClosureApproval) return 'Closure rationale and approver details are required before closing the report.';
  if (!(report.signatures || []).length) return 'At least one report sign-off is required before closing the report.';
  if (!hasMonitoringPlan) return 'A safety monitoring indicator and review date are required before closing the report.';

  if (status === 'Closed - Effective') {
    if (report.monitoringPlan?.reviewResult !== 'Effective' || !report.monitoringPlan.reviewCompletedAt) {
      return 'The monitoring review must be recorded as effective before the report can be fully closed.';
    }
  }

  return null;
}

export async function PUT(request: Request, context: { params: Promise<{ reportId: string }> }) {
  const tenantId = await getTenantId(request);
  if (!tenantId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const session = await getServerSession(authOptions);
  const actorId = session?.user?.id?.trim() || null;

  const { reportId } = await context.params;
  const body = await request.json();
  const data = body?.report;

  if (!reportId || !data) {
    return NextResponse.json({ error: 'Missing report data.' }, { status: 400 });
  }

  const rows = await prisma.$queryRawUnsafe<{ data: unknown; tenant_id: string }[]>(
    `SELECT data, tenant_id FROM safety_reports WHERE id = $1 LIMIT 1`,
    reportId
  );
  const row = rows[0];
  if (!row || row.tenant_id !== tenantId) {
    return NextResponse.json({ error: 'Report not found.' }, { status: 404 });
  }

  const existingReport = row.data as SafetyReport;
  const incomingReport = data as SafetyReport;
  const nextReport: SafetyReport = ['Closed - Monitoring', 'Closed - Effective'].includes(incomingReport.status)
    ? { ...incomingReport, closedDate: incomingReport.closedDate || new Date().toISOString() }
    : incomingReport;
  const lifecycleError = validateLifecycleUpdate(nextReport);
  if (lifecycleError) {
    return NextResponse.json({ error: lifecycleError }, { status: 422 });
  }
  const existingSignatures = Array.isArray(existingReport?.signatures) ? existingReport.signatures : [];
  const incomingSignatures = Array.isArray(nextReport?.signatures) ? nextReport.signatures : [];
  const signaturesChanged = toStableJson(existingSignatures) !== toStableJson(incomingSignatures);

  if (signaturesChanged) {
    if (!actorId) {
      return NextResponse.json({ error: 'You must be signed in to sign this report.' }, { status: 401 });
    }

    if (incomingSignatures.length !== existingSignatures.length + 1) {
      return NextResponse.json({ error: 'Safety report signatures can only be added by the active signed-in user.' }, { status: 403 });
    }

    const appendedSignature = incomingSignatures[incomingSignatures.length - 1];
    if (!appendedSignature || appendedSignature.userId !== actorId) {
      return NextResponse.json({ error: 'Safety report signatures must belong to the current signed-in user.' }, { status: 403 });
    }
  }

  await prisma.$executeRawUnsafe(
    `UPDATE safety_reports SET data = $2::jsonb, updated_at = NOW() WHERE id = $1 AND tenant_id = $3`,
    reportId,
    JSON.stringify(nextReport),
    tenantId
  );

  return NextResponse.json({ report: nextReport }, { status: 200 });
}

export async function PATCH(request: Request, context: { params: Promise<{ reportId: string }> }) {
  const tenantId = await getTenantId(request);
  if (!tenantId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { reportId } = await context.params;
  const body = await request.json();
  const relatedReportId = typeof body?.relatedReportId === 'string' ? body.relatedReportId.trim() : '';
  const relationship = typeof body?.relationship === 'string' ? body.relationship.trim().slice(0, 120) : 'Related safety matter';
  const action = body?.action;

  if (!reportId || !relatedReportId || reportId === relatedReportId || !['link', 'unlink'].includes(action)) {
    return NextResponse.json({ error: 'Invalid related report request.' }, { status: 400 });
  }

  const rows = await prisma.$queryRawUnsafe<{ id: string; data: unknown }[]>(
    `SELECT id, data FROM safety_reports WHERE tenant_id = $1 AND id IN ($2, $3)`,
    tenantId,
    reportId,
    relatedReportId,
  );
  const currentReport = rows.find((row) => row.id === reportId)?.data as SafetyReport | undefined;
  const relatedReport = rows.find((row) => row.id === relatedReportId)?.data as SafetyReport | undefined;

  if (!currentReport || !relatedReport) {
    return NextResponse.json({ error: 'Related safety report not found.' }, { status: 404 });
  }

  const updateLinks = (report: SafetyReport, targetId: string) => {
    const existing = Array.isArray(report.relatedReportIds) ? report.relatedReportIds.filter(Boolean) : [];
    const relatedReportIds = action === 'link'
      ? [...new Set([...existing, targetId])]
      : existing.filter((id) => id !== targetId);
    const reportLinks = Array.isArray(report.relatedReportLinks) ? report.relatedReportLinks.filter((link) => link.reportId !== targetId) : [];
    if (action === 'link') reportLinks.push({ reportId: targetId, relationship: relationship || 'Related safety matter' });
    return { ...report, relatedReportIds, relatedReportLinks: reportLinks };
  };

  const nextCurrentReport = updateLinks(currentReport, relatedReportId);
  const nextRelatedReport = updateLinks(relatedReport, reportId);

  await prisma.$transaction(async (tx) => {
    await tx.$executeRawUnsafe(
      `UPDATE safety_reports SET data = $2::jsonb, updated_at = NOW() WHERE id = $1 AND tenant_id = $3`,
      reportId,
      JSON.stringify(nextCurrentReport),
      tenantId,
    );
    await tx.$executeRawUnsafe(
      `UPDATE safety_reports SET data = $2::jsonb, updated_at = NOW() WHERE id = $1 AND tenant_id = $3`,
      relatedReportId,
      JSON.stringify(nextRelatedReport),
      tenantId,
    );
  });

  return NextResponse.json({ report: nextCurrentReport }, { status: 200 });
}

export async function GET(request: Request, context: { params: Promise<{ reportId: string }> }) {
  try {
    const tenantId = await getTenantId(request);
    if (!tenantId) return NextResponse.json({ report: null }, { status: 200 });

    const { reportId } = await context.params;
    if (!reportId) return NextResponse.json({ report: null }, { status: 400 });

    const rows = await prisma.$queryRawUnsafe<{ data: unknown; tenant_id: string }[]>(
      `SELECT data, tenant_id FROM safety_reports WHERE id = $1 LIMIT 1`,
      reportId
    );
    const row = rows[0];

    if (!row || row.tenant_id !== tenantId) {
      return NextResponse.json({ report: null }, { status: 404 });
    }

    return NextResponse.json({ report: row.data }, { status: 200 });
  } catch (error) {
    console.error('[safety-reports/[reportId]] fallback to null:', error);
    return NextResponse.json({ report: null }, { status: 200 });
  }
}
