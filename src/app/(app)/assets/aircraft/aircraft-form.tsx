'use client';

import { useState } from 'react';
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useFirestore, addDocumentNonBlocking, updateDocumentNonBlocking } from '@/firebase';
import { collection, doc } from 'firebase/firestore';
import { useToast } from '@/hooks/use-toast';
import type { Aircraft } from '@/types/aircraft';
import { Separator } from '@/components/ui/separator';

const aircraftFormSchema = z.object({
  make: z.string().min(1, 'Make is required.'),
  model: z.string().min(1, 'Model is required.'),
  tailNumber: z.string().min(1, 'Tail number is required.'),
  type: z.enum(['Single-Engine', 'Multi-Engine']),
  initialHobbs: z.number({ coerce: true }).default(0),
  currentHobbs: z.number({ coerce: true }).default(0),
  initialTacho: z.number({ coerce: true }).default(0),
  currentTacho: z.number({ coerce: true }).default(0),
  tachoAtNext50Inspection: z.number({ coerce: true }).optional(),
  tachoAtNext100Inspection: z.number({ coerce: true }).optional(),
});

type AircraftFormValues = z.infer<typeof aircraftFormSchema>;

interface AircraftFormProps {
  tenantId: string;
  existingAircraft?: Aircraft;
  onCancel: () => void;
}

export function AircraftForm({ tenantId, existingAircraft, onCancel }: AircraftFormProps) {
  const firestore = useFirestore();
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const form = useForm<AircraftFormValues>({
    resolver: zodResolver(aircraftFormSchema),
    defaultValues: existingAircraft ? {
      make: existingAircraft.make,
      model: existingAircraft.model,
      tailNumber: existingAircraft.tailNumber,
      type: existingAircraft.type || 'Single-Engine',
      initialHobbs: existingAircraft.initialHobbs || 0,
      currentHobbs: existingAircraft.currentHobbs || 0,
      initialTacho: existingAircraft.initialTacho || 0,
      currentTacho: existingAircraft.currentTacho || 0,
      tachoAtNext50Inspection: existingAircraft.tachoAtNext50Inspection,
      tachoAtNext100Inspection: existingAircraft.tachoAtNext100Inspection,
    } : {
      make: '',
      model: '',
      tailNumber: '',
      type: 'Single-Engine',
      initialHobbs: 0,
      currentHobbs: 0,
      initialTacho: 0,
      currentTacho: 0,
    },
  });

  const onSubmit = async (values: AircraftFormValues) => {
    if (!firestore) return;
    setIsSubmitting(true);

    try {
      if (existingAircraft) {
        const aircraftRef = doc(firestore, 'tenants', tenantId, 'aircrafts', existingAircraft.id);
        updateDocumentNonBlocking(aircraftRef, values);
        toast({ title: 'Aircraft Updated' });
      } else {
        const aircraftCollection = collection(firestore, 'tenants', tenantId, 'aircrafts');
        addDocumentNonBlocking(aircraftCollection, { ...values, documents: [], maintenanceLogs: [] });
        toast({ title: 'Aircraft Added' });
      }
      onCancel();
    } catch (error: any) {
      toast({ variant: 'destructive', title: 'Error', description: error.message });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <FormField control={form.control} name="make" render={({ field }) => (<FormItem><FormLabel>Make</FormLabel><FormControl><Input placeholder="e.g., Cessna" {...field} /></FormControl><FormMessage /></FormItem>)} />
          <FormField control={form.control} name="model" render={({ field }) => (<FormItem><FormLabel>Model</FormLabel><FormControl><Input placeholder="e.g., 172S" {...field} /></FormControl><FormMessage /></FormItem>)} />
          <FormField control={form.control} name="tailNumber" render={({ field }) => (<FormItem><FormLabel>Tail Number</FormLabel><FormControl><Input placeholder="e.g., ZS-FPT" {...field} /></FormControl><FormMessage /></FormItem>)} />
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

        <div className="flex justify-end gap-2">
          <Button type="button" variant="outline" onClick={onCancel} disabled={isSubmitting}>Cancel</Button>
          <Button type="submit" disabled={isSubmitting}>{isSubmitting ? 'Saving...' : 'Save Aircraft'}</Button>
        </div>
      </form>
    </Form>
  );
}
