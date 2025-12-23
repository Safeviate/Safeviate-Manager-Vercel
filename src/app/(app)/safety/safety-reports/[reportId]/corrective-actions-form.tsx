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
import { useToast } from '@/hooks/use-toast';
import type { SafetyReport, CorrectiveAction } from '@/types/safety-report';
import { useFirestore, updateDocumentNonBlocking } from '@/firebase';
import { doc } from 'firebase/firestore';
import type { Personnel } from '@/app/(app)/users/personnel/page';
import { PlusCircle, Trash2, CalendarIcon } from 'lucide-react';
import { v4 as uuidv4 } from 'uuid';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { CustomCalendar } from '@/components/ui/custom-calendar';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';

const correctiveActionSchema = z.object({
    id: z.string(),
    description: z.string().min(1, "Action description is required."),
    responsiblePersonId: z.string().min(1, "Responsible person is required."),
    deadline: z.date(),
    status: z.enum(["Open", "In Progress", "Closed", "Cancelled"]),
});

const capSchema = z.object({
  correctiveActions: z.array(correctiveActionSchema),
});

type CapFormValues = z.infer<typeof capSchema>;

interface CorrectiveActionsFormProps {
  report: SafetyReport;
  tenantId: string;
  personnel: Personnel[];
}

export function CorrectiveActionsForm({ report, tenantId, personnel }: CorrectiveActionsFormProps) {
  const firestore = useFirestore();
  const { toast } = useToast();

  const form = useForm<CapFormValues>({
    resolver: zodResolver(capSchema),
    defaultValues: {
      correctiveActions: report.correctiveActions?.map(action => ({ ...action, deadline: new Date(action.deadline) })) || [],
    },
  });

  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: "correctiveActions",
  });

  const onSubmit = (values: CapFormValues) => {
    if (!firestore) return;

    const reportRef = doc(firestore, 'tenants', tenantId, 'safety-reports', report.id);
    const dataToSave = {
        correctiveActions: values.correctiveActions.map(action => ({
            ...action,
            deadline: action.deadline.toISOString(),
        }))
    };
    
    updateDocumentNonBlocking(reportRef, dataToSave);
    toast({
      title: 'Corrective Actions Saved',
      description: 'The Corrective Action Plan has been updated.',
    });
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        <Card>
          <CardHeader>
            <div className="flex justify-between items-center">
                <div>
                    <CardTitle>Corrective Action Plan (CAP)</CardTitle>
                    <CardDescription>Define and track actions to mitigate risks and prevent recurrence.</CardDescription>
                </div>
                 <Button type="button" variant="outline" size="sm" onClick={() => append({ id: uuidv4(), description: '', responsiblePersonId: '', deadline: new Date(), status: 'Open' })}>
                    <PlusCircle className="mr-2 h-4 w-4" /> Add Action
                </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
             {fields.map((field, index) => (
                <div key={field.id} className="grid grid-cols-1 md:grid-cols-4 items-end gap-4 p-4 border rounded-lg">
                    <FormField control={form.control} name={`correctiveActions.${index}.description`} render={({ field }) => (<FormItem className='md:col-span-4'><FormLabel>Action</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>)} />
                    <FormField control={form.control} name={`correctiveActions.${index}.responsiblePersonId`} render={({ field }) => ( <FormItem><FormLabel>Assignee</FormLabel><Select onValueChange={field.onChange} defaultValue={field.value}><FormControl><SelectTrigger><SelectValue placeholder="Assign to..." /></SelectTrigger></FormControl><SelectContent>{personnel.map(p => (<SelectItem key={p.id} value={p.id}>{p.firstName} {p.lastName}</SelectItem>))}</SelectContent></Select><FormMessage /></FormItem> )} />
                    <FormField control={form.control} name={`correctiveActions.${index}.deadline`} render={({ field }) => (<FormItem className='flex flex-col'><FormLabel>Deadline</FormLabel><Popover><PopoverTrigger asChild><FormControl><Button variant={"outline"} className={cn("pl-3 text-left font-normal", !field.value && "text-muted-foreground")}>{field.value ? format(field.value, "PPP") : <span>Pick a date</span>}<CalendarIcon className="ml-auto h-4 w-4 opacity-50" /></Button></FormControl></PopoverTrigger><PopoverContent className="w-auto p-0"><CustomCalendar selectedDate={field.value} onDateSelect={field.onChange} /></PopoverContent></Popover><FormMessage /></FormItem>)}/>
                    <FormField control={form.control} name={`correctiveActions.${index}.status`} render={({ field }) => (<FormItem><FormLabel>Status</FormLabel><Select onValueChange={field.onChange} defaultValue={field.value}><FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl><SelectContent>{['Open', 'In Progress', 'Closed', 'Cancelled'].map(s => (<SelectItem key={s} value={s}>{s}</SelectItem>))}</SelectContent></Select><FormMessage /></FormItem>)} />
                    <Button type="button" variant="destructive" size="icon" onClick={() => remove(index)}><Trash2 className="h-4 w-4" /></Button>
                </div>
             ))}
             {fields.length === 0 && (
                 <p className='text-center text-muted-foreground py-8'>No corrective actions defined.</p>
             )}
          </CardContent>
        </Card>
        <div className="flex justify-end pt-4">
            <Button type="submit">Save Corrective Actions</Button>
        </div>
      </form>
    </Form>
  );
}
