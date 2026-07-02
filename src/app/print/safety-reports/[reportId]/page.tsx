'use client';

import { use, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { format } from 'date-fns';
import { ArrowLeft, FileText } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { PrintButton } from '@/components/print-button';
import type { SafetyReport } from '@/types/safety-report';
import type { Personnel } from '@/app/(app)/users/personnel/page';
import type { RiskMatrixSettings } from '@/types/risk';
import { TriageForm } from '@/app/(app)/safety/safety-reports/[reportId]/triage-form';
import { HazardIdentificationForm } from '@/app/(app)/safety/safety-reports/[reportId]/hazard-identification-form';
import { InvestigationForm } from '@/app/(app)/safety/safety-reports/[reportId]/investigation-form';
import { CorrectiveActionsForm } from '@/app/(app)/safety/safety-reports/[reportId]/corrective-actions-form';
import { FinalReview } from '@/app/(app)/safety/safety-reports/[reportId]/final-review';
import { useUserProfile } from '@/hooks/use-user-profile';

const isEmailLike = (value?: string | null) => Boolean(value && /\S+@\S+\.\S+/.test(value));

const resolveReporterLabel = (
  report: {
    isAnonymous?: boolean | null;
    submittedBy?: string | null;
    submittedByEmail?: string | null;
    submittedByName?: string | null;
    submittedOnBehalfOf?: string | null;
  },
  currentUserEmail?: string | null,
) => {
  if (report.isAnonymous) return 'Anonymous';
  const submittedOnBehalfOf = report.submittedOnBehalfOf?.trim() || '';
  const submittedByEmail = report.submittedByEmail?.trim() || '';
  const submittedByName = report.submittedByName?.trim() || '';
  const submittedBy = report.submittedBy?.trim() || '';
  const viewerEmail = currentUserEmail?.trim() || '';

  if (submittedOnBehalfOf) return submittedOnBehalfOf;
  if (submittedByEmail) return submittedByEmail;
  if (submittedByName && !/^vercel user$/i.test(submittedByName)) return submittedByName;
  if (isEmailLike(submittedBy)) return submittedBy;
  if ((/^vercel user$/i.test(submittedByName) || /^vercel-user$/i.test(submittedBy)) && viewerEmail) return viewerEmail;
  return submittedByName || submittedBy || 'Signed-in User';
};

interface SafetyReportPrintPageProps {
  params: Promise<{ reportId: string }>;
}

export default function SafetyReportPrintPage({ params }: SafetyReportPrintPageProps) {
  const resolvedParams = use(params);
  const { userProfile, tenantId } = useUserProfile();
  const reportId = resolvedParams.reportId;
  const [report, setReport] = useState<SafetyReport | null>(null);
  const [personnel, setPersonnel] = useState<Personnel[]>([]);
  const [riskMatrixSettings, setRiskMatrixSettings] = useState<RiskMatrixSettings | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      if (!reportId || !tenantId) {
        if (!cancelled) setIsLoading(false);
        return;
      }

      setIsLoading(true);
      try {
        const [reportResponse, personnelResponse] = await Promise.all([
          fetch(`/api/safety-reports/${reportId}`, { cache: 'no-store' }),
          fetch('/api/personnel', { cache: 'no-store' }),
        ]);

        const reportPayload = await reportResponse.json().catch(() => ({ report: null }));
        const personnelPayload = await personnelResponse.json().catch(() => ({ personnel: [] }));

        if (!cancelled) {
          setReport(reportPayload.report ?? null);
          setPersonnel(personnelPayload.personnel ?? []);
          setRiskMatrixSettings(null);
        }
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    };

    void load();
    return () => {
      cancelled = true;
    };
  }, [reportId, tenantId]);

  const reporterLabel = useMemo(() => {
    if (!report) return '';
    return resolveReporterLabel(report, userProfile?.email);
  }, [report, userProfile?.email]);

  if (isLoading) {
    return (
      <div className="mx-auto flex w-full max-w-[1100px] flex-col gap-6 px-4 py-6">
        <Skeleton className="h-10 w-40" />
        <Skeleton className="h-[220px] w-full" />
        <Skeleton className="h-[700px] w-full" />
      </div>
    );
  }

  if (!tenantId || !report) {
    return (
      <div className="mx-auto flex min-h-screen w-full max-w-[1100px] flex-col items-center justify-center gap-4 px-4 py-8 text-center">
        <p className="text-sm text-muted-foreground">Safety report document could not be loaded.</p>
        <Button asChild variant="outline">
          <Link href="/safety/safety-reports">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Safety Reports
          </Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="mx-auto flex w-full max-w-[1100px] flex-col gap-6 px-4 py-6 print:max-w-none print:px-0 print:py-0">
      <div className="no-print flex flex-wrap items-center justify-between gap-3 rounded-2xl border bg-muted/5 px-4 py-3">
        <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
          <FileText className="h-4 w-4 text-primary" />
          Safety report document view
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button asChild variant="outline" size="sm">
            <Link href={`/safety/safety-reports/${report.id}`}>
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to Working Page
            </Link>
          </Button>
          <PrintButton label="Print Document" className="h-9" />
        </div>
      </div>

      <div className="space-y-8">
        <Card className="shadow-none print:border-none">
          <CardHeader className="space-y-3 print:px-0">
            <CardTitle className="text-3xl font-black tracking-tight">Safety Report {report.reportNumber}</CardTitle>
            <CardDescription className="text-base">
              Filed on {format(new Date(report.submittedAt), 'PPP')} by {reporterLabel}
            </CardDescription>
            {report.submittedOnBehalfOf ? (
              <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-muted-foreground">
                On behalf of {report.submittedOnBehalfOf}
              </p>
            ) : null}
            {report.sourceQuickReportNumber ? (
              <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-muted-foreground">
                Originated from {report.sourceQuickReportNumber}
              </p>
            ) : null}
          </CardHeader>
          <CardContent className="border-t pt-4 print:px-0">
            <h4 className="mb-2 text-xs font-bold uppercase tracking-widest text-muted-foreground">Original Description</h4>
            <p className="whitespace-pre-wrap text-sm">{report.description}</p>
          </CardContent>
        </Card>

        <div className="flex flex-col gap-10">
          <TriageForm report={report} tenantId={tenantId} isStacked />
          <HazardIdentificationForm report={report} tenantId={tenantId} personnel={personnel} riskMatrixColors={riskMatrixSettings?.colors} isStacked onReportSaved={() => {}} />
          <InvestigationForm report={report} tenantId={tenantId} personnel={personnel} isStacked />
          <CorrectiveActionsForm report={report} tenantId={tenantId} personnel={personnel} isStacked onReportSaved={() => {}} />
          <FinalReview report={report} tenantId={tenantId} personnel={personnel} riskMatrixColors={riskMatrixSettings?.colors} isStacked />
        </div>
      </div>
    </div>
  );
}
