'use client';

import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { collection, doc } from 'firebase/firestore';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogClose
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useFirestore, addDocumentNonBlocking, updateDocumentNonBlocking } from '@/firebase';
import { useToast } from '@/hooks/use-toast';
import type { Aircraft } from '@/types/aircraft';
import { Form, FormControl, FormField, FormMessage } from '@/components/ui/form';

const formSchema = z.object({
  tailNumber: z.string().min(1, 'Tail number is required.'),
  model: z.string().min(1, 'Model is required.'),
  initialHobbs: z.number({ coerce: true }).optional(),
  initialTacho: z.number({ coerce: true }).optional(),
  tachoAtNext50Inspection: z.number({ coerce: true }).optional(),
  tachoAtNext100Inspection: z.number({ coerce: true }).optional(),
});

type AircraftFormValues = z.infer<typeof formSchema>;

interface AircraftFormProps {
    isOpen: boolean;
    setIsOpen: (isOpen: boolean) => void;
    onClose: () => void;
    tenantId: string;
    existingAircraft?: Aircraft | null;
}

export function AircraftForm({ isOpen, setIsOpen, onClose, tenantId, existingAircraft }: AircraftFormProps) {
  const firestore = useFirestore();
  const { toast } = useToast();

  const form = useForm<AircraftFormValues>({
      resolver: zodResolver(formSchema),
      defaultValues: {},
  });

  useEffect(() => {
    if (isOpen) {
        form.reset(existingAircraft ? {
            ...existingAircraft,
            initialHobbs: existingAircraft.initialHobbs || 0,
            initialTacho: existingAircraft.initialTacho || 0,
        } : {
            tailNumber: '',
            model: '',
            initialHobbs: 0,
            initialTacho: 0,
            tachoAtNext50Inspection: 0,
            tachoAtNext100Inspection: 0,
        });
    }
  }, [isOpen, existingAircraft, form]);

  const onSubmit = (values: AircraftFormValues) => {
    if (!firestore || !tenantId) {
        toast({
            variant: 'destructive',
            title: 'Error',
            description: 'Could not connect to the database.',
          });
        return;
    }
    
    if (existingAircraft) {
        const aircraftRef = doc(firestore, 'tenants', tenantId, 'aircrafts', existingAircraft.id);
        updateDocumentNonBlocking(aircraftRef, values);
        toast({
            title: 'Aircraft Updated',
            description: `The aircraft "${values.tailNumber}" has been updated.`,
        });
    } else {
        const aircraftsRef = collection(firestore, 'tenants', tenantId, 'aircrafts');
        addDocumentNonBlocking(aircraftsRef, {
            ...values,
            currentHobbs: values.initialHobbs || 0,
            currentTacho: values.initialTacho || 0,
        });
        toast({
            title: 'Aircraft Added',
            description: `The aircraft "${values.tailNumber}" is being added.`,
        });
    }
    
    onClose();
  };

  const onOpenChange = (open: boolean) => {
    if (!open) {
        onClose();
    }
    setIsOpen(open);
  }

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>{existingAircraft ? 'Edit Aircraft' : 'Add Aircraft'}</DialogTitle>
          <DialogDescription>
            {existingAircraft ? `Update details for ${existingAircraft.tailNumber}.` : 'Add a new aircraft to the fleet.'}
          </DialogDescription>
        </DialogHeader>
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
                <FormField control={form.control} name="initialHobbs" render={({ field }) => (
                    <FormItem>
                        <Label htmlFor="initialHobbs">Initial Hobbs</Label>
                        <FormControl><Input id="initialHobbs" type="number" {...field} /></FormControl>
                        <FormMessage />
                    </FormItem>
                )} />
                <FormField control={form.control} name="initialTacho" render={({ field }) => (
                    <FormItem>
                        <Label htmlFor="initialTacho">Initial Tacho</Label>
                        <FormControl><Input id="initialTacho" type="number" {...field} /></FormControl>
                        <FormMessage />
                    </FormItem>
                )} />
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
                <DialogFooter>
                  <DialogClose asChild>
                    <Button variant="outline" type="button">Cancel</Button>
                  </DialogClose>
                  <Button type="submit">Save</Button>
                </DialogFooter>
            </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
