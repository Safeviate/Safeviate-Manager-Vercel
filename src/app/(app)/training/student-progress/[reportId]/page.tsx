'use client';

import { use, useMemo } from 'react';
import { useDoc, useFirestore, useMemoFirebase } from '@/firebase';
import { doc } from 'firebase/firestore';
import { Skeleton } from '@/components/ui/skeleton';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ArrowLeft } from 'lucide-react';
import Link from 'next/link';
import { format } from 'date-fns';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import type { StudentProgressReport } from '@/types/training';
import type { PilotProfile } from '@/app/(app)/users/personnel/page';
import type { Booking } from '@/types/booking';

interface ReportDetailPageProps {
  params: { reportId: string };
}

const getRatingColor = (rating: number) => {
    switch (rating) {
        case 1: return 'bg-red-500';
        case 2: return 'bg-orange-500';
        case 3: return 'bg-yellow-500 text-black';
        case 4: return 'bg-green-500';
        default: return 'bg-gray-400';
    }
}

export default function StudentProgressReportPage({ params }: ReportDetailPageProps) {
  const resolvedParams = use(params);
  const firestore = useFirestore();
  const tenantId = 'safeviate';

  const reportRef = useMemoFirebase(
    () => (firestore ? doc(firestore, `tenants/${tenantId}/student-progress-reports`, resolvedParams.reportId) : null),
    [firestore, tenantId, resolvedParams.reportId]
  );
  
  const { data: report, isLoading: isLoadingReport, error } = useDoc<StudentProgressReport>(reportRef);

  const bookingRef = useMemoFirebase(
      () => (firestore && report?.bookingId ? doc(firestore, `tenants/${tenantId}/bookings`, report.bookingId) : null),
      [firestore, tenantId, report?.bookingId]
  );
  const studentRef = useMemoFirebase(
      () => (firestore && report?.studentId ? doc(firestore, `tenants/${tenantId}/students`, report.studentId) : null),
      [firestore, tenantId, report?.studentId]
  );
  const instructorRef = useMemoFirebase(
      () => (firestore && report?.instructorId ? doc(firestore, `tenants/${tenantId}/instructors`, report.instructorId) : null),
      [firestore, tenantId, report?.instructorId]
  );

  const { data: booking } = useDoc<Booking>(bookingRef);
  const { data: student } = useDoc<PilotProfile>(studentRef);
  const { data: instructor } = useDoc<PilotProfile>(instructorRef);
  
  const isLoading = isLoadingReport || !report || !booking || !student || !instructor;

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-10 w-48" />
        <Skeleton className="h-24 w-full" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }
  
  if (error) {
      return <p className="text-destructive">Error: {error.message}</p>
  }
  
  if (!report) {
      return <p>Report not found.</p>
  }

  return (
    <div className="space-y-6">
      <Button asChild variant="outline">
        <Link href="/training/student-progress">
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to All Reports
        </Link>
      </Button>

      <Card>
        <CardHeader>
          <CardTitle>Student Debrief Report</CardTitle>
          <CardDescription>
            For Booking #{booking?.bookingNumber} on {format(new Date(report.date), 'PPP')}
          </CardDescription>
        </CardHeader>
        <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
                <p className="text-sm text-muted-foreground">Student</p>
                <p className="font-semibold">{student?.firstName} {student?.lastName}</p>
            </div>
            <div>
                <p className="text-sm text-muted-foreground">Instructor</p>
                <p className="font-semibold">{instructor?.firstName} {instructor?.lastName}</p>
            </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
            <CardTitle>Exercises & Performance</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
            {report.entries.map(entry => (
                <div key={entry.id} className="p-4 rounded-md bg-muted/50 border">
                    <div className="flex justify-between items-start">
                        <p className="font-semibold">{entry.exercise}</p>
                        <Badge className={cn(getRatingColor(entry.rating), "text-white")}>{entry.rating}/4</Badge>
                    </div>
                    <p className="text-sm text-muted-foreground mt-2">{entry.comment}</p>
                </div>
            ))}
        </CardContent>
      </Card>

      {report.overallComment && (
        <Card>
            <CardHeader>
                <CardTitle>Overall Comments & Plan</CardTitle>
            </CardHeader>
            <CardContent>
                <p className="text-sm text-muted-foreground whitespace-pre-wrap">{report.overallComment}</p>
            </CardContent>
        </Card>
      )}
    </div>
  );
}