'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useToast } from '@/hooks/use-toast';
import { ExamForm, type ExamFormValues } from '../exam-form';
import { Card } from '@/components/ui/card';
import { BackNavButton } from '@/components/back-nav-button';
import { MainPageHeader } from '@/components/page-header';

export default function NewExamPage() {
  const router = useRouter();
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleCreate = async (values: ExamFormValues) => {
    setIsSubmitting(true);

    try {
      const data = {
        ...values,
        id: crypto.randomUUID(),
        createdAt: new Date().toISOString(),
      };

      const response = await fetch('/api/exams', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ template: data }),
      });

      if (!response.ok) {
        throw new Error('Failed to save exam template.');
      }
      
      toast({ title: 'Exam Created', description: `"${values.title}" template is now available.` });
      router.push('/training/exams');
    } catch (error: any) {
      toast({ variant: 'destructive', title: 'Error', description: error.message });
      setIsSubmitting(false);
    }
  };

  return (
    <div className="lg:max-w-[1100px] mx-auto w-full flex flex-col h-full overflow-hidden gap-4">
      <MainPageHeader
        title="New Exam Template"
        description="Define questions and subject matter for official or mock assessments."
        actions={<BackNavButton href="/training/exams" text="Back to Exams" />}
      />

      <Card className="flex-1 flex flex-col overflow-hidden shadow-none border">
        <ExamForm 
          onSubmit={handleCreate}
          onCancel={() => router.push('/training/exams')}
          isSubmitting={isSubmitting}
        />
      </Card>
    </div>
  );
}
