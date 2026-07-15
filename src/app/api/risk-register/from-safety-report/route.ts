import { ensureRisksSchema } from '@/lib/server/bootstrap-db';
import { getTenantIdForRoute } from '@/lib/server/session-tenant';
import { prisma } from '@/lib/prisma';
import { recordSimulationRouteMetric } from '@/lib/server/simulation-telemetry';
import type { Risk, RiskItem, Mitigation, RiskSourceOccurrence, RiskTrainingClassification } from '@/types/risk';
import type { ReportHazard, ReportRisk, SafetyReport } from '@/types/safety-report';
import { NextResponse } from 'next/server';

const registerIdFor = (reportId: string, hazardId: string) => `safety-report:${reportId}:${hazardId}`;
const riskIdFor = (reportId: string, hazardId: string, riskId: string) => `safety-report:${reportId}:${hazardId}:${riskId}`;

const asDate = (value?: string | null) => value || new Date().toISOString();

const normalizeText = (value?: string | null) => (value || '')
  .toLowerCase()
  .replace(/[^a-z0-9]+/g, ' ')
  .trim()
  .replace(/\s+/g, ' ');

const occurrenceKey = (occurrence: Pick<RiskSourceOccurrence, 'reportId' | 'hazardId' | 'riskId'>) =>
  `${occurrence.reportId}:${occurrence.hazardId}:${occurrence.riskId}`;

const canonicalKeyFor = (report: SafetyReport, hazard: ReportHazard) =>
  `${normalizeText(report.occurrenceCategory || 'Safety Reports')}::${normalizeText(hazard.description || report.title || report.reportNumber)}`;

const defaultTrainingClassification = (): RiskTrainingClassification => ({
  status: 'Unclassified',
  audience: 'All Personnel',
  trainingArea: '',
  learningObjective: '',
  notes: '',
});

const mergeOccurrences = (existing: RiskSourceOccurrence[] | undefined, next: RiskSourceOccurrence) => {
  const occurrences = [...(existing || [])];
  if (!occurrences.some((entry) => occurrenceKey(entry) === occurrenceKey(next))) {
    occurrences.push(next);
  }
  return occurrences;
};

const mergeMitigations = (existing: Mitigation[], incoming: Mitigation[]) => {
  const merged = [...existing];
  for (const mitigation of incoming) {
    const isDuplicate = merged.some((candidate) => normalizeText(candidate.description) === normalizeText(mitigation.description));
    if (!isDuplicate) merged.push(mitigation);
  }
  return merged;
};

function toRegisterRisk(
  report: SafetyReport,
  hazard: ReportHazard,
  risk: ReportRisk,
  occurrence: RiskSourceOccurrence,
): RiskItem {
  const correctiveActions = report.correctiveActions || [];
  const mitigations: Mitigation[] = (risk.mitigations || []).map((mitigation) => {
    const action = correctiveActions.find((candidate) => candidate.id === mitigation.id);
    return {
      id: mitigation.id,
      description: mitigation.description || 'No mitigation description recorded.',
      responsiblePersonId: action?.responsiblePersonId || '',
      reviewDate: asDate(action?.deadline),
      residualRiskAssessment: mitigation.residualRiskAssessment,
    };
  });

  return {
    id: riskIdFor(report.id, hazard.id, risk.id),
    description: risk.description || 'Unspecified risk outcome',
    initialRiskAssessment: risk.riskAssessment,
    mitigations,
    sourceOccurrences: [occurrence],
    trainingClassification: defaultTrainingClassification(),
    sourceSafetyReportId: report.id,
    sourceSafetyReportNumber: report.reportNumber,
    sourceHazardId: hazard.id,
    sourceRiskId: risk.id,
  };
}

const isOccurrenceLinked = (entry: RiskItem, occurrence: RiskSourceOccurrence) =>
  entry.sourceOccurrences?.some((source) => occurrenceKey(source) === occurrenceKey(occurrence)) ||
  (entry.sourceSafetyReportId === occurrence.reportId &&
    entry.sourceHazardId === occurrence.hazardId &&
    entry.sourceRiskId === occurrence.riskId);

const mergeRiskItem = (existing: RiskItem, incoming: RiskItem, occurrence: RiskSourceOccurrence): RiskItem => ({
  ...existing,
  sourceOccurrences: mergeOccurrences(existing.sourceOccurrences, occurrence),
  mitigations: mergeMitigations(existing.mitigations || [], incoming.mitigations || []),
  initialRiskAssessment: existing.initialRiskAssessment || incoming.initialRiskAssessment,
  trainingClassification: existing.trainingClassification || incoming.trainingClassification,
});

export async function POST(request: Request) {
  const startedAt = Date.now();
  const tenantId = await getTenantIdForRoute(request);
  if (!tenantId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    await ensureRisksSchema();
    const body = await request.json();
    const report = body?.report as SafetyReport | undefined;
    const hazard = body?.hazard as ReportHazard | undefined;
    const risk = body?.risk as ReportRisk | undefined;

    if (!report?.id || !report.reportNumber || !hazard?.id || !risk?.id) {
      return NextResponse.json({ error: 'A report, hazard, and risk are required.' }, { status: 400 });
    }

    const occurrence: RiskSourceOccurrence = {
      reportId: report.id,
      reportNumber: report.reportNumber,
      hazardId: hazard.id,
      riskId: risk.id,
      linkedAt: new Date().toISOString(),
    };
    const canonicalKey = canonicalKeyFor(report, hazard);
    const rows = await prisma.$queryRawUnsafe<{ id: string; data: Risk }[]>(
      `SELECT id, data FROM risks WHERE tenant_id = $1`,
      tenantId,
    );
    const risks = rows.map((row) => row.data).filter(Boolean);
    const exactRegisterId = registerIdFor(report.id, hazard.id);

    const exactLinkedRisk = risks.find((entry) =>
      (entry.risks || []).some((riskItem) => isOccurrenceLinked(riskItem, occurrence)),
    );
    if (exactLinkedRisk) {
      return NextResponse.json({ risk: exactLinkedRisk, alreadyLinked: true, linkedExisting: true }, { status: 200 });
    }

    const existing = risks.find((entry) =>
      entry.id === exactRegisterId ||
      entry.canonicalKey === canonicalKey ||
      (!entry.canonicalKey &&
        normalizeText(entry.hazardArea) === normalizeText(report.occurrenceCategory || 'Safety Reports') &&
        normalizeText(entry.hazard) === normalizeText(hazard.description || report.title || report.reportNumber)),
    );
    const incomingRisk = toRegisterRisk(report, hazard, risk, occurrence);

    if (existing) {
      const matchingRiskIndex = (existing.risks || []).findIndex((entry) =>
        normalizeText(entry.description) === normalizeText(incomingRisk.description),
      );
      const nextRiskItems = [...(existing.risks || [])];
      if (matchingRiskIndex >= 0) {
        nextRiskItems[matchingRiskIndex] = mergeRiskItem(nextRiskItems[matchingRiskIndex], incomingRisk, occurrence);
      } else {
        nextRiskItems.push(incomingRisk);
      }

      const updated: Risk = {
        ...existing,
        canonicalKey,
        sourceOccurrences: mergeOccurrences(existing.sourceOccurrences, occurrence),
        risks: nextRiskItems,
      };
      await prisma.$executeRawUnsafe(
        `UPDATE risks SET data = $1::jsonb, updated_at = NOW() WHERE tenant_id = $2 AND id = $3`,
        JSON.stringify(updated),
        tenantId,
        existing.id,
      );
      await recordSimulationRouteMetric({ tenantId, routeKey: 'risk-register.from-safety-report', reads: 1, writes: 1, durationMs: Date.now() - startedAt });
      return NextResponse.json({ risk: updated, alreadyLinked: false, linkedExisting: existing.id !== exactRegisterId }, { status: 200 });
    }

    const created: Risk = {
      id: exactRegisterId,
      canonicalKey,
      hazardArea: report.occurrenceCategory || 'Safety Reports',
      hazard: hazard.description || report.title || report.reportNumber,
      status: 'Open',
      risks: [incomingRisk],
      sourceOccurrences: [occurrence],
      organizationId: report.organizationId || null,
      sourceSafetyReportId: report.id,
      sourceSafetyReportNumber: report.reportNumber,
      sourceHazardId: hazard.id,
    };
    await prisma.$executeRawUnsafe(
      `INSERT INTO risks (id, tenant_id, data, created_at, updated_at) VALUES ($1, $2, $3::jsonb, NOW(), NOW())`,
      exactRegisterId,
      tenantId,
      JSON.stringify(created),
    );
    await recordSimulationRouteMetric({ tenantId, routeKey: 'risk-register.from-safety-report', reads: 1, writes: 1, durationMs: Date.now() - startedAt });
    return NextResponse.json({ risk: created, alreadyLinked: false, linkedExisting: false }, { status: 201 });
  } catch (error) {
    console.error('[risk-register/from-safety-report] failed:', error);
    await recordSimulationRouteMetric({ tenantId, routeKey: 'risk-register.from-safety-report', reads: 0, writes: 0, durationMs: Date.now() - startedAt, isError: true });
    return NextResponse.json({ error: 'Unable to add the safety risk to the risk register.' }, { status: 500 });
  }
}
