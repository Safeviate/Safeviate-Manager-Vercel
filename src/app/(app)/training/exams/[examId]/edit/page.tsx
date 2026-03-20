'use client';

import { use, useState } from 'react';
import { useRouter } from 'next/navigation';
import { doc } from 'firebase/firestore';
import { useFirestore, updateDocumentNonBlocking, useDoc, useMemoFirebase } from '@/firebase';
import { useToast } from '@/hooks/use-toast';
import { ExamForm, type ExamFormValues } from '../../exam-form';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ArrowLeft } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import type { ExamTemplate } from '@/types/training';

interface EditExamPageProps {
  params: Promise<{ examId: string }>;
}

export default function EditExamPage({ params }: EditExamPageProps) {
  const resolvedParams = use(params);
  const firestore = useFirestore();
  const router = useRouter();
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const tenantId = 'safeviate';
  const examId = resolvedParams.examId;

  const examRef = useMemoFirebase(
    () => (firestore ? doc(firestore, `tenants/${tenantId}/exam-templates`, examId) : null),
    [firestore, tenantId, examId]
  );

  const { data: exam, isLoading, error } = useDoc<ExamTemplate>(examRef);

  const handleUpdate = async (values: ExamFormValues) => {
    if (!firestore || !exam) return;
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
    return <div className="p-8 space-y-6"><Skeleton className="h-10 w-48" /><Skeleton className="h-[600px] w-full" /></div>;
  }

  if (error || !exam) {
    return (
      <div className="max-w-5xl mx-auto w-full text-center py-20">
        <p className="text-destructive mb-4">Error: {error?.message || 'Exam template not found.'}</p>
        <Button onClick={() => router.push('/training/exams')}>Return to Exams</Button>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto w-full flex flex-col h-full overflow-hidden gap-4">
      <div className="shrink-0 px-1">
        <Button variant="ghost" size="sm" onClick={() => router.back()} className="mb-2">
          <ArrowLeft className="mr-2 h-4 w-4" /> Back to All Exams
        </Button>
        <div className="space-y-1">
          <h1 className="text-3xl font-bold tracking-tight font-headline">Edit Exam: {exam.title}</h1>
          <p className="text-muted-foreground">Modify questions, subject matter, or passing criteria.</p>
        </div>
      </div>

      <Card className="flex-1 flex flex-col overflow-hidden shadow-none border mt-4">
        <ExamForm 
          initialValues={exam}
          onSubmit={handleUpdate}
          onCancel={() => router.push('/training/exams')}
          isSubmitting={isSubmitting}
        />
      </Card>
    </div>
  );
}
