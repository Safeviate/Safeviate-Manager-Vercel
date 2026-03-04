
'use client';

import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
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
import { useToast } from '@/hooks/use-toast';
import { collection, doc } from 'firebase/firestore';
import type { AircraftComponent } from '@/types/aircraft';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogClose } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';

const componentFormSchema = z.object({
  name: z.string().min(1, 'Component name is required'),
  manufacturer: z.string().min(1, 'Manufacturer is required'),
  partNumber: z.string().min(1, 'Part number is required'),
  serialNumber: z.string().min(1, 'Serial number is required'),
  installDate: z.string().min(1, 'Install date is required'),
  installHours: z.number({ coerce: true }).min(0),
  maxHours: z.number({ coerce: true }).min(0),
  tsn: z.number({ coerce: true }).min(0),
  tso: z.number({ coerce: true }).min(0),
  totalTime: z.number({ coerce: true }).min(0),
  notes: z.string().optional(),
});

type ComponentFormValues = z.infer<typeof componentFormSchema>;

interface ComponentFormProps {
  isOpen: boolean;
  setIsOpen: (open: boolean) => void;
  tenantId: string;
  aircraftId: string;
  existingComponent?: AircraftComponent | null;
}

export function ComponentForm({ isOpen, setIsOpen, tenantId, aircraftId, existingComponent }: ComponentFormProps) {
  const firestore = useFirestore();
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const form = useForm<ComponentFormValues>({
    resolver: zodResolver(componentFormSchema),
    defaultValues: {
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

  useEffect(() => {
    if (existingComponent && isOpen) {
      form.reset({
        ...existingComponent,
        installDate: existingComponent.installDate.split('T')[0],
      });
    } else if (isOpen) {
      form.reset({
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
      });
    }
  }, [existingComponent, isOpen, form]);

  const onSubmit = async (values: ComponentFormValues) => {
    if (!firestore) return;
    setIsSubmitting(true);

    try {
      const componentsCol = collection(firestore, 'tenants', tenantId, 'aircrafts', aircraftId, 'components');
      if (existingComponent) {
        const compRef = doc(componentsCol, existingComponent.id);
        updateDocumentNonBlocking(compRef, values);
        toast({ title: 'Component Updated' });
      } else {
        addDocumentNonBlocking(componentsCol, values);
        toast({ title: 'Component Added' });
      }
      setIsOpen(false);
    } catch (error: any) {
      toast({ variant: 'destructive', title: 'Error', description: error.message });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>{existingComponent ? 'Edit Component' : 'Add Tracked Component'}</DialogTitle>
          <DialogDescription>Track maintenance lifecycle for this aircraft part.</DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <FormField control={form.control} name="name" render={({ field }) => (<FormItem><FormLabel>Component Name</FormLabel><FormControl><Input placeholder="Engine #1" {...field} /></FormControl><FormMessage /></FormItem>)} />
              <FormField control={form.control} name="manufacturer" render={({ field }) => (<FormItem><FormLabel>Manufacturer</FormLabel><FormControl><Input placeholder="Lycoming" {...field} /></FormControl><FormMessage /></FormItem>)} />
              <FormField control={form.control} name="partNumber" render={({ field }) => (<FormItem><FormLabel>Part Number</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>)} />
              <FormField control={form.control} name="serialNumber" render={({ field }) => (<FormItem><FormLabel>Serial Number</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>)} />
              <FormField control={form.control} name="installDate" render={({ field }) => (<FormItem><FormLabel>Install Date</FormLabel><FormControl><Input type="date" {...field} /></FormControl><FormMessage /></FormItem>)} />
              <FormField control={form.control} name="maxHours" render={({ field }) => (<FormItem><FormLabel>TBO / Max Hours</FormLabel><FormControl><Input type="number" {...field} /></FormControl><FormMessage /></FormItem>)} />
            </div>
            <div className="grid grid-cols-3 gap-4 border-t pt-4">
              <FormField control={form.control} name="tsn" render={({ field }) => (<FormItem><FormLabel>TSN (Time Since New)</FormLabel><FormControl><Input type="number" step="0.1" {...field} /></FormControl></FormItem>)} />
              <FormField control={form.control} name="tso" render={({ field }) => (<FormItem><FormLabel>TSO (Time Since Overhaul)</FormLabel><FormControl><Input type="number" step="0.1" {...field} /></FormControl></FormItem>)} />
              <FormField control={form.control} name="totalTime" render={({ field }) => (<FormItem><FormLabel>Total Time</FormLabel><FormControl><Input type="number" step="0.1" {...field} /></FormControl></FormItem>)} />
            </div>
            <FormField control={form.control} name="notes" render={({ field }) => (<FormItem><FormLabel>Notes</FormLabel><FormControl><Textarea {...field} /></FormControl></FormItem>)} />
            <DialogFooter>
              <DialogClose asChild><Button variant="outline" disabled={isSubmitting}>Cancel</Button></DialogClose>
              <Button type="submit" disabled={isSubmitting}>Save Component</Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
