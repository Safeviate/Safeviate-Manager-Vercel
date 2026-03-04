'use client';

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { useFirestore, addDocumentNonBlocking, updateDocumentNonBlocking } from '@/firebase';
import { doc, collection } from 'firebase/firestore';
import { useToast } from '@/hooks/use-toast';
import type { Aircraft } from '@/types/aircraft';

const aircraftSchema = z.object({
  tailNumber: z.string().min(1, 'Tail number is required.'),
  make: z.string().min(1, 'Make is required.'),
  model: z.string().min(1, 'Model is required.'),
  type: z.enum(['Single-Engine', 'Multi-Engine']),
  initialHobbs: z.number({ coerce: true }).default(0),
  currentHobbs: z.number({ coerce: true }).default(0),
  initialTacho: z.number({ coerce: true }).default(0),
  currentTacho: z.number({ coerce: true }).default(0),
  tachoAtNext50Inspection: z.number({ coerce: true }).optional(),
  tachoAtNext100Inspection: z.number({ coerce: true }).optional(),
});

type AircraftFormValues = z.infer<typeof aircraftSchema>;

interface AircraftFormProps {
  tenantId: string;
  existingAircraft?: Aircraft;
  onComplete: () => void;
}

export function AircraftForm({ tenantId, existingAircraft, onComplete }: AircraftFormProps) {
  const firestore = useFirestore();
  const { toast } = useToast();

  const form = useForm<AircraftFormValues>({
    resolver: zodResolver(aircraftSchema),
    defaultValues: {
      tailNumber: existingAircraft?.tailNumber || '',
      make: existingAircraft?.make || '',
      model: existingAircraft?.model || '',
      type: existingAircraft?.type || 'Single-Engine',
      initialHobbs: existingAircraft?.initialHobbs || 0,
      currentHobbs: existingAircraft?.currentHobbs || 0,
      initialTacho: existingAircraft?.initialTacho || 0,
      currentTacho: existingAircraft?.currentTacho || 0,
      tachoAtNext50Inspection: existingAircraft?.tachoAtNext50Inspection,
      tachoAtNext100Inspection: existingAircraft?.tachoAtNext100Inspection,
    },
  });

  const onSubmit = (values: AircraftFormValues) => {
    if (!firestore) return;

    if (existingAircraft) {
      const aircraftRef = doc(firestore, `tenants/${tenantId}/aircrafts`, existingAircraft.id);
      updateDocumentNonBlocking(aircraftRef, values);
      toast({ title: 'Aircraft Updated' });
    } else {
      const aircraftsCollection = collection(firestore, `tenants/${tenantId}/aircrafts`);
      addDocumentNonBlocking(aircraftsCollection, values);
      toast({ title: 'Aircraft Added' });
    }
    onComplete();
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <FormField control={form.control} name="tailNumber" render={({ field }) => (<FormItem><FormLabel>Tail Number</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>)} />
          <FormField control={form.control} name="make" render={({ field }) => (<FormItem><FormLabel>Make</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>)} />
          <FormField control={form.control} name="model" render={({ field }) => (<FormItem><FormLabel>Model</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>)} />
          <FormField control={form.control} name="type" render={({ field }) => (<FormItem><FormLabel>Type</FormLabel><Select onValueChange={field.onChange} value={field.value}><FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl><SelectContent><SelectItem value="Single-Engine">Single-Engine</SelectItem><SelectItem value="Multi-Engine">Multi-Engine</SelectItem></SelectContent></Select><FormMessage /></FormItem>)} />
        </div>
        
        <Separator />
        
        <div className="grid grid-cols-2 gap-4">
          <FormField control={form.control} name="initialHobbs" render={({ field }) => (<FormItem><FormLabel>Initial Hobbs</FormLabel><FormControl><Input type="number" step="0.1" {...field} /></FormControl></FormItem>)} />
          <FormField control={form.control} name="currentHobbs" render={({ field }) => (<FormItem><FormLabel>Current Hobbs</FormLabel><FormControl><Input type="number" step="0.1" {...field} /></FormControl></FormItem>)} />
          <FormField control={form.control} name="initialTacho" render={({ field }) => (<FormItem><FormLabel>Initial Tacho</FormLabel><FormControl><Input type="number" step="0.1" {...field} /></FormControl></FormItem>)} />
          <FormField control={form.control} name="currentTacho" render={({ field }) => (<FormItem><FormLabel>Current Tacho</FormLabel><FormControl><Input type="number" step="0.1" {...field} /></FormControl></FormItem>)} />
        </div>

        <Separator />

        <div className="grid grid-cols-2 gap-4">
            <FormField control={form.control} name="tachoAtNext50Inspection" render={({ field }) => (<FormItem><FormLabel>Next 50hr Due (Tacho)</FormLabel><FormControl><Input type="number" step="0.1" {...field} /></FormControl></FormItem>)} />
            <FormField control={form.control} name="tachoAtNext100Inspection" render={({ field }) => (<FormItem><FormLabel>Next 100hr Due (Tacho)</FormLabel><FormControl><Input type="number" step="0.1" {...field} /></FormControl></FormItem>)} />
        </div>

        <div className="flex justify-end gap-2 pt-4">
          <Button type="button" variant="outline" onClick={onComplete}>Cancel</Button>
          <Button type="submit">Save Aircraft</Button>
        </div>
      </form>
    </Form>
  );
}