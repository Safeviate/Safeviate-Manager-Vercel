'use client';

import { use, useMemo, useState } from 'react';
import { useDoc, useFirestore, useMemoFirebase, useCollection } from '@/firebase';
import { doc, collection } from 'firebase/firestore';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import type { SafetyReport } from '@/types/safety-report';
import { ArrowLeft, Printer, ShieldAlert, Pencil } from 'lucide-react';
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

interface SafetyReportDetailPageProps {
  params: Promise<{ reportId: string }>;
}

export default function SafetyReportDetailPage({ params }: SafetyReportDetailPageProps) {
  const resolvedParams = use(params);
  const firestore = useFirestore();
  const { toast } = useToast();
  const { userProfile } = useUserProfile();
  const tenantId = 'safeviate';
  const reportId = resolvedParams.reportId;

  const reportRef = useMemoFirebase(
    () => (firestore ? doc(firestore, 'tenants', tenantId, 'safety-reports', reportId) : null),
    [firestore, tenantId, reportId]
  );
  const personnelQuery = useMemoFirebase(
    () => (firestore ? collection(firestore, `tenants/${tenantId}/personnel`) : null),
    [firestore, tenantId]
  );
  const riskMatrixSettingsRef = useMemoFirebase(
    () => (firestore && tenantId ? doc(firestore, 'tenants', tenantId, 'settings', 'risk-matrix-config') : null),
    [firestore, tenantId]
  );

  const { data: report, isLoading: isLoadingReport, error } = useDoc<SafetyReport>(reportRef);
  const { data: personnel, isLoading: isLoadingPersonnel } = useCollection<Personnel>(personnelQuery);
  const { data: riskMatrixSettings, isLoading: isLoadingRiskMatrix } = useDoc<RiskMatrixSettings>(riskMatrixSettingsRef);

  const myMentionsCount = useMemo(() => {
    if (!report?.discussion || !userProfile) return 0;
    return report.discussion.filter(item => item.assignedToId === userProfile.id).length;
  }, [report?.discussion, userProfile]);

  const isLoading = isLoadingReport || isLoadingPersonnel || isLoadingRiskMatrix;

  const handlePrint = () => {
    window.print();
  };

  if (isLoading) {
    return (
      <div className="space-y-6 max-w-[1400px] mx-auto w-full pt-4 px-1">
        <Skeleton className="h-10 w-48" />
        <Skeleton className="h-[400px] w-full" />
      </div>
    );
  }

  if (error || !report) {
    return (
      <div className="max-w-[1400px] mx-auto w-full text-center py-20 px-1">
        <p className="text-muted-foreground">{error ? `Error: ${error.message}` : 'Report not found.'}</p>
        <Button asChild variant="link" className="mt-4">
          <Link href="/safety/safety-reports">Return to reports list</Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="max-w-[1400px] mx-auto w-full flex flex-col h-full overflow-hidden pt-0 px-1">
      <Tabs defaultValue="triage" className="w-full flex-1 flex flex-col overflow-hidden">
        
        {/* --- MAIN CONTENT CARD --- */}
        <div className="flex-1 overflow-hidden pb-10 no-print pt-0">
          <div className="rounded-xl border overflow-hidden flex flex-col bg-card shadow-none h-full">
            <div className="sticky top-0 z-30 bg-card">
              <CardHeader className="bg-muted/5 border-b flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-6 shrink-0">
                <div className="flex-1 min-w-0">
                  <CardTitle className="text-2xl flex items-center gap-2 font-black uppercase truncate">
                    <ShieldAlert className="h-6 w-6 text-primary shrink-0" />
                    Report {report.reportNumber}
                  </CardTitle>
                  <CardDescription className="text-sm font-medium mt-1">
                    Filed on {format(new Date(report.submittedAt), 'PPP')} by <span className="text-foreground font-semibold">{report.submittedByName}</span>
                  </CardDescription>
                </div>
                <div className="flex items-center gap-3 shrink-0">
                  <EditReportDialog 
                    report={report} 
                    tenantId={tenantId} 
                    trigger={
                      <Button variant="outline" size="sm" className="h-9 px-4 gap-2 rounded-md border-slate-300 text-xs font-black uppercase shadow-sm">
                          <Pencil className="h-3.5 w-3.5" />
                          Edit Report
                      </Button>
                    }
                  />
                  <Button onClick={handlePrint} variant="outline" size="sm" className="h-9 px-4 gap-2 rounded-md border-slate-300 text-xs font-black uppercase shadow-sm">
                      <Printer className="h-4 w-4" />
                      Print Report
                  </Button>
                </div>
              </CardHeader>

              {/* --- TAB BAR INSIDE CARD WITH HORIZONTAL SCROLL --- */}
              <div className="border-b bg-muted/5 px-6 py-2 shrink-0">
                <TabsList className="bg-transparent h-auto p-0 gap-2 border-b-0 justify-start overflow-x-auto no-scrollbar flex items-center w-full">
                  <TabsTrigger value="full" className="rounded-full px-6 py-2 border data-[state=active]:bg-emerald-700 data-[state=active]:text-white font-bold text-[10px] uppercase transition-all shrink-0">Full Report</TabsTrigger>
                  <TabsTrigger value="triage" className="rounded-full px-6 py-2 border data-[state=active]:bg-emerald-700 data-[state=active]:text-white font-bold text-[10px] uppercase transition-all shrink-0">Report & Triage</TabsTrigger>
                  <TabsTrigger value="hazards" className="rounded-full px-6 py-2 border data-[state=active]:bg-emerald-700 data-[state=active]:text-white font-bold text-[10px] uppercase transition-all shrink-0">Hazard & Risk ID</TabsTrigger>
                  <TabsTrigger value="investigation" className="rounded-full px-6 py-2 border data-[state=active]:bg-emerald-700 data-[state=active]:text-white font-bold text-[10px] uppercase transition-all shrink-0">Investigation</TabsTrigger>
                  <TabsTrigger value="cap" className="rounded-full px-6 py-2 border data-[state=active]:bg-emerald-700 data-[state=active]:text-white font-bold text-[10px] uppercase transition-all shrink-0">Corrective Actions</TabsTrigger>
                  <TabsTrigger value="review" className="rounded-full px-6 py-2 border data-[state=active]:bg-emerald-700 data-[state=active]:text-white font-bold text-[10px] uppercase transition-all shrink-0">Final Review</TabsTrigger>
                  <TabsTrigger value="discussion" className="rounded-full px-6 py-2 border data-[state=active]:bg-emerald-700 data-[state=active]:text-white font-bold text-[10px] uppercase transition-all shrink-0">
                    Discussion {myMentionsCount > 0 && <Badge className="ml-2 h-4 px-1.5 min-w-4 flex items-center justify-center text-[10px]">{myMentionsCount}</Badge>}
                  </TabsTrigger>
                </TabsList>
              </div>
            </div>

            <div className="flex-1 min-h-0">
              <TabsContent value="full" className="m-0 h-full outline-none overflow-y-auto no-scrollbar">
                <div className="flex flex-col gap-8 p-6 pb-20">
                  <TriageForm report={report} tenantId={tenantId} isStacked />
                  <HazardIdentificationForm 
                      report={report} 
                      tenantId={tenantId} 
                      riskMatrixColors={riskMatrixSettings?.colors}
                      isStacked
                  />
                  <InvestigationForm 
                      report={report} 
                      tenantId={tenantId} 
                      personnel={personnel || []} 
                      isStacked
                  />
                  <CorrectiveActionsForm report={report} tenantId={tenantId} personnel={personnel || []} isStacked />
                  <FinalReview 
                      report={report} 
                      tenantId={tenantId} 
                      personnel={personnel || []} 
                      riskMatrixColors={riskMatrixSettings?.colors}
                      isStacked
                  />
                </div>
              </TabsContent>
              <TabsContent value="triage" className="m-0 h-full outline-none overflow-hidden h-full"><TriageForm report={report} tenantId={tenantId} /></TabsContent>
              <TabsContent value="hazards" className="m-0 h-full outline-none overflow-hidden h-full"><HazardIdentificationForm report={report} tenantId={tenantId} riskMatrixColors={riskMatrixSettings?.colors} /></TabsContent>
              <TabsContent value="investigation" className="m-0 h-full outline-none overflow-hidden h-full"><InvestigationForm report={report} tenantId={tenantId} personnel={personnel || []} /></TabsContent>
              <TabsContent value="cap" className="m-0 h-full outline-none overflow-hidden h-full"><CorrectiveActionsForm report={report} tenantId={tenantId} personnel={personnel || []} /></TabsContent>
              <TabsContent value="review" className="m-0 h-full outline-none overflow-hidden h-full"><FinalReview report={report} tenantId={tenantId} personnel={personnel || []} riskMatrixColors={riskMatrixSettings?.colors} /></TabsContent>
              <TabsContent value="discussion" className="m-0 h-full outline-none overflow-hidden h-full"><ReportForum report={report} tenantId={tenantId} /></TabsContent>
            </div>
          </div>
        </div>
      </Tabs>

      {/* --- Dedicated Print Layout (Hidden in UI) --- */}
      <div className="hidden print:block space-y-8 max-w-[1200px] mx-auto w-full">
          <Card className="shadow-none border-none">
            <CardHeader className="p-0 pb-4">
                <CardTitle className="text-2xl">Safety Report {report.reportNumber}</CardTitle>
                <CardDescription>
                Filed on {format(new Date(report.submittedAt), 'PPP')} by {report.submittedByName}
                </CardDescription>
            </CardHeader>
            <CardContent className="p-0 border-t pt-4">
                <h4 className="text-xs font-bold uppercase tracking-widest text-muted-foreground mb-2">Original Description</h4>
                <p className="text-sm whitespace-pre-wrap">{report.description}</p>
            </CardContent>
          </Card>
          <div className="flex flex-col gap-10">
              <TriageForm report={report} tenantId={tenantId} isStacked />
              <HazardIdentificationForm report={report} tenantId={tenantId} riskMatrixColors={riskMatrixSettings?.colors} isStacked />
              <InvestigationForm report={report} tenantId={tenantId} personnel={personnel || []} isStacked />
              <CorrectiveActionsForm report={report} tenantId={tenantId} personnel={personnel || []} isStacked />
              <FinalReview report={report} tenantId={tenantId} personnel={personnel || []} riskMatrixColors={riskMatrixSettings?.colors} isStacked />
          </div>
      </div>
    </div>
  );
}
