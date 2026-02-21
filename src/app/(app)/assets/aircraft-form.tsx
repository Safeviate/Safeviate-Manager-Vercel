'use client';

import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogClose,
} from '@/components/ui/dialog';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { useFirestore, addDocumentNonBlocking, updateDocumentNonBlocking } from '@/firebase';
import { useToast } from '@/hooks/use-toast';
import { doc, collection } from 'firebase/firestore';
import type { Aircraft } from '@/types/aircraft';

const formSchema = z.object({
  tailNumber: z.string().min(1, 'Tail number is required.'),
  model: z.string().min(1, 'Model is required.'),
  abbreviation: z.string().max(5, "Abbreviation must be 5 characters or less.").optional(),
  currentHobbs: z.number({ coerce: true }).optional(),
  currentTacho: z.number({ coerce: true }).optional(),
  tachoAtNext50Inspection: z.number({ coerce: true }).optional(),
  tachoAtNext100Inspection: z.number({ coerce: true }).optional(),
});

type AircraftFormValues = z.infer<typeof formSchema>;

interface AircraftFormProps {
  isOpen: boolean;
  onClose: () => void;
  tenantId: string;
  existingAircraft?: Aircraft | null;
}

export function AircraftForm({ isOpen, onClose, tenantId, existingAircraft }: AircraftFormProps) {
  const firestore = useFirestore();
  const { toast } = useToast();

  const form = useForm<AircraftFormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: existingAircraft || {
      tailNumber: '',
      model: '',
    },
  });

  useEffect(() => {
    if (isOpen) {
      form.reset(existingAircraft || {
        tailNumber: '',
        model: '',
        abbreviation: '',
        currentHobbs: 0,
        currentTacho: 0,
        tachoAtNext50Inspection: 0,
        tachoAtNext100Inspection: 0,
      });
    }
  }, [isOpen, existingAircraft, form]);

  const onSubmit = (values: AircraftFormValues) => {
    if (!firestore) return;

    if (existingAircraft) {
      const aircraftRef = doc(firestore, 'tenants', tenantId, 'aircrafts', existingAircraft.id);
      updateDocumentNonBlocking(aircraftRef, values);
      toast({ title: 'Aircraft Updated', description: 'The aircraft details have been saved.' });
    } else {
      const aircraftsCollection = collection(firestore, 'tenants', tenantId, 'aircrafts');
      addDocumentNonBlocking(aircraftsCollection, values);
      toast({ title: 'Aircraft Added', description: 'The new aircraft has been added to your fleet.' });
    }
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{existingAircraft ? 'Edit Aircraft' : 'Add New Aircraft'}</DialogTitle>
          <DialogDescription>
            {existingAircraft ? 'Update the details for this aircraft.' : 'Add a new aircraft to your fleet.'}
          </DialogDescription>
        </DialogHeader>
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
                <FormLabel>Abbreviation</FormLabel>
                <FormControl><Input maxLength={5} {...field} /></FormControl>
                <FormMessage />
              </FormItem>
            )} />
            <div className="grid grid-cols-2 gap-4">
                <FormField control={form.control} name="currentHobbs" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Current Hobbs</FormLabel>
                    <FormControl><Input type="number" {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
                <FormField control={form.control} name="currentTacho" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Current Tacho</FormLabel>
                    <FormControl><Input type="number" {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <FormField control={form.control} name="tachoAtNext50Inspection" render={({ field }) => (
                <FormItem>
                  <FormLabel>Tacho at Next 50hr</FormLabel>
                  <FormControl><Input type="number" {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />
              <FormField control={form.control} name="tachoAtNext100Inspection" render={({ field }) => (
                <FormItem>
                  <FormLabel>Tacho at Next 100hr</FormLabel>
                  <FormControl><Input type="number" {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />
            </div>
            <DialogFooter className="pt-4">
              <DialogClose asChild><Button type="button" variant="outline">Cancel</Button></DialogClose>
              <Button type="submit">Save Aircraft</Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
