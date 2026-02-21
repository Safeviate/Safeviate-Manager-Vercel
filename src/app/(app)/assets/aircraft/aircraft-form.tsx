'use client';

import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { doc, collection } from 'firebase/firestore';
import { useFirestore, addDocumentNonBlocking, updateDocumentNonBlocking } from '@/firebase';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogClose,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import type { Aircraft } from '@/types/aircraft';
import { Form, FormControl, FormField, FormItem, FormMessage } from '@/components/ui/form';

const formSchema = z.object({
  make: z.string().min(1, 'Make is required'),
  model: z.string().min(1, 'Model is required'),
  tailNumber: z.string().min(1, 'Tail Number is required'),
  initialHobbs: z.coerce.number().optional(),
  currentHobbs: z.coerce.number().optional(),
  initialTacho: z.coerce.number().optional(),
  currentTacho: z.coerce.number().optional(),
});

type AircraftFormValues = z.infer<typeof formSchema>;

interface AircraftFormProps {
  aircraft?: Aircraft | null;
  trigger: React.ReactNode;
  tenantId: string;
}

export function AircraftForm({ aircraft, trigger, tenantId }: AircraftFormProps) {
  const firestore = useFirestore();
  const { toast } = useToast();
  const [isOpen, setIsOpen] = useState(false);

  const isEditMode = !!aircraft;

  const form = useForm<AircraftFormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: isEditMode
      ? {
          make: aircraft.make,
          model: aircraft.model,
          tailNumber: aircraft.tailNumber,
          initialHobbs: aircraft.initialHobbs,
          currentHobbs: aircraft.currentHobbs,
          initialTacho: aircraft.initialTacho,
          currentTacho: aircraft.currentTacho,
        }
      : {
          make: '',
          model: '',
          tailNumber: '',
          initialHobbs: 0,
          currentHobbs: 0,
          initialTacho: 0,
          currentTacho: 0,
        },
  });

  // Reset form when dialog opens/closes or aircraft data changes
  useEffect(() => {
    if (isOpen) {
      form.reset(
        isEditMode
          ? {
              make: aircraft.make,
              model: aircraft.model,
              tailNumber: aircraft.tailNumber,
              initialHobbs: aircraft.initialHobbs || 0,
              currentHobbs: aircraft.currentHobbs || 0,
              initialTacho: aircraft.initialTacho || 0,
              currentTacho: aircraft.currentTacho || 0,
            }
          : {
              make: '',
              model: '',
              tailNumber: '',
              initialHobbs: 0,
              currentHobbs: 0,
              initialTacho: 0,
              currentTacho: 0,
            }
      );
    }
  }, [isOpen, aircraft, isEditMode, form]);

  const onSubmit = async (values: AircraftFormValues) => {
    if (!firestore) {
      toast({ variant: 'destructive', title: 'Error', description: 'Database not available.' });
      return;
    }

    try {
      if (isEditMode) {
        const aircraftRef = doc(firestore, `tenants/${tenantId}/aircrafts`, aircraft.id);
        await updateDocumentNonBlocking(aircraftRef, values);
        toast({ title: 'Aircraft Updated', description: `Details for ${values.tailNumber} have been saved.` });
      } else {
        const aircraftsCollection = collection(firestore, `tenants/${tenantId}/aircrafts`);
        await addDocumentNonBlocking(aircraftsCollection, values);
        toast({ title: 'Aircraft Created', description: `${values.tailNumber} has been added to the fleet.` });
      }
      setIsOpen(false);
    } catch (error: any) {
      console.error('Failed to save aircraft:', error);
      toast({ variant: 'destructive', title: 'Save Failed', description: error.message });
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{isEditMode ? 'Edit Aircraft' : 'Create New Aircraft'}</DialogTitle>
          <DialogDescription>
            {isEditMode ? `Editing details for ${aircraft.tailNumber}.` : 'Add a new aircraft to your fleet.'}
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <FormField control={form.control} name="make" render={({ field }) => ( <FormItem><Label>Make</Label><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem> )} />
              <FormField control={form.control} name="model" render={({ field }) => ( <FormItem><Label>Model</Label><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem> )} />
            </div>
            <FormField control={form.control} name="tailNumber" render={({ field }) => ( <FormItem><Label>Tail Number</Label><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem> )} />
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <FormField control={form.control} name="initialHobbs" render={({ field }) => ( <FormItem><Label>Initial Hobbs Hours</Label><FormControl><Input type="number" {...field} /></FormControl><FormMessage /></FormItem> )} />
              <FormField control={form.control} name="currentHobbs" render={({ field }) => ( <FormItem><Label>Current Hobbs Hours</Label><FormControl><Input type="number" {...field} /></FormControl><FormMessage /></FormItem> )} />
              <FormField control={form.control} name="initialTacho" render={({ field }) => ( <FormItem><Label>Initial Tacho Hours</Label><FormControl><Input type="number" {...field} /></FormControl><FormMessage /></FormItem> )} />
              <FormField control={form.control} name="currentTacho" render={({ field }) => ( <FormItem><Label>Current Tacho Hours</Label><FormControl><Input type="number" {...field} /></FormControl><FormMessage /></FormItem> )} />
            </div>
            <DialogFooter>
              <DialogClose asChild><Button type="button" variant="outline">Cancel</Button></DialogClose>
              <Button type="submit">Save Aircraft</Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
