'use client';

import { use, useMemo, useState } from 'react';
import { useDoc, useFirestore, useMemoFirebase } from '@/firebase';
import { doc } from 'firebase/firestore';
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

  const { data: report, isLoading, error } = useDoc<SafetyReport>(reportRef);

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
      
      <Tabs defaultValue="triage">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="triage">Report & Triage</TabsTrigger>
          <TabsTrigger value="investigation">Investigation</TabsTrigger>
          <TabsTrigger value="cap">Corrective Actions</TabsTrigger>
          <TabsTrigger value="review">Final Review</TabsTrigger>
        </TabsList>
        <TabsContent value="triage">
            <TriageForm report={report} tenantId={tenantId} />
        </TabsContent>
        <TabsContent value="investigation">
          <Card>
             <CardHeader><CardTitle>Investigation</CardTitle></CardHeader>
            <CardContent>
              <p>Investigation task management, discussion forum, and root cause analysis tools will be here.</p>
            </CardContent>
          </Card>
        </TabsContent>
        <TabsContent value="cap">
          <Card>
             <CardHeader><CardTitle>Corrective Action Plan</CardTitle></CardHeader>
            <CardContent>
                <p>Tools for creating and tracking corrective actions and performing mitigated risk assessment will be here.</p>
            </CardContent>
          </Card>
        </TabsContent>
        <TabsContent value="review">
          <Card>
             <CardHeader><CardTitle>Final Review</CardTitle></CardHeader>
            <CardContent>
                <p>A summary of the entire report and signature functionality will be here.</p>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
