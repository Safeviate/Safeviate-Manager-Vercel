'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { collection } from 'firebase/firestore';
import { useFirestore, addDocumentNonBlocking } from '@/firebase';
import { useToast } from '@/hooks/use-toast';
import { ExamForm, type ExamFormValues } from '../exam-form';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ArrowLeft } from 'lucide-react';

export default function NewExamPage() {
  const firestore = useFirestore();
  const router = useRouter();
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const tenantId = 'safeviate';

  const handleCreate = async (values: ExamFormValues) => {
    if (!firestore) return;
    setIsSubmitting(true);

    try {
      const colRef = collection(firestore, `tenants/${tenantId}/exam-templates`);
      const data = {
        ...values,
        createdAt: new Date().toISOString(),
      };

      addDocumentNonBlocking(colRef, data);
      toast({ title: 'Exam Created', description: `"${values.title}" template is now available.` });
      router.push('/training/exams');
    } catch (error: any) {
      toast({ variant: 'destructive', title: 'Error', description: error.message });
      setIsSubmitting(false);
    }
  };

  return (
    <div className="max-w-5xl mx-auto w-full flex flex-col h-full overflow-hidden gap-4">
      <div className="shrink-0 px-1">
        <Button variant="ghost" size="sm" onClick={() => router.back()} className="mb-2">
          <ArrowLeft className="mr-2 h-4 w-4" /> Back to All Exams
        </Button>
        <div className="space-y-1">
          <h1 className="text-3xl font-bold tracking-tight font-headline">New Exam Template</h1>
          <p className="text-muted-foreground">Define questions and subject matter for official or mock assessments.</p>
        </div>
      </div>

      <Card className="flex-1 flex flex-col overflow-hidden shadow-none border mt-4">
        <ExamForm 
          onSubmit={handleCreate}
          onCancel={() => router.push('/training/exams')}
          isSubmitting={isSubmitting}
        />
      </Card>
    </div>
  );
}
