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
import { useFirestore, addDocumentNonBlocking } from '@/firebase';
import { collection } from 'firebase/firestore';
import { useToast } from '@/hooks/use-toast';
import { format } from 'date-fns';

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

export function MaintenanceForm({ tenantId, aircraftId, trigger }: MaintenanceFormProps) {
  const firestore = useFirestore();
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
    if (!firestore) return;
    const logsRef = collection(firestore, `tenants/${tenantId}/aircrafts/${aircraftId}/maintenanceLogs`);
    addDocumentNonBlocking(logsRef, { ...values, aircraftId });
    toast({ title: 'Maintenance Activity Logged' });
    setIsOpen(false);
    form.reset();
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Log Maintenance Activity</DialogTitle>
          <DialogDescription>Record a new engineering activity in the aircraft history.</DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <FormField control={form.control} name="maintenanceType" render={({ field }) => ( <FormItem><FormLabel>Maintenance Type</FormLabel><FormControl><Input placeholder="e.g. 50 Hour Inspection" {...field} /></FormControl><FormMessage /></FormItem> )} />
              <FormField control={form.control} name="date" render={({ field }) => ( <FormItem><FormLabel>Date</FormLabel><FormControl><Input type="date" {...field} /></FormControl><FormMessage /></FormItem> )} />
              <FormField control={form.control} name="reference" render={({ field }) => ( <FormItem className="col-span-2"><FormLabel>Reference (Work Order / Invoice)</FormLabel><FormControl><Input placeholder="e.g. WO-12345" {...field} /></FormControl><FormMessage /></FormItem> )} />
              <FormField control={form.control} name="details" render={({ field }) => ( <FormItem className="col-span-2"><FormLabel>Work Details</FormLabel><FormControl><Textarea placeholder="Describe the work performed..." {...field} /></FormControl><FormMessage /></FormItem> )} />
              <FormField control={form.control} name="ameNo" render={({ field }) => ( <FormItem><FormLabel>AME License No.</FormLabel><FormControl><Input placeholder="e.g. 123456" {...field} /></FormControl><FormMessage /></FormItem> )} />
              <FormField control={form.control} name="amoNo" render={({ field }) => ( <FormItem><FormLabel>AMO Number</FormLabel><FormControl><Input placeholder="e.g. 1234" {...field} /></FormControl><FormMessage /></FormItem> )} />
            </div>
            <DialogFooter>
              <DialogClose asChild><Button type="button" variant="outline">Cancel</Button></DialogClose>
              <Button type="submit">Log Activity</Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
