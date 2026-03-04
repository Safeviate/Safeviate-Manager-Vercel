
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
import { useFirestore, addDocumentNonBlocking, updateDocumentNonBlocking } from '@/firebase';
import { collection, doc } from 'firebase/firestore';
import { useToast } from '@/hooks/use-toast';
import type { AircraftComponent } from '@/types/aircraft';
import { format } from 'date-fns';

const formSchema = z.object({
  name: z.string().min(1, 'Component name is required'),
  manufacturer: z.string().min(1, 'Manufacturer is required'),
  serialNumber: z.string().min(1, 'Serial number is required'),
  installDate: z.string().min(1, 'Install date is required'),
  tsn: z.number({ coerce: true }).min(0),
  tso: z.number({ coerce: true }).min(0),
  totalTime: z.number({ coerce: true }).min(0),
  notes: z.string().optional(),
});

type FormValues = z.infer<typeof formSchema>;

interface ComponentFormProps {
  aircraftId: string;
  tenantId: string;
  existingComponent?: AircraftComponent;
  trigger?: React.ReactNode;
}

export function ComponentForm({ aircraftId, tenantId, existingComponent, trigger }: ComponentFormProps) {
  const firestore = useFirestore();
  const { toast } = useToast();
  const [isOpen, setIsOpen] = useState(false);

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: existingComponent ? {
      name: existingComponent.name,
      manufacturer: existingComponent.manufacturer,
      serialNumber: existingComponent.serialNumber,
      installDate: existingComponent.installDate ? format(new Date(existingComponent.installDate), 'yyyy-MM-dd') : '',
      tsn: existingComponent.tsn || 0,
      tso: existingComponent.tso || 0,
      totalTime: existingComponent.totalTime || 0,
      notes: existingComponent.notes || '',
    } : {
      name: '',
      manufacturer: '',
      serialNumber: '',
      installDate: format(new Date(), 'yyyy-MM-dd'),
      tsn: 0,
      tso: 0,
      totalTime: 0,
      notes: '',
    },
  });

  const onSubmit = (values: FormValues) => {
    if (!firestore) return;

    if (existingComponent) {
      const compRef = doc(firestore, `tenants/${tenantId}/aircrafts/${aircraftId}/components`, existingComponent.id);
      updateDocumentNonBlocking(compRef, values);
      toast({ title: 'Component updated' });
    } else {
      const compCollection = collection(firestore, `tenants/${tenantId}/aircrafts/${aircraftId}/components`);
      addDocumentNonBlocking(compCollection, values);
      toast({ title: 'Component added' });
    }
    setIsOpen(false);
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      {trigger && <DialogTrigger asChild>{trigger}</DialogTrigger>}
      <DialogContent className="max-w-xl">
        <DialogHeader>
          <DialogTitle>{existingComponent ? 'Edit' : 'Add'} Component</DialogTitle>
          <DialogDescription>
            Enter the tracking and maintenance details for the aircraft component.
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <FormField control={form.control} name="name" render={({ field }) => ( <FormItem><FormLabel>Component Name</FormLabel><FormControl><Input placeholder="Engine #1" {...field} /></FormControl><FormMessage /></FormItem> )} />
              <FormField control={form.control} name="manufacturer" render={({ field }) => ( <FormItem><FormLabel>Manufacturer</FormLabel><FormControl><Input placeholder="Lycoming" {...field} /></FormControl><FormMessage /></FormItem> )} />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <FormField control={form.control} name="serialNumber" render={({ field }) => ( <FormItem><FormLabel>Serial Number</FormLabel><FormControl><Input placeholder="SN-12345" {...field} /></FormControl><FormMessage /></FormItem> )} />
              <FormField control={form.control} name="installDate" render={({ field }) => ( <FormItem><FormLabel>Install Date</FormLabel><FormControl><Input type="date" {...field} /></FormControl><FormMessage /></FormItem> )} />
            </div>
            <div className="grid grid-cols-3 gap-4 p-4 border rounded-lg bg-muted/20">
              <FormField control={form.control} name="tsn" render={({ field }) => ( <FormItem><FormLabel className="text-xs">TSN</FormLabel><FormControl><Input type="number" step="0.1" {...field} /></FormControl></FormItem> )} />
              <FormField control={form.control} name="tso" render={({ field }) => ( <FormItem><FormLabel className="text-xs">TSO</FormLabel><FormControl><Input type="number" step="0.1" {...field} /></FormControl></FormItem> )} />
              <FormField control={form.control} name="totalTime" render={({ field }) => ( <FormItem><FormLabel className="text-xs">Total Time</FormLabel><FormControl><Input type="number" step="0.1" {...field} /></FormControl></FormItem> )} />
            </div>
            <DialogFooter>
              <DialogClose asChild><Button variant="outline">Cancel</Button></DialogClose>
              <Button type="submit">Save Component</Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
