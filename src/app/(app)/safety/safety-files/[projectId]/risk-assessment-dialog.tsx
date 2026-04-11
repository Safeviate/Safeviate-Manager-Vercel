'use client';

import { useEffect, useMemo, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { CalendarIcon, PlusCircle } from 'lucide-react';
import { format } from 'date-fns';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
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
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { CustomCalendar } from '@/components/ui/custom-calendar';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { cn } from '@/lib/utils';
import type {
  SafetyFileBaselineRiskAssessment,
  SafetyFileRiskAssessmentValue,
  SafetyFileTaskRiskAssessment,
} from '@/types/safety-file';

type PersonnelOption = {
  id: string;
  firstName: string;
  lastName: string;
};

type Mode = 'baseline' | 'task';
type RiskAssessmentDialogProps =
  | {
      mode: 'baseline';
      personnel: PersonnelOption[];
      initialValue?: SafetyFileBaselineRiskAssessment | null;
      onSave: (value: SafetyFileBaselineRiskAssessment) => Promise<void> | void;
    }
  | {
      mode: 'task';
      personnel: PersonnelOption[];
      initialValue?: SafetyFileTaskRiskAssessment | null;
      onSave: (value: SafetyFileTaskRiskAssessment) => Promise<void> | void;
    };

const parseLocalDate = (value?: string | null) => {
  if (!value) return undefined;
  const [year, month, day] = value.split('-').map(Number);
  if (!year || !month || !day) {
    const fallback = new Date(value);
    return Number.isNaN(fallback.getTime()) ? undefined : fallback;
  }
  return new Date(year, month - 1, day, 12);
};

const riskAssessmentSchema = z.object({
  severity: z.number().min(1).max(5),
  likelihood: z.number().min(1).max(5),
});

const formSchema = z.object({
  taskName: z.string().optional(),
  activityDescription: z.string().optional(),
  hazard: z.string().min(1, 'Hazard is required.'),
  riskDescription: z.string().min(1, 'Risk description is required.'),
  existingControls: z.string().optional(),
  additionalControls: z.string().optional(),
  controls: z.string().optional(),
  responsiblePersonId: z.string().optional(),
  reviewDate: z.date().optional(),
  initialAssessment: riskAssessmentSchema,
  residualAssessment: riskAssessmentSchema.optional(),
});

function getRiskLevel(score: number): SafetyFileRiskAssessmentValue['riskLevel'] {
  if (score <= 4) return 'Low';
  if (score <= 9) return 'Medium';
  if (score <= 16) return 'High';
  return 'Critical';
}

function buildAssessment(value: z.infer<typeof riskAssessmentSchema>): SafetyFileRiskAssessmentValue {
  const riskScore = value.likelihood * value.severity;
  return {
    severity: value.severity,
    likelihood: value.likelihood,
    riskScore,
    riskLevel: getRiskLevel(riskScore),
  };
}

function isTaskAssessment(
  value?: SafetyFileBaselineRiskAssessment | SafetyFileTaskRiskAssessment | null
): value is SafetyFileTaskRiskAssessment {
  return Boolean(value && 'taskName' in value);
}

function isBaselineAssessment(
  value?: SafetyFileBaselineRiskAssessment | SafetyFileTaskRiskAssessment | null
): value is SafetyFileBaselineRiskAssessment {
  return Boolean(value && 'existingControls' in value);
}

export function RiskAssessmentDialog(props: RiskAssessmentDialogProps) {
  const { personnel } = props;
  const mode: Mode = props.mode;
  const initialValue = props.initialValue;
  const [isOpen, setIsOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { toast } = useToast();

  const defaultValues = useMemo(
    () => ({
      taskName: isTaskAssessment(initialValue) ? initialValue.taskName || '' : '',
      activityDescription: isTaskAssessment(initialValue)
        ? initialValue.activityDescription || ''
        : '',
      hazard: initialValue?.hazard || '',
      riskDescription: initialValue?.riskDescription || '',
      existingControls: isBaselineAssessment(initialValue)
        ? initialValue.existingControls || ''
        : '',
      additionalControls: isBaselineAssessment(initialValue)
        ? initialValue.additionalControls || ''
        : '',
      controls: isTaskAssessment(initialValue) ? initialValue.controls || '' : '',
      responsiblePersonId: initialValue?.responsiblePersonId || '',
      reviewDate: parseLocalDate(initialValue?.reviewDate),
      initialAssessment: {
        likelihood: initialValue?.initialAssessment?.likelihood || 1,
        severity: initialValue?.initialAssessment?.severity || 1,
      },
      residualAssessment: initialValue?.residualAssessment
        ? {
            likelihood: initialValue.residualAssessment.likelihood,
            severity: initialValue.residualAssessment.severity,
          }
        : undefined,
    }),
    [initialValue]
  );

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues,
  });

  useEffect(() => {
    form.reset(defaultValues);
  }, [defaultValues, form]);

  const onSubmit = async (values: z.infer<typeof formSchema>) => {
    setIsSubmitting(true);
    try {
      if (mode === 'task' && !values.taskName?.trim()) {
        throw new Error('Task name is required for a task-specific risk assessment.');
      }

      const now = new Date().toISOString();
      const common = {
        id: initialValue?.id || crypto.randomUUID(),
        hazard: values.hazard,
        riskDescription: values.riskDescription,
        responsiblePersonId: values.responsiblePersonId || '',
        reviewDate: values.reviewDate ? new Date(Date.UTC(values.reviewDate.getFullYear(), values.reviewDate.getMonth(), values.reviewDate.getDate(), 12)).toISOString() : '',
        initialAssessment: buildAssessment(values.initialAssessment),
        residualAssessment: values.residualAssessment
          ? buildAssessment(values.residualAssessment)
          : undefined,
        createdAt: initialValue?.createdAt || now,
        updatedAt: now,
      };

      if (props.mode === 'baseline') {
        await props.onSave({
          ...common,
          existingControls: values.existingControls || '',
          additionalControls: values.additionalControls || '',
        } satisfies SafetyFileBaselineRiskAssessment);
      } else {
        await props.onSave({
          ...common,
          taskName: values.taskName || '',
          activityDescription: values.activityDescription || '',
          controls: values.controls || '',
        } satisfies SafetyFileTaskRiskAssessment);
      }

      toast({
        title: initialValue ? 'Assessment Updated' : 'Assessment Added',
        description:
          mode === 'baseline'
            ? 'The baseline project risk assessment was saved.'
            : 'The task-specific risk assessment was saved.',
      });
      setIsOpen(false);
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error?.message || 'Failed to save risk assessment.',
        variant: 'destructive',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button
          variant={initialValue ? 'outline' : 'default'}
          className="h-9 gap-2 px-4 text-[10px] font-black uppercase tracking-widest"
        >
          <PlusCircle className="h-3.5 w-3.5" />
          {initialValue
            ? `Edit ${mode === 'baseline' ? 'Baseline' : 'Task'} Risk`
            : `Add ${mode === 'baseline' ? 'Baseline' : 'Task'} Risk`}
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-3xl">
        <DialogHeader>
          <DialogTitle>
            {mode === 'baseline' ? 'Baseline Risk Assessment' : 'Task-Specific Risk Assessment'}
          </DialogTitle>
          <DialogDescription>
            {mode === 'baseline'
              ? 'Record project-wide hazards and baseline risk controls for this site.'
              : 'Record a task or activity-specific risk assessment linked to this project.'}
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            {mode === 'task' ? (
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <FormField
                  control={form.control}
                  name="taskName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Task Name</FormLabel>
                      <FormControl>
                        <Input placeholder="e.g. Roof anchor installation" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="activityDescription"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Activity Description</FormLabel>
                      <FormControl>
                        <Input placeholder="Short activity summary" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            ) : null}

            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <FormField
                control={form.control}
                name="hazard"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Hazard</FormLabel>
                    <FormControl>
                      <Input placeholder="Describe the hazard" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="riskDescription"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Risk Outcome</FormLabel>
                    <FormControl>
                      <Input placeholder="Describe the risk outcome" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {mode === 'baseline' ? (
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <FormField
                  control={form.control}
                  name="existingControls"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Existing Controls</FormLabel>
                      <FormControl>
                        <Textarea rows={4} className="resize-none" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="additionalControls"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Additional Controls</FormLabel>
                      <FormControl>
                        <Textarea rows={4} className="resize-none" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            ) : (
              <FormField
                control={form.control}
                name="controls"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Controls</FormLabel>
                    <FormControl>
                      <Textarea rows={4} className="resize-none" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}

            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <FormField
                control={form.control}
                name="responsiblePersonId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Responsible Person</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value || undefined}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select user" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {personnel.map((person) => (
                          <SelectItem key={person.id} value={person.id}>
                            {person.firstName} {person.lastName}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="reviewDate"
                render={({ field }) => (
                  <FormItem className="flex flex-col">
                    <FormLabel>Review Date</FormLabel>
                    <Popover>
                      <PopoverTrigger asChild>
                        <FormControl>
                          <Button
                            variant="outline"
                            className={cn(
                              'pl-3 text-left font-normal',
                              !field.value && 'text-muted-foreground'
                            )}
                          >
                            {field.value ? format(field.value, 'dd MMM yyyy') : 'Pick a date'}
                            <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                          </Button>
                        </FormControl>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <CustomCalendar
                          selectedDate={field.value}
                          onDateSelect={field.onChange}
                        />
                      </PopoverContent>
                    </Popover>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <div className="rounded-lg border p-4">
                <p className="mb-3 text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground">
                  Initial Assessment
                </p>
                <div className="grid grid-cols-2 gap-3">
                  <FormField
                    control={form.control}
                    name="initialAssessment.likelihood"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Likelihood</FormLabel>
                        <Select
                          onValueChange={(value) => field.onChange(Number(value))}
                          value={String(field.value)}
                        >
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {[1, 2, 3, 4, 5].map((value) => (
                              <SelectItem key={value} value={String(value)}>
                                {value}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="initialAssessment.severity"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Severity</FormLabel>
                        <Select
                          onValueChange={(value) => field.onChange(Number(value))}
                          value={String(field.value)}
                        >
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {[1, 2, 3, 4, 5].map((value) => (
                              <SelectItem key={value} value={String(value)}>
                                {value}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              </div>

              <div className="rounded-lg border p-4">
                <p className="mb-3 text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground">
                  Residual Assessment
                </p>
                <div className="grid grid-cols-2 gap-3">
                  <FormField
                    control={form.control}
                    name="residualAssessment.likelihood"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Likelihood</FormLabel>
                        <Select
                          onValueChange={(value) => field.onChange(Number(value))}
                          value={field.value ? String(field.value) : '1'}
                        >
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {[1, 2, 3, 4, 5].map((value) => (
                              <SelectItem key={value} value={String(value)}>
                                {value}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="residualAssessment.severity"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Severity</FormLabel>
                        <Select
                          onValueChange={(value) => field.onChange(Number(value))}
                          value={field.value ? String(field.value) : '1'}
                        >
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {[1, 2, 3, 4, 5].map((value) => (
                              <SelectItem key={value} value={String(value)}>
                                {value}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              </div>
            </div>

            <DialogFooter className="pt-4">
              <DialogClose asChild>
                <Button variant="outline">Cancel</Button>
              </DialogClose>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? 'Saving...' : 'Save Assessment'}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
