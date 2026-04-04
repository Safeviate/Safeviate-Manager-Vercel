'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useToast } from '@/hooks/use-toast';
import { ExamForm, type ExamFormValues } from '../exam-form';
import { Card } from '@/components/ui/card';
import { BackNavButton } from '@/components/back-nav-button';

export default function NewExamPage() {
  const router = useRouter();
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleCreate = async (values: ExamFormValues) => {
    setIsSubmitting(true);

    try {
      const storedTemplates = localStorage.getItem('safeviate.exam-templates');
      const templates = storedTemplates ? JSON.parse(storedTemplates) : [];
      const data = {
        ...values,
        id: crypto.randomUUID(),
        createdAt: new Date().toISOString(),
      };

      const nextTemplates = [data, ...templates];
      localStorage.setItem('safeviate.exam-templates', JSON.stringify(nextTemplates));
      window.dispatchEvent(new Event('safeviate-exams-updated'));
      
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
        <BackNavButton href="/training/exams" text="Back to Exams" className="mb-2 border-slate-300 bg-background text-foreground hover:bg-muted" />
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
