
'use client';

import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
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
import { collection, doc } from 'firebase/firestore';
import { useToast } from '@/hooks/use-toast';
import type { Aircraft } from '@/types/aircraft';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';

const aircraftFormSchema = z.object({
  make: z.string().min(1, 'Make is required.'),
  model: z.string().min(1, 'Model is required.'),
  tailNumber: z.string().min(1, 'Tail number is required.'),
  abbreviation: z.string().max(5).optional(),
  type: z.enum(['Single-Engine', 'Multi-Engine']),
  initialHobbs: z.number({ coerce: true }).min(0),
  currentHobbs: z.number({ coerce: true }).min(0),
  initialTacho: z.number({ coerce: true }).min(0),
  currentTacho: z.number({ coerce: true }).min(0),
  tachoAtNext50Inspection: z.number({ coerce: true }).min(0).optional(),
  tachoAtNext100Inspection: z.number({ coerce: true }).min(0).optional(),
});

type AircraftFormValues = z.infer<typeof aircraftFormSchema>;

interface AircraftFormProps {
  aircraft?: Aircraft;
  isOpen: boolean;
  setIsOpen: (open: boolean) => void;
}

export function AircraftForm({ aircraft, isOpen, setIsOpen }: AircraftFormProps) {
  const firestore = useFirestore();
  const { toast } = useToast();
  const tenantId = 'safeviate';

  const form = useForm<AircraftFormValues>({
    resolver: zodResolver(aircraftFormSchema),
    defaultValues: {
      make: aircraft?.make || '',
      model: aircraft?.model || '',
      tailNumber: aircraft?.tailNumber || '',
      abbreviation: aircraft?.abbreviation || '',
      type: aircraft?.type || 'Single-Engine',
      initialHobbs: aircraft?.initialHobbs || 0,
      currentHobbs: aircraft?.currentHobbs || 0,
      initialTacho: aircraft?.initialTacho || 0,
      currentTacho: aircraft?.currentTacho || 0,
      tachoAtNext50Inspection: aircraft?.tachoAtNext50Inspection || 0,
      tachoAtNext100Inspection: aircraft?.tachoAtNext100Inspection || 0,
    },
  });

  useEffect(() => {
    if (isOpen && aircraft) {
      form.reset({
        make: aircraft.make,
        model: aircraft.model,
        tailNumber: aircraft.tailNumber,
        abbreviation: aircraft.abbreviation || '',
        type: aircraft.type || 'Single-Engine',
        initialHobbs: aircraft.initialHobbs || 0,
        currentHobbs: aircraft.currentHobbs || 0,
        initialTacho: aircraft.initialTacho || 0,
        currentTacho: aircraft.currentTacho || 0,
        tachoAtNext50Inspection: aircraft.tachoAtNext50Inspection || 0,
        tachoAtNext100Inspection: aircraft.tachoAtNext100Inspection || 0,
      });
    }
  }, [isOpen, aircraft, form]);

  const onSubmit = async (values: AircraftFormValues) => {
    if (!firestore) return;

    if (aircraft) {
      const aircraftRef = doc(firestore, `tenants/${tenantId}/aircrafts`, aircraft.id);
      updateDocumentNonBlocking(aircraftRef, values);
      toast({ title: 'Aircraft Updated' });
    } else {
      const aircraftsRef = collection(firestore, `tenants/${tenantId}/aircrafts`);
      addDocumentNonBlocking(aircraftsRef, values);
      toast({ title: 'Aircraft Added' });
    }
    setIsOpen(false);
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>{aircraft ? 'Edit Aircraft' : 'Add New Aircraft'}</DialogTitle>
          <DialogDescription>
            Enter registration and initial meter details for the aircraft.
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <div className="grid grid-cols-2 gap-4">
              <FormField control={form.control} name="make" render={({ field }) => (<FormItem><FormLabel>Make</FormLabel><FormControl><Input placeholder="e.g., Cessna" {...field} /></FormControl><FormMessage /></FormItem>)} />
              <FormField control={form.control} name="model" render={({ field }) => (<FormItem><FormLabel>Model</FormLabel><FormControl><Input placeholder="e.g., 172S" {...field} /></FormControl><FormMessage /></FormItem>)} />
              <FormField control={form.control} name="tailNumber" render={({ field }) => (<FormItem><FormLabel>Tail Number</FormLabel><FormControl><Input placeholder="e.g., ZS-FST" {...field} /></FormControl><FormMessage /></FormItem>)} />
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
              <FormField control={form.control} name="tachoAtNext50Inspection" render={({ field }) => (<FormItem><FormLabel>Next 50hr Inspection (Tacho)</FormLabel><FormControl><Input type="number" step="0.1" {...field} /></FormControl></FormItem>)} />
              <FormField control={form.control} name="tachoAtNext100Inspection" render={({ field }) => (<FormItem><FormLabel>Next 100hr Inspection (Tacho)</FormLabel><FormControl><Input type="number" step="0.1" {...field} /></FormControl></FormItem>)} />
            </div>

            <DialogFooter>
              <Button type="submit">Save Aircraft</Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
