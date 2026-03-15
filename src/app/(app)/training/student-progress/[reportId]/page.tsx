'use client';

import { use } from 'react';
import { useDoc, useFirestore, useMemoFirebase } from '@/firebase';
import { doc } from 'firebase/firestore';
import { Skeleton } from '@/components/ui/skeleton';
import { Card, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ArrowLeft } from 'lucide-react';
import Link from 'next/link';
import type { PilotProfile } from '@/app/(app)/users/personnel/page';
import { TrainingRecords } from '@/app/(app)/users/personnel/[id]/training-records';

interface StudentDetailPageProps {
  params: Promise<{ reportId: string }>; // reportId is actually studentId here
}


export default function StudentDetailPage({ params }: StudentDetailPageProps) {
  const resolvedParams = use(params);
  const firestore = useFirestore();
  const tenantId = 'safeviate';
  const studentId = resolvedParams.reportId;

  const studentRef = useMemoFirebase(
    () => (firestore ? doc(firestore, `tenants/${tenantId}/students`, studentId) : null),
    [firestore, tenantId, studentId]
  );
  
  const { data: student, isLoading, error } = useDoc<PilotProfile>(studentRef);

  if (isLoading) {
    return (
      <div className="flex flex-col h-full gap-6">
        <Skeleton className="h-10 w-48" />
        <Skeleton className="h-24 w-full" />
        <Skeleton className="flex-1 w-full" />
      </div>
    );
  }
  
  if (error) {
      return <div className="text-center py-10 text-destructive">Error: {error.message}</div>
  }
  
  if (!student) {
      return <div className="text-center py-10">Student not found.</div>
  }

  return (
    <div className="flex flex-col h-full overflow-hidden gap-4">
      <div className="shrink-0">
        <Button asChild variant="outline">
            <Link href="/training/student-progress">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to All Students
            </Link>
        </Button>
      </div>

      <div className="shrink-0">
        <Card className='shadow-none border bg-muted/5'>
            <CardHeader className="py-4">
            <CardTitle className="text-2xl">{student.firstName} {student.lastName}</CardTitle>
            <CardDescription>
                Training path and progress summary.
            </CardDescription>
            </CardHeader>
        </Card>
      </div>
      
      <div className="flex-1 min-h-0 overflow-hidden">
        <TrainingRecords studentId={studentId} tenantId={tenantId} />
      </div>
    </div>
  );
}
