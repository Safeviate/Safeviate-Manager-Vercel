'use client';

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useFirestore, addDocumentNonBlocking, updateDocumentNonBlocking } from '@/firebase';
import { doc, collection } from 'firebase/firestore';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import type { AircraftComponent } from '@/types/aircraft';

const formSchema = z.object({
  name: z.string().min(1, 'Component name is required.'),
  partNumber: z.string().min(1, 'Part number is required.'),
  serialNumber: z.string().optional(),
  installDate: z.string().optional(),
  installHours: z.number({ coerce: true }).optional(),
  maxHours: z.number({ coerce: true }).optional(),
  notes: z.string().optional(),
});

type FormValues = z.infer<typeof formSchema>;

interface AircraftComponentFormProps {
  aircraftId: string;
  tenantId: string;
  component?: AircraftComponent;
  onFormSubmit: () => void;
}

export function AircraftComponentForm({ aircraftId, tenantId, component, onFormSubmit }: AircraftComponentFormProps) {
  const firestore = useFirestore();
  const { toast } = useToast();

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: component?.name || '',
      partNumber: component?.partNumber || '',
      serialNumber: component?.serialNumber || '',
      installDate: component?.installDate || '',
      installHours: component?.installHours || 0,
      maxHours: component?.maxHours || 0,
      notes: component?.notes || '',
    },
  });

  const onSubmit = (values: FormValues) => {
    if (!firestore) return;

    const dataToSave = {
      ...values,
      installDate: values.installDate || null,
    };

    if (component) {
      // Update existing component
      const componentRef = doc(firestore, `tenants/${tenantId}/aircrafts/${aircraftId}/components`, component.id);
      updateDocumentNonBlocking(componentRef, dataToSave);
      toast({ title: 'Component Updated' });
    } else {
      // Add new component
      const componentsCollection = collection(firestore, `tenants/${tenantId}/aircrafts/${aircraftId}/components`);
      addDocumentNonBlocking(componentsCollection, dataToSave);
      toast({ title: 'Component Added' });
    }
    onFormSubmit();
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <FormField control={form.control} name="name" render={({ field }) => ( <FormItem><FormLabel>Component Name</FormLabel><FormControl><Input placeholder="e.g., Engine" {...field} /></FormControl><FormMessage /></FormItem> )} />
            <FormField control={form.control} name="partNumber" render={({ field }) => ( <FormItem><FormLabel>Part Number</FormLabel><FormControl><Input placeholder="P/N" {...field} /></FormControl><FormMessage /></FormItem> )} />
            <FormField control={form.control} name="serialNumber" render={({ field }) => ( <FormItem><FormLabel>Serial Number</FormLabel><FormControl><Input placeholder="S/N" {...field} /></FormControl><FormMessage /></FormItem> )} />
            <FormField control={form.control} name="installDate" render={({ field }) => ( <FormItem><FormLabel>Install Date</FormLabel><FormControl><Input type="date" {...field} /></FormControl><FormMessage /></FormItem> )} />
            <FormField control={form.control} name="installHours" render={({ field }) => ( <FormItem><FormLabel>Install Hours</FormLabel><FormControl><Input type="number" {...field} /></FormControl><FormMessage /></FormItem> )} />
            <FormField control={form.control} name="maxHours" render={({ field }) => ( <FormItem><FormLabel>Max Hours (TBO)</FormLabel><FormControl><Input type="number" {...field} /></FormControl><FormMessage /></FormItem> )} />
        </div>
        <FormField control={form.control} name="notes" render={({ field }) => ( <FormItem><FormLabel>Notes</FormLabel><FormControl><Textarea placeholder="Any relevant notes..." {...field} /></FormControl><FormMessage /></FormItem> )} />
        <div className="flex justify-end pt-4">
          <Button type="submit">{component ? 'Save Changes' : 'Add Component'}</Button>
        </div>
      </form>
    </Form>
  );
}