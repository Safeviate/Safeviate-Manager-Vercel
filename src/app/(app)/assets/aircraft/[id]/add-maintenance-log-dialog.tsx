'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useFirestore, addDocumentNonBlocking } from '@/firebase';
import { collection } from 'firebase/firestore';
import { useToast } from '@/hooks/use-toast';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogTrigger, DialogClose } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { PlusCircle } from 'lucide-react';

const formSchema = z.object({
  maintenanceType: z.string().min(1, 'Type is required.'),
  date: z.string().min(1, 'Date is required.'),
  details: z.string().min(5, 'Details are required.'),
  reference: z.string().optional(),
  ameNo: z.string().optional(),
  amoNo: z.string().optional(),
});

export function AddMaintenanceLogDialog({ tenantId, aircraftId }: { tenantId: string, aircraftId: string }) {
  const [isOpen, setIsOpen] = useState(false);
  const firestore = useFirestore();
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
    if (!firestore) return;
    const logsRef = collection(firestore, `tenants/${tenantId}/aircrafts/${aircraftId}/maintenanceLogs`);
    addDocumentNonBlocking(logsRef, {
        ...values,
        aircraftId,
    });
    toast({ title: 'Maintenance Log Recorded' });
    setIsOpen(false);
    form.reset();
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button size="sm">
          <PlusCircle className="mr-2 h-4 w-4" /> Add Maintenance Log
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Record Maintenance Activity</DialogTitle>
          <DialogDescription>Document inspection, repair, or component replacement details.</DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
                <FormField control={form.control} name="maintenanceType" render={({ field }) => ( <FormItem><FormLabel>Log Type</FormLabel><FormControl><Input placeholder="e.g. 50h Inspection" {...field} /></FormControl></FormItem> )} />
                <FormField control={form.control} name="date" render={({ field }) => ( <FormItem><FormLabel>Date</FormLabel><FormControl><Input type="date" {...field} /></FormControl></FormItem> )} />
            </div>
            <FormField control={form.control} name="details" render={({ field }) => ( <FormItem><FormLabel>Work Performed</FormLabel><FormControl><Textarea className="min-h-32" {...field} /></FormControl></FormItem> )} />
            <div className="grid grid-cols-2 gap-4">
                <FormField control={form.control} name="ameNo" render={({ field }) => ( <FormItem><FormLabel>AME License</FormLabel><FormControl><Input {...field} /></FormControl></FormItem> )} />
                <FormField control={form.control} name="reference" render={({ field }) => ( <FormItem><FormLabel>Reference #</FormLabel><FormControl><Input {...field} /></FormControl></FormItem> )} />
            </div>
            <DialogFooter className="pt-4">
              <DialogClose asChild><Button variant="outline">Cancel</Button></DialogClose>
              <Button type="submit">Save Log Entry</Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}