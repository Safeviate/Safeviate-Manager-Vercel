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
import type { SafetyReport } from '@/types/safety-report';
import { useFirestore, updateDocumentNonBlocking } from '@/firebase';
import { doc } from 'firebase/firestore';
import type { Personnel } from '@/app/(app)/users/personnel/page';
import { PlusCircle, Trash2, CalendarIcon, Save } from 'lucide-react';
import { v4 as uuidv4 } from 'uuid';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { CustomCalendar } from '@/components/ui/custom-calendar';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import { ScrollArea } from '@/components/ui/scroll-area';

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
  isStacked?: boolean;
}

export function CorrectiveActionsForm({ report, tenantId, personnel, isStacked = false }: CorrectiveActionsFormProps) {
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
    <Card className={cn("flex flex-col shadow-none border", !isStacked && "h-[calc(100vh-300px)] overflow-hidden")}>
      <CardHeader className="shrink-0 border-b bg-muted/5">
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
      <div className={cn("flex-1 p-0 overflow-hidden", isStacked && "overflow-visible")}>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="h-full flex flex-col">
            {isStacked ? (
              <div className="p-6 space-y-4">
                <CapFields fields={fields} form={form} personnel={personnel} remove={remove} />
              </div>
            ) : (
              <ScrollArea className="flex-1 p-6">
                <div className="space-y-4">
                  <CapFields fields={fields} form={form} personnel={personnel} remove={remove} />
                </div>
              </ScrollArea>
            )}
            <div className="shrink-0 flex justify-end p-4 border-t bg-muted/5 gap-2">
              <Button type="submit">
                <Save className="mr-2 h-4 w-4" /> Save Corrective Actions
              </Button>
            </div>
          </form>
        </Form>
      </div>
    </Card>
  );
}

function CapFields({ fields, form, personnel, remove }: any) {
  return (
    <>
      {fields.map((field: any, index: number) => (
          <div key={field.id} className="grid grid-cols-1 md:grid-cols-4 items-end gap-4 p-4 border rounded-lg bg-muted/10">
              <FormField control={form.control} name={`correctiveActions.${index}.description`} render={({ field }) => (<FormItem className='md:col-span-4'><FormLabel>Action</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>)} />
              <FormField control={form.control} name={`correctiveActions.${index}.responsiblePersonId`} render={({ field }) => ( <FormItem><FormLabel>Assignee</FormLabel><Select onValueChange={field.onChange} defaultValue={field.value}><FormControl><SelectTrigger><SelectValue placeholder="Assign to..." /></SelectTrigger></FormControl><SelectContent>{personnel.map((p: any) => (<SelectItem key={p.id} value={p.id}>{p.firstName} {p.lastName}</SelectItem>))}</SelectContent></Select><FormMessage /></FormItem> )} />
              <FormField control={form.control} name={`correctiveActions.${index}.deadline`} render={({ field }) => (<FormItem className='flex flex-col'><FormLabel>Deadline</FormLabel><Popover><PopoverTrigger asChild><FormControl><Button variant={"outline"} className={cn("pl-3 text-left font-normal bg-background", !field.value && "text-muted-foreground")}>{field.value ? format(field.value, "PPP") : <span>Pick a date</span>}<CalendarIcon className="ml-auto h-4 w-4 opacity-50" /></Button></FormControl></PopoverTrigger><PopoverContent className="w-auto p-0"><CustomCalendar selectedDate={field.value} onDateSelect={field.onChange} /></PopoverContent></Popover><FormMessage /></FormItem>)}/>
              <FormField control={form.control} name={`correctiveActions.${index}.status`} render={({ field }) => (<FormItem><FormLabel>Status</FormLabel><Select onValueChange={field.onChange} defaultValue={field.value}><FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl><SelectContent>{['Open', 'In Progress', 'Closed', 'Cancelled'].map(s => (<SelectItem key={s} value={s}>{s}</SelectItem>))}</SelectContent></Select><FormMessage /></FormItem>)} />
              <Button type="button" variant="destructive" size="icon" onClick={() => remove(index)}><Trash2 className="h-4 w-4" /></Button>
          </div>
      ))}
      {fields.length === 0 && (
          <p className='text-center text-muted-foreground py-8'>No corrective actions defined.</p>
      )}
    </>
  );
}
