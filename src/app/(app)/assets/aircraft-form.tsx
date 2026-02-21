'use client';

import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useFirestore, addDocumentNonBlocking, updateDocumentNonBlocking } from '@/firebase';
import { doc, collection } from 'firebase/firestore';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Form, FormControl, FormField, FormItem, FormMessage } from '@/components/ui/form';
import type { Aircraft } from './page';

const formSchema = z.object({
  tailNumber: z.string().min(1, 'Tail number is required.'),
  model: z.string().min(1, 'Model is required.'),
  currentHobbs: z.number({ coerce: true }).optional(),
  currentTacho: z.number({ coerce: true }).optional(),
  tachoAtNext50Inspection: z.number({ coerce: true }).optional(),
  tachoAtNext100Inspection: z.number({ coerce: true }).optional(),
});

type AircraftFormValues = z.infer<typeof formSchema>;

interface AircraftFormProps {
  aircraftData: Aircraft | null;
  tenantId: string;
  onClose: () => void;
}

export function AircraftForm({ aircraftData, tenantId, onClose }: AircraftFormProps) {
  const firestore = useFirestore();
  const { toast } = useToast();

  const form = useForm<AircraftFormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: aircraftData || {
      tailNumber: '',
      model: '',
      currentHobbs: 0,
      currentTacho: 0,
      tachoAtNext50Inspection: 0,
      tachoAtNext100Inspection: 0,
    },
  });
  
  useEffect(() => {
    form.reset(aircraftData || {
      tailNumber: '',
      model: '',
      currentHobbs: 0,
      currentTacho: 0,
      tachoAtNext50Inspection: 0,
      tachoAtNext100Inspection: 0,
    });
  }, [aircraftData, form]);

  const onSubmit = async (data: AircraftFormValues) => {
    if (!firestore) return;
    
    if (aircraftData) { // Editing existing aircraft
      const docRef = doc(firestore, `tenants/${tenantId}/aircrafts`, aircraftData.id);
      await updateDocumentNonBlocking(docRef, data);
      toast({ title: 'Aircraft Updated', description: 'The aircraft details have been saved.' });
    } else { // Adding new aircraft
      const collectionRef = collection(firestore, `tenants/${tenantId}/aircrafts`);
      await addDocumentNonBlocking(collectionRef, data);
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
          <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
          <Button type="submit">Save Aircraft</Button>
        </div>
      </form>
    </Form>
  );
}
