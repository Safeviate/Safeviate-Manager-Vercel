'use client';

import React from 'react';
import { useForm, useFieldArray, useFormContext, Controller, FormProvider } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from '@/components/ui/card';
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
import { Separator } from '@/components/ui/separator';
import { useToast } from '@/hooks/use-toast';
import type { SafetyReport } from '@/types/safety-report';
import { useFirestore, updateDocumentNonBlocking } from '@/firebase';
import { doc } from 'firebase/firestore';
import type { Personnel } from '@/app/(app)/users/personnel/page';
import { PlusCircle, Trash2, CalendarIcon, Save, Users, CheckCircle2, AlertTriangle } from 'lucide-react';
import { v4 as uuidv4 } from 'uuid';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { CustomCalendar } from '@/components/ui/custom-calendar';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import { ScrollArea } from '@/components/ui/scroll-area';

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
const SectionHeader = ({ title, icon: Icon }: { title: string, icon: any }) => (
    <div className="flex items-center gap-2 mb-4">
        <div className="p-1.5 rounded-md bg-primary/10 text-primary">
            <Icon className="h-4 w-4" />
        </div>
        <h3 className="text-sm font-bold uppercase tracking-wider">{title}</h3>
    </div>
);

const Label = ({ children, className }: { children: React.ReactNode, className?: string }) => (
    <label className={cn("text-[10px] font-bold uppercase text-muted-foreground block", className)}>
        {children}
    </label>
);

interface InvestigationFormProps {
  report: SafetyReport;
  tenantId: string;
  personnel: Personnel[];
  isStacked?: boolean;
}

export function InvestigationForm({ report, tenantId, personnel, isStacked = false }: InvestigationFormProps) {
  const firestore = useFirestore();
  const { toast } = useToast();

  const form = useForm<FormValues>({
    resolver: zodResolver(investigationSchema),
    defaultValues: {
      investigationTeam: report.investigationTeam || [],
      investigationNotes: report.investigationNotes || '',
      investigationTasks: report.investigationTasks?.map(task => ({ ...task, dueDate: new Date(task.dueDate) })) || [],
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

  const onSubmit = (values: FormValues) => {
    if (!firestore) return;

    const reportRef = doc(firestore, 'tenants', tenantId, 'safety-reports', report.id);
    const dataToSave = {
        ...values,
        investigationTasks: values.investigationTasks.map(task => ({
            ...task,
            dueDate: task.dueDate.toISOString(),
        }))
    };

    updateDocumentNonBlocking(reportRef, dataToSave);
    toast({ title: 'Investigation Details Saved' });
  };

  const handleUserSelection = (index: number, userId: string) => {
      const selectedUser = personnel.find(p => p.id === userId);
      if (selectedUser) {
          form.setValue(`investigationTeam.${index}.name`, `${selectedUser.firstName} ${selectedUser.lastName}`);
          form.setValue(`investigationTeam.${index}.userId`, userId);
      }
  };

  return (
    <Card className={cn("flex flex-col shadow-none border", !isStacked && "h-[calc(100vh-300px)] overflow-hidden")}>
      <CardHeader className="shrink-0 border-b bg-muted/5">
        <CardTitle>Investigation Management</CardTitle>
        <CardDescription>Assemble the investigation team and manage specific discovery tasks.</CardDescription>
      </CardHeader>
      <div className={cn("flex-1 p-0 overflow-hidden", isStacked && "overflow-visible")}>
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
              <div className="shrink-0 flex justify-end p-4 border-t bg-muted/5 gap-2 no-print">
                <Button type="submit" size="sm" className="h-8 px-4"><Save className="mr-2 h-4 w-4" /> Save Investigation Details</Button>
              </div>
            </form>
          </Form>
        </FormProvider>
      </div>
    </Card>
  );
}

function InvestigationFields({ form, teamFields, taskFields, personnel, removeTeamMember, removeTask, appendTeamMember, appendTask, handleUserSelection }: any) {
  return (
    <>
      {/* 1. Team Section */}
      <section>
        <div className="flex justify-between items-center mb-4">
            <SectionHeader title="Investigation Team" icon={Users} />
            <Button type="button" variant="outline" size="sm" onClick={() => appendTeamMember({ userId: '', name: '', role: 'Team Member' })} className="h-7 text-[10px] no-print">
                <PlusCircle className="mr-1 h-3 w-3" /> Add Member
            </Button>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {teamFields.map((field: any, index: number) => (
            <div key={field.id} className="flex items-end gap-2 p-3 border rounded-lg bg-muted/10">
              <FormField control={form.control} name={`investigationTeam.${index}.userId`} render={({ field }) => ( 
                  <FormItem className='flex-1'>
                      <Label>Team Member</Label>
                      <Select onValueChange={(value) => handleUserSelection(index, value)} defaultValue={field.value}>
                          <FormControl>
                              <SelectTrigger className="h-8 text-xs bg-background">
                                  <SelectValue placeholder="Select..." />
                              </SelectTrigger>
                          </FormControl>
                          <SelectContent>{personnel.map((p: any) => (<SelectItem key={p.id} value={p.id} className="text-xs">{p.firstName} {p.lastName}</SelectItem>))}</SelectContent>
                      </Select>
                  </FormItem> 
              )} />
              <FormField control={form.control} name={`investigationTeam.${index}.role`} render={({ field }) => ( 
                  <FormItem className='flex-1'>
                      <Label>Role</Label>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                          <FormControl>
                              <SelectTrigger className="h-8 text-xs bg-background">
                                  <SelectValue />
                              </SelectTrigger>
                          </FormControl>
                          <SelectContent>{['Lead Investigator', 'Team Member', 'Technical Expert', 'Observer'].map(role => (<SelectItem key={role} value={role} className="text-xs">{role}</SelectItem>))}</SelectContent>
                      </Select>
                  </FormItem> 
              )} />
              <Button type="button" variant="ghost" size="icon" onClick={() => removeTeamMember(index)} className="h-8 w-8 text-destructive no-print"><Trash2 className="h-4 w-4" /></Button>
            </div>
          ))}
        </div>
      </section>

      <Separator />

      {/* 2. Tasks Section */}
      <section>
        <div className="flex justify-between items-center mb-4">
            <SectionHeader title="Investigation Tasks" icon={CheckCircle2} />
            <Button type="button" variant="outline" size="sm" onClick={() => appendTask({ id: uuidv4(), description: '', assigneeId: '', dueDate: new Date(), status: 'Open' })} className="h-7 text-[10px] no-print">
                <PlusCircle className="mr-1 h-3 w-3" /> Add Task
            </Button>
        </div>
        <div className="space-y-2">
          {taskFields.map((field: any, index: number) => (
              <div key={field.id} className="grid grid-cols-1 md:grid-cols-12 gap-3 p-3 border rounded-lg bg-muted/10 items-end">
                  <FormField control={form.control} name={`investigationTasks.${index}.description`} render={({ field }) => (
                      <FormItem className='md:col-span-5'><Label>Task Detail</Label><FormControl><Input placeholder="..." {...field} className="h-8 text-xs bg-background" /></FormControl></FormItem>
                  )} />
                  <FormField control={form.control} name={`investigationTasks.${index}.assigneeId`} render={({ field }) => ( 
                      <FormItem className='md:col-span-2'><Label>Assignee</Label><Select onValueChange={field.onChange} defaultValue={field.value}><FormControl><SelectTrigger className="h-8 text-xs bg-background"><SelectValue placeholder="..." /></SelectTrigger></FormControl><SelectContent>{personnel.map((p: any) => (<SelectItem key={p.id} value={p.id} className="text-xs">{p.firstName} {p.lastName}</SelectItem>))}</SelectContent></Select></FormItem> 
                  )} />
                  <FormField control={form.control} name={`investigationTasks.${index}.dueDate`} render={({ field }) => (
                      <FormItem className='md:col-span-2 flex flex-col'><Label>Due Date</Label><Popover><PopoverTrigger asChild><FormControl><Button variant="outline" className={cn("h-8 pl-3 text-left font-normal bg-background text-xs", !field.value && "text-muted-foreground")}>{field.value ? format(field.value, "dd MMM") : <span>Date</span>}<CalendarIcon className="ml-auto h-3 w-3 opacity-50" /></Button></FormControl></PopoverTrigger><PopoverContent className="w-auto p-0"><CustomCalendar selectedDate={field.value} onDateSelect={field.onChange} /></PopoverContent></Popover></FormItem>
                  )}/>
                  <FormField control={form.control} name={`investigationTasks.${index}.status`} render={({ field }) => (
                      <FormItem className='md:col-span-2'><Label>Status</Label><Select onValueChange={field.onChange} defaultValue={field.value}><FormControl><SelectTrigger className="h-8 text-xs bg-background"><SelectValue /></SelectTrigger></FormControl><SelectContent>{['Open', 'In Progress', 'Completed'].map(s => (<SelectItem key={s} value={s} className="text-xs">{s}</SelectItem>))}</SelectContent></Select></FormItem>
                  )} />
                  <Button type="button" variant="ghost" size="icon" onClick={() => removeTask(index)} className="md:col-span-1 text-destructive h-8 w-8 no-print"><Trash2 className="h-4 w-4" /></Button>
              </div>
          ))}
        </div>
      </section>

      <Separator />

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
                  className="min-h-48 text-sm p-4 bg-muted/10"
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
