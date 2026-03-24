'use client';

import { use } from 'react';
import { useDoc, useFirestore, useMemoFirebase } from '@/firebase';
import { doc } from 'firebase/firestore';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { ArrowLeft } from 'lucide-react';
import Link from 'next/link';
import type { PilotProfile } from '@/app/(app)/users/personnel/page';
import { TrainingRecords } from '@/app/(app)/users/personnel/[id]/training-records';

interface StudentDetailPageProps {
  params: Promise<{ reportId: string }>;
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
      <div className="max-w-[1200px] mx-auto w-full flex flex-col h-full gap-6 pt-4">
        <Skeleton className="h-10 w-48" />
        <Skeleton className="flex-1 w-full" />
      </div>
    );
  }
  
  if (error) {
      return <div className="max-w-[1200px] mx-auto w-full text-center py-10 text-destructive">Error: {error.message}</div>
  }
  
  if (!student) {
      return <div className="max-w-[1200px] mx-auto w-full text-center py-10">Student not found.</div>
  }

  return (
    <div className="max-w-[1200px] mx-auto w-full flex flex-col h-full overflow-hidden gap-4 pt-4">
      
      <div className="flex-1 min-h-0 overflow-hidden px-1">
        <TrainingRecords studentId={studentId} tenantId={tenantId} />
      </div>
    </div>
  );
}