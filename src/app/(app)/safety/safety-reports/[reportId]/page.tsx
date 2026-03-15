'use client';

import { use, useMemo, useState } from 'react';
import { useDoc, useFirestore, useMemoFirebase, useCollection } from '@/firebase';
import { doc, collection } from 'firebase/firestore';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import type { SafetyReport } from '@/types/safety-report';
import { ArrowLeft, Printer } from 'lucide-react';
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
      <div className="space-y-6">
        <Skeleton className="h-10 w-48" />
        <Card>
          <CardHeader>
            <Skeleton className="h-8 w-1/2" />
            <Skeleton className="h-4 w-3/4 mt-2" />
          </CardHeader>
          <CardContent>
            <Skeleton className="h-48 w-full" />
          </CardContent>
        </Card>
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-10">
        <p className="text-destructive">Error loading report: {error.message}</p>
        <Button asChild variant="link">
          <Link href="/safety/safety-reports">Return to list</Link>
        </Button>
      </div>
    );
  }

  if (!report) {
    return (
      <div className="text-center py-10">
        <p className="text-muted-foreground">Report not found.</p>
        <Button asChild variant="link">
          <Link href="/safety/safety-reports">Return to list</Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full overflow-hidden gap-4">
       <div className="shrink-0 flex justify-between items-center no-print">
          <Button asChild variant="outline" className="w-fit">
            <Link href="/safety/safety-reports">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to All Reports
            </Link>
          </Button>
          <Button onClick={handlePrint} variant="outline" className="gap-2">
            <Printer className="h-4 w-4" />
            Print Report
          </Button>
       </div>

      <div className="shrink-0">
        <Card className="shadow-none border bg-muted/5">
          <CardHeader className="py-4">
            <CardTitle className="text-xl">Report {report.reportNumber}</CardTitle>
            <CardDescription>
              Filed on {format(new Date(report.submittedAt), 'PPP')} by {report.submittedByName}
            </CardDescription>
          </CardHeader>
          <CardContent className="pb-4">
            <p className="text-sm whitespace-pre-wrap flex-1">{report.description}</p>
          </CardContent>
        </Card>
      </div>
      
      <Tabs defaultValue="triage" className="w-full flex-1 flex flex-col min-h-0">
        <div className="shrink-0 no-print">
          <TabsList className="bg-transparent h-auto p-0 gap-2 mb-4 border-b-0 justify-start overflow-x-auto no-scrollbar">
            <TabsTrigger value="full" className="rounded-full px-6 py-2 border data-[state=active]:bg-button-primary data-[state=active]:text-button-primary-foreground">Full Report</TabsTrigger>
            <TabsTrigger value="triage" className="rounded-full px-6 py-2 border data-[state=active]:bg-button-primary data-[state=active]:text-button-primary-foreground">Report & Triage</TabsTrigger>
            <TabsTrigger value="hazards" className="rounded-full px-6 py-2 border data-[state=active]:bg-button-primary data-[state=active]:text-button-primary-foreground">Hazard & Risk ID</TabsTrigger>
            <TabsTrigger value="investigation" className="rounded-full px-6 py-2 border data-[state=active]:bg-button-primary data-[state=active]:text-button-primary-foreground">Investigation</TabsTrigger>
            <TabsTrigger value="cap" className="rounded-full px-6 py-2 border data-[state=active]:bg-button-primary data-[state=active]:text-button-primary-foreground">Corrective Actions</TabsTrigger>
            <TabsTrigger value="review" className="rounded-full px-6 py-2 border data-[state=active]:bg-button-primary data-[state=active]:text-button-primary-foreground">Final Review</TabsTrigger>
            <TabsTrigger value="discussion" className="rounded-full px-6 py-2 border data-[state=active]:bg-button-primary data-[state=active]:text-button-primary-foreground">
              Discussion {myMentionsCount > 0 && <Badge className="ml-2 h-4 px-1.5 min-w-4 flex items-center justify-center text-[10px]">{myMentionsCount}</Badge>}
            </TabsTrigger>
          </TabsList>
        </div>
        
        <div className="flex-1 min-h-0">
          <TabsContent value="full" className="m-0 h-full">
            <Card className="h-full flex flex-col overflow-hidden shadow-none border print:border-none print:shadow-none">
              <ScrollArea className="h-full">
                <div className="flex flex-col gap-8 p-6 pb-20 print:p-0">
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
              </ScrollArea>
            </Card>
          </TabsContent>
          <TabsContent value="triage" className="m-0 h-full">
              <TriageForm report={report} tenantId={tenantId} />
          </TabsContent>
          <TabsContent value="hazards" className="m-0 h-full">
            <HazardIdentificationForm 
              report={report} 
              tenantId={tenantId} 
              riskMatrixColors={riskMatrixSettings?.colors}
            />
          </TabsContent>
          <TabsContent value="investigation" className="m-0 h-full">
            <InvestigationForm 
              report={report} 
              tenantId={tenantId} 
              personnel={personnel || []} 
            />
          </TabsContent>
          <TabsContent value="cap" className="m-0 h-full">
            <CorrectiveActionsForm report={report} tenantId={tenantId} personnel={personnel || []} />
          </TabsContent>
          <TabsContent value="review" className="m-0 h-full">
            <FinalReview 
              report={report} 
              tenantId={tenantId} 
              personnel={personnel || []} 
              riskMatrixColors={riskMatrixSettings?.colors}
            />
          </TabsContent>
          <TabsContent value="discussion" className="m-0 h-full no-print">
            <ReportForum report={report} tenantId={tenantId} />
          </TabsContent>
        </div>
      </Tabs>
    </div>
  );
}