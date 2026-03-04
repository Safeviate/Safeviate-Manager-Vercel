
'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { useFirestore, addDocumentNonBlocking } from '@/firebase';
import { collection } from 'firebase/firestore';
import { useToast } from '@/hooks/use-toast';
import { v4 as uuidv4 } from 'uuid';

const componentSchema = z.object({
  name: z.string().min(1, 'Name is required.'),
  manufacturer: z.string().min(1, 'Manufacturer is required.'),
  serialNumber: z.string().min(1, 'Serial Number is required.'),
  installDate: z.string().min(1, 'Install Date is required.'),
  tsn: z.number({ coerce: true }).default(0),
  tso: z.number({ coerce: true }).default(0),
  totalTime: z.number({ coerce: true }).default(0),
});

type FormValues = z.infer<typeof componentSchema>;

interface ComponentFormProps {
  aircraftId: string;
  tenantId: string;
  onSuccess: () => void;
}

export function ComponentForm({ aircraftId, tenantId, onSuccess }: ComponentFormProps) {
  const firestore = useFirestore();
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const form = useForm<FormValues>({
    resolver: zodResolver(componentSchema),
    defaultValues: {
      name: '',
      manufacturer: '',
      serialNumber: '',
      installDate: new Date().toISOString().split('T')[0],
      tsn: 0,
      tso: 0,
      totalTime: 0,
    },
  });

  const onSubmit = async (values: FormValues) => {
    if (!firestore) return;
    setIsSubmitting(true);

    try {
      const componentsRef = collection(firestore, `tenants/${tenantId}/aircrafts/${aircraftId}/components`);
      addDocumentNonBlocking(componentsRef, { ...values, id: uuidv4() });
      toast({ title: 'Component Added' });
      onSuccess();
    } catch (error: any) {
      toast({ variant: 'destructive', title: 'Error', description: error.message });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        <FormField control={form.control} name="name" render={({ field }) => (<FormItem><FormLabel>Component Name</FormLabel><FormControl><Input placeholder="e.g., Engine #1" {...field} /></FormControl><FormMessage /></FormItem>)} />
        <div className="grid grid-cols-2 gap-4">
          <FormField control={form.control} name="manufacturer" render={({ field }) => (<FormItem><FormLabel>Manufacturer</FormLabel><FormControl><Input placeholder="e.g., Lycoming" {...field} /></FormControl><FormMessage /></FormItem>)} />
          <FormField control={form.control} name="serialNumber" render={({ field }) => (<FormItem><FormLabel>Serial Number</FormLabel><FormControl><Input placeholder="e.g., L-12345-67" {...field} /></FormControl><FormMessage /></FormItem>)} />
        </div>
        <FormField control={form.control} name="installDate" render={({ field }) => (<FormItem><FormLabel>Install Date</FormLabel><FormControl><Input type="date" {...field} /></FormControl><FormMessage /></FormItem>)} />
        <div className="grid grid-cols-3 gap-4">
          <FormField control={form.control} name="tsn" render={({ field }) => (<FormItem><FormLabel>TSN</FormLabel><FormControl><Input type="number" step="0.1" {...field} /></FormControl></FormItem>)} />
          <FormField control={form.control} name="tso" render={({ field }) => (<FormItem><FormLabel>TSO</FormLabel><FormControl><Input type="number" step="0.1" {...field} /></FormControl></FormItem>)} />
          <FormField control={form.control} name="totalTime" render={({ field }) => (<FormItem><FormLabel>Total Time</FormLabel><FormControl><Input type="number" step="0.1" {...field} /></FormControl></FormItem>)} />
        </div>
        <div className="flex justify-end pt-4">
          <Button type="submit" disabled={isSubmitting}>{isSubmitting ? 'Saving...' : 'Add Component'}</Button>
        </div>
      </form>
    </Form>
  );
}
