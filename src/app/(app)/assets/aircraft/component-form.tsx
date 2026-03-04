'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogClose } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { useFirestore } from '@/firebase';
import { addDocumentNonBlocking, updateDocumentNonBlocking } from '@/firebase/non-blocking-updates';
import { useToast } from '@/hooks/use-toast';
import { collection, doc } from 'firebase/firestore';
import type { AircraftComponent } from '@/types/aircraft';

const formSchema = z.object({
  name: z.string().min(1, 'Component name is required.'),
  manufacturer: z.string().min(1, 'Manufacturer is required.'),
  partNumber: z.string().min(1, 'Part number is required.'),
  serialNumber: z.string().min(1, 'Serial number is required.'),
  installDate: z.string().min(1, 'Install date is required.'),
  installHours: z.number({ coerce: true }).default(0),
  maxHours: z.number({ coerce: true }).default(0),
  tsn: z.number({ coerce: true }).default(0),
  tso: z.number({ coerce: true }).default(0),
  totalTime: z.number({ coerce: true }).default(0),
  notes: z.string().optional(),
});

type FormValues = z.infer<typeof formSchema>;

interface ComponentFormProps {
  tenantId: string;
  aircraftId: string;
  existingComponent?: AircraftComponent;
  trigger?: React.ReactNode;
}

export function ComponentForm({ tenantId, aircraftId, existingComponent, trigger }: ComponentFormProps) {
  const [isOpen, setIsOpen] = useState(false);
  const firestore = useFirestore();
  const { toast } = useToast();

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: existingComponent || {
      name: '',
      manufacturer: '',
      partNumber: '',
      serialNumber: '',
      installDate: new Date().toISOString().split('T')[0],
      installHours: 0,
      maxHours: 0,
      tsn: 0,
      tso: 0,
      totalTime: 0,
      notes: '',
    },
  });

  const onSubmit = async (values: FormValues) => {
    if (!firestore) return;

    try {
      const componentsRef = collection(firestore, `tenants/${tenantId}/aircrafts/${aircraftId}/components`);
      if (existingComponent) {
        const componentRef = doc(firestore, `tenants/${tenantId}/aircrafts/${aircraftId}/components`, existingComponent.id);
        updateDocumentNonBlocking(componentRef, values);
        toast({ title: 'Component Updated' });
      } else {
        addDocumentNonBlocking(componentsRef, values);
        toast({ title: 'Component Added' });
      }
      setIsOpen(false);
      form.reset();
    } catch (error: any) {
      toast({ variant: 'destructive', title: 'Error', description: error.message });
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      {trigger ? <div onClick={() => setIsOpen(true)}>{trigger}</div> : <Button onClick={() => setIsOpen(true)}>Add Component</Button>}
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>{existingComponent ? 'Edit' : 'Add'} Tracked Component</DialogTitle>
          <DialogDescription>Enter maintenance and tracking details for this aircraft component.</DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <FormField control={form.control} name="name" render={({ field }) => (<FormItem><FormLabel>Component Name</FormLabel><FormControl><Input placeholder="e.g., Propeller" {...field} /></FormControl><FormMessage /></FormItem>)} />
              <FormField control={form.control} name="manufacturer" render={({ field }) => (<FormItem><FormLabel>Manufacturer</FormLabel><FormControl><Input placeholder="e.g., McCauley" {...field} /></FormControl><FormMessage /></FormItem>)} />
              <FormField control={form.control} name="partNumber" render={({ field }) => (<FormItem><FormLabel>Part Number</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>)} />
              <FormField control={form.control} name="serialNumber" render={({ field }) => (<FormItem><FormLabel>Serial Number</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>)} />
              <FormField control={form.control} name="installDate" render={({ field }) => (<FormItem><FormLabel>Install Date</FormLabel><FormControl><Input type="date" {...field} /></FormControl><FormMessage /></FormItem>)} />
              <FormField control={form.control} name="installHours" render={({ field }) => (<FormItem><FormLabel>Hours at Install</FormLabel><FormControl><Input type="number" step="0.1" {...field} /></FormControl><FormMessage /></FormItem>)} />
              <FormField control={form.control} name="tsn" render={({ field }) => (<FormItem><FormLabel>Time Since New (TSN)</FormLabel><FormControl><Input type="number" step="0.1" {...field} /></FormControl><FormMessage /></FormItem>)} />
              <FormField control={form.control} name="tso" render={({ field }) => (<FormItem><FormLabel>Time Since Overhaul (TSO)</FormLabel><FormControl><Input type="number" step="0.1" {...field} /></FormControl><FormMessage /></FormItem>)} />
              <FormField control={form.control} name="totalTime" render={({ field }) => (<FormItem><FormLabel>Total Operating Time</FormLabel><FormControl><Input type="number" step="0.1" {...field} /></FormControl><FormMessage /></FormItem>)} />
              <FormField control={form.control} name="maxHours" render={({ field }) => (<FormItem><FormLabel>Max Hours (Limit)</FormLabel><FormControl><Input type="number" step="0.1" {...field} /></FormControl><FormMessage /></FormItem>)} />
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
