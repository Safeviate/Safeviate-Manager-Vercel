'use client';

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useFirestore, addDocumentNonBlocking, updateDocumentNonBlocking } from '@/firebase';
import { doc, collection } from 'firebase/firestore';
import { useToast } from '@/hooks/use-toast';
import type { Aircraft } from './aircraft-type';
import React, { useEffect } from 'react';

const formSchema = z.object({
  tailNumber: z.string().min(1, "Tail number is required."),
  model: z.string().min(1, "Model is required."),
  abbreviation: z.string().optional(),
  initialHobbs: z.number({ coerce: true }).optional(),
  currentHobbs: z.number({ coerce: true }).optional(),
  initialTacho: z.number({ coerce: true }).optional(),
  currentTacho: z.number({ coerce: true }).optional(),
  tachoAtNext50Inspection: z.number({ coerce: true }).optional(),
  tachoAtNext100Inspection: z.number({ coerce: true }).optional(),
});

type AircraftFormValues = z.infer<typeof formSchema>;

interface AircraftFormProps {
  existingAircraft?: Aircraft | null;
  onClose: () => void;
}

export function AircraftForm({ existingAircraft, onClose }: AircraftFormProps) {
  const firestore = useFirestore();
  const { toast } = useToast();
  const tenantId = 'safeviate';

  const form = useForm<AircraftFormValues>({
    resolver: zodResolver(formSchema),
  });

  useEffect(() => {
    form.reset({
      tailNumber: existingAircraft?.tailNumber || '',
      model: existingAircraft?.model || '',
      abbreviation: existingAircraft?.abbreviation || '',
      initialHobbs: existingAircraft?.initialHobbs || 0,
      currentHobbs: existingAircraft?.currentHobbs || 0,
      initialTacho: existingAircraft?.initialTacho || 0,
      currentTacho: existingAircraft?.currentTacho || 0,
      tachoAtNext50Inspection: existingAircraft?.tachoAtNext50Inspection || 0,
      tachoAtNext100Inspection: existingAircraft?.tachoAtNext100Inspection || 0,
    });
  }, [existingAircraft, form]);
  

  const onSubmit = async (values: AircraftFormValues) => {
    if (!firestore) return;
    
    if (existingAircraft) {
      const docRef = doc(firestore, `tenants/${tenantId}/aircrafts`, existingAircraft.id);
      await updateDocumentNonBlocking(docRef, values);
      toast({ title: 'Aircraft Updated', description: `${values.tailNumber} has been updated.` });
    } else {
      const collectionRef = collection(firestore, `tenants/${tenantId}/aircrafts`);
      await addDocumentNonBlocking(collectionRef, values);
      toast({ title: 'Aircraft Added', description: 'The new aircraft has been added to your fleet.' });
    }
    onClose();
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 py-4">
        <FormField control={form.control} name="tailNumber" render={({ field }) => (
            <FormItem>
                <FormLabel>Tail Number</FormLabel>
                <FormControl><Input {...field} /></FormControl>
                <FormMessage />
            </FormItem>
        )} />
        <FormField control={form.control} name="model" render={({ field }) => (
            <FormItem>
                <FormLabel>Model</FormLabel>
                <FormControl><Input {...field} /></FormControl>
                <FormMessage />
            </FormItem>
        )} />
        <FormField control={form.control} name="abbreviation" render={({ field }) => (
            <FormItem>
                <FormLabel>Abbreviation (5 characters)</FormLabel>
                <FormControl><Input maxLength={5} {...field} /></FormControl>
                <FormMessage />
            </FormItem>
        )} />
        <div className="grid grid-cols-2 gap-4">
            <FormField control={form.control} name="initialHobbs" render={({ field }) => (<FormItem><FormLabel>Initial Hobbs</FormLabel><FormControl><Input type="number" {...field} /></FormControl><FormMessage /></FormItem>)} />
            <FormField control={form.control} name="currentHobbs" render={({ field }) => (<FormItem><FormLabel>Current Hobbs</FormLabel><FormControl><Input type="number" {...field} /></FormControl><FormMessage /></FormItem>)} />
            <FormField control={form.control} name="initialTacho" render={({ field }) => (<FormItem><FormLabel>Initial Tacho</FormLabel><FormControl><Input type="number" {...field} /></FormControl><FormMessage /></FormItem>)} />
            <FormField control={form.control} name="currentTacho" render={({ field }) => (<FormItem><FormLabel>Current Tacho</FormLabel><FormControl><Input type="number" {...field} /></FormControl><FormMessage /></FormItem>)} />
            <FormField control={form.control} name="tachoAtNext50Inspection" render={({ field }) => (<FormItem><FormLabel>Tacho at Next 50hr</FormLabel><FormControl><Input type="number" {...field} /></FormControl><FormMessage /></FormItem>)} />
            <FormField control={form.control} name="tachoAtNext100Inspection" render={({ field }) => (<FormItem><FormLabel>Tacho at Next 100hr</FormLabel><FormControl><Input type="number" {...field} /></FormControl><FormMessage /></FormItem>)} />
        </div>
        <div className="flex justify-end gap-2 pt-4">
          <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
          <Button type="submit">{existingAircraft ? 'Save Changes' : 'Add Aircraft'}</Button>
        </div>
      </form>
    </Form>
  );
}
