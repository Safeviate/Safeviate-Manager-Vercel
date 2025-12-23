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
import type { SafetyReport, InvestigationMember, InvestigationTask, ReportHazard, RiskAssessment } from '@/types/safety-report';
import { useFirestore, updateDocumentNonBlocking, useCollection, useMemoFirebase } from '@/firebase';
import { doc, collection } from 'firebase/firestore';
import type { Personnel } from '@/app/(app)/users/personnel/page';
import { PlusCircle, Trash2 } from 'lucide-react';
import { v4 as uuidv4 } from 'uuid';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { CustomCalendar } from '@/components/ui/custom-calendar';
import { CalendarIcon } from 'lucide-react';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';

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
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Investigation Management</CardTitle>
            <CardDescription>Manage the investigation team, tasks, and findings.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            
            {/* Investigation Team */}
            <div>
              <div className="flex justify-between items-center mb-4">
                  <h3 className="text-lg font-medium">Investigation Team</h3>
                  <Button type="button" variant="outline" size="sm" onClick={() => appendTeamMember({ userId: '', name: '', role: 'Team Member' })}>
                      <PlusCircle className="mr-2 h-4 w-4" /> Add Member
                  </Button>
              </div>
              <div className="space-y-4">
                {teamFields.map((field, index) => (
                  <div key={field.id} className="flex items-end gap-2 p-4 border rounded-lg">
                    <FormField control={form.control} name={`investigationTeam.${index}.userId`} render={({ field }) => ( <FormItem className='flex-1'><FormLabel>Team Member</FormLabel><Select onValueChange={(value) => handleUserSelection(index, value)} defaultValue={field.value}><FormControl><SelectTrigger><SelectValue placeholder="Select a person" /></SelectTrigger></FormControl><SelectContent>{personnel.map(p => (<SelectItem key={p.id} value={p.id}>{p.firstName} {p.lastName}</SelectItem>))}</SelectContent></Select><FormMessage /></FormItem> )} />
                    <FormField control={form.control} name={`investigationTeam.${index}.role`} render={({ field }) => ( <FormItem className='flex-1'><FormLabel>Role</FormLabel><Select onValueChange={field.onChange} defaultValue={field.value}><FormControl><SelectTrigger><SelectValue placeholder="Select a role" /></SelectTrigger></FormControl><SelectContent>{['Lead Investigator', 'Team Member', 'Technical Expert', 'Observer'].map(role => (<SelectItem key={role} value={role}>{role}</SelectItem>))}</SelectContent></Select><FormMessage /></FormItem> )} />
                    <Button type="button" variant="destructive" size="icon" onClick={() => removeTeamMember(index)}><Trash2 className="h-4 w-4" /></Button>
                  </div>
                ))}
              </div>
            </div>

            <Separator />
            
            {/* Initial Hazard Identification */}
            <div>
                <div className="flex justify-between items-center mb-4">
                    <h3 className="text-lg font-medium">Initial Hazard Identification</h3>
                    <Button type="button" variant="outline" size="sm" onClick={() => appendHazard({ id: uuidv4(), description: '' })}>
                        <PlusCircle className="mr-2 h-4 w-4" /> Add Hazard
                    </Button>
                </div>
                <div className='space-y-4'>
                    {hazardFields.map((field, index) => (
                        <div key={field.id} className="flex items-end gap-2 p-4 border rounded-lg">
                            <FormField control={form.control} name={`initialHazards.${index}.description`} render={({ field }) => (<FormItem className='flex-1'><FormLabel>Hazard Description</FormLabel><FormControl><Input placeholder="e.g., Runway incursion risk" {...field} /></FormControl><FormMessage /></FormItem>)} />
                            <Button type="button" variant="destructive" size="icon" onClick={() => removeHazard(index)}><Trash2 className="h-4 w-4" /></Button>
                        </div>
                    ))}
                </div>
            </div>

            <Separator />

            {/* Investigation Tasks */}
            <div>
               <div className="flex justify-between items-center mb-4">
                  <h3 className="text-lg font-medium">Investigation Tasks</h3>
                  <Button type="button" variant="outline" size="sm" onClick={() => appendTask({ id: uuidv4(), description: '', assigneeId: '', dueDate: new Date(), status: 'Open' })}>
                      <PlusCircle className="mr-2 h-4 w-4" /> Add Task
                  </Button>
              </div>
              <div className="space-y-4">
                {taskFields.map((field, index) => (
                    <div key={field.id} className="grid grid-cols-1 md:grid-cols-4 items-end gap-4 p-4 border rounded-lg">
                        <FormField control={form.control} name={`investigationTasks.${index}.description`} render={({ field }) => (<FormItem className='md:col-span-4'><FormLabel>Task</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>)} />
                        <FormField control={form.control} name={`investigationTasks.${index}.assigneeId`} render={({ field }) => ( <FormItem><FormLabel>Assignee</FormLabel><Select onValueChange={field.onChange} defaultValue={field.value}><FormControl><SelectTrigger><SelectValue placeholder="Assign to..." /></SelectTrigger></FormControl><SelectContent>{personnel.map(p => (<SelectItem key={p.id} value={p.id}>{p.firstName} {p.lastName}</SelectItem>))}</SelectContent></Select><FormMessage /></FormItem> )} />
                        <FormField control={form.control} name={`investigationTasks.${index}.dueDate`} render={({ field }) => (<FormItem className='flex flex-col'><FormLabel>Due Date</FormLabel><Popover><PopoverTrigger asChild><FormControl><Button variant={"outline"} className={cn("pl-3 text-left font-normal", !field.value && "text-muted-foreground")}>{field.value ? format(field.value, "PPP") : <span>Pick a date</span>}<CalendarIcon className="ml-auto h-4 w-4 opacity-50" /></Button></FormControl></PopoverTrigger><PopoverContent className="w-auto p-0"><CustomCalendar selectedDate={field.value} onDateSelect={field.onChange} /></PopoverContent></Popover><FormMessage /></FormItem>)}/>
                        <FormField control={form.control} name={`investigationTasks.${index}.status`} render={({ field }) => (<FormItem><FormLabel>Status</FormLabel><Select onValueChange={field.onChange} defaultValue={field.value}><FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl><SelectContent>{['Open', 'In Progress', 'Completed'].map(s => (<SelectItem key={s} value={s}>{s}</SelectItem>))}</SelectContent></Select><FormMessage /></FormItem>)} />
                        <Button type="button" variant="destructive" size="icon" onClick={() => removeTask(index)}><Trash2 className="h-4 w-4" /></Button>
                    </div>
                ))}
              </div>
            </div>

            <Separator />

            {/* Investigation Findings */}
            <FormField
              control={form.control}
              name="investigationNotes"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-lg font-medium">Investigation Findings & Root Cause Analysis</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Summarize the findings of the investigation and identify the root cause(s)..."
                      className="min-h-48"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </CardContent>
        </Card>
        <div className="flex justify-end pt-4">
            <Button type="submit">Save Investigation Details</Button>
        </div>
      </form>
    </Form>
  );
}
