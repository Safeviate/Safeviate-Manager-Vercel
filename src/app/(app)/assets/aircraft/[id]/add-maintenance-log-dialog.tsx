'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useToast } from '@/hooks/use-toast';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogTrigger, DialogClose } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { PlusCircle, FileText, Calendar, PenTool } from 'lucide-react';
import type { MaintenanceLog } from '@/types/aircraft';

const formSchema = z.object({
  maintenanceType: z.string().min(1, 'Type is required.'),
  date: z.string().min(1, 'Date is required.'),
  details: z.string().min(5, 'Details are required.'),
  reference: z.string().optional(),
  ameNo: z.string().optional(),
  amoNo: z.string().optional(),
});

export function AddMaintenanceLogDialog({ aircraftId }: { tenantId: string, aircraftId: string }) {
  const [isOpen, setIsOpen] = useState(false);
  const { toast } = useToast();

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      maintenanceType: '',
      date: new Date().toISOString().substring(0, 10),
      details: '',
      reference: '',
      ameNo: '',
      amoNo: '',
    },
  });

  const onSubmit = (values: z.infer<typeof formSchema>) => {
    try {
        const logStorageKey = `safeviate.maintenance-logs.${aircraftId}`;
        const stored = localStorage.getItem(logStorageKey);
        const logs = stored ? JSON.parse(stored) as MaintenanceLog[] : [];
        
        const newLog: MaintenanceLog = {
          id: crypto.randomUUID(),
          aircraftId,
          timestamp: new Date().toISOString(),
          ...values,
        };

        const nextLogs = [newLog, ...logs];
        localStorage.setItem(logStorageKey, JSON.stringify(nextLogs));
        
        // Trigger reactive update
        window.dispatchEvent(new Event('safeviate-maintenance-logs-updated'));

        toast({ 
            title: 'Maintenance Log Recorded',
            description: `Successfully synchronized technical entry for this asset.`
        });
        
        setIsOpen(false);
        form.reset();
    } catch (e) {
        toast({ 
            variant: 'destructive', 
            title: 'Logging Failed',
            description: 'Unable to commit the maintenance entry to local storage.'
        });
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button size="sm" className="h-10 px-6 text-[10px] font-black uppercase tracking-widest shadow-md gap-2">
          <PlusCircle className="h-4 w-4" /> Add Maintenance Log
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-xl p-0 overflow-hidden rounded-3xl border-2 shadow-2xl">
        <DialogHeader className="p-8 border-b bg-muted/5">
          <DialogTitle className="text-xl font-black uppercase tracking-tight">Technical Entry</DialogTitle>
          <DialogDescription className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mt-1">
            Document inspection, repair, or component replacement details.
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6 p-8">
            <div className="grid grid-cols-2 gap-6">
                <FormField control={form.control} name="maintenanceType" render={({ field }) => ( <FormItem><FormLabel className="text-[10px] font-black uppercase tracking-widest flex items-center gap-2"><PenTool className="h-3 w-3 text-primary" /> Log Type</FormLabel><FormControl><Input className="h-10 font-bold" placeholder="e.g. 50h Inspection" {...field} /></FormControl></FormItem> )} />
                <FormField control={form.control} name="date" render={({ field }) => ( <FormItem><FormLabel className="text-[10px] font-black uppercase tracking-widest flex items-center gap-2"><Calendar className="h-3 w-3 text-primary" /> Date</FormLabel><FormControl><Input className="h-10 font-bold" type="date" {...field} /></FormControl></FormItem> )} />
            </div>
            <FormField control={form.control} name="details" render={({ field }) => ( <FormItem><FormLabel className="text-[10px] font-black uppercase tracking-widest flex items-center gap-2"><FileText className="h-3 w-3 text-primary" /> Work Performed</FormLabel><FormControl><Textarea className="min-h-32 font-medium leading-relaxed" placeholder="Detailed description of technical services..." {...field} /></FormControl></FormItem> )} />
            <div className="grid grid-cols-2 gap-6">
                <FormField control={form.control} name="ameNo" render={({ field }) => ( <FormItem><FormLabel className="text-[10px] font-black uppercase tracking-widest">AME License</FormLabel><FormControl><Input className="h-10 font-black uppercase" {...field} /></FormControl></FormItem> )} />
                <FormField control={form.control} name="reference" render={({ field }) => ( <FormItem><FormLabel className="text-[10px] font-black uppercase tracking-widest">Reference #</FormLabel><FormControl><Input className="h-10 font-mono font-bold" {...field} /></FormControl></FormItem> )} />
            </div>
            <DialogFooter className="pt-6 border-t mt-4 flex flex-row gap-3">
              <DialogClose asChild><Button type="button" variant="outline" className="flex-1 text-[10px] font-black uppercase">Cancel</Button></DialogClose>
              <Button type="submit" className="flex-1 text-[10px] font-black uppercase shadow-lg">Synchronize Log</Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}