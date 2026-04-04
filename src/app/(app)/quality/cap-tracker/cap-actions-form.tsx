'use client';

import { useForm, useFieldArray } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import type { CorrectiveActionPlan } from '@/types/quality';
import type { Personnel } from '@/app/(app)/users/personnel/page';
import { PlusCircle, Trash2, CalendarIcon } from 'lucide-react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { CustomCalendar } from '@/components/ui/custom-calendar';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import { Textarea } from '@/components/ui/textarea';

const correctiveActionSchema = z.object({
    id: z.string(),
    description: z.string().min(1, "Action description is required."),
    responsiblePersonId: z.string().min(1, "Responsible person is required."),
    deadline: z.date(),
    status: z.enum(["Open", "In Progress", "Closed", "Cancelled"]),
});

const capSchema = z.object({
    rootCauseAnalysis: z.string().optional(),
    actions: z.array(correctiveActionSchema),
});

type CapFormValues = z.infer<typeof capSchema>;

interface CapActionsFormProps {
    cap: CorrectiveActionPlan;
    tenantId: string;
    personnel: Personnel[];
    onFormSubmit: () => void;
}

export function CapActionsForm({ cap, tenantId, personnel, onFormSubmit }: CapActionsFormProps) {
    const { toast } = useToast();

    const form = useForm<CapFormValues>({
        resolver: zodResolver(capSchema),
        defaultValues: {
            rootCauseAnalysis: cap.rootCauseAnalysis || '',
            actions: cap.actions?.map(action => ({ ...action, deadline: new Date(action.deadline) })) || [],
        },
    });

    const { fields, append, remove } = useFieldArray({
        control: form.control,
        name: "actions",
    });

    const onSubmit = (values: CapFormValues) => {
        try {
            const storedCaps = localStorage.getItem('safeviate.corrective-action-plans');
            const currentCaps = storedCaps ? JSON.parse(storedCaps) as CorrectiveActionPlan[] : [];
            
            const dataToSave = {
                ...values,
                actions: values.actions.map(action => ({
                    ...action,
                    deadline: action.deadline.toISOString(),
                }))
            };

            const nextCaps = currentCaps.map(c => c.id === cap.id ? { ...c, ...dataToSave } : c);
            localStorage.setItem('safeviate.corrective-action-plans', JSON.stringify(nextCaps));
            
            window.dispatchEvent(new Event('safeviate-quality-updated'));
            toast({
                title: 'Corrective Action Plan Saved',
                description: 'The CAP has been updated.',
            });
            onFormSubmit();
        } catch (error: any) {
            toast({ variant: 'destructive', title: 'Error', description: error.message });
        }
    };

    return (
        <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <div className="space-y-4">
                <FormField control={form.control} name="rootCauseAnalysis" render={({ field }) => ( <FormItem><FormLabel>Root Cause Analysis</FormLabel><FormControl><Textarea className="min-h-24" placeholder="Describe the root cause of the finding..." {...field} /></FormControl><FormMessage /></FormItem> )}/>

                <div className="flex justify-between items-center pt-4">
                    <h3 className="text-lg font-medium">Corrective Actions</h3>
                    <Button type="button" variant="outline" size="sm" onClick={() => append({ id: crypto.randomUUID(), description: '', responsiblePersonId: '', deadline: new Date(), status: 'Open' })}>
                        <PlusCircle className="mr-2 h-4 w-4" /> Add Action
                    </Button>
                </div>

                <div className="space-y-4">
                    {fields.map((field, index) => (
                        <div key={field.id} className="grid grid-cols-1 md:grid-cols-4 items-end gap-4 p-4 border rounded-lg bg-muted/30">
                            <FormField control={form.control} name={`actions.${index}.description`} render={({ field }) => (<FormItem className='md:col-span-4'><FormLabel>Action</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>)} />
                            <FormField control={form.control} name={`actions.${index}.responsiblePersonId`} render={({ field }) => ( <FormItem><FormLabel>Assignee</FormLabel><Select onValueChange={field.onChange} defaultValue={field.value}><FormControl><SelectTrigger><SelectValue placeholder="Assign to..." /></SelectTrigger></FormControl><SelectContent>{personnel.map(p => (<SelectItem key={p.id} value={p.id}>{p.firstName} {p.lastName}</SelectItem>))}</SelectContent></Select><FormMessage /></FormItem> )} />
                            <FormField control={form.control} name={`actions.${index}.deadline`} render={({ field }) => (<FormItem className='flex flex-col'><FormLabel>Deadline</FormLabel><Popover><PopoverTrigger asChild><FormControl><Button variant={"outline"} className={cn("pl-3 text-left font-normal bg-background", !field.value && "text-muted-foreground")}>{field.value ? format(field.value, "PPP") : <span>Pick a date</span>}<CalendarIcon className="ml-auto h-4 w-4 opacity-50" /></Button></FormControl></PopoverTrigger><PopoverContent className="w-auto p-0"><CustomCalendar selectedDate={field.value} onDateSelect={field.onChange} /></PopoverContent></Popover><FormMessage /></FormItem>)}/>
                            <FormField control={form.control} name={`actions.${index}.status`} render={({ field }) => (<FormItem><FormLabel>Status</FormLabel><Select onValueChange={field.onChange} defaultValue={field.value}><FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl><SelectContent>{['Open', 'In Progress', 'Closed', 'Cancelled'].map(s => (<SelectItem key={s} value={s}>{s}</SelectItem>))}</SelectContent></Select><FormMessage /></FormItem>)} />
                            <Button type="button" variant="destructive" size="icon" onClick={() => remove(index)}><Trash2 className="h-4 w-4" /></Button>
                        </div>
                    ))}
                    {fields.length === 0 && (
                        <p className='text-center text-muted-foreground py-8'>No corrective actions defined.</p>
                    )}
                </div>
            </div>
            <div className="flex justify-end pt-4 gap-2">
                <Button type="button" variant="outline" onClick={onFormSubmit}>Cancel</Button>
                <Button type="submit">Save CAP</Button>
            </div>
        </form>
        </Form>
    );
}
