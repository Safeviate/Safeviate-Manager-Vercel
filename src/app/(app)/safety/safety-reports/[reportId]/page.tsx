'use client';

import { use, useMemo, useState } from 'react';
import { useDoc, useFirestore, useMemoFirebase, useCollection } from '@/firebase';
import { doc, collection } from 'firebase/firestore';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import type { SafetyReport } from '@/types/safety-report';
import { ArrowLeft } from 'lucide-react';
import Link from 'next/link';
import { format } from 'date-fns';
import { TriageForm } from './triage-form';
import { useToast } from '@/hooks/use-toast';
import { InvestigationForm } from './investigation-form';
import { CorrectiveActionsForm } from './corrective-actions-form';
import { FinalReview } from './final-review';
import type { Personnel } from '@/app/(app)/users/personnel/page';

interface SafetyReportDetailPageProps {
  params: { reportId: string };
}

export default function SafetyReportDetailPage({ params }: SafetyReportDetailPageProps) {
  const resolvedParams = use(params);
  const firestore = useFirestore();
  const { toast } = useToast();
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

  const { data: report, isLoading: isLoadingReport, error } = useDoc<SafetyReport>(reportRef);
  const { data: personnel, isLoading: isLoadingPersonnel } = useCollection<Personnel>(personnelQuery);

  const isLoading = isLoadingReport || isLoadingPersonnel;

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
    <div className="space-y-6">
       <Button asChild variant="outline" className="w-fit">
          <Link href="/safety/safety-reports">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to All Reports
          </Link>
        </Button>
      <Card>
        <CardHeader>
          <CardTitle>Report {report.reportNumber}</CardTitle>
          <CardDescription>
            Filed on {format(new Date(report.submittedAt), 'PPP')} by {report.submittedByName}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <p className="whitespace-pre-wrap flex-1">{report.description}</p>
        </CardContent>
      </Card>
      
      <Tabs defaultValue="triage" className="w-full">
        <TabsList className="bg-transparent h-auto p-0 gap-2 mb-6 border-b-0 justify-start overflow-x-auto no-scrollbar">
          <TabsTrigger value="triage" className="rounded-full px-6 py-2 border data-[state=active]:bg-button-primary data-[state=active]:text-button-primary-foreground">Report & Triage</TabsTrigger>
          <TabsTrigger value="investigation" className="rounded-full px-6 py-2 border data-[state=active]:bg-button-primary data-[state=active]:text-button-primary-foreground">Investigation</TabsTrigger>
          <TabsTrigger value="cap" className="rounded-full px-6 py-2 border data-[state=active]:bg-button-primary data-[state=active]:text-button-primary-foreground">Corrective Actions</TabsTrigger>
          <TabsTrigger value="review" className="rounded-full px-6 py-2 border data-[state=active]:bg-button-primary data-[state=active]:text-button-primary-foreground">Final Review</TabsTrigger>
        </TabsList>
        <TabsContent value="triage" className="m-0">
            <TriageForm report={report} tenantId={tenantId} />
        </TabsContent>
        <TabsContent value="investigation" className="m-0">
          <InvestigationForm report={report} tenantId={tenantId} personnel={personnel || []} />
        </TabsContent>
        <TabsContent value="cap" className="m-0">
          <CorrectiveActionsForm report={report} tenantId={tenantId} personnel={personnel || []} />
        </TabsContent>
        <TabsContent value="review" className="m-0">
          <FinalReview report={report} tenantId={tenantId} personnel={personnel || []} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
