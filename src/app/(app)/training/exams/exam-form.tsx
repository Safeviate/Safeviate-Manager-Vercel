'use client';

import { useForm, useFieldArray, useFormContext } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { v4 as uuidv4 } from 'uuid';
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
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { PlusCircle, Trash2, CheckCircle2, GripVertical } from 'lucide-react';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Separator } from '@/components/ui/separator';
import { cn } from '@/lib/utils';

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
});

export type ExamFormValues = z.infer<typeof examFormSchema>;

interface ExamFormProps {
  initialValues?: Partial<ExamFormValues>;
  onSubmit: (values: ExamFormValues) => void;
  onCancel: () => void;
  isSubmitting?: boolean;
}

export function ExamForm({ initialValues, onSubmit, onCancel, isSubmitting }: ExamFormProps) {
  const form = useForm<ExamFormValues>({
    resolver: zodResolver(examFormSchema),
    defaultValues: {
      title: initialValues?.title || '',
      subject: initialValues?.subject || '',
      description: initialValues?.description || '',
      passingScore: initialValues?.passingScore || 75,
      questions: initialValues?.questions || [
        {
          id: uuidv4(),
          text: '',
          options: [
            { id: uuidv4(), text: '' },
            { id: uuidv4(), text: '' },
          ],
          correctOptionId: '',
        },
      ],
    },
  });

  const { fields: questionFields, append: appendQuestion, remove: removeQuestion } = useFieldArray({
    control: form.control,
    name: 'questions',
  });

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <FormField
            control={form.control}
            name="title"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Exam Title</FormLabel>
                <FormControl>
                  <Input placeholder="e.g., PPL Air Law & Operational Procedures" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="subject"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Subject Area</FormLabel>
                <FormControl>
                  <Input placeholder="e.g., Theoretical Knowledge" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="passingScore"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Passing Score (%)</FormLabel>
                <FormControl>
                  <Input type="number" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="description"
            render={({ field }) => (
              <FormItem className="md:col-span-2">
                <FormLabel>Description</FormLabel>
                <FormControl>
                  <Textarea placeholder="Optional details about the exam format or scope..." {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <Separator />

        <div className="space-y-6">
          <div className="flex justify-between items-center">
            <h3 className="text-lg font-bold">Questions</h3>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() =>
                appendQuestion({
                  id: uuidv4(),
                  text: '',
                  options: [
                    { id: uuidv4(), text: '' },
                    { id: uuidv4(), text: '' },
                  ],
                  correctOptionId: '',
                })
              }
            >
              <PlusCircle className="mr-2 h-4 w-4" />
              Add Question
            </Button>
          </div>

          {questionFields.map((question, qIndex) => (
            <QuestionItem
              key={question.id}
              questionIndex={qIndex}
              onRemove={() => removeQuestion(qIndex)}
            />
          ))}
        </div>

        <div className="flex justify-end gap-4 pt-6 border-t sticky bottom-0 bg-background py-4 z-10">
          <Button type="button" variant="outline" onClick={onCancel} disabled={isSubmitting}>
            Cancel
          </Button>
          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting ? 'Saving...' : 'Save Exam Template'}
          </Button>
        </div>
      </form>
    </Form>
  );
}

function QuestionItem({ questionIndex, onRemove }: { questionIndex: number; onRemove: () => void }) {
  const { control, watch, setValue } = useFormContext<ExamFormValues>();
  const { fields: optionFields, append: appendOption, remove: removeOption } = useFieldArray({
    control,
    name: `questions.${questionIndex}.options`,
  });

  const correctOptionId = watch(`questions.${questionIndex}.correctOptionId`);

  return (
    <Card className="bg-muted/10 border-muted">
      <CardHeader className="py-4 flex flex-row items-start justify-between space-y-0">
        <div className="flex items-center gap-3 flex-1 mr-4">
          <Badge variant="outline" className="h-6 w-6 rounded-full p-0 flex items-center justify-center shrink-0">
            {questionIndex + 1}
          </Badge>
          <FormField
            control={control}
            name={`questions.${questionIndex}.text`}
            render={({ field }) => (
              <FormItem className="flex-1 space-y-0">
                <FormControl>
                  <Input placeholder="Enter question text..." {...field} className="font-bold border-none bg-transparent shadow-none focus-visible:ring-0 px-0 h-auto" />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>
        <Button type="button" variant="ghost" size="icon" onClick={onRemove} className="text-destructive h-8 w-8">
          <Trash2 className="h-4 w-4" />
        </Button>
      </CardHeader>
      <CardContent className="space-y-4 pt-0">
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <Label className="text-[10px] uppercase font-bold text-muted-foreground tracking-widest">Options (Select Correct)</Label>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => appendOption({ id: uuidv4(), text: '' })}
              className="h-6 text-[10px] uppercase font-bold"
            >
              <PlusCircle className="mr-1 h-3 w-3" /> Add Option
            </Button>
          </div>

          <RadioGroup
            value={correctOptionId}
            onValueChange={(val) => setValue(`questions.${questionIndex}.correctOptionId`, val)}
            className="space-y-2"
          >
            {optionFields.map((option, oIndex) => (
              <div key={option.id} className="flex items-center gap-3 group">
                <RadioGroupItem value={option.id} id={`q${questionIndex}-o${oIndex}`} className="shrink-0" />
                <FormField
                  control={control}
                  name={`questions.${questionIndex}.options.${oIndex}.text`}
                  render={({ field }) => (
                    <FormItem className="flex-1 space-y-0">
                      <FormControl>
                        <Input
                          placeholder={`Option ${oIndex + 1}`}
                          {...field}
                          className={cn(
                            "h-9 text-sm bg-background transition-all",
                            correctOptionId === option.id && "border-green-500 ring-1 ring-green-500"
                          )}
                        />
                      </FormControl>
                    </FormItem>
                  )}
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  onClick={() => removeOption(oIndex)}
                  disabled={optionFields.length <= 2}
                  className="h-8 w-8 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </div>
            ))}
          </RadioGroup>
          <FormField
            control={control}
            name={`questions.${questionIndex}.correctOptionId`}
            render={() => <FormMessage />}
          />
        </div>
      </CardContent>
    </Card>
  );
}
