'use client';

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogDescription, 
  DialogFooter, 
  DialogClose,
  DialogTrigger
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import type { MaintenanceLog } from '@/types/aircraft';

const logSchema = z.object({
  maintenanceType: z.string().min(1, "Maintenance type is required"),
  date: z.string().min(1, "Date is required"),
  details: z.string().min(1, "Work details are required"),
  reference: z.string().optional(),
  ameNo: z.string().min(1, "AME number is required"),
  amoNo: z.string().min(1, "AMO number is required"),
});

type FormValues = z.infer<typeof logSchema>;

interface MaintenanceLogFormProps {
  aircraftId: string;
  isOpen: boolean;
  setIsOpen: (open: boolean) => void;
  trigger?: React.ReactNode;
}

export function MaintenanceLogForm({ aircraftId, isOpen, setIsOpen, trigger }: MaintenanceLogFormProps) {
  const { toast } = useToast();

  const form = useForm<FormValues>({
    resolver: zodResolver(logSchema),
    defaultValues: {
      maintenanceType: 'Routine Inspection',
      date: new Date().toISOString().split('T')[0],
      details: '',
      reference: '',
      ameNo: '',
      amoNo: '',
    },
  });

  const onSubmit = (values: FormValues) => {
    try {
        const logStorageKey = `safeviate.maintenance-logs.${aircraftId}`;
        const stored = localStorage.getItem(logStorageKey);
        const logs = stored ? JSON.parse(stored) as MaintenanceLog[] : [];
        
        const newLog: MaintenanceLog = {
          id: crypto.randomUUID(),
          ...values,
          aircraftId,
          timestamp: new Date().toISOString(),
        };

        const nextLogs = [newLog, ...logs];
        localStorage.setItem(logStorageKey, JSON.stringify(nextLogs));
        
        // Trigger reactive update for the log list
        window.dispatchEvent(new Event('safeviate-maintenance-logs-updated'));

        toast({ 
          title: "Maintenance Logged", 
          description: `Successfully recorded ${values.maintenanceType} for this asset.` 
        });
        
        setIsOpen(false);
        form.reset();
    } catch (e) {
        toast({ 
          variant: 'destructive', 
          title: "Logging Failed", 
          description: "Unable to save the maintenance entry to local storage." 
        });
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      {trigger && <DialogTrigger asChild>{trigger}</DialogTrigger>}
      <DialogContent className="sm:max-w-xl max-h-[90vh] flex flex-col p-0 overflow-hidden rounded-3xl border-2">
        <DialogHeader className="p-8 border-b bg-muted/5">
          <DialogTitle className="text-xl font-black uppercase tracking-tight">Record Technical Activity</DialogTitle>
          <DialogDescription className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Log airworthiness certifications, defects, and maintenance actions.</DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6 flex-1 overflow-auto p-8">
            <div className="grid grid-cols-2 gap-6">
              <FormField control={form.control} name="maintenanceType" render={({ field }) => ( <FormItem><FormLabel className="text-[10px] font-black uppercase tracking-widest">Activity Category</FormLabel><FormControl><Input className="h-10 font-bold" placeholder="e.g. 100hr Inspection" {...field} /></FormControl><FormMessage /></FormItem> )} />
              <FormField control={form.control} name="date" render={({ field }) => ( <FormItem><FormLabel className="text-[10px] font-black uppercase tracking-widest">Completion Date</FormLabel><FormControl><Input className="h-10 font-bold" type="date" {...field} /></FormControl><FormMessage /></FormItem> )} />
            </div>
            <FormField control={form.control} name="details" render={({ field }) => ( <FormItem><FormLabel className="text-[10px] font-black uppercase tracking-widest">Statement of Work</FormLabel><FormControl><Textarea className="min-h-[120px] font-medium leading-relaxed" placeholder="Detailed description of compliance, parts replaced, and inspections performed..." {...field} /></FormControl><FormMessage /></FormItem> )} />
            <FormField control={form.control} name="reference" render={({ field }) => ( <FormItem><FormLabel className="text-[10px] font-black uppercase tracking-widest">Job Reference / Release #</FormLabel><FormControl><Input className="h-10 font-mono font-bold" placeholder="e.g. CRT-123-SAFE" {...field} /></FormControl><FormMessage /></FormItem> )} />
            <div className="grid grid-cols-2 gap-6 pt-2">
              <FormField control={form.control} name="ameNo" render={({ field }) => ( <FormItem><FormLabel className="text-[10px] font-black uppercase tracking-widest">AME License Auth</FormLabel><FormControl><Input className="h-10 font-black uppercase" {...field} /></FormControl><FormMessage /></FormItem> )} />
              <FormField control={form.control} name="amoNo" render={({ field }) => ( <FormItem><FormLabel className="text-[10px] font-black uppercase tracking-widest">AMO Approval Auth</FormLabel><FormControl><Input className="h-10 font-black uppercase" {...field} /></FormControl><FormMessage /></FormItem> )} />
            </div>
            <DialogFooter className="pt-6 border-t mt-8">
              <DialogClose asChild><Button type="button" variant="outline" className="text-[10px] font-black uppercase">Cancel</Button></DialogClose>
              <Button type="submit" className="text-[10px] font-black uppercase px-8 shadow-lg">Commence Entry</Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
