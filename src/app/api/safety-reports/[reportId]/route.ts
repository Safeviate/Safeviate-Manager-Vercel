import { authOptions } from '@/auth';
import { prisma } from '@/lib/prisma';
import { getTenantIdForRoute } from '@/lib/server/session-tenant';
import { isMasterTenantEmail } from '@/lib/server/tenant-access';
import { getServerSession } from 'next-auth';
import { NextResponse } from 'next/server';
import type { SafetyReport } from '@/types/safety-report';

function toStableJson(value: unknown) {
  return JSON.stringify(value ?? null);
}

async function getTenantId(request: Request) {
  return getTenantIdForRoute(request);
}

function mergePermissions(rolePermissions: unknown, userPermissions: unknown) {
  const permissions = new Set<string>();
  const denied = new Set<string>();
  for (const source of [rolePermissions, userPermissions]) {
    if (!Array.isArray(source)) continue;
    for (const entry of source) {
      if (typeof entry !== 'string') continue;
      const value = entry.trim();
      if (!value) continue;
      if (value.startsWith('!')) denied.add(value.slice(1));
      else permissions.add(value);
    }
  }
  for (const permission of denied) permissions.delete(permission);
  return permissions;
}

async function canEditSafetyReports(request: Request, tenantId: string) {
  const session = await getServerSession(authOptions);
  const email = session?.user?.email?.trim().toLowerCase();
  if (!email) return false;

  // The Safeviate master account must retain full tenant-wide access.
  if (isMasterTenantEmail(email)) return true;

  const personnel = await prisma.personnel.findFirst({
    where: { tenantId, email: { equals: email, mode: 'insensitive' } },
    select: { role: true, permissions: true },
  });
  if (!personnel) return false;

  const role = personnel.role?.trim();
  const roleRecord = role
    ? await prisma.role.findFirst({
      where: { tenantId, OR: [{ id: role }, { name: role }] },
      select: { permissions: true },
    })
    : null;
  const permissions = mergePermissions(roleRecord?.permissions, personnel.permissions);
  return permissions.has('*') || permissions.has('safety-reports-edit');
}

function validateLifecycleUpdate(existingReport: SafetyReport, report: SafetyReport) {
  const status = report.status;
  const actions = report.correctiveActions || [];
  const hasOpenActions = actions.some((action) => !['Closed', 'Cancelled'].includes(action.status));
  const hasHighSeverityRisk = (report.initialHazards || []).some((hazard) =>
    (hazard.risks || []).some((risk) => ['High', 'Critical'].includes(risk.riskAssessment?.riskLevel || '')),
  );
  const requiresRootCause = hasHighSeverityRisk || ['Incident', 'Serious Incident', 'Accident'].includes(report.eventClassification || '');
  const hasInvestigationConclusion = Boolean(report.investigationNotes?.trim());
  const hasDocumentedRootCause = (report.rootCauseAnalyses || []).some((cause) => cause.title?.trim() && cause.analysis?.trim());
  const hasClosureApproval = Boolean(
    report.closure?.rationale?.trim()
    && report.closure?.approvedBy?.trim()
    && report.closure?.approvedAt,
  );
  const nextFeedbackDate = report.monitoringPlan?.reviewDate ? new Date(report.monitoringPlan.reviewDate) : null;
  const hasFutureFeedbackDate = Boolean(nextFeedbackDate && !Number.isNaN(nextFeedbackDate.getTime()) && nextFeedbackDate.getTime() > Date.now());
  const hasRiskDecision = actions.length === 0 || actions.every((action) =>
    action.tolerabilityDecision
    && action.tolerabilityDecision !== 'Unacceptable'
    && action.tolerabilityRationale?.trim(),
  );
  const monitoringPlan = report.monitoringPlan;
  const hasMeasurableMonitoringPlan = Boolean(
    monitoringPlan?.indicatorName?.trim()
    && monitoringPlan.baseline?.trim()
    && monitoringPlan.target?.trim()
    && monitoringPlan.monitoringPeriod?.trim(),
  );

  if (status === 'Reopened' && !report.closure?.reopenReason?.trim()) {
    return 'A reason is required before reopening a safety report.';
  }

  if (!['Closed - Monitoring', 'Closed - Effective'].includes(status)) return null;
  if (hasOpenActions) return 'All corrective actions must be closed or cancelled before the report can enter closure monitoring.';
  if (!hasRiskDecision) return 'Record an acceptable or tolerable decision and rationale for every corrective action before closing the report.';
  if (hasHighSeverityRisk && !hasInvestigationConclusion) {
    return 'Record an investigation conclusion before closing a report with high or critical risk.';
  }
  if (requiresRootCause && !hasDocumentedRootCause) {
    return hasHighSeverityRisk
      ? 'At least one completed root cause analysis is required before closing a report with high or critical risk.'
      : 'At least one completed root cause analysis is required before closing an incident or accident report.';
  }
  if (!hasClosureApproval) return 'Closure rationale and approver details are required before closing the report.';
  if (!(report.signatures || []).length) return 'At least one report sign-off is required before closing the report.';
  if (!hasFutureFeedbackDate) return 'Schedule a future feedback date before entering closure monitoring.';
  if (!hasMeasurableMonitoringPlan) return 'Define a measurable monitoring indicator, baseline, target, and monitoring period before entering closure monitoring.';

  if (status === 'Closed - Effective') {
    if (existingReport.status !== 'Closed - Monitoring' && existingReport.status !== 'Closed - Effective') {
      return 'The report must enter closure monitoring before it can be marked closed and effective.';
    }
    if (report.monitoringPlan?.reviewResult !== 'Effective' || !report.monitoringPlan.reviewCompletedAt) {
      return 'The monitoring review must be recorded as effective before the report can be fully closed.';
    }
    if (!report.monitoringPlan.reviewNotes?.trim()) {
      return 'Record monitoring evidence or notes before the report can be fully closed.';
    }
  }

  return null;
}

export async function PUT(request: Request, context: { params: Promise<{ reportId: string }> }) {
  const tenantId = await getTenantId(request);
  if (!tenantId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  if (!(await canEditSafetyReports(request, tenantId))) {
    return NextResponse.json({ error: 'You do not have permission to edit safety reports for this tenant.' }, { status: 403 });
  }
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
  const lifecycleError = validateLifecycleUpdate(existingReport, nextReport);
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
  if (!(await canEditSafetyReports(request, tenantId))) {
    return NextResponse.json({ error: 'You do not have permission to edit safety reports for this tenant.' }, { status: 403 });
  }

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
