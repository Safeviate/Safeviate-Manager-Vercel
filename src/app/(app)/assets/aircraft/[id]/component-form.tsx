
'use client';

import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogClose } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { useFirestore } from '@/firebase';
import { useToast } from '@/hooks/use-toast';
import { doc, collection } from 'firebase/firestore';
import { addDocumentNonBlocking, updateDocumentNonBlocking } from '@/firebase/non-blocking-updates';
import type { AircraftComponent } from '@/types/aircraft';
import { format } from 'date-fns';

const componentFormSchema = z.object({
  name: z.string().min(1, 'Component name is required.'),
  manufacturer: z.string().min(1, 'Manufacturer is required.'),
  partNumber: z.string().min(1, 'Part number is required.'),
  serialNumber: z.string().min(1, 'Serial number is required.'),
  installDate: z.string().min(1, 'Install date is required.'),
  installHours: z.number({ coerce: true }).min(0),
  tsn: z.number({ coerce: true }).min(0),
  tso: z.number({ coerce: true }).min(0),
  totalTime: z.number({ coerce: true }).min(0),
  maxHours: z.number({ coerce: true }).optional(),
  notes: z.string().optional(),
});

type ComponentFormValues = z.infer<typeof componentFormSchema>;

interface ComponentFormProps {
  isOpen: boolean;
  onClose: () => void;
  aircraftId: string;
  tenantId: string;
  existingComponent?: AircraftComponent | null;
}

export function ComponentForm({ isOpen, onClose, aircraftId, tenantId, existingComponent }: ComponentFormProps) {
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
      installDate: format(new Date(), 'yyyy-MM-dd'),
      installHours: 0,
      tsn: 0,
      tso: 0,
      totalTime: 0,
      maxHours: 0,
      notes: '',
    },
  });

  useEffect(() => {
    if (isOpen && existingComponent) {
      form.reset({
        ...existingComponent,
        installDate: existingComponent.installDate ? format(new Date(existingComponent.installDate), 'yyyy-MM-dd') : format(new Date(), 'yyyy-MM-dd'),
      });
    } else if (isOpen) {
      form.reset({
        name: '',
        manufacturer: '',
        partNumber: '',
        serialNumber: '',
        installDate: format(new Date(), 'yyyy-MM-dd'),
        installHours: 0,
        tsn: 0,
        tso: 0,
        totalTime: 0,
        maxHours: 0,
        notes: '',
      });
    }
  }, [isOpen, existingComponent, form]);

  const onSubmit = async (data: ComponentFormValues) => {
    if (!firestore) return;
    setIsSubmitting(true);

    try {
      const componentsCol = collection(firestore, `tenants/${tenantId}/aircrafts/${aircraftId}/components`);
      
      if (existingComponent) {
        const compRef = doc(firestore, `tenants/${tenantId}/aircrafts/${aircraftId}/components`, existingComponent.id);
        updateDocumentNonBlocking(compRef, data);
        toast({ title: 'Component Updated' });
      } else {
        addDocumentNonBlocking(componentsCol, data);
        toast({ title: 'Component Added' });
      }
      onClose();
    } catch (error: any) {
      toast({ variant: 'destructive', title: 'Error', description: error.message });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>{existingComponent ? 'Edit Component' : 'Add New Component'}</DialogTitle>
          <DialogDescription>Track serial numbers and lifed hours for aircraft parts.</DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <FormField control={form.control} name="name" render={({ field }) => ( <FormItem><FormLabel>Component Name</FormLabel><FormControl><Input placeholder="e.g., Engine #1" {...field} /></FormControl><FormMessage /></FormItem> )} />
              <FormField control={form.control} name="manufacturer" render={({ field }) => ( <FormItem><FormLabel>Manufacturer</FormLabel><FormControl><Input placeholder="e.g., Lycoming" {...field} /></FormControl><FormMessage /></FormItem> )} />
              <FormField control={form.control} name="partNumber" render={({ field }) => ( <FormItem><FormLabel>Part Number</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem> )} />
              <FormField control={form.control} name="serialNumber" render={({ field }) => ( <FormItem><FormLabel>Serial Number</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem> )} />
              <FormField control={form.control} name="installDate" render={({ field }) => ( <FormItem><FormLabel>Install Date</FormLabel><FormControl><Input type="date" {...field} /></FormControl><FormMessage /></FormItem> )} />
              <FormField control={form.control} name="installHours" render={({ field }) => ( <FormItem><FormLabel>A/C Hours at Install</FormLabel><FormControl><Input type="number" step="0.1" {...field} /></FormControl><FormMessage /></FormItem> )} />
            </div>
            <div className="grid grid-cols-3 gap-4 border-t pt-4">
              <FormField control={form.control} name="tsn" render={({ field }) => ( <FormItem><FormLabel>TSN</FormLabel><FormControl><Input type="number" step="0.1" {...field} /></FormControl><FormMessage /></FormItem> )} />
              <FormField control={form.control} name="tso" render={({ field }) => ( <FormItem><FormLabel>TSO</FormLabel><FormControl><Input type="number" step="0.1" {...field} /></FormControl><FormMessage /></FormItem> )} />
              <FormField control={form.control} name="totalTime" render={({ field }) => ( <FormItem><FormLabel>Total Time</FormLabel><FormControl><Input type="number" step="0.1" {...field} /></FormControl><FormMessage /></FormItem> )} />
            </div>
            <FormField control={form.control} name="notes" render={({ field }) => ( <FormItem><FormLabel>Notes</FormLabel><FormControl><Textarea {...field} /></FormControl></FormItem> )} />
            <DialogFooter className="pt-4">
              <DialogClose asChild><Button variant="outline">Cancel</Button></DialogClose>
              <Button type="submit" disabled={isSubmitting}>{isSubmitting ? 'Saving...' : 'Save Component'}</Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
