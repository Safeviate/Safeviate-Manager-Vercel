'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import type { QuestionBankItem } from '@/types/training';
import { CheckCircle2 } from 'lucide-react';

const optionSchema = z.object({
  id: z.string(),
  text: z.string().min(1, 'Option text is required'),
});

const questionSchema = z.object({
  id: z.string(),
  text: z.string().min(1, 'Question text is required'),
  options: z.array(optionSchema).min(2, 'At least 2 options are required'),
  correctOptionId: z.string().min(1, 'Select the correct option'),
});

const examFormSchema = z.object({
  title: z.string().min(1, 'Exam title is required'),
  subject: z.string().min(1, 'Subject is required'),
  description: z.string().optional(),
  passingScore: z.coerce.number().min(0).max(100),
  questions: z.array(questionSchema).min(1, 'At least one question is required'),
  publicationMode: z.enum(['mandatory', 'mock']),
  assigneeIds: z.array(z.string()),
  dueDate: z.string().optional(),
}).superRefine((values, context) => {
  if (values.publicationMode === 'mandatory' && values.assigneeIds.length === 0) {
    context.addIssue({ code: z.ZodIssueCode.custom, path: ['assigneeIds'], message: 'Select at least one required user.' });
  }
});

export type ExamFormValues = z.infer<typeof examFormSchema>;

interface ExamFormProps {
  initialValues?: Partial<ExamFormValues>;
  onSubmit: (values: ExamFormValues) => void;
  onCancel: () => void;
  isSubmitting?: boolean;
  assignees: Array<{ id: string; firstName: string; lastName: string; userType?: string }>;
  questionBankItems: QuestionBankItem[];
}

export function ExamForm({ initialValues, onSubmit, onCancel, isSubmitting, assignees, questionBankItems }: ExamFormProps) {
  const form = useForm<ExamFormValues>({
    resolver: zodResolver(examFormSchema),
    defaultValues: {
      title: initialValues?.title || '',
      subject: initialValues?.subject || '',
      description: initialValues?.description || '',
      passingScore: initialValues?.passingScore || 75,
      publicationMode: initialValues?.publicationMode || 'mandatory',
      assigneeIds: initialValues?.assigneeIds || [],
      dueDate: initialValues?.dueDate || '',
      questions: initialValues?.questions || [],
    },
  });

  const bankTopics = [...new Set(questionBankItems.map((item) => item.topic).filter(Boolean))].sort();
  const publicationMode = form.watch('publicationMode');
  const assignedUserIds = form.watch('assigneeIds');
  const loadedQuestions = form.watch('questions');
  const [selectedBankTopic, setSelectedBankTopic] = useState(() => {
    const existingTopic = initialValues?.subject || '';
    return bankTopics.includes(existingTopic) ? existingTopic : '';
  });
  const [bankQuestionCount, setBankQuestionCount] = useState('10');
  const canSave = Boolean(selectedBankTopic || initialValues?.title) && loadedQuestions.length > 0;

  const toggleAssignee = (personId: string, checked: boolean) => {
    form.setValue(
      'assigneeIds',
      checked ? [...assignedUserIds, personId] : assignedUserIds.filter((id) => id !== personId),
      { shouldValidate: true },
    );
  };

  const handleQuestionBankTopicChange = (topic: string) => {
    setSelectedBankTopic(topic);
    form.setValue('title', topic, { shouldValidate: true });
    form.setValue('subject', topic, { shouldValidate: true });
    form.setValue('questions', [], { shouldValidate: true });
  };

  const handleQuestionBankSelection = () => {
    const selectedCount = Math.max(1, Number(bankQuestionCount) || 1);
    const candidates = questionBankItems.filter((item) => item.topic === selectedBankTopic);
    const selected = [...candidates]
      .sort(() => Math.random() - 0.5)
      .slice(0, selectedCount)
      .map(({ id, text, options, correctOptionId }) => ({ id, text, options, correctOptionId }));
    form.setValue('questions', selected, { shouldValidate: true });
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="h-full flex flex-col overflow-hidden">
        <ScrollArea className="flex-1">
          <div className="space-y-8 p-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <div className="space-y-2 md:col-span-2">
                <Label className="text-[10px] font-black uppercase tracking-widest text-primary">Question Bank Topic</Label>
                <Select value={selectedBankTopic} onValueChange={handleQuestionBankTopicChange}>
                  <SelectTrigger className="h-12 bg-background font-bold"><SelectValue placeholder={bankTopics.length ? 'Select a Question Bank topic' : 'No Question Bank topics are available'} /></SelectTrigger>
                  <SelectContent>{bankTopics.map((topic) => <SelectItem key={topic} value={topic}>{topic}</SelectItem>)}</SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground">The selected topic is used as the assessment name and category.</p>
              </div>
              <FormField
                control={form.control}
                name="passingScore"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-[10px] font-black uppercase tracking-widest text-primary flex items-center gap-2">
                        <CheckCircle2 className="h-3.5 w-3.5" />
                        Minimum Mastery (%)
                    </FormLabel>
                    <FormControl>
                      <Input type="number" {...field} className="h-12 font-mono font-black text-lg bg-muted/5 border-2 border-slate-200 focus-visible:ring-primary/20 rounded-xl" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <div className="space-y-2">
                <Label className="text-[10px] font-black uppercase tracking-widest text-primary">Questions to Include</Label>
                <div className="flex gap-2">
                  <Input type="number" min="1" value={bankQuestionCount} onChange={(event) => setBankQuestionCount(event.target.value)} className="h-12 bg-background" />
                  <Button type="button" variant="outline" disabled={!selectedBankTopic} onClick={handleQuestionBankSelection} className="h-12 shrink-0 text-[10px] font-black uppercase tracking-widest">
                    Load Questions
                  </Button>
                </div>
              </div>
              <FormField
                control={form.control}
                name="publicationMode"
                render={({ field }) => (
                  <FormItem className="md:col-span-2 rounded-xl border bg-muted/5 p-4">
                    <FormLabel className="text-[10px] font-black uppercase tracking-widest text-primary">Publishing Mode</FormLabel>
                    <FormControl>
                      <RadioGroup value={field.value} onValueChange={field.onChange} className="grid gap-3 md:grid-cols-2">
                        <Label className="flex cursor-pointer items-start gap-3 rounded-lg border bg-background p-3">
                          <RadioGroupItem value="mandatory" className="mt-0.5" />
                          <span><span className="block text-sm font-bold">Mandatory assessment</span><span className="block text-xs text-muted-foreground">Assign selected users and record their official completion.</span></span>
                        </Label>
                        <Label className="flex cursor-pointer items-start gap-3 rounded-lg border bg-background p-3">
                          <RadioGroupItem value="mock" className="mt-0.5" />
                          <span><span className="block text-sm font-bold">Open mock exam</span><span className="block text-xs text-muted-foreground">Anyone may practise; attempts are not saved officially.</span></span>
                        </Label>
                      </RadioGroup>
                    </FormControl>
                  </FormItem>
                )}
              />
              {publicationMode === 'mandatory' ? (
                <>
                  <FormField
                    control={form.control}
                    name="dueDate"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-[10px] font-black uppercase tracking-widest text-primary">Completion Due Date</FormLabel>
                        <FormControl><Input type="date" {...field} className="h-12" /></FormControl>
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="assigneeIds"
                    render={() => (
                      <FormItem className="md:col-span-2">
                        <FormLabel className="text-[10px] font-black uppercase tracking-widest text-primary">Required Users</FormLabel>
                        <div className="grid max-h-48 gap-2 overflow-y-auto rounded-xl border bg-muted/5 p-3 sm:grid-cols-2">
                          {assignees.map((person) => (
                            <Label key={person.id} className="flex cursor-pointer items-center gap-3 rounded-lg border bg-background p-3 text-sm font-medium">
                              <Checkbox checked={assignedUserIds.includes(person.id)} onCheckedChange={(checked) => toggleAssignee(person.id, checked === true)} />
                              <span>{person.firstName} {person.lastName}</span>
                            </Label>
                          ))}
                          {assignees.length === 0 ? <p className="text-sm text-muted-foreground">No personnel are available to assign.</p> : null}
                        </div>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </>
              ) : null}
            </div>

            <p className="text-sm text-muted-foreground">
              {loadedQuestions.length > 0
                ? `${loadedQuestions.length} Question Bank question${loadedQuestions.length === 1 ? '' : 's'} loaded for this assessment.`
                : 'Choose a Question Bank topic and load questions before publishing.'}
            </p>
          </div>
        </ScrollArea>

        <div className="shrink-0 flex flex-col gap-3 p-6 border-t bg-muted/5 sm:flex-row sm:justify-end">
          <Button type="button" variant="outline" onClick={onCancel} disabled={isSubmitting} className="w-full sm:w-auto">
            Cancel
          </Button>
          <Button type="submit" disabled={isSubmitting || !canSave} className="w-full sm:w-auto">
            {isSubmitting ? 'Saving...' : 'Save Exam Template'}
          </Button>
        </div>
      </form>
    </Form>
  );
}
