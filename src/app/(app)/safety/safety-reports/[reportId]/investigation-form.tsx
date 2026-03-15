'use client';

import React, { useState } from 'react';
import { useForm, useFieldArray, useFormContext, Controller } from 'react-hook-form';
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
import type { SafetyReport, ReportHazard, ReportRisk, RiskAssessment } from '@/types/safety-report';
import { useFirestore, updateDocumentNonBlocking } from '@/firebase';
import { doc } from 'firebase/firestore';
import type { Personnel } from '@/app/(app)/users/personnel/page';
import { PlusCircle, Trash2, CalendarIcon, Save, Users, ShieldAlert, CheckCircle2, ChevronDown, AlertTriangle } from 'lucide-react';
import { v4 as uuidv4 } from 'uuid';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { CustomCalendar } from '@/components/ui/custom-calendar';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Slider } from '@/components/ui/slider';

// --- Helper Functions ---
const getRiskLevel = (score: number): 'Low' | 'Medium' | 'High' | 'Critical' => {
    if (score <= 4) return 'Low';
    if (score <= 9) return 'Medium';
    if (score <= 16) return 'High';
    return 'Critical';
}

const getRiskScoreColor = (likelihood: number, severity: number): { backgroundColor: string; color: string } => {
    const score = likelihood * severity;
    if (score > 9) return { backgroundColor: '#ef4444', color: 'white' }; // red-500
    if (score > 4) return { backgroundColor: '#f59e0b', color: 'black' }; // amber-500
    return { backgroundColor: '#10b981', color: 'white' }; // emerald-500
};

// --- Form Schemas ---
const riskAssessmentSchema = z.object({
    severity: z.number().min(1).max(5),
    likelihood: z.number().min(1).max(5),
    riskScore: z.number(),
    riskLevel: z.enum(["Low", "Medium", "High", "Critical"]),
});

const reportRiskSchema = z.object({
    id: z.string(),
    description: z.string().min(1, "Risk description is required."),
    riskAssessment: riskAssessmentSchema,
});

const reportHazardSchema = z.object({
    id: z.string(),
    description: z.string().min(1, "Hazard description is required."),
    risks: z.array(reportRiskSchema).optional(),
});

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
  initialHazards: z.array(reportHazardSchema),
});

type FormValues = z.infer<typeof investigationSchema>;

// --- Components ---

const RiskAssessmentEditor = ({ path, label }: { path: string; label: string }) => {
    const { control, setValue, watch } = useFormContext<FormValues>();
    
    const likelihood = watch(`${path}.likelihood` as any) || 1;
    const severity = watch(`${path}.severity` as any) || 1;
    
    const riskScore = likelihood * severity;
    const riskLevel = getRiskLevel(riskScore);
    const { backgroundColor, color } = getRiskScoreColor(likelihood, severity);

    const severityLetters: Record<number, string> = { 5: 'A', 4: 'B', 3: 'C', 2: 'D', 1: 'E' };
    const displayValue = `${likelihood}${severityLetters[severity] || 'E'}`;

    React.useEffect(() => {
        setValue(`${path}.riskScore` as any, riskScore);
        setValue(`${path}.riskLevel` as any, riskLevel);
    }, [riskScore, riskLevel, path, setValue]);

    return (
        <div className="flex items-center gap-4 p-3 bg-background border rounded-lg shadow-sm">
            <div className="flex-1 space-y-3">
                <p className="text-[10px] font-bold uppercase text-muted-foreground">{label}</p>
                <div className="grid grid-cols-2 gap-4">
                    <Controller
                        control={control}
                        name={`${path}.likelihood` as any}
                        render={({ field }) => (
                            <div className="space-y-1">
                                <Label className="text-[9px] uppercase">Likelihood: {field.value}</Label>
                                <Slider 
                                    value={[field.value || 1]} 
                                    onValueChange={(val) => field.onChange(val[0])} 
                                    min={1} max={5} step={1} 
                                />
                            </div>
                        )}
                    />
                    <Controller
                        control={control}
                        name={`${path}.severity` as any}
                        render={({ field }) => (
                            <div className="space-y-1">
                                <Label className="text-[9px] uppercase">Severity: {field.value}</Label>
                                <Slider 
                                    value={[field.value || 1]} 
                                    onValueChange={(val) => field.onChange(val[0])} 
                                    min={1} max={5} step={1} 
                                />
                            </div>
                        )}
                    />
                </div>
            </div>
            <div 
                className="h-10 w-10 rounded-full flex items-center justify-center font-bold text-sm shadow-inner"
                style={{ backgroundColor, color }}
            >
                {displayValue}
            </div>
        </div>
    );
};

const RisksArray = ({ hazardIndex }: { hazardIndex: number }) => {
    const { control } = useFormContext<FormValues>();
    const { fields, append, remove } = useFieldArray({
        control,
        name: `initialHazards.${hazardIndex}.risks`,
    });

    return (
        <div className="space-y-3 pl-4 border-l-2 ml-2 mt-3">
            {fields.map((field, riskIndex) => (
                <div key={field.id} className="p-3 bg-muted/30 border rounded-lg space-y-3">
                    <div className="flex items-start gap-2">
                        <FormField
                            control={control}
                            name={`initialHazards.${hazardIndex}.risks.${riskIndex}.description`}
                            render={({ field }) => (
                                <FormItem className="flex-1">
                                    <FormLabel className="text-[10px] uppercase font-bold text-muted-foreground">Identified Risk / Outcome</FormLabel>
                                    <FormControl>
                                        <Input placeholder="e.g., Loss of separation, Mid-air collision" {...field} className="h-8 text-xs" />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                        <Button 
                            type="button" 
                            variant="ghost" 
                            size="icon" 
                            onClick={() => remove(riskIndex)} 
                            className="h-8 w-8 text-destructive mt-5"
                        >
                            <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                    </div>
                    <RiskAssessmentEditor 
                        path={`initialHazards.${hazardIndex}.risks.${riskIndex}.riskAssessment`}
                        label="Assessment"
                    />
                </div>
            ))}
            <Button 
                type="button" 
                variant="outline" 
                size="sm" 
                onClick={() => append({ 
                    id: uuidv4(), 
                    description: '', 
                    riskAssessment: { likelihood: 1, severity: 1, riskScore: 1, riskLevel: 'Low' } 
                })}
                className="h-7 text-[10px]"
            >
                <PlusCircle className="mr-1 h-3 w-3" /> Add Risk Assessment
            </Button>
        </div>
    );
};

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

export function InvestigationForm({ report, tenantId, personnel }: InvestigationFormProps) {
  const firestore = useFirestore();
  const { toast } = useToast();

  const form = useForm<FormValues>({
    resolver: zodResolver(investigationSchema),
    defaultValues: {
      investigationTeam: report.investigationTeam || [],
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
    <Card className="flex flex-col h-[calc(100vh-300px)] overflow-hidden shadow-none border">
      <CardHeader className="shrink-0 border-b bg-muted/5">
        <CardTitle>Investigation Management</CardTitle>
        <CardDescription>Analyze the event, identify hazards, and assess operational risks.</CardDescription>
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
                                    <SelectContent>{personnel.map(p => (<SelectItem key={p.id} value={p.id} className="text-xs">{p.firstName} {p.lastName}</SelectItem>))}</SelectContent>
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
                        <Button type="button" variant="ghost" size="icon" onClick={() => removeTeamMember(index)} className="h-8 w-8 text-destructive"><Trash2 className="h-4 w-4" /></Button>
                      </div>
                    ))}
                  </div>
                </section>

                <Separator />
                
                {/* 2. Hazard & Risk Section */}
                <section>
                    <div className="flex justify-between items-center mb-4">
                        <SectionHeader title="Hazard & Risk Identification" icon={ShieldAlert} />
                        <Button type="button" variant="outline" size="sm" onClick={() => appendHazard({ id: uuidv4(), description: '', risks: [] })} className="h-7 text-[10px]">
                            <PlusCircle className="mr-1 h-3 w-3" /> Add Hazard
                        </Button>
                    </div>
                    <div className='space-y-4'>
                        {hazardFields.map((field, index) => (
                            <Card key={field.id} className="border-none shadow-none bg-muted/10">
                                <CardHeader className="p-4 pb-0">
                                    <div className="flex items-center gap-3">
                                        <div className="h-6 w-6 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-[10px] font-bold">
                                            {index + 1}
                                        </div>
                                        <FormField control={form.control} name={`initialHazards.${index}.description`} render={({ field }) => (
                                            <FormItem className='flex-1 space-y-0'>
                                                <FormControl>
                                                    <Input placeholder="Hazard description (e.g., Unstable approach at low altitude)" {...field} className="h-8 text-sm font-bold bg-background" />
                                                </FormControl>
                                            </FormItem>
                                        )} />
                                        <Button type="button" variant="ghost" size="icon" onClick={() => removeHazard(index)} className="text-destructive"><Trash2 className="h-4 w-4" /></Button>
                                    </div>
                                </CardHeader>
                                <CardContent className="p-4 pt-2">
                                    <RisksArray hazardIndex={index} />
                                </CardContent>
                            </Card>
                        ))}
                        {hazardFields.length === 0 && <p className="text-xs text-muted-foreground italic text-center py-12 border-2 border-dashed rounded-lg">No hazards identified.</p>}
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
                  <div className="space-y-2">
                    {taskFields.map((field, index) => (
                        <div key={field.id} className="grid grid-cols-1 md:grid-cols-12 gap-3 p-3 border rounded-lg bg-muted/10 items-end">
                            <FormField control={form.control} name={`investigationTasks.${index}.description`} render={({ field }) => (
                                <FormItem className='md:col-span-5'><Label>Task Detail</Label><FormControl><Input placeholder="..." {...field} className="h-8 text-xs bg-background" /></FormControl></FormItem>
                            )} />
                            <FormField control={form.control} name={`investigationTasks.${index}.assigneeId`} render={({ field }) => ( 
                                <FormItem className='md:col-span-2'><Label>Assignee</Label><Select onValueChange={field.onChange} defaultValue={field.value}><FormControl><SelectTrigger className="h-8 text-xs bg-background"><SelectValue placeholder="..." /></SelectTrigger></FormControl><SelectContent>{personnel.map(p => (<SelectItem key={p.id} value={p.id} className="text-xs">{p.firstName} {p.lastName}</SelectItem>))}</SelectContent></Select></FormItem> 
                            )} />
                            <FormField control={form.control} name={`investigationTasks.${index}.dueDate`} render={({ field }) => (
                                <FormItem className='md:col-span-2 flex flex-col'><Label>Due Date</Label><Popover><PopoverTrigger asChild><FormControl><Button variant="outline" className={cn("h-8 pl-3 text-left font-normal bg-background text-xs", !field.value && "text-muted-foreground")}>{field.value ? format(field.value, "dd MMM") : <span>Date</span>}<CalendarIcon className="ml-auto h-3 w-3 opacity-50" /></Button></FormControl></PopoverTrigger><PopoverContent className="w-auto p-0"><CustomCalendar selectedDate={field.value} onDateSelect={field.onChange} /></PopoverContent></Popover></FormItem>
                            )}/>
                            <FormField control={form.control} name={`investigationTasks.${index}.status`} render={({ field }) => (
                                <FormItem className='md:col-span-2'><Label>Status</Label><Select onValueChange={field.onChange} defaultValue={field.value}><FormControl><SelectTrigger className="h-8 text-xs bg-background"><SelectValue /></SelectTrigger></FormControl><SelectContent>{['Open', 'In Progress', 'Completed'].map(s => (<SelectItem key={s} value={s} className="text-xs">{s}</SelectItem>))}</SelectContent></Select></FormItem>
                            )} />
                            <Button type="button" variant="ghost" size="icon" onClick={() => removeTask(index)} className="md:col-span-1 text-destructive h-8 w-8"><Trash2 className="h-4 w-4" /></Button>
                        </div>
                    ))}
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
                        <SectionHeader title="Root Cause Analysis & Findings" icon={AlertTriangle} />
                        <FormControl>
                            <Textarea
                            placeholder="Provide a comprehensive summary of the investigation results..."
                            className="min-h-48 text-sm p-4 bg-muted/10"
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
              <Button type="submit" size="sm" className="h-8 px-4"><Save className="mr-2 h-4 w-4" /> Save Investigation Details</Button>
            </div>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}
