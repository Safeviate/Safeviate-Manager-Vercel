'use client';

import { useEffect } from 'react';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useFirestore } from '@/firebase';
import { addDocumentNonBlocking, updateDocumentNonBlocking } from '@/firebase/non-blocking-updates';
import { collection, doc } from 'firebase/firestore';
import { useToast } from '@/hooks/use-toast';
import type { Aircraft } from './aircraft-table';

const formSchema = z.object({
  tailNumber: z.string().min(1, 'Tail number is required.'),
  model: z.string().min(1, 'Model is required.'),
  currentHobbs: z.number({ coerce: true }).optional(),
  currentTacho: z.number({ coerce: true }).optional(),
  tachoAtNext50Inspection: z.number({ coerce: true }).optional(),
  tachoAtNext100Inspection: z.number({ coerce: true }).optional(),
});

type FormValues = z.infer<typeof formSchema>;

interface AircraftFormProps {
  tenantId: string;
  aircraft?: Aircraft | null;
  onClose: () => void;
}

export function AircraftForm({ tenantId, aircraft, onClose }: AircraftFormProps) {
  const firestore = useFirestore();
  const { toast } = useToast();

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      tailNumber: '',
      model: '',
      currentHobbs: 0,
      currentTacho: 0,
      tachoAtNext50Inspection: 0,
      tachoAtNext100Inspection: 0,
    },
  });

  useEffect(() => {
    if (aircraft) {
      form.reset({
        tailNumber: aircraft.tailNumber,
        model: aircraft.model,
        currentHobbs: aircraft.currentHobbs,
        currentTacho: aircraft.currentTacho,
        tachoAtNext50Inspection: aircraft.tachoAtNext50Inspection,
        tachoAtNext100Inspection: aircraft.tachoAtNext100Inspection,
      });
    } else {
        form.reset({
             tailNumber: '',
            model: '',
            currentHobbs: 0,
            currentTacho: 0,
            tachoAtNext50Inspection: 0,
            tachoAtNext100Inspection: 0,
        });
    }
  }, [aircraft, form]);

  const onSubmit = (values: FormValues) => {
    if (!firestore) return;

    if (aircraft) {
      // Update existing aircraft
      const aircraftRef = doc(firestore, `tenants/${tenantId}/aircrafts`, aircraft.id);
      updateDocumentNonBlocking(aircraftRef, values);
      toast({ title: 'Aircraft Updated', description: 'The aircraft details have been saved.' });
    } else {
      // Add new aircraft
      const aircraftsCollection = collection(firestore, `tenants/${tenantId}/aircrafts`);
      addDocumentNonBlocking(aircraftsCollection, values);
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

            <div className="grid grid-cols-2 gap-4">
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
            </div>
             <div className="grid grid-cols-2 gap-4">
                <FormField control={form.control} name="tachoAtNext50Inspection" render={({ field }) => (
                    <FormItem>
                        <Label htmlFor="tachoAtNext50Inspection">Next 50hr Tacho</Label>
                        <FormControl><Input id="tachoAtNext50Inspection" type="number" {...field} /></FormControl>
                        <FormMessage />
                    </FormItem>
                )} />
                 <FormField control={form.control} name="tachoAtNext100Inspection" render={({ field }) => (
                    <FormItem>
                        <Label htmlFor="tachoAtNext100Inspection">Next 100hr Tacho</Label>
                        <FormControl><Input id="tachoAtNext100Inspection" type="number" {...field} /></FormControl>
                        <FormMessage />
                    </FormItem>
                )} />
            </div>

            <div className="flex justify-end gap-2 pt-4">
                <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
                <Button type="submit">Save Aircraft</Button>
            </div>
        </form>
    </Form>
  );
}
