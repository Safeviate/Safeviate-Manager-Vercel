'use client';

import React from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useFirestore } from '@/firebase';
import { addDocumentNonBlocking, updateDocumentNonBlocking } from '@/firebase/non-blocking-updates';
import { collection, doc } from 'firebase/firestore';
import { useToast } from '@/hooks/use-toast';
import type { Aircraft } from './page';

interface AircraftFormProps {
  tenantId: string;
  onClose: () => void;
  existingAircraft?: Aircraft | null;
}

const formSchema = z.object({
  tailNumber: z.string().min(1, 'Tail number is required.'),
  model: z.string().min(1, 'Model is required.'),
  currentHobbs: z.number({ coerce: true }).optional(),
  currentTacho: z.number({ coerce: true }).optional(),
  tachoAtNext50Inspection: z.number({ coerce: true }).optional(),
  tachoAtNext100Inspection: z.number({ coerce: true }).optional(),
});

type FormValues = z.infer<typeof formSchema>;

export function AircraftForm({ tenantId, onClose, existingAircraft }: AircraftFormProps) {
  const firestore = useFirestore();
  const { toast } = useToast();

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
  });

  React.useEffect(() => {
    form.reset({
      tailNumber: existingAircraft?.tailNumber || '',
      model: existingAircraft?.model || '',
      currentHobbs: existingAircraft?.currentHobbs || 0,
      currentTacho: existingAircraft?.currentTacho || 0,
      tachoAtNext50Inspection: existingAircraft?.tachoAtNext50Inspection || 0,
      tachoAtNext100Inspection: existingAircraft?.tachoAtNext100Inspection || 0,
    });
  }, [existingAircraft, form]);


  const onSubmit = (data: FormValues) => {
    if (!firestore) return;

    if (existingAircraft) {
      // Update
      const aircraftRef = doc(firestore, `tenants/${tenantId}/aircrafts`, existingAircraft.id);
      updateDocumentNonBlocking(aircraftRef, data);
      toast({ title: 'Aircraft Updated', description: 'The aircraft details have been saved.' });
    } else {
      // Create
      const aircraftsCollection = collection(firestore, `tenants/${tenantId}/aircrafts`);
      addDocumentNonBlocking(aircraftsCollection, data);
      toast({ title: 'Aircraft Added', description: 'The new aircraft has been added to your fleet.' });
    }
    onClose();
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 py-4">
        <FormField control={form.control} name="tailNumber" render={({ field }) => (
            <FormItem>
                <Label htmlFor="tailNumber">Tail Number</Label>
                <FormControl><Input id="tailNumber" {...field} /></FormControl>
                <FormMessage />
            </FormItem>
        )} />
        <FormField control={form.control} name="model" render={({ field }) => (
            <FormItem>
                <Label htmlFor="model">Model</Label>
                <FormControl><Input id="model" {...field} /></FormControl>
                <FormMessage />
            </FormItem>
        )} />
        <FormField control={form.control} name="currentHobbs" render={({ field }) => (
            <FormItem>
                <Label htmlFor="currentHobbs">Current Hobbs</Label>
                <FormControl><Input id="currentHobbs" type="number" {...field} /></FormControl>
                <FormMessage />
            </FormItem>
        )} />
        <FormField control={form.control} name="currentTacho" render={({ field }) => (
            <FormItem>
                <Label htmlFor="currentTacho">Current Tacho</Label>
                <FormControl><Input id="currentTacho" type="number" {...field} /></FormControl>
                <FormMessage />
            </FormItem>
        )} />
        <FormField control={form.control} name="tachoAtNext50Inspection" render={({ field }) => (
            <FormItem>
                <Label htmlFor="tachoAtNext50Inspection">Tacho at Next 50hr</Label>
                <FormControl><Input id="tachoAtNext50Inspection" type="number" {...field} /></FormControl>
                <FormMessage />
            </FormItem>
        )} />
        <FormField control={form.control} name="tachoAtNext100Inspection" render={({ field }) => (
            <FormItem>
                <Label htmlFor="tachoAtNext100Inspection">Tacho at Next 100hr</Label>
                <FormControl><Input id="tachoAtNext100Inspection" type="number" {...field} /></FormControl>
                <FormMessage />
            </FormItem>
        )} />
        <div className="flex justify-end gap-2 pt-4">
          <Button type="button" variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit">Save Aircraft</Button>
        </div>
      </form>
    </Form>
  );
}
