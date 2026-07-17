'use client';

import { use, useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsContent } from '@/components/ui/tabs';
import type { SafetyReport } from '@/types/safety-report';
import { ArrowLeft, Printer, ShieldAlert, Pencil, FileText, Link2, Unlink } from 'lucide-react';
import Link from 'next/link';
import { format } from 'date-fns';
import { TriageForm } from './triage-form';
import { useToast } from '@/hooks/use-toast';
import { InvestigationForm } from './investigation-form';
import { HazardIdentificationForm } from './hazard-identification-form';
import { CorrectiveActionsForm } from './corrective-actions-form';
import { FinalReview } from './final-review';
import { ReportForum } from './report-forum';
import type { Personnel } from '@/app/(app)/users/personnel/page';
import type { RiskMatrixSettings } from '@/types/risk';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useUserProfile } from '@/hooks/use-user-profile';
import { Badge } from '@/components/ui/badge';
import { EditReportDialog } from '../edit-report-dialog';
import { cn } from '@/lib/utils';
import {
  CARD_COMPACT_HEADER_BAND_CLASS,
  CARD_HEADER_BAND_CLASS,
  HEADER_COMPACT_CONTROL_CLASS,
  HEADER_SECONDARY_BUTTON_CLASS,
  HEADER_TAB_LIST_CLASS,
  HEADER_TAB_TRIGGER_CLASS,
} from '@/components/page-header';
import { usePageLayout } from '@/hooks/use-page-layout';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { getInitialNarrative } from '@/lib/safety-report-text';

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

interface SafetyReportDetailPageProps {
  params: Promise<{ reportId: string }>;
}

export default function SafetyReportDetailPage({ params }: SafetyReportDetailPageProps) {
  const { toast } = useToast();
  const { userProfile, tenantId } = useUserProfile();
  const { isPageEnabled, isSectionEnabled, isTabEnabled } = usePageLayout('safety-reports');
  const resolvedParams = use(params);
  const reportId = resolvedParams.reportId;
  const searchParams = useSearchParams();
  const [report, setReport] = useState<SafetyReport | null>(null);
  const [allReports, setAllReports] = useState<SafetyReport[]>([]);
  const [relatedReportReason, setRelatedReportReason] = useState('Same hazard or contributing factor');
  const [personnel, setPersonnel] = useState<Personnel[]>([]);
  const [riskMatrixSettings, setRiskMatrixSettings] = useState<RiskMatrixSettings | null>(null);
  const [isLoadingReport, setIsLoadingReport] = useState(true);
  const [isLoadingPersonnel, setIsLoadingPersonnel] = useState(true);
  const [isLoadingRiskMatrix, setIsLoadingRiskMatrix] = useState(true);
  const [activeTab, setActiveTab] = useState('triage');
  const showReportViews = isSectionEnabled('report-views');
  const requestedTab = searchParams?.get('tab');

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      if (!reportId || !tenantId) {
        setIsLoadingReport(false);
        setIsLoadingPersonnel(false);
        setIsLoadingRiskMatrix(false);
        return;
      }

      setIsLoadingReport(true);
      setIsLoadingPersonnel(true);
      setIsLoadingRiskMatrix(true);
      try {
        const [reportResponse, personnelResponse, allReportsResponse] = await Promise.all([
          fetch(`/api/safety-reports/${reportId}`, { cache: 'no-store' }),
          fetch('/api/personnel', { cache: 'no-store' }),
          fetch('/api/safety-reports', { cache: 'no-store' }),
        ]);

        const reportPayload = await reportResponse.json();
        const personnelPayload = await personnelResponse.json();
        const allReportsPayload = await allReportsResponse.json();

        if (cancelled) return;
        setReport(reportPayload.report ?? null);
        setPersonnel(personnelPayload.personnel ?? []);
        setAllReports(Array.isArray(allReportsPayload.reports) ? allReportsPayload.reports : []);
        setRiskMatrixSettings(null);
      } finally {
        if (!cancelled) {
          setIsLoadingReport(false);
          setIsLoadingPersonnel(false);
          setIsLoadingRiskMatrix(false);
        }
      }
    };

    void load();
    return () => {
      cancelled = true;
    };
  }, [reportId, tenantId]);

  const myMentionsCount = useMemo(() => {
    if (!userProfile) return 0;
    const assignedDiaryItems = (report?.discussion || []).filter((item) => item.assignedToId === userProfile.id).length;
    const assignedOpenTasks = (report?.investigationTasks || []).filter(
      (task) => task.assigneeId === userProfile.id && task.status !== 'Completed'
    ).length;
    return assignedDiaryItems + assignedOpenTasks;
  }, [report?.discussion, report?.investigationTasks, userProfile]);

  const visibleReportTabs = useMemo(() => {
    const tabs = [
      { value: 'full', label: 'Full Report' },
      { value: 'triage', label: 'Report & Triage' },
      { value: 'hazards', label: 'Hazard & Risk ID' },
      { value: 'investigation', label: 'Investigation & Root Cause' },
      { value: 'cap', label: 'Actions & Controls' },
      { value: 'monitoring', label: 'Monitoring' },
      { value: 'review', label: 'Final Review & Closure' },
      { value: 'discussion', label: myMentionsCount > 0 ? `Diary (${myMentionsCount})` : 'Diary' },
    ];
    return tabs.filter((tab) => isTabEnabled(tab.value));
  }, [isTabEnabled, myMentionsCount]);

  useEffect(() => {
    if (showReportViews && requestedTab && visibleReportTabs.some((tab) => tab.value === requestedTab)) {
      setActiveTab(requestedTab);
    }
  }, [requestedTab, showReportViews, visibleReportTabs]);

  useEffect(() => {
    if (!showReportViews || visibleReportTabs.length === 0) return;
    if (!visibleReportTabs.some((tab) => tab.value === activeTab)) {
      setActiveTab(visibleReportTabs[0].value);
    }
  }, [activeTab, showReportViews, visibleReportTabs]);

  const isLoading = isLoadingReport || isLoadingPersonnel || isLoadingRiskMatrix;

  const handleReportSaved = (updatedReport: SafetyReport) => {
    setReport(updatedReport);
  };

  const handlePrint = () => {
    window.print();
  };

  const handleRelatedReportChange = async (relatedReportId: string, action: 'link' | 'unlink') => {
    const response = await fetch(`/api/safety-reports/${reportId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ relatedReportId, action, relationship: relatedReportReason }),
    });
    const payload = await response.json().catch(() => ({}));
    if (!response.ok) {
      toast({ variant: 'destructive', title: 'Related Report Update Failed', description: payload.error || 'Unable to update the report link.' });
      return;
    }
    setReport(payload.report);
    setAllReports((current) => current.map((entry) => entry.id === payload.report.id ? payload.report : entry));
    toast({ title: action === 'link' ? 'Safety Reports Linked' : 'Safety Reports Unlinked' });
  };

  if (isLoading) {
    return (
      <div className="space-y-6 max-w-[1100px] mx-auto w-full pt-4 px-1">
        <Skeleton className="h-10 w-48" />
        <Skeleton className="h-[400px] w-full" />
      </div>
    );
  }

  if (!tenantId) {
    return (
      <div className="max-w-[1100px] mx-auto w-full text-center py-20 px-1">
        <p className="text-muted-foreground">Tenant context is required to load this report.</p>
        <Button asChild variant="link" className="mt-4">
          <Link href="/safety/safety-reports">Return to reports list</Link>
        </Button>
      </div>
    );
  }

  if (!report) {
    return (
      <div className="max-w-[1100px] mx-auto w-full text-center py-20 px-1">
        <p className="text-muted-foreground">Report not found.</p>
        <Button asChild variant="link" className="mt-4">
          <Link href="/safety/safety-reports">Return to reports list</Link>
        </Button>
      </div>
    );
  }

  if (!isPageEnabled) {
    return (
      <div className="max-w-[1100px] mx-auto w-full px-1 pt-4">
        <Card className="border shadow-none">
          <CardContent className="p-6 text-center text-sm text-muted-foreground">
            This page is disabled for the current tenant layout.
          </CardContent>
        </Card>
      </div>
    );
  }

  const reporterLabel = resolveReporterLabel(report, userProfile?.email);
  const relatedReportIds = Array.isArray(report.relatedReportIds) ? report.relatedReportIds : [];
  const relatedReportLinks = Array.isArray(report.relatedReportLinks) ? report.relatedReportLinks : [];
  const relatedReports = allReports.filter((entry) => relatedReportIds.includes(entry.id));
  const availableRelatedReports = allReports.filter((entry) => entry.id !== report.id && !relatedReportIds.includes(entry.id) && entry.status !== 'Archived');
  const riskCount = (report.initialHazards || []).reduce((count, hazard) => count + (hazard.risks?.length || 0), 0);
  const openActionCount = (report.correctiveActions || []).filter((action) => !['Closed', 'Cancelled'].includes(action.status)).length;
  const requiresRootCause = ['Incident', 'Serious Incident', 'Accident'].includes(report.eventClassification || '');
  const isInMonitoring = ['Closed - Monitoring', 'Closed - Effective'].includes(report.status);
  const workflowSteps = [
    {
      tab: 'triage',
      label: 'Triage',
      complete: Boolean(report.eventClassification && report.occurrenceCategory),
      detail: report.eventClassification && report.occurrenceCategory ? 'Classified' : 'Classification needed',
    },
    {
      tab: 'hazards',
      label: 'Risk Assessment',
      complete: riskCount > 0,
      detail: riskCount > 0 ? `${riskCount} risk${riskCount === 1 ? '' : 's'} recorded` : 'Risk assessment needed',
    },
    {
      tab: 'investigation',
      label: 'Investigation',
      complete: Boolean(report.investigationNotes && (!requiresRootCause || (report.rootCauseAnalyses || []).length > 0)),
      detail: report.investigationNotes ? `${report.rootCauseAnalyses?.length || 0} root cause${(report.rootCauseAnalyses?.length || 0) === 1 ? '' : 's'}` : 'Conclusion needed',
    },
    {
      tab: 'cap',
      label: 'Corrective Actions',
      complete: riskCount === 0 || ((report.correctiveActions || []).length > 0 && openActionCount === 0),
      detail: openActionCount > 0 ? `${openActionCount} action${openActionCount === 1 ? '' : 's'} open` : 'Actions complete',
    },
    {
      tab: 'monitoring',
      label: 'Monitoring',
      complete: report.status === 'Closed - Effective',
      detail: report.status === 'Closed - Effective' ? 'Effectiveness verified' : isInMonitoring ? 'Feedback monitoring in progress' : 'Feedback date needed',
    },
    {
      tab: 'review',
      label: 'Final Review & Closure',
      complete: Boolean(report.closure?.rationale?.trim() && isInMonitoring),
      detail: report.closure?.rationale?.trim() ? isInMonitoring ? 'Final review and closure recorded' : 'Closure awaiting monitoring' : 'Final review and closure needed',
    },
  ];
  const visibleWorkflowSteps = workflowSteps.filter((step) => visibleReportTabs.some((tab) => tab.value === step.tab));

  const renderFullReportSummary = () => {
    const hazards = report.initialHazards || [];
    const risks = hazards.flatMap((hazard) => (hazard.risks || []).map((risk) => ({ hazard, risk })));
    const investigationTasks = report.investigationTasks || [];
    const correctiveActions = report.correctiveActions || [];
    const signatures = report.signatures || [];
    const initialNarrative = getInitialNarrative(report.description, report.immediateAction);

    return (
      <div className="space-y-4 p-4 md:p-6">
        <section className="overflow-hidden rounded-lg border">
          <div className={CARD_COMPACT_HEADER_BAND_CLASS}>
            <h2 className="text-sm font-black uppercase tracking-wide">Report Summary</h2>
          </div>
          <div className="grid gap-x-6 gap-y-4 p-4 sm:grid-cols-2 lg:grid-cols-3">
            <div>
              <p className="text-[10px] font-black uppercase tracking-[0.14em] text-muted-foreground">Status</p>
              <p className="mt-1 text-sm font-semibold">{report.status}</p>
            </div>
            <div>
              <p className="text-[10px] font-black uppercase tracking-[0.14em] text-muted-foreground">Classification</p>
              <p className="mt-1 text-sm font-semibold">{report.eventClassification || 'Not classified'}</p>
            </div>
            <div>
              <p className="text-[10px] font-black uppercase tracking-[0.14em] text-muted-foreground">Occurrence category</p>
              <p className="mt-1 text-sm font-semibold">{report.occurrenceCategory || 'Not recorded'}</p>
            </div>
            <div>
              <p className="text-[10px] font-black uppercase tracking-[0.14em] text-muted-foreground">Event date and time</p>
              <p className="mt-1 text-sm font-semibold">{format(new Date(report.eventDate), 'PPP')} {report.eventTime ? `at ${report.eventTime}` : ''}</p>
            </div>
            <div>
              <p className="text-[10px] font-black uppercase tracking-[0.14em] text-muted-foreground">Location</p>
              <p className="mt-1 text-sm font-semibold">{report.location || 'Not recorded'}</p>
            </div>
            <div>
              <p className="text-[10px] font-black uppercase tracking-[0.14em] text-muted-foreground">Submitted by</p>
              <p className="mt-1 text-sm font-semibold">{reporterLabel}</p>
            </div>
          </div>
          <div className="border-t px-4 py-4">
            <p className="text-[10px] font-black uppercase tracking-[0.14em] text-muted-foreground">Initial narrative</p>
            <p className="mt-2 whitespace-pre-wrap text-sm leading-relaxed">{initialNarrative || 'No narrative recorded.'}</p>
          </div>
          {report.immediateAction ? (
            <div className="border-t bg-amber-50/50 px-4 py-4">
              <p className="text-[10px] font-black uppercase tracking-[0.14em] text-amber-800">Immediate action recorded</p>
              <p className="mt-2 whitespace-pre-wrap text-sm leading-relaxed">{report.immediateAction}</p>
            </div>
          ) : null}
        </section>

        <section className="overflow-hidden rounded-lg border">
          <div className={CARD_COMPACT_HEADER_BAND_CLASS}>
            <h2 className="text-sm font-black uppercase tracking-wide">Hazards and Risk Assessment</h2>
            <Badge variant="secondary">{risks.length} recorded</Badge>
          </div>
          {risks.length > 0 ? (
            <div className="divide-y">
              {risks.map(({ hazard, risk }) => (
                <div key={risk.id} className="grid gap-3 px-4 py-3 md:grid-cols-[minmax(0,1fr)_auto] md:items-center">
                  <div className="min-w-0">
                    <p className="text-sm font-semibold">{risk.description}</p>
                    <p className="mt-1 text-xs text-muted-foreground">Hazard: {hazard.description}</p>
                  </div>
                  <p className="text-xs font-bold uppercase tracking-wide text-muted-foreground">
                    Initial risk: {risk.riskAssessment.riskScore}{risk.riskAssessment.riskLevel ? ` - ${risk.riskAssessment.riskLevel}` : ''}
                  </p>
                </div>
              ))}
            </div>
          ) : <p className="px-4 py-5 text-sm text-muted-foreground">No hazards or risks have been recorded.</p>}
        </section>

        <section className="overflow-hidden rounded-lg border">
          <div className={CARD_COMPACT_HEADER_BAND_CLASS}>
            <h2 className="text-sm font-black uppercase tracking-wide">Investigation Summary</h2>
            <Badge variant="secondary">{investigationTasks.filter((task) => task.status !== 'Completed').length} open tasks</Badge>
          </div>
          <div className="grid gap-x-6 gap-y-4 p-4 sm:grid-cols-2 lg:grid-cols-4">
            <div><p className="text-[10px] font-black uppercase tracking-[0.14em] text-muted-foreground">Team members</p><p className="mt-1 text-sm font-semibold">{report.investigationTeam?.length || 0}</p></div>
            <div><p className="text-[10px] font-black uppercase tracking-[0.14em] text-muted-foreground">Interviews</p><p className="mt-1 text-sm font-semibold">{report.investigationInterviews?.length || 0}</p></div>
            <div><p className="text-[10px] font-black uppercase tracking-[0.14em] text-muted-foreground">Evidence files</p><p className="mt-1 text-sm font-semibold">{(report.investigationEvidencePhotos?.length || 0) + (report.investigationDocuments?.length || 0)}</p></div>
            <div><p className="text-[10px] font-black uppercase tracking-[0.14em] text-muted-foreground">Root causes</p><p className="mt-1 text-sm font-semibold">{report.rootCauseAnalyses?.length || 0}</p></div>
          </div>
          {report.investigationNotes ? <div className="border-t px-4 py-4"><p className="text-[10px] font-black uppercase tracking-[0.14em] text-muted-foreground">Investigation notes</p><p className="mt-2 whitespace-pre-wrap text-sm leading-relaxed">{report.investigationNotes}</p></div> : null}
        </section>

        <section className="overflow-hidden rounded-lg border">
          <div className={CARD_COMPACT_HEADER_BAND_CLASS}>
            <h2 className="text-sm font-black uppercase tracking-wide">Root Cause Analysis</h2>
            <Badge variant="secondary">{report.rootCauseAnalyses?.length || 0} recorded</Badge>
          </div>
          {(report.rootCauseAnalyses || []).length > 0 ? (
            <div className="divide-y">
              {report.rootCauseAnalyses?.map((cause) => (
                <div key={cause.id} className="px-4 py-3">
                  <div className="flex flex-wrap items-center gap-2"><p className="text-sm font-semibold">{cause.title}</p><Badge variant="outline">{cause.category}</Badge></div>
                  <p className="mt-2 whitespace-pre-wrap text-sm leading-relaxed text-muted-foreground">{cause.analysis}</p>
                </div>
              ))}
            </div>
          ) : <p className="px-4 py-5 text-sm text-muted-foreground">No root cause analysis has been recorded.</p>}
        </section>

        <section className="overflow-hidden rounded-lg border">
          <div className={CARD_COMPACT_HEADER_BAND_CLASS}>
            <h2 className="text-sm font-black uppercase tracking-wide">Corrective Action Summary</h2>
            <Badge variant="secondary">{correctiveActions.length} recorded</Badge>
          </div>
          {correctiveActions.length > 0 ? (
            <div className="divide-y">
              {correctiveActions.map((action) => (
                <div key={action.id} className="grid gap-3 px-4 py-3 md:grid-cols-[minmax(0,1fr)_auto_auto] md:items-center">
                  <p className="text-sm font-semibold">{action.description}</p>
                  <p className="text-xs text-muted-foreground">Due {format(new Date(action.deadline), 'PPP')}</p>
                  <Badge variant={action.status === 'Closed' ? 'secondary' : 'outline'}>{action.status}</Badge>
                </div>
              ))}
            </div>
          ) : <p className="px-4 py-5 text-sm text-muted-foreground">No corrective actions have been recorded.</p>}
        </section>

        <section className="overflow-hidden rounded-lg border">
          <div className={CARD_COMPACT_HEADER_BAND_CLASS}>
            <h2 className="text-sm font-black uppercase tracking-wide">Closure Record</h2>
            <Badge variant="secondary">{signatures.length} signatures</Badge>
          </div>
          <div className="grid gap-x-6 gap-y-4 p-4 sm:grid-cols-2">
            <div><p className="text-[10px] font-black uppercase tracking-[0.14em] text-muted-foreground">Closed date</p><p className="mt-1 text-sm font-semibold">{report.closedDate ? format(new Date(report.closedDate), 'PPP') : 'Not closed'}</p></div>
            <div><p className="text-[10px] font-black uppercase tracking-[0.14em] text-muted-foreground">Final status</p><p className="mt-1 text-sm font-semibold">{report.status}</p></div>
          </div>
        </section>

        <section className="overflow-hidden rounded-lg border">
          <div className={CARD_COMPACT_HEADER_BAND_CLASS}>
            <h2 className="text-sm font-black uppercase tracking-wide">Closure and Monitoring</h2>
            <Badge variant="secondary">{report.status}</Badge>
          </div>
          <div className="grid gap-x-6 gap-y-4 p-4 sm:grid-cols-2 lg:grid-cols-3">
            <div><p className="text-[10px] font-black uppercase tracking-[0.14em] text-muted-foreground">Closure approver</p><p className="mt-1 text-sm font-semibold">{report.closure?.approvedBy || 'Not approved'}</p></div>
            <div><p className="text-[10px] font-black uppercase tracking-[0.14em] text-muted-foreground">Monitoring indicator</p><p className="mt-1 text-sm font-semibold">{report.monitoringPlan?.indicatorName || 'Not defined'}</p></div>
            <div><p className="text-[10px] font-black uppercase tracking-[0.14em] text-muted-foreground">Monitoring result</p><p className="mt-1 text-sm font-semibold">{report.monitoringPlan?.reviewResult || 'Pending'}</p></div>
          </div>
          {report.closure?.rationale ? <div className="border-t px-4 py-4"><p className="text-[10px] font-black uppercase tracking-[0.14em] text-muted-foreground">Closure rationale</p><p className="mt-2 whitespace-pre-wrap text-sm leading-relaxed">{report.closure.rationale}</p></div> : null}
          {report.monitoringPlan?.reviewNotes ? <div className="border-t px-4 py-4"><p className="text-[10px] font-black uppercase tracking-[0.14em] text-muted-foreground">Monitoring evidence</p><p className="mt-2 whitespace-pre-wrap text-sm leading-relaxed">{report.monitoringPlan.reviewNotes}</p></div> : null}
          {report.closure?.reopenReason ? <div className="border-t bg-amber-50/50 px-4 py-4"><p className="text-[10px] font-black uppercase tracking-[0.14em] text-amber-800">Reopen reason</p><p className="mt-2 whitespace-pre-wrap text-sm leading-relaxed">{report.closure.reopenReason}</p></div> : null}
        </section>
      </div>
    );
  };

  const renderSingleTabContent = (tabValue: string) => {
    switch (tabValue) {
      case 'full':
        return renderFullReportSummary();
      case 'triage':
        return <TriageForm report={report} tenantId={tenantId} onReportSaved={handleReportSaved} />;
      case 'hazards':
        return <HazardIdentificationForm report={report} tenantId={tenantId} personnel={personnel || []} riskMatrixColors={riskMatrixSettings?.colors} onReportSaved={handleReportSaved} />;
      case 'investigation':
        return <InvestigationForm report={report} tenantId={tenantId} personnel={personnel || []} onReportSaved={handleReportSaved} />;
      case 'cap':
        return <CorrectiveActionsForm report={report} tenantId={tenantId} personnel={personnel || []} riskMatrixColors={riskMatrixSettings?.colors} onReportSaved={handleReportSaved} />;
      case 'review':
        return <FinalReview report={report} tenantId={tenantId} personnel={personnel || []} riskMatrixColors={riskMatrixSettings?.colors} showMonitoring={false} onReportSaved={handleReportSaved} />;
      case 'monitoring':
        return <FinalReview report={report} tenantId={tenantId} personnel={personnel || []} riskMatrixColors={riskMatrixSettings?.colors} showReview={false} showClosure={false} onReportSaved={handleReportSaved} />;
      case 'discussion':
        return <ReportForum report={report} tenantId={tenantId} onReportSaved={handleReportSaved} />;
      default:
        return renderFullReportSummary();
    }
  };

  return (
    <div className="max-w-[1100px] mx-auto w-full flex flex-col h-full overflow-hidden pt-4 px-1">
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full flex-1 flex flex-col overflow-hidden">
        
        {/* --- MAIN CONTENT CARD --- */}
        <div className="flex-1 overflow-hidden pb-10 no-print pt-4">
          <div className="rounded-xl border border-card-border overflow-hidden flex flex-col bg-card shadow-none h-full">
            <div className="sticky top-0 z-30 bg-card">
              <div className={`${CARD_COMPACT_HEADER_BAND_CLASS} min-h-[38px] bg-background px-4 md:px-5`}>
                <div className="flex min-w-0 flex-1 items-center gap-2 overflow-hidden">
                  <ShieldAlert className="h-3.5 w-3.5 shrink-0 text-slate-500" />
                  <p className="shrink-0 text-sm font-black tracking-tight text-slate-800">Report {report.reportNumber}</p>
                  <Badge variant="secondary" className="h-4 shrink-0 bg-slate-100 px-1.5 text-[8px] font-bold uppercase tracking-[0.08em] text-slate-700">{report.status}</Badge>
                  <span className="hidden h-3 w-px shrink-0 bg-slate-200 sm:block" aria-hidden="true" />
                  {report.sourceQuickReportNumber ? (
                    <span className="truncate text-[9px] font-bold uppercase tracking-[0.1em] text-slate-500">
                      Quick intake: {report.sourceQuickReportNumber}
                    </span>
                  ) : null}
                  <span className="hidden shrink-0 text-[9px] font-semibold uppercase tracking-[0.1em] text-slate-500 md:inline">
                    {report.reportingChannel || 'Voluntary'} report
                  </span>
                </div>
                <div className="flex shrink-0 items-center gap-1.5">
                  <EditReportDialog 
                    report={report} 
                    tenantId={tenantId} 
                    trigger={
                      <Button variant="outline" size="sm" className={`${HEADER_SECONDARY_BUTTON_CLASS} !h-8 !gap-1.5 !px-3 !py-1.5 !text-[9px]`}>
                          <Pencil className="h-3.5 w-3.5" />
                          Edit Report
                      </Button>
                    }
                  />
                  <Dialog>
                    <DialogTrigger asChild>
                      <Button variant="outline" size="sm" className={`${HEADER_SECONDARY_BUTTON_CLASS} !h-8 !gap-1.5 !px-3 !py-1.5 !text-[9px]`}>
                        <Link2 className="h-3.5 w-3.5" />
                        Related Reports{relatedReportIds.length > 0 ? ` (${relatedReportIds.length})` : ''}
                      </Button>
                    </DialogTrigger>
                    <DialogContent className="max-w-lg">
                      <DialogHeader>
                        <DialogTitle>Related Safety Reports</DialogTitle>
                        <DialogDescription>Link reports that relate to the same event, hazard, investigation, or corrective action.</DialogDescription>
                      </DialogHeader>
                      <div className="space-y-4">
                        <label className="block space-y-1.5 text-sm font-medium">
                          <span>Relationship</span>
                          <select value={relatedReportReason} onChange={(event) => setRelatedReportReason(event.target.value)} className="h-9 w-full rounded-md border bg-background px-3 text-sm">
                            <option>Same hazard or contributing factor</option>
                            <option>Repeat occurrence</option>
                            <option>Same corrective action or control</option>
                            <option>Related investigation</option>
                            <option>Related safety matter</option>
                          </select>
                        </label>
                        <label className="block space-y-1.5 text-sm font-medium">
                          <span>Link another report</span>
                          <select
                            className="h-9 w-full rounded-md border bg-background px-3 text-sm"
                            defaultValue=""
                            onChange={(event) => {
                              const relatedReportId = event.currentTarget.value;
                              if (relatedReportId) void handleRelatedReportChange(relatedReportId, 'link');
                            }}
                          >
                            <option value="">Select a safety report</option>
                            {availableRelatedReports.map((entry) => (
                              <option key={entry.id} value={entry.id}>
                                {entry.reportNumber} - {entry.location || entry.description.slice(0, 50)}
                              </option>
                            ))}
                          </select>
                        </label>
                        <div className="space-y-2">
                          <p className="text-xs font-black uppercase tracking-[0.14em] text-muted-foreground">Linked reports</p>
                          {relatedReports.length > 0 ? relatedReports.map((entry) => (
                            <div key={entry.id} className="flex items-center justify-between gap-3 rounded-md border px-3 py-2">
                              <Link href={`/safety/safety-reports/${entry.id}`} className="min-w-0 hover:text-primary hover:underline">
                                <p className="truncate text-sm font-semibold">{entry.reportNumber}</p>
                                <p className="truncate text-xs text-muted-foreground">{relatedReportLinks.find((link) => link.reportId === entry.id)?.relationship || entry.location || entry.description}</p>
                              </Link>
                              <Button type="button" variant="ghost" size="icon" className="h-8 w-8 shrink-0" onClick={() => void handleRelatedReportChange(entry.id, 'unlink')} aria-label={`Unlink ${entry.reportNumber}`}>
                                <Unlink className="h-4 w-4" />
                              </Button>
                            </div>
                          )) : (
                            <p className="rounded-md border border-dashed px-3 py-4 text-sm text-muted-foreground">No related safety reports are linked yet.</p>
                          )}
                        </div>
                      </div>
                    </DialogContent>
                  </Dialog>
                  <Button asChild variant="outline" size="sm" className={`${HEADER_SECONDARY_BUTTON_CLASS} !h-8 !gap-1.5 !px-3 !py-1.5 !text-[9px]`}>
                    <Link href={`/print/safety-reports/${report.id}`}>
                      <FileText className="h-4 w-4" />
                      Open Document
                    </Link>
                  </Button>
                  <Button onClick={handlePrint} variant="outline" size="sm" className={`${HEADER_SECONDARY_BUTTON_CLASS} !h-8 !gap-1.5 !px-3 !py-1.5 !text-[9px]`}>
                      <Printer className="h-4 w-4" />
                      Print Report
                  </Button>
                </div>
              </div>

              <div className={`${CARD_HEADER_BAND_CLASS} bg-slate-50/70 px-4 py-1.5 md:px-5`}>
                <div className="flex flex-col gap-2">
                  <div className={`${HEADER_TAB_LIST_CLASS} max-w-full overflow-x-auto no-scrollbar`} aria-label="Safety case workflow">
                    {visibleWorkflowSteps.map((step, index) => {
                      const isActive = activeTab === step.tab;
                      return (
                        <button
                          key={step.tab}
                          type="button"
                          onClick={() => setActiveTab(step.tab)}
                          title={`${index + 1}. ${step.label}`}
                          className={`${HEADER_TAB_TRIGGER_CLASS} h-6 ${isActive ? 'border-slate-900 bg-slate-900 text-white hover:bg-slate-800' : 'bg-white text-slate-600 hover:bg-slate-50'}`}
                        >
                          <span className={`h-1.5 w-1.5 shrink-0 rounded-full ${step.complete ? 'bg-emerald-500' : 'bg-amber-400'}`} />
                          <span>{index + 1}. {step.label}</span>
                        </button>
                      );
                    })}
                  </div>
                  <div className="flex shrink-0 items-center justify-end gap-1.5 border-t border-slate-200/80 pt-2">
                    <p className="text-[10px] font-semibold text-slate-500">{visibleWorkflowSteps.filter((step) => step.complete).length}/{visibleWorkflowSteps.length} complete</p>
                    <Button type="button" variant="ghost" size="sm" className={`${HEADER_COMPACT_CONTROL_CLASS} !h-6 px-2.5 ${activeTab === 'full' ? 'border-slate-900 bg-white text-slate-900' : 'text-slate-500'}`} onClick={() => setActiveTab('full')}>Full Report</Button>
                    <Button type="button" variant="ghost" size="sm" className={`${HEADER_COMPACT_CONTROL_CLASS} !h-6 px-2.5 ${activeTab === 'discussion' ? 'border-slate-900 bg-white text-slate-900' : 'text-slate-500'}`} onClick={() => setActiveTab('discussion')}>Diary{myMentionsCount > 0 ? ` (${myMentionsCount})` : ''}</Button>
                  </div>
                </div>
              </div>
            </div>

            <div className="flex-1 min-h-0">
              {!showReportViews || visibleReportTabs.length === 0 ? (
                <div className="m-0 h-full outline-none overflow-y-auto no-scrollbar">
                  {renderFullReportSummary()}
                </div>
              ) : visibleReportTabs.length === 1 ? (
                <div className="m-0 h-full outline-none overflow-y-auto no-scrollbar">
                  {renderSingleTabContent(visibleReportTabs[0].value)}
                </div>
              ) : (
                <>
                  <TabsContent value="full" className="m-0 h-full outline-none overflow-y-auto no-scrollbar">
                    {renderFullReportSummary()}
                  </TabsContent>
                  <TabsContent value="triage" className="m-0 h-full outline-none overflow-hidden h-full"><TriageForm report={report} tenantId={tenantId} onReportSaved={handleReportSaved} /></TabsContent>
                  <TabsContent value="hazards" className="m-0 h-full outline-none overflow-hidden h-full"><HazardIdentificationForm report={report} tenantId={tenantId} personnel={personnel || []} riskMatrixColors={riskMatrixSettings?.colors} onReportSaved={handleReportSaved} /></TabsContent>
                  <TabsContent value="investigation" className="m-0 h-full outline-none overflow-hidden h-full"><InvestigationForm report={report} tenantId={tenantId} personnel={personnel || []} onReportSaved={handleReportSaved} /></TabsContent>
                  <TabsContent value="cap" className="m-0 h-full outline-none overflow-hidden h-full"><CorrectiveActionsForm report={report} tenantId={tenantId} personnel={personnel || []} riskMatrixColors={riskMatrixSettings?.colors} onReportSaved={handleReportSaved} /></TabsContent>
                  <TabsContent value="review" className="m-0 h-full outline-none overflow-hidden h-full"><FinalReview report={report} tenantId={tenantId} personnel={personnel || []} riskMatrixColors={riskMatrixSettings?.colors} showMonitoring={false} onReportSaved={handleReportSaved} /></TabsContent>
                  <TabsContent value="monitoring" className="m-0 h-full outline-none overflow-hidden h-full"><FinalReview report={report} tenantId={tenantId} personnel={personnel || []} riskMatrixColors={riskMatrixSettings?.colors} showReview={false} showClosure={false} onReportSaved={handleReportSaved} /></TabsContent>
                  <TabsContent value="discussion" className="m-0 h-full outline-none overflow-hidden h-full"><ReportForum report={report} tenantId={tenantId} onReportSaved={handleReportSaved} /></TabsContent>
                </>
              )}
            </div>
          </div>
        </div>
      </Tabs>

      {/* --- Dedicated Print Layout (Hidden in UI) --- */}
      <div className="hidden print:block space-y-8 max-w-[1100px] mx-auto w-full">
          <Card className="shadow-none border-none">
            <CardHeader className="p-0 pb-4">
                <CardTitle className="text-2xl">Safety Report {report.reportNumber}</CardTitle>
                <CardDescription>
                Filed on {format(new Date(report.submittedAt), 'PPP')} by {reporterLabel}
                </CardDescription>
                {report.submittedOnBehalfOf ? (
                  <p className="mt-1 text-[10px] font-bold uppercase tracking-[0.16em] text-muted-foreground">
                    On behalf of {report.submittedOnBehalfOf}
                  </p>
                ) : null}
            </CardHeader>
            <CardContent className="p-0 border-t pt-4">
                <h4 className="text-xs font-bold uppercase tracking-widest text-muted-foreground mb-2">Original Description</h4>
                <p className="text-sm whitespace-pre-wrap">{getInitialNarrative(report.description, report.immediateAction) || 'No narrative recorded.'}</p>
            </CardContent>
          </Card>
          <div className="flex flex-col gap-10">
              <TriageForm report={report} tenantId={tenantId} isStacked onReportSaved={handleReportSaved} />
              <HazardIdentificationForm report={report} tenantId={tenantId} personnel={personnel || []} riskMatrixColors={riskMatrixSettings?.colors} isStacked onReportSaved={handleReportSaved} />
              <InvestigationForm report={report} tenantId={tenantId} personnel={personnel || []} isStacked />
              <CorrectiveActionsForm report={report} tenantId={tenantId} personnel={personnel || []} riskMatrixColors={riskMatrixSettings?.colors} isStacked onReportSaved={handleReportSaved} />
              <FinalReview report={report} tenantId={tenantId} personnel={personnel || []} riskMatrixColors={riskMatrixSettings?.colors} isStacked onReportSaved={handleReportSaved} />
          </div>
      </div>
    </div>
  );
}
