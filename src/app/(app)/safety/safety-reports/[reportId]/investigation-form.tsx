'use client';

import React from 'react';
import { useForm, useFieldArray, useFormContext, Controller, FormProvider, type UseFormReturn } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import type { SafetyReport } from '@/types/safety-report';
import type { Personnel } from '@/app/(app)/users/personnel/page';
import { PlusCircle, Trash2, CalendarIcon, Save, Users, CheckCircle2, AlertTriangle } from 'lucide-react';
import { v4 as uuidv4 } from 'uuid';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { CustomCalendar } from '@/components/ui/custom-calendar';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import { ScrollArea } from '@/components/ui/scroll-area';

const parseLocalDate = (value: string) => {
  const [year, month, day] = value.split('-').map(Number);
  if (!year || !month || !day) {
    return new Date(value);
  }
  return new Date(year, month - 1, day, 12);
};

const toNoonUtcIso = (date: Date) =>
  new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate(), 12)).toISOString();

// --- Form Schemas ---
const investigationMemberSchema = z.object({
    userId: z.string().min(1, "Member is required."),
    name: z.string(),
    role: z.enum(["Lead Investigator", "Team Member", "Technical Expert", "Observer"]),
});

const investigationTaskSchema = z.object({
    id: z.string(),
    description: z.string().min(1, "Task description is required."),
    assigneeId: z.string().min(1, "Assignee is required."),
    dueDate: z.date(),
    status: z.enum(["Open", "In Progress", "Completed"]),
});

const investigationSchema = z.object({
  investigationTeam: z.array(investigationMemberSchema),
  investigationNotes: z.string().optional(),
  investigationTasks: z.array(investigationTaskSchema),
});

type FormValues = z.infer<typeof investigationSchema>;

// --- Helper Components ---
const SectionHeader = ({ title, icon: Icon }: { title: string, icon: React.ElementType }) => (
    <div className="flex items-center gap-2 mb-4">
        <div className="p-1.5 rounded-md bg-primary/10 text-primary">
            <Icon className="h-4 w-4" />
        </div>
        <h3 className="text-sm font-bold uppercase tracking-wider">{title}</h3>
    </div>
);

const Label = ({ children, className }: { children: React.ReactNode, className?: string }) => (
    <label className={cn("text-[10px] font-black uppercase text-muted-foreground block tracking-widest", className)}>
        {children}
    </label>
);

const LocalSeparator = () => (
    <div className="h-px w-full bg-slate-200/60 my-8" />
);

interface InvestigationFormProps {
  report: SafetyReport;
  tenantId: string;
  personnel: Personnel[];
  isStacked?: boolean;
}

export function InvestigationForm({ report, tenantId, personnel, isStacked = false }: InvestigationFormProps) {
  const { toast } = useToast();

  const form = useForm<FormValues>({
    resolver: zodResolver(investigationSchema),
    defaultValues: {
      investigationTeam: report.investigationTeam || [],
      investigationNotes: report.investigationNotes || '',
      investigationTasks: report.investigationTasks?.map(task => ({ ...task, dueDate: parseLocalDate(task.dueDate) })) || [],
    },
  });

  const { fields: teamFields, append: appendTeamMember, remove: removeTeamMember } = useFieldArray({
    control: form.control,
    name: "investigationTeam",
  });
  const { fields: taskFields, append: appendTask, remove: removeTask } = useFieldArray({
    control: form.control,
    name: "investigationTasks",
  });

  const onSubmit = async (values: FormValues) => {
    const dataToSave = {
        ...values,
        investigationTasks: values.investigationTasks.map(task => ({
            ...task,
            dueDate: toNoonUtcIso(task.dueDate),
        }))
    };

    try {
      const response = await fetch(`/api/safety-reports/${report.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ report: { ...report, ...dataToSave } }),
      });

      if (!response.ok) {
        const payload = await response.json().catch(() => null);
        throw new Error(payload?.error || 'Unable to save investigation details.');
      }
      toast({ title: 'Investigation Details Saved' });
    } catch (error) {
      toast({
        variant: 'destructive',
        title: 'Save failed',
        description: error instanceof Error ? error.message : 'Unable to save investigation details.',
      });
    }
  };

  const handleUserSelection = (index: number, userId: string) => {
      const selectedUser = personnel.find(p => p.id === userId);
      if (selectedUser) {
          form.setValue(`investigationTeam.${index}.name`, `${selectedUser.firstName} ${selectedUser.lastName}`);
          form.setValue(`investigationTeam.${index}.userId`, userId);
      }
  };

  return (
    <div className={cn("flex flex-col h-full", !isStacked && "overflow-hidden")}>
      <div className="shrink-0 border-b bg-muted/5 p-4">
        <h3 className="text-lg font-black uppercase tracking-tight">Investigation Management</h3>
      </div>
      <div className={cn("flex-1 p-0 overflow-hidden flex flex-col", isStacked && "overflow-visible h-auto")}>
        <FormProvider {...form}>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="h-full flex flex-col">
              {isStacked ? (
                <div className="p-6 space-y-10 pb-10">
                  <InvestigationFields form={form} teamFields={teamFields} taskFields={taskFields} personnel={personnel} removeTeamMember={removeTeamMember} removeTask={removeTask} appendTeamMember={appendTeamMember} appendTask={appendTask} handleUserSelection={handleUserSelection} />
                </div>
              ) : (
                <ScrollArea className="flex-1 p-6">
                  <div className="space-y-10 pb-10">
                    <InvestigationFields form={form} teamFields={teamFields} taskFields={taskFields} personnel={personnel} removeTeamMember={removeTeamMember} removeTask={removeTask} appendTeamMember={appendTeamMember} appendTask={appendTask} handleUserSelection={handleUserSelection} />
                  </div>
                </ScrollArea>
              )}
              {!isStacked && (
                <div className="shrink-0 flex justify-end p-4 border-t bg-muted/5 gap-2 no-print">
                  <Button type="submit" className="font-black uppercase text-xs h-10 px-8 shadow-md">
                    <Save className="mr-2 h-4 w-4" /> Save Investigation Details
                  </Button>
                </div>
              )}
            </form>
          </Form>
        </FormProvider>
      </div>
    </div>
  );
}

function InvestigationFields({
  form,
  teamFields,
  taskFields,
  personnel,
  removeTeamMember,
  removeTask,
  appendTeamMember,
  appendTask,
  handleUserSelection,
}: {
  form: UseFormReturn<FormValues>;
  teamFields: Array<{ id: string }>;
  taskFields: Array<{ id: string }>;
  personnel: Personnel[];
  removeTeamMember: (index: number) => void;
  removeTask: (index: number) => void;
  appendTeamMember: (value: FormValues['investigationTeam'][number]) => void;
  appendTask: (value: FormValues['investigationTasks'][number]) => void;
  handleUserSelection: (index: number, userId: string) => void;
}) {
  return (
    <>
      {/* 1. Team Section */}
      <section>
        <div className="flex justify-between items-center mb-4">
            <SectionHeader title="Investigation Team" icon={Users} />
            <Button type="button" variant="outline" size="sm" onClick={() => appendTeamMember({ userId: '', name: '', role: 'Team Member' })} className="h-7 px-3 text-[10px] font-black uppercase border-slate-300 no-print">
                <PlusCircle className="mr-1 h-3 w-3" /> Add Member
            </Button>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {teamFields.map((field, index) => (
            <div key={field.id} className="flex items-end gap-2 p-3 border rounded-lg bg-muted/10">
              <FormField control={form.control} name={`investigationTeam.${index}.userId`} render={({ field }) => ( 
                  <FormItem className='flex-1'>
                      <Label>Team Member</Label>
                      <Select onValueChange={(value) => handleUserSelection(index, value)} defaultValue={field.value}>
                          <FormControl>
                              <SelectTrigger className="h-9 text-xs bg-background font-bold border-slate-300">
                                  <SelectValue placeholder="Select..." />
                              </SelectTrigger>
                          </FormControl>
                          <SelectContent>{personnel.map((p) => (<SelectItem key={p.id} value={p.id} className="text-xs">{p.firstName} {p.lastName}</SelectItem>))}</SelectContent>
                      </Select>
                  </FormItem> 
              )} />
              <FormField control={form.control} name={`investigationTeam.${index}.role`} render={({ field }) => ( 
                  <FormItem className='flex-1'>
                      <Label>Role</Label>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                          <FormControl>
                              <SelectTrigger className="h-9 text-xs bg-background font-bold border-slate-300">
                                  <SelectValue />
                              </SelectTrigger>
                          </FormControl>
                          <SelectContent>{['Lead Investigator', 'Team Member', 'Technical Expert', 'Observer'].map(role => (<SelectItem key={role} value={role} className="text-xs">{role}</SelectItem>))}</SelectContent>
                      </Select>
                  </FormItem> 
              )} />
              <Button type="button" variant="ghost" size="icon" onClick={() => removeTeamMember(index)} className="h-8 w-8 text-destructive no-print hover:bg-destructive/10"><Trash2 className="h-4 w-4" /></Button>
            </div>
          ))}
        </div>
      </section>

      <LocalSeparator />

      {/* 2. Tasks Section */}
      <section>
        <div className="flex justify-between items-center mb-4">
            <SectionHeader title="Investigation Tasks" icon={CheckCircle2} />
            <Button type="button" variant="outline" size="sm" onClick={() => appendTask({ id: uuidv4(), description: '', assigneeId: '', dueDate: new Date(), status: 'Open' })} className="h-7 px-3 text-[10px] font-black uppercase border-slate-300 no-print">
                <PlusCircle className="mr-1 h-3 w-3" /> Add Task
            </Button>
        </div>
        <div className="space-y-2">
          {taskFields.map((field, index) => (
              <div key={field.id} className="grid grid-cols-1 md:grid-cols-12 gap-3 p-3 border rounded-lg bg-muted/10 items-end">
                  <FormField control={form.control} name={`investigationTasks.${index}.description`} render={({ field }) => (
                      <FormItem className='md:col-span-5'><Label>Task Detail</Label><FormControl><Input placeholder="..." {...field} className="h-9 text-xs bg-background font-bold border-slate-300" /></FormControl></FormItem>
                  )} />
                  <FormField control={form.control} name={`investigationTasks.${index}.assigneeId`} render={({ field }) => ( 
                      <FormItem className='md:col-span-2'><Label>Assignee</Label><Select onValueChange={field.onChange} defaultValue={field.value}><FormControl><SelectTrigger className="h-9 text-xs bg-background font-bold border-slate-300"><SelectValue placeholder="..." /></SelectTrigger></FormControl><SelectContent>{personnel.map((p) => (<SelectItem key={p.id} value={p.id} className="text-xs">{p.firstName} {p.lastName}</SelectItem>))}</SelectContent></Select></FormItem> 
                  )} />
                  <FormField control={form.control} name={`investigationTasks.${index}.dueDate`} render={({ field }) => (
                      <FormItem className='md:col-span-2 flex flex-col'><Label>Due Date</Label><Popover><PopoverTrigger asChild><FormControl><Button variant="outline" className={cn("h-9 pl-3 text-left font-bold bg-background text-xs border-slate-300", !field.value && "text-muted-foreground")}>{field.value ? format(field.value, "dd MMM") : <span>Date</span>}<CalendarIcon className="ml-auto h-3 w-3 opacity-50" /></Button></FormControl></PopoverTrigger><PopoverContent className="w-auto p-0"><CustomCalendar selectedDate={field.value} onDateSelect={field.onChange} /></PopoverContent></Popover></FormItem>
                  )}/>
                  <FormField control={form.control} name={`investigationTasks.${index}.status`} render={({ field }) => (
                      <FormItem className='md:col-span-2'><Label>Status</Label><Select onValueChange={field.onChange} defaultValue={field.value}><FormControl><SelectTrigger className="h-9 text-xs bg-background font-bold border-slate-300"><SelectValue /></SelectTrigger></FormControl><SelectContent>{['Open', 'In Progress', 'Completed'].map(s => (<SelectItem key={s} value={s} className="text-xs">{s}</SelectItem>))}</SelectContent></Select></FormItem>
                  )} />
                  <Button type="button" variant="ghost" size="icon" onClick={() => removeTask(index)} className="md:col-span-1 text-destructive h-8 w-8 no-print hover:bg-destructive/10"><Trash2 className="h-4 w-4" /></Button>
              </div>
          ))}
        </div>
      </section>

      <LocalSeparator />

      {/* 3. Notes Section */}
      <section>
          <FormField
          control={form.control}
          name="investigationNotes"
          render={({ field }) => (
              <FormItem>
              <SectionHeader title="Investigation Summary & Root Cause" icon={AlertTriangle} />
              <FormControl>
                  <Textarea
                  placeholder="Summarize the final investigation findings..."
                  className="min-h-48 text-sm font-medium p-4 bg-muted/10 border-slate-200"
                  {...field}
                  />
              </FormControl>
              <FormMessage />
              </FormItem>
          )}
          />
      </section>
    </>
  );
}
