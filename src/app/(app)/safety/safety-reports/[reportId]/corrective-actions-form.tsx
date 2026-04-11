'use client';

import { useForm, useFieldArray } from 'react-hook-form';
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
import { useToast } from '@/hooks/use-toast';
import type { SafetyReport } from '@/types/safety-report';
import type { Personnel } from '@/app/(app)/users/personnel/page';
import { PlusCircle, Trash2, CalendarIcon, Save, CheckCircle2 } from 'lucide-react';
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
const correctiveActionSchema = z.object({
    id: z.string(),
    description: z.string().min(1, "Action description is required."),
    responsiblePersonId: z.string().min(1, "Assignee is required."),
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
  const { toast } = useToast();

  const form = useForm<CapFormValues>({
    resolver: zodResolver(capSchema),
    defaultValues: {
      correctiveActions: report.correctiveActions?.map(action => ({ ...action, deadline: parseLocalDate(action.deadline) })) || [],
    },
  });

  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: "correctiveActions",
  });

  const onSubmit = async (values: CapFormValues) => {
    const dataToSave = {
        correctiveActions: values.correctiveActions.map(action => ({
            ...action,
            deadline: toNoonUtcIso(action.deadline),
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
        throw new Error(payload?.error || 'Unable to save corrective actions.');
      }
      toast({ title: 'Corrective Actions Saved' });
    } catch (error) {
      toast({
        variant: 'destructive',
        title: 'Save failed',
        description: error instanceof Error ? error.message : 'Unable to save corrective actions.',
      });
    }
  };

  return (
    <div className={cn("flex flex-col h-full", !isStacked && "overflow-hidden")}>
      <div className="shrink-0 border-b bg-muted/5 p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <h3 className="text-lg font-black uppercase tracking-tight">Corrective Action Plan (CAP)</h3>
        <Button type="button" size="sm" onClick={() => append({ id: uuidv4(), description: '', responsiblePersonId: '', deadline: new Date(), status: 'Open' })} className="font-black uppercase text-xs h-9 px-6 shadow-md no-print">
            <PlusCircle className="mr-2 h-4 w-4" /> Add Action
        </Button>
      </div>
      <div className={cn("flex-1 p-0 overflow-hidden flex flex-col", isStacked && "overflow-visible h-auto")}>
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
            {!isStacked && (
                <div className="shrink-0 flex justify-end p-4 border-t bg-muted/5 gap-2 no-print">
                    <Button type="submit" className="font-black uppercase text-xs h-10 px-8 shadow-md">
                        <Save className="mr-2 h-4 w-4" /> Save Corrective Actions
                    </Button>
                </div>
            )}
          </form>
        </Form>
      </div>
    </div>
  );
}

function CapFields({ fields, form, personnel, remove }: any) {
  return (
    <>
      {fields.map((field: any, index: number) => (
          <div key={field.id} className="grid grid-cols-1 md:grid-cols-4 items-end gap-4 p-4 border rounded-lg bg-muted/10">
              <FormField control={form.control} name={`correctiveActions.${index}.description`} render={({ field }) => (
                  <FormItem className='md:col-span-4'>
                      <FormLabel className="text-[10px] font-black uppercase text-muted-foreground tracking-widest">Mitigation Action</FormLabel>
                      <FormControl><Input {...field} className="h-9 text-xs bg-background font-bold border-slate-300" /></FormControl>
                      <FormMessage />
                  </FormItem>
              )} />
              <FormField control={form.control} name={`correctiveActions.${index}.responsiblePersonId`} render={({ field }) => ( 
                  <FormItem>
                      <FormLabel className="text-[10px] font-black uppercase text-muted-foreground tracking-widest">Assignee</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                          <FormControl><SelectTrigger className="h-9 text-xs bg-background font-bold border-slate-300"><SelectValue placeholder="Assign to..." /></SelectTrigger></FormControl>
                          <SelectContent>{personnel.map((p: any) => (<SelectItem key={p.id} value={p.id} className="text-xs">{p.firstName} {p.lastName}</SelectItem>))}</SelectContent>
                      </Select>
                  </FormItem> 
              )} />
              <FormField control={form.control} name={`correctiveActions.${index}.deadline`} render={({ field }) => (
                  <FormItem className='flex flex-col'>
                      <FormLabel className="text-[10px] font-black uppercase text-muted-foreground tracking-widest">Deadline</FormLabel>
                      <Popover><PopoverTrigger asChild><FormControl><Button variant={"outline"} className={cn("h-9 pl-3 text-left font-bold bg-background text-xs border-slate-300", !field.value && "text-muted-foreground")}>{field.value ? format(field.value, "dd MMM yyyy") : <span>Date</span>}<CalendarIcon className="ml-auto h-3 w-3 opacity-50" /></Button></FormControl></PopoverTrigger><PopoverContent className="w-auto p-0"><CustomCalendar selectedDate={field.value} onDateSelect={field.onChange} /></PopoverContent></Popover>
                  </FormItem>
              )}/>
              <FormField control={form.control} name={`correctiveActions.${index}.status`} render={({ field }) => (
                  <FormItem>
                      <FormLabel className="text-[10px] font-black uppercase text-muted-foreground tracking-widest">Status</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                          <FormControl><SelectTrigger className="h-9 text-xs bg-background font-bold border-slate-300"><SelectValue /></SelectTrigger></FormControl>
                          <SelectContent>{['Open', 'In Progress', 'Closed', 'Cancelled'].map(s => (<SelectItem key={s} value={s} className="text-xs">{s}</SelectItem>))}</SelectContent>
                      </Select>
                  </FormItem>
              )} />
              <Button type="button" variant="ghost" size="icon" onClick={() => remove(index)} className="h-9 w-9 text-destructive no-print hover:bg-destructive/10"><Trash2 className="h-4 w-4" /></Button>
          </div>
      ))}
      {fields.length === 0 && (
          <div className="flex flex-col items-center justify-center py-20 text-center opacity-40">
              <CheckCircle2 className="h-12 w-12 mb-4" />
              <p className="text-sm font-black uppercase tracking-widest">No corrective actions defined.</p>
              <p className="text-xs font-medium">Add actions to mitigate identified risks and prevent recurrence.</p>
          </div>
      )}
    </>
  );
}
