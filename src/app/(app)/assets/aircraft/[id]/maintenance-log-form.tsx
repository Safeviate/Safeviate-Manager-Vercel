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
import { useFirestore, addDocumentNonBlocking } from '@/firebase';
import { collection } from 'firebase/firestore';
import { useToast } from '@/hooks/use-toast';

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
  tenantId: string;
  aircraftId: string;
  isOpen: boolean;
  setIsOpen: (open: boolean) => void;
  trigger?: React.ReactNode;
}

export function MaintenanceLogForm({ tenantId, aircraftId, isOpen, setIsOpen, trigger }: MaintenanceLogFormProps) {
  const firestore = useFirestore();
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
    if (!firestore) return;
    const logsRef = collection(firestore, 'tenants', tenantId, 'aircrafts', aircraftId, 'maintenanceLogs');
    
    addDocumentNonBlocking(logsRef, {
      ...values,
      aircraftId,
    });

    toast({ title: "Maintenance Logged" });
    setIsOpen(false);
    form.reset();
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      {trigger && <DialogTrigger asChild>{trigger}</DialogTrigger>}
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Log Maintenance Activity</DialogTitle>
          <DialogDescription>Record maintenance actions and compliance data.</DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <FormField control={form.control} name="maintenanceType" render={({ field }) => ( <FormItem><FormLabel>Activity Type</FormLabel><FormControl><Input placeholder="e.g. 100hr Inspection" {...field} /></FormControl><FormMessage /></FormItem> )} />
              <FormField control={form.control} name="date" render={({ field }) => ( <FormItem><FormLabel>Completion Date</FormLabel><FormControl><Input type="date" {...field} /></FormControl><FormMessage /></FormItem> )} />
            </div>
            <FormField control={form.control} name="details" render={({ field }) => ( <FormItem><FormLabel>Work Details</FormLabel><FormControl><Textarea placeholder="Comprehensive description of work performed..." {...field} /></FormControl><FormMessage /></FormItem> )} />
            <FormField control={form.control} name="reference" render={({ field }) => ( <FormItem><FormLabel>Reference Number</FormLabel><FormControl><Input placeholder="e.g. Job Card #123" {...field} /></FormControl><FormMessage /></FormItem> )} />
            <div className="grid grid-cols-2 gap-4">
              <FormField control={form.control} name="ameNo" render={({ field }) => ( <FormItem><FormLabel>AME License No</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem> )} />
              <FormField control={form.control} name="amoNo" render={({ field }) => ( <FormItem><FormLabel>AMO Approval No</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem> )} />
            </div>
            <DialogFooter>
              <DialogClose asChild><Button variant="outline">Cancel</Button></DialogClose>
              <Button type="submit">Record Entry</Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
