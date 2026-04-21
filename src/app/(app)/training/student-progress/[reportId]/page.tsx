'use client';

import { use, useState, useEffect } from 'react';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { ArrowLeft } from 'lucide-react';
import Link from 'next/link';
import type { PilotProfile } from '@/app/(app)/users/personnel/page';
import { TrainingRecords } from '@/app/(app)/users/personnel/[id]/training-records';
import { useUserProfile } from '@/hooks/use-user-profile';

interface StudentDetailPageProps {
  params: Promise<{ reportId: string }>;
}


export default function StudentDetailPage({ params }: StudentDetailPageProps) {
  const resolvedParams = use(params);
  const { tenantId } = useUserProfile();
  const studentId = resolvedParams.reportId;

  const [student, setStudent] = useState<PilotProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      try {
        const response = await fetch('/api/dashboard-summary', { cache: 'no-store' });
        const payload = await response.json().catch(() => ({}));
        const students = Array.isArray(payload?.students) ? payload.students : [];
        const found = students.find((s: { id?: string }) => s.id === studentId);
        if (!cancelled) setStudent(found || null);
      } catch (e) {
        console.error('Failed to load student', e);
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    };

    void load();
    return () => {
      cancelled = true;
    };
  }, [studentId]);

  if (isLoading) {
    return (
      <div className="max-w-[1100px] mx-auto w-full flex flex-col h-full gap-6 pt-4">
        <Skeleton className="h-10 w-48" />
        <Skeleton className="flex-1 w-full" />
      </div>
    );
  }
  

  
  if (!student) {
      return <div className="max-w-[1100px] mx-auto w-full text-center py-10">Student not found.</div>
  }

  return (
    <div className="max-w-[1100px] mx-auto w-full flex flex-col h-full overflow-hidden gap-4 pt-4">
      
      <div className="flex-1 min-h-0 overflow-hidden px-1">
        <TrainingRecords studentId={studentId} tenantId={tenantId || ''} />
      </div>
    </div>
  );
}
