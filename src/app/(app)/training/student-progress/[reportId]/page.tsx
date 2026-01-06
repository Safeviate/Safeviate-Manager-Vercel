
'use client';

import { use, useMemo } from 'react';
import { useDoc, useFirestore, useMemoFirebase } from '@/firebase';
import { doc } from 'firebase/firestore';
import { Skeleton } from '@/components/ui/skeleton';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ArrowLeft } from 'lucide-react';
import Link from 'next/link';
import type { PilotProfile } from '@/app/(app)/users/personnel/page';
import { TrainingRecords } from '@/app/(app)/users/personnel/[id]/training-records';

interface StudentDetailPageProps {
  params: { reportId: string }; // reportId is actually studentId here
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
  
  if (!student) {
      return <p>Student not found.</p>
  }

  return (
    <div className="space-y-6">
      <Button asChild variant="outline">
        <Link href="/training/student-progress">
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to All Students
        </Link>
      </Button>

      <Card>
        <CardHeader>
          <CardTitle className="text-2xl">{student.firstName} {student.lastName}</CardTitle>
          <CardDescription>
            Training and progress overview.
          </CardDescription>
        </CardHeader>
      </Card>
      
      <TrainingRecords studentId={studentId} tenantId={tenantId} />

    </div>
  );
}
