'use client';

import { useForm, useFieldArray } from 'react-hook-form';
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
import { PlusCircle, Trash2, CalendarIcon, Save, Users, ShieldAlert, CheckCircle2 } from 'lucide-react';
import { v4 as uuidv4 } from 'uuid';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { CustomCalendar } from '@/components/ui/custom-calendar';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import { ScrollArea } from '@/components/ui/scroll-area';

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

const riskAssessmentSchema = z.object({
  severity: z.number().min(1).max(5),
  likelihood: z.number().min(1).max(5),
  riskScore: z.number(),
  riskLevel: z.enum(["Low", "Medium", "High", "Critical"]),
});

const reportHazardSchema = z.object({
    id: z.string(),
    description: z.string().min(1, "Hazard description is required."),
    riskAssessment: riskAssessmentSchema.optional(),
});

const investigationSchema = z.object({
  investigationTeam: z.array(investigationMemberSchema),
  investigationNotes: z.string().optional(),
  investigationTasks: z.array(investigationTaskSchema),
  initialHazards: z.array(reportHazardSchema),
});

type InvestigationFormValues = z.infer<typeof investigationSchema>;

interface InvestigationFormProps {
  report: SafetyReport;
  tenantId: string;
  personnel: Personnel[];
}

const SectionHeader = ({ title, icon: Icon }: { title: string, icon: any }) => (
    <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-md bg-primary/10 text-primary">
                <Icon className="h-4 w-4" />
            </div>
            <h3 className="text-sm font-bold uppercase tracking-wider">{title}</h3>
        </div>
    </div>
);

export function InvestigationForm({ report, tenantId, personnel }: InvestigationFormProps) {
  const firestore = useFirestore();
  const { toast } = useToast();

  const form = useForm<InvestigationFormValues>({
    resolver: zodResolver(investigationSchema),
    defaultValues: {
      investigationTeam: report.investigationTeam?.map(member => ({ ...member })) || [],
      investigationNotes: report.investigationNotes || '',
      investigationTasks: report.investigationTasks?.map(task => ({ ...task, dueDate: new Date(task.dueDate) })) || [],
      initialHazards: report.initialHazards || [],
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
  const { fields: hazardFields, append: appendHazard, remove: removeHazard } = useFieldArray({
      control: form.control,
      name: "initialHazards"
  })

  const onSubmit = (values: InvestigationFormValues) => {
    if (!firestore) return;

    const reportRef = doc(firestore, 'tenants', tenantId, 'safety-reports', report.id);
    
    const dataToSave = {
        ...values,
        investigationTasks: values.investigationTasks.map(task => ({
            ...task,
            dueDate: task.dueDate.toISOString(),
        }))
    }

    updateDocumentNonBlocking(reportRef, dataToSave);
    toast({
      title: 'Investigation Details Saved',
      description: 'The investigation details have been updated.',
    });
  };
  
  const handleUserSelection = (index: number, userId: string) => {
      const selectedUser = personnel.find(p => p.id === userId);
      if (selectedUser) {
          form.setValue(`investigationTeam.${index}.name`, `${selectedUser.firstName} ${selectedUser.lastName}`);
          form.setValue(`investigationTeam.${index}.userId`, userId);
      }
  }

  return (
    <Card className="flex flex-col h-[calc(100vh-300px)] overflow-hidden shadow-none border">
      <CardHeader className="shrink-0 border-b bg-muted/5">
        <CardTitle>Investigation Management</CardTitle>
        <CardDescription>Analyze the event, assign tasks, and identify underlying hazards.</CardDescription>
      </CardHeader>
      <CardContent className="flex-1 min-h-0 p-0 overflow-hidden">
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="h-full flex flex-col">
            <ScrollArea className="flex-1 p-6">
              <div className="space-y-10 pb-10">
                
                {/* 1. Team Section */}
                <section>
                  <div className="flex justify-between items-center mb-4">
                      <SectionHeader title="Investigation Team" icon={Users} />
                      <Button type="button" variant="outline" size="sm" onClick={() => appendTeamMember({ userId: '', name: '', role: 'Team Member' })} className="h-7 text-[10px]">
                          <PlusCircle className="mr-1 h-3 w-3" /> Add Member
                      </Button>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {teamFields.map((field, index) => (
                      <div key={field.id} className="flex items-end gap-2 p-3 border rounded-lg bg-background shadow-sm">
                        <FormField control={form.control} name={`investigationTeam.${index}.userId`} render={({ field }) => ( 
                            <FormItem className='flex-1'>
                                <FormLabel className="text-[10px] uppercase font-bold text-muted-foreground">Team Member</FormLabel>
                                <Select onValueChange={(value) => handleUserSelection(index, value)} defaultValue={field.value}>
                                    <FormControl>
                                        <SelectTrigger className="h-8 text-xs">
                                            <SelectValue placeholder="Select..." />
                                        </SelectTrigger>
                                    </FormControl>
                                    <SelectContent>{personnel.map(p => (<SelectItem key={p.id} value={p.id} className="text-xs">{p.firstName} {p.lastName}</SelectItem>))}</SelectContent>
                                </Select>
                            </FormItem> 
                        )} />
                        <FormField control={form.control} name={`investigationTeam.${index}.role`} render={({ field }) => ( 
                            <FormItem className='flex-1'>
                                <FormLabel className="text-[10px] uppercase font-bold text-muted-foreground">Role</FormLabel>
                                <Select onValueChange={field.onChange} defaultValue={field.value}>
                                    <FormControl>
                                        <SelectTrigger className="h-8 text-xs">
                                            <SelectValue />
                                        </SelectTrigger>
                                    </FormControl>
                                    <SelectContent>{['Lead Investigator', 'Team Member', 'Technical Expert', 'Observer'].map(role => (<SelectItem key={role} value={role} className="text-xs">{role}</SelectItem>))}</SelectContent>
                                </Select>
                            </FormItem> 
                        )} />
                        <Button type="button" variant="ghost" size="icon" onClick={() => removeTeamMember(index)} className="h-8 w-8 text-destructive hover:bg-destructive/10"><Trash2 className="h-4 w-4" /></Button>
                      </div>
                    ))}
                    {teamFields.length === 0 && <p className="text-xs text-muted-foreground italic col-span-full py-4 text-center border border-dashed rounded-lg bg-muted/5">No team members assigned.</p>}
                  </div>
                </section>

                <Separator />
                
                {/* 2. Hazard Section */}
                <section>
                    <div className="flex justify-between items-center mb-4">
                        <SectionHeader title="Hazard Identification" icon={ShieldAlert} />
                        <Button type="button" variant="outline" size="sm" onClick={() => appendHazard({ id: uuidv4(), description: '' })} className="h-7 text-[10px]">
                            <PlusCircle className="mr-1 h-3 w-3" /> Add Hazard
                        </Button>
                    </div>
                    <div className='grid grid-cols-1 gap-3'>
                        {hazardFields.map((field, index) => (
                            <div key={field.id} className="flex items-center gap-3 p-3 border rounded-lg bg-background shadow-sm group">
                                <div className="h-6 w-6 rounded-full bg-primary/10 text-primary flex items-center justify-center text-[10px] font-bold shrink-0">{index + 1}</div>
                                <FormField control={form.control} name={`initialHazards.${index}.description`} render={({ field }) => (
                                    <FormItem className='flex-1 space-y-0'>
                                        <FormControl>
                                            <Input placeholder="Describe the identified hazard..." {...field} className="h-8 text-sm border-none shadow-none focus-visible:ring-1 focus-visible:ring-primary p-0 bg-transparent" />
                                        </FormControl>
                                    </FormItem>
                                )} />
                                <Button type="button" variant="ghost" size="icon" onClick={() => removeHazard(index)} className="h-7 w-7 text-muted-foreground hover:text-destructive opacity-0 group-hover:opacity-100 transition-opacity"><Trash2 className="h-3.5 w-3.5" /></Button>
                            </div>
                        ))}
                        {hazardFields.length === 0 && <p className="text-xs text-muted-foreground italic text-center py-8 border border-dashed rounded-lg bg-muted/5">No initial hazards identified yet.</p>}
                    </div>
                </section>

                <Separator />

                {/* 3. Tasks Section */}
                <section>
                  <div className="flex justify-between items-center mb-4">
                      <SectionHeader title="Investigation Tasks" icon={CheckCircle2} />
                      <Button type="button" variant="outline" size="sm" onClick={() => appendTask({ id: uuidv4(), description: '', assigneeId: '', dueDate: new Date(), status: 'Open' })} className="h-7 text-[10px]">
                          <PlusCircle className="mr-1 h-3 w-3" /> Add Task
                      </Button>
                  </div>
                  <div className="space-y-3">
                    {taskFields.map((field, index) => (
                        <div key={field.id} className="grid grid-cols-1 md:grid-cols-12 gap-3 p-3 border rounded-lg bg-background shadow-sm items-end">
                            <FormField control={form.control} name={`investigationTasks.${index}.description`} render={({ field }) => (
                                <FormItem className='md:col-span-5'>
                                    <FormLabel className="text-[10px] uppercase font-bold text-muted-foreground">Task Detail</FormLabel>
                                    <FormControl><Input placeholder="Task description..." {...field} className="h-8 text-xs" /></FormControl>
                                </FormItem>
                            )} />
                            <FormField control={form.control} name={`investigationTasks.${index}.assigneeId`} render={({ field }) => ( 
                                <FormItem className='md:col-span-2'>
                                    <FormLabel className="text-[10px] uppercase font-bold text-muted-foreground">Assignee</FormLabel>
                                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                                        <FormControl><SelectTrigger className="h-8 text-xs"><SelectValue placeholder="..." /></SelectTrigger></FormControl>
                                        <SelectContent>{personnel.map(p => (<SelectItem key={p.id} value={p.id} className="text-xs">{p.firstName} {p.lastName}</SelectItem>))}</SelectContent>
                                    </Select>
                                </FormItem> 
                            )} />
                            <FormField control={form.control} name={`investigationTasks.${index}.dueDate`} render={({ field }) => (
                                <FormItem className='md:col-span-2 flex flex-col'>
                                    <FormLabel className="text-[10px] uppercase font-bold text-muted-foreground">Due Date</FormLabel>
                                    <Popover>
                                        <PopoverTrigger asChild>
                                            <FormControl>
                                                <Button variant={"outline"} className={cn("h-8 pl-3 text-left font-normal bg-background text-[10px]", !field.value && "text-muted-foreground")}>
                                                    {field.value ? format(field.value, "dd MMM") : <span>Date</span>}
                                                    <CalendarIcon className="ml-auto h-3 w-3 opacity-50" />
                                                </Button>
                                            </FormControl>
                                        </PopoverTrigger>
                                        <PopoverContent className="w-auto p-0"><CustomCalendar selectedDate={field.value} onDateSelect={field.onChange} /></PopoverContent>
                                    </Popover>
                                </FormItem>
                            )}/>
                            <FormField control={form.control} name={`investigationTasks.${index}.status`} render={({ field }) => (
                                <FormItem className='md:col-span-2'>
                                    <FormLabel className="text-[10px] uppercase font-bold text-muted-foreground">Status</FormLabel>
                                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                                        <FormControl><SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger></FormControl>
                                        <SelectContent>{['Open', 'In Progress', 'Completed'].map(s => (<SelectItem key={s} value={s} className="text-xs">{s}</SelectItem>))}</SelectContent>
                                    </Select>
                                </FormItem>
                            )} />
                            <div className="md:col-span-1 flex justify-end">
                                <Button type="button" variant="ghost" size="icon" onClick={() => removeTask(index)} className="h-8 w-8 text-destructive hover:bg-destructive/10"><Trash2 className="h-4 w-4" /></Button>
                            </div>
                        </div>
                    ))}
                    {taskFields.length === 0 && <p className="text-xs text-muted-foreground italic text-center py-8 border border-dashed rounded-lg bg-muted/5">No investigation tasks defined.</p>}
                  </div>
                </section>

                <Separator />

                {/* 4. Notes Section */}
                <section>
                    <FormField
                    control={form.control}
                    name="investigationNotes"
                    render={({ field }) => (
                        <FormItem>
                        <FormLabel className="text-sm font-bold uppercase tracking-wider text-muted-foreground">Root Cause Analysis & Findings</FormLabel>
                        <FormControl>
                            <Textarea
                            placeholder="Summarize the findings of the investigation and identify the root cause(s)..."
                            className="min-h-48 text-sm p-4 bg-muted/5"
                            {...field}
                            />
                        </FormControl>
                        <FormMessage />
                        </FormItem>
                    )}
                    />
                </section>
              </div>
            </ScrollArea>
            <div className="shrink-0 flex justify-end p-4 border-t bg-muted/5 gap-2">
              <Button type="submit" size="sm" className="h-8 px-4">
                <Save className="mr-2 h-4 w-4" /> Save Investigation Details
              </Button>
            </div>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}
