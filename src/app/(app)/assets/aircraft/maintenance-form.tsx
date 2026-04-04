'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogClose,
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
import { useToast } from '@/hooks/use-toast';
import { format } from 'date-fns';
import { History, ClipboardCheck } from 'lucide-react';
import type { MaintenanceLog } from '@/types/maintenance';

const logSchema = z.object({
  maintenanceType: z.string().min(1, 'Maintenance type is required.'),
  date: z.string().min(1, 'Date is required.'),
  details: z.string().min(1, 'Details are required.'),
  reference: z.string().min(1, 'Reference is required.'),
  ameNo: z.string().min(1, 'AME license is required.'),
  amoNo: z.string().min(1, 'AMO number is required.'),
});

type FormValues = z.infer<typeof logSchema>;

interface MaintenanceFormProps {
  tenantId: string;
  aircraftId: string;
  trigger: React.ReactNode;
}

export function MaintenanceForm({ aircraftId, trigger }: MaintenanceFormProps) {
  const { toast } = useToast();
  const [isOpen, setIsOpen] = useState(false);

  const form = useForm<FormValues>({
    resolver: zodResolver(logSchema),
    defaultValues: {
      maintenanceType: '',
      date: format(new Date(), 'yyyy-MM-dd'),
      details: '',
      reference: '',
      ameNo: '',
      amoNo: '',
    },
  });

  const onSubmit = (values: FormValues) => {
    try {
        const key = `safeviate.maintenance-logs:${aircraftId}`;
        const stored = localStorage.getItem(key);
        const logs = stored ? JSON.parse(stored) as MaintenanceLog[] : [];
        
        const newLog: MaintenanceLog = {
            ...values,
            id: crypto.randomUUID(),
            aircraftId,
            createdAt: new Date().toISOString(),
        };

        const nextLogs = [newLog, ...logs];
        localStorage.setItem(key, JSON.stringify(nextLogs));
        window.dispatchEvent(new Event(`safeviate-maintenance-logs-updated:${aircraftId}`));

        toast({ title: 'Maintenance Activity Logged', description: `Activity registered under WO ${values.reference}. Aircraft history updated.` });
        setIsOpen(false);
        form.reset();
    } catch (e) {
        toast({ variant: 'destructive', title: 'Error', description: 'Failed to record maintenance activity.' });
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent className="max-w-2xl rounded-3xl p-8">
        <DialogHeader>
          <DialogTitle className="text-xl font-black uppercase tracking-tight flex items-center gap-2">
            <ClipboardCheck className="h-5 w-5 text-primary" />
            Certify Maintenance Activity
          </DialogTitle>
          <DialogDescription className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Record a new engineering activity into the permanent airframe history.</DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6 pt-4">
            <div className="grid grid-cols-2 gap-6">
              <FormField control={form.control} name="maintenanceType" render={({ field }) => ( 
                <FormItem><FormLabel className="text-[10px] font-black uppercase tracking-widest opacity-70">Category / Type</FormLabel><FormControl><Input placeholder="e.g. 50 Hour Inspection" className="h-11 font-black uppercase" {...field} /></FormControl><FormMessage /></FormItem> 
              )} />
              <FormField control={form.control} name="date" render={({ field }) => ( 
                <FormItem><FormLabel className="text-[10px] font-black uppercase tracking-widest opacity-70">Certification Date</FormLabel><FormControl><Input type="date" className="h-11 font-bold" {...field} /></FormControl><FormMessage /></FormItem> 
              )} />
              <FormField control={form.control} name="reference" render={({ field }) => ( 
                <FormItem className="col-span-2"><FormLabel className="text-[10px] font-black uppercase tracking-widest opacity-70">Reference (Work Order / CRS #)</FormLabel><FormControl><Input placeholder="e.g. WO-12345" className="h-11 font-mono font-bold uppercase" {...field} /></FormControl><FormMessage /></FormItem> 
              )} />
              <FormField control={form.control} name="details" render={({ field }) => ( 
                <FormItem className="col-span-2"><FormLabel className="text-[10px] font-black uppercase tracking-widest opacity-70">Engineering Work Details</FormLabel><FormControl><Textarea placeholder="Describe the specific work performed and parts replaced..." className="min-h-[120px] font-medium p-4" {...field} /></FormControl><FormMessage /></FormItem> 
              )} />
              <FormField control={form.control} name="ameNo" render={({ field }) => ( 
                <FormItem><FormLabel className="text-[10px] font-black uppercase tracking-widest opacity-70">AME License No.</FormLabel><FormControl><Input placeholder="e.g. 123456" className="h-11 font-mono font-bold" {...field} /></FormControl><FormMessage /></FormItem> 
              )} />
              <FormField control={form.control} name="amoNo" render={({ field }) => ( 
                <FormItem><FormLabel className="text-[10px] font-black uppercase tracking-widest opacity-70">AMO Number</FormLabel><FormControl><Input placeholder="e.g. 1234" className="h-11 font-mono font-bold" {...field} /></FormControl><FormMessage /></FormItem> 
              )} />
            </div>
            <DialogFooter className="pt-4">
              <DialogClose asChild><Button type="button" variant="outline" className="h-11 px-10 text-[10px] font-black uppercase border-slate-300">Discard Entry</Button></DialogClose>
              <Button type="submit" className="h-11 px-10 text-[10px] font-black uppercase shadow-lg">Certify & Log Activity</Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
