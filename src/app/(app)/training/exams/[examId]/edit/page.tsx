'use client';

import { use, useState } from 'react';
import { useRouter } from 'next/navigation';
import { doc } from 'firebase/firestore';
import { useFirestore, updateDocumentNonBlocking, useDoc, useMemoFirebase } from '@/firebase';
import { useToast } from '@/hooks/use-toast';
import { ExamForm, type ExamFormValues } from '../../exam-form';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ArrowLeft } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import type { ExamTemplate } from '@/types/training';
import { MainPageHeader } from '@/components/page-header';
import { useUserProfile } from '@/hooks/use-user-profile';

interface EditExamPageProps {
  params: Promise<{ examId: string }>;
}

export default function EditExamPage({ params }: EditExamPageProps) {
  const resolvedParams = use(params);
  const firestore = useFirestore();
  const router = useRouter();
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { tenantId } = useUserProfile();
  const examId = resolvedParams.examId;

  const examRef = useMemoFirebase(
    () => (firestore && tenantId ? doc(firestore, `tenants/${tenantId}/exam-templates`, examId) : null),
    [firestore, tenantId, examId]
  );

  const { data: exam, isLoading, error } = useDoc<ExamTemplate>(examRef);

  const handleUpdate = async (values: ExamFormValues) => {
    if (!firestore || !tenantId || !exam) return;
    setIsSubmitting(true);

    try {
      const docRef = doc(firestore, `tenants/${tenantId}/exam-templates`, exam.id);
      updateDocumentNonBlocking(docRef, values);
      toast({ title: 'Exam Updated', description: `"${values.title}" has been updated.` });
      router.push('/training/exams');
    } catch (error: any) {
      toast({ variant: 'destructive', title: 'Error', description: error.message });
      setIsSubmitting(false);
    }
  };

  if (isLoading) {
    return <div className="p-8 space-y-6 max-w-[1400px] mx-auto w-full"><Skeleton className="h-20 w-full" /><Skeleton className="h-[600px] w-full" /></div>;
  }

  if (error || !exam) {
    return (
      <div className="max-w-[1400px] mx-auto w-full text-center py-20 px-1">
        <p className="text-destructive font-black uppercase tracking-tight mb-4">Error: {error?.message || 'Exam template not found.'}</p>
        <Button onClick={() => router.push('/training/exams')}>Return to Exams</Button>
      </div>
    );
  }

  return (
    <div className="max-w-[1400px] mx-auto w-full flex flex-col h-full overflow-hidden pt-2 px-1">
      <Card className="flex-1 flex flex-col overflow-hidden shadow-none border rounded-xl">
        <div className="sticky top-0 z-30 bg-card">
            <MainPageHeader 
                title={`Edit Exam: ${exam.title}`}
                description="Modify questions, subject matter, or passing criteria."
            />
        </div>
        <div className="flex-1 overflow-hidden">
            <ExamForm 
                initialValues={exam}
                onSubmit={handleUpdate}
                onCancel={() => router.push('/training/exams')}
                isSubmitting={isSubmitting}
            />
        </div>
      </Card>
    </div>
  );
}
