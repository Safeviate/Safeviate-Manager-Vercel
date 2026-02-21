
'use client';

import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import {
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogClose,
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
import { doc, collection } from 'firebase/firestore';
import { useToast } from '@/hooks/use-toast';
import type { Aircraft } from '@/types/aircraft';

const formSchema = z.object({
  make: z.string().min(1, 'Make is required.'),
  model: z.string().min(1, 'Model is required.'),
  tailNumber: z.string().min(1, 'Tail number is required.'),
  initialHobbs: z.coerce.number().optional(),
  currentHobbs: z.coerce.number().optional(),
  initialTacho: z.coerce.number().optional(),
  currentTacho: z.coerce.number().optional(),
});

type AircraftFormValues = z.infer<typeof formSchema>;

interface AircraftFormProps {
  existingAircraft?: Aircraft | null;
  onFormSubmit: () => void;
}

export function AircraftForm({ existingAircraft, onFormSubmit }: AircraftFormProps) {
  const firestore = useFirestore();
  const { toast } = useToast();
  const tenantId = 'safeviate';

  const form = useForm<AircraftFormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: existingAircraft
      ? {
          make: existingAircraft.make || '',
          model: existingAircraft.model || '',
          tailNumber: existingAircraft.tailNumber || '',
          initialHobbs: existingAircraft.initialHobbs || 0,
          currentHobbs: existingAircraft.currentHobbs || 0,
          initialTacho: existingAircraft.initialTacho || 0,
          currentTacho: existingAircraft.currentTacho || 0,
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

  // This effect ensures the form resets if the `existingAircraft` prop changes
  // which can happen if the dialog is kept open while the user interacts elsewhere.
  useEffect(() => {
    form.reset(
      existingAircraft
        ? {
            make: existingAircraft.make || '',
            model: existingAircraft.model || '',
            tailNumber: existingAircraft.tailNumber || '',
            initialHobbs: existingAircraft.initialHobbs || 0,
            currentHobbs: existingAircraft.currentHobbs || 0,
            initialTacho: existingAircraft.initialTacho || 0,
            currentTacho: existingAircraft.currentTacho || 0,
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
  }, [existingAircraft, form]);


  const onSubmit = (values: AircraftFormValues) => {
    if (!firestore) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Database not available.',
      });
      return;
    }
    const collectionRef = collection(firestore, `tenants/${tenantId}/aircrafts`);

    if (existingAircraft) {
      const docRef = doc(collectionRef, existingAircraft.id);
      updateDocumentNonBlocking(docRef, values);
      toast({
        title: 'Aircraft Updated',
        description: `${values.tailNumber} has been updated.`,
      });
    } else {
      addDocumentNonBlocking(collectionRef, values);
      toast({
        title: 'Aircraft Created',
        description: `${values.tailNumber} has been added to the fleet.`,
      });
    }
    onFormSubmit();
  };
  
  return (
      <>
        <DialogHeader>
          <DialogTitle>{existingAircraft ? 'Edit' : 'Create'} Aircraft</DialogTitle>
          <DialogDescription>
            {existingAircraft
              ? 'Edit the details of the aircraft.'
              : 'Add a new aircraft to your fleet.'}
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField control={form.control} name="make" render={({ field }) => ( <FormItem><FormLabel>Make</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem> )}/>
              <FormField control={form.control} name="model" render={({ field }) => ( <FormItem><FormLabel>Model</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem> )}/>
              <FormField control={form.control} name="tailNumber" render={({ field }) => ( <FormItem className="md:col-span-2"><FormLabel>Tail Number</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem> )}/>
              <FormField control={form.control} name="initialHobbs" render={({ field }) => ( <FormItem><FormLabel>Initial Hobbs</FormLabel><FormControl><Input type="number" {...field} /></FormControl><FormMessage /></FormItem> )}/>
              <FormField control={form.control} name="currentHobbs" render={({ field }) => ( <FormItem><FormLabel>Current Hobbs</FormLabel><FormControl><Input type="number" {...field} /></FormControl><FormMessage /></FormItem> )}/>
              <FormField control={form.control} name="initialTacho" render={({ field }) => ( <FormItem><FormLabel>Initial Tacho</FormLabel><FormControl><Input type="number" {...field} /></FormControl><FormMessage /></FormItem> )}/>
              <FormField control={form.control} name="currentTacho" render={({ field }) => ( <FormItem><FormLabel>Current Tacho</FormLabel><FormControl><Input type="number" {...field} /></FormControl><FormMessage /></FormItem> )}/>
            </div>
             <DialogFooter className="pt-4">
                <Button type="button" variant="outline" onClick={onFormSubmit}>Cancel</Button>
                <Button type="submit">Save</Button>
            </DialogFooter>
          </form>
        </Form>
      </>
  );
}
