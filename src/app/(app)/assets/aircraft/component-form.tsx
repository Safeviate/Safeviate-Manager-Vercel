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
import { useFirestore, addDocumentNonBlocking } from '@/firebase';
import { collection } from 'firebase/firestore';
import { useToast } from '@/hooks/use-toast';
import { format } from 'date-fns';

const componentSchema = z.object({
  name: z.string().min(1, 'Component name is required.'),
  manufacturer: z.string().min(1, 'Manufacturer is required.'),
  serialNumber: z.string().min(1, 'Serial number is required.'),
  installDate: z.string().min(1, 'Install date is required.'),
  tsn: z.number({ coerce: true }).default(0),
  tso: z.number({ coerce: true }).default(0),
  totalTime: z.number({ coerce: true }).default(0),
});

type FormValues = z.infer<typeof componentSchema>;

interface ComponentFormProps {
  tenantId: string;
  aircraftId: string;
  trigger: React.ReactNode;
}

export function ComponentForm({ tenantId, aircraftId, trigger }: ComponentFormProps) {
  const firestore = useFirestore();
  const { toast } = useToast();
  const [isOpen, setIsOpen] = useState(false);

  const form = useForm<FormValues>({
    resolver: zodResolver(componentSchema),
    defaultValues: {
      name: '',
      manufacturer: '',
      serialNumber: '',
      installDate: format(new Date(), 'yyyy-MM-dd'),
      tsn: 0,
      tso: 0,
      totalTime: 0,
    },
  });

  const onSubmit = (values: FormValues) => {
    if (!firestore) return;
    const componentsRef = collection(firestore, `tenants/${tenantId}/aircrafts/${aircraftId}/components`);
    addDocumentNonBlocking(componentsRef, values);
    toast({ title: 'Component Added' });
    setIsOpen(false);
    form.reset();
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Add Tracked Component</DialogTitle>
          <DialogDescription>Register a new life-limited part for this aircraft.</DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <FormField control={form.control} name="name" render={({ field }) => ( <FormItem className="col-span-2"><FormLabel>Component Name</FormLabel><FormControl><Input placeholder="e.g. Lycoming IO-360-L2A" {...field} /></FormControl><FormMessage /></FormItem> )} />
              <FormField control={form.control} name="manufacturer" render={({ field }) => ( <FormItem><FormLabel>Manufacturer</FormLabel><FormControl><Input placeholder="e.g. Lycoming" {...field} /></FormControl><FormMessage /></FormItem> )} />
              <FormField control={form.control} name="serialNumber" render={({ field }) => ( <FormItem><FormLabel>Serial Number</FormLabel><FormControl><Input placeholder="e.g. L-12345-51A" {...field} /></FormControl><FormMessage /></FormItem> )} />
              <FormField control={form.control} name="installDate" render={({ field }) => ( <FormItem><FormLabel>Install Date</FormLabel><FormControl><Input type="date" {...field} /></FormControl><FormMessage /></FormItem> )} />
              <FormField control={form.control} name="tsn" render={({ field }) => ( <FormItem><FormLabel>Time Since New (TSN)</FormLabel><FormControl><Input type="number" step="0.1" {...field} /></FormControl><FormMessage /></FormItem> )} />
              <FormField control={form.control} name="tso" render={({ field }) => ( <FormItem><FormLabel>Time Since Overhaul (TSO)</FormLabel><FormControl><Input type="number" step="0.1" {...field} /></FormControl><FormMessage /></FormItem> )} />
              <FormField control={form.control} name="totalTime" render={({ field }) => ( <FormItem><FormLabel>Total Service Time</FormLabel><FormControl><Input type="number" step="0.1" {...field} /></FormControl><FormMessage /></FormItem> )} />
            </div>
            <DialogFooter>
              <DialogClose asChild><Button type="button" variant="outline">Cancel</Button></DialogClose>
              <Button type="submit">Register Component</Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
