'use client';

import { useState } from 'react';
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
  DialogTrigger,
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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useFirestore, addDocumentNonBlocking, updateDocumentNonBlocking } from '@/firebase';
import { doc, collection } from 'firebase/firestore';
import { useToast } from '@/hooks/use-toast';
import { PlusCircle } from 'lucide-react';
import type { Aircraft } from '@/types/aircraft';

const aircraftSchema = z.object({
  make: z.string().min(1, 'Make is required.'),
  model: z.string().min(1, 'Model is required.'),
  tailNumber: z.string().min(1, 'Tail Number is required.'),
  type: z.enum(['Single-Engine', 'Multi-Engine']),
  currentHobbs: z.number({ coerce: true }).default(0),
  currentTacho: z.number({ coerce: true }).default(0),
  tachoAtNext50Inspection: z.number({ coerce: true }).default(0),
  tachoAtNext100Inspection: z.number({ coerce: true }).default(0),
});

type FormValues = z.infer<typeof aircraftSchema>;

interface AircraftFormProps {
  tenantId: string;
  existingAircraft?: Aircraft;
  trigger?: React.ReactNode;
}

export function AircraftForm({ tenantId, existingAircraft, trigger }: AircraftFormProps) {
  const firestore = useFirestore();
  const { toast } = useToast();
  const [isOpen, setIsOpen] = useState(false);

  const form = useForm<FormValues>({
    resolver: zodResolver(aircraftSchema),
    defaultValues: existingAircraft ? {
      make: existingAircraft.make,
      model: existingAircraft.model,
      tailNumber: existingAircraft.tailNumber,
      type: existingAircraft.type || 'Single-Engine',
      currentHobbs: existingAircraft.currentHobbs || 0,
      currentTacho: existingAircraft.currentTacho || 0,
      tachoAtNext50Inspection: existingAircraft.tachoAtNext50Inspection || 0,
      tachoAtNext100Inspection: existingAircraft.tachoAtNext100Inspection || 0,
    } : {
      make: '',
      model: '',
      tailNumber: '',
      type: 'Single-Engine',
      currentHobbs: 0,
      currentTacho: 0,
      tachoAtNext50Inspection: 50,
      tachoAtNext100Inspection: 100,
    },
  });

  const onSubmit = (values: FormValues) => {
    if (!firestore) return;

    if (existingAircraft) {
      const aircraftRef = doc(firestore, `tenants/${tenantId}/aircrafts`, existingAircraft.id);
      updateDocumentNonBlocking(aircraftRef, values);
      toast({ title: 'Aircraft Updated' });
    } else {
      const aircraftCollection = collection(firestore, `tenants/${tenantId}/aircrafts`);
      addDocumentNonBlocking(aircraftCollection, { ...values, documents: [], components: [], maintenanceLogs: [] });
      toast({ title: 'Aircraft Added' });
    }
    setIsOpen(false);
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        {trigger || (
          <Button>
            <PlusCircle className="mr-2 h-4 w-4" />
            Add Aircraft
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>{existingAircraft ? 'Edit Aircraft' : 'Add New Aircraft'}</DialogTitle>
          <DialogDescription>
            Enter the primary details and initial meter readings for the aircraft.
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <FormField control={form.control} name="make" render={({ field }) => ( <FormItem><FormLabel>Make</FormLabel><FormControl><Input placeholder="e.g. Cessna" {...field} /></FormControl><FormMessage /></FormItem> )} />
              <FormField control={form.control} name="model" render={({ field }) => ( <FormItem><FormLabel>Model</FormLabel><FormControl><Input placeholder="e.g. 172S" {...field} /></FormControl><FormMessage /></FormItem> )} />
              <FormField control={form.control} name="tailNumber" render={({ field }) => ( <FormItem><FormLabel>Tail Number</FormLabel><FormControl><Input placeholder="e.g. ZS-XYZ" {...field} /></FormControl><FormMessage /></FormItem> )} />
              <FormField control={form.control} name="type" render={({ field }) => ( <FormItem><FormLabel>Type</FormLabel><Select onValueChange={field.onChange} defaultValue={field.value}><FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl><SelectContent><SelectItem value="Single-Engine">Single-Engine</SelectItem><SelectItem value="Multi-Engine">Multi-Engine</SelectItem></SelectContent></Select><FormMessage /></FormItem> )} />
            </div>
            <Separator />
            <div className="grid grid-cols-2 gap-4">
              <FormField control={form.control} name="currentHobbs" render={({ field }) => ( <FormItem><FormLabel>Current Hobbs</FormLabel><FormControl><Input type="number" step="0.1" {...field} /></FormControl><FormMessage /></FormItem> )} />
              <FormField control={form.control} name="currentTacho" render={({ field }) => ( <FormItem><FormLabel>Current Tacho</FormLabel><FormControl><Input type="number" step="0.1" {...field} /></FormControl><FormMessage /></FormItem> )} />
              <FormField control={form.control} name="tachoAtNext50Inspection" render={({ field }) => ( <FormItem><FormLabel>Next 50hr Tacho</FormLabel><FormControl><Input type="number" step="0.1" {...field} /></FormControl><FormMessage /></FormItem> )} />
              <FormField control={form.control} name="tachoAtNext100Inspection" render={({ field }) => ( <FormItem><FormLabel>Next 100hr Tacho</FormLabel><FormControl><Input type="number" step="0.1" {...field} /></FormControl><FormMessage /></FormItem> )} />
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

import { Separator } from '@/components/ui/separator';
