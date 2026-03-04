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
import { collection, doc } from 'firebase/firestore';
import { useToast } from '@/hooks/use-toast';
import { Separator } from '@/components/ui/separator';
import type { Aircraft } from '@/types/aircraft';

const formSchema = z.object({
  make: z.string().min(1, 'Make is required'),
  model: z.string().min(1, 'Model is required'),
  tailNumber: z.string().min(1, 'Tail number is required'),
  abbreviation: z.string().max(5).optional(),
  type: z.enum(['Single-Engine', 'Multi-Engine']),
  initialHobbs: z.number({ coerce: true }).min(0),
  currentHobbs: z.number({ coerce: true }).min(0),
  initialTacho: z.number({ coerce: true }).min(0),
  currentTacho: z.number({ coerce: true }).min(0),
  tachoAtNext50Inspection: z.number({ coerce: true }).optional(),
  tachoAtNext100Inspection: z.number({ coerce: true }).optional(),
});

type FormValues = z.infer<typeof formSchema>;

interface AircraftFormProps {
  tenantId: string;
  existingAircraft?: Aircraft;
  trigger?: React.ReactNode;
}

export function AircraftForm({ tenantId, existingAircraft, trigger }: AircraftFormProps) {
  const [isOpen, setIsOpen] = useState(false);
  const firestore = useFirestore();
  const { toast } = useToast();

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: existingAircraft ? {
      make: existingAircraft.make,
      model: existingAircraft.model,
      tailNumber: existingAircraft.tailNumber,
      abbreviation: existingAircraft.abbreviation || '',
      type: existingAircraft.type || 'Single-Engine',
      initialHobbs: existingAircraft.initialHobbs || 0,
      currentHobbs: existingAircraft.currentHobbs || 0,
      initialTacho: existingAircraft.initialTacho || 0,
      currentTacho: existingAircraft.currentTacho || 0,
      tachoAtNext50Inspection: existingAircraft.tachoAtNext50Inspection,
      tachoAtNext100Inspection: existingAircraft.tachoAtNext100Inspection,
    } : {
      make: '',
      model: '',
      tailNumber: '',
      abbreviation: '',
      type: 'Single-Engine',
      initialHobbs: 0,
      currentHobbs: 0,
      initialTacho: 0,
      currentTacho: 0,
    },
  });

  const onSubmit = async (values: FormValues) => {
    if (!firestore) return;

    if (existingAircraft) {
      const aircraftRef = doc(firestore, `tenants/${tenantId}/aircrafts`, existingAircraft.id);
      updateDocumentNonBlocking(aircraftRef, values);
      toast({ title: 'Aircraft Updated' });
    } else {
      const aircraftsCollection = collection(firestore, `tenants/${tenantId}/aircrafts`);
      addDocumentNonBlocking(aircraftsCollection, values);
      toast({ title: 'Aircraft Added' });
    }
    setIsOpen(false);
    if (!existingAircraft) form.reset();
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        {trigger || <Button><PlusCircle className="mr-2 h-4 w-4" /> Add Aircraft</Button>}
      </DialogTrigger>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>{existingAircraft ? 'Edit' : 'Add New'} Aircraft</DialogTitle>
          <DialogDescription>Enter the primary registration and meter details.</DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <div className="grid grid-cols-2 gap-4">
              <FormField control={form.control} name="tailNumber" render={({ field }) => (<FormItem><FormLabel>Tail Number</FormLabel><FormControl><Input placeholder="e.g. ZS-ABC" {...field} /></FormControl><FormMessage /></FormItem>)} />
              <FormField control={form.control} name="abbreviation" render={({ field }) => (<FormItem><FormLabel>Abbreviation</FormLabel><FormControl><Input placeholder="ABC" {...field} /></FormControl><FormMessage /></FormItem>)} />
              <FormField control={form.control} name="make" render={({ field }) => (<FormItem><FormLabel>Make</FormLabel><FormControl><Input placeholder="e.g. Cessna" {...field} /></FormControl><FormMessage /></FormItem>)} />
              <FormField control={form.control} name="model" render={({ field }) => (<FormItem><FormLabel>Model</FormLabel><FormControl><Input placeholder="e.g. 172S" {...field} /></FormControl><FormMessage /></FormItem>)} />
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
              <FormField control={form.control} name="tachoAtNext50Inspection" render={({ field }) => (<FormItem><FormLabel>Next 50hr Due (Tacho)</FormLabel><FormControl><Input type="number" step="0.1" {...field} /></FormControl></FormItem>)} />
              <FormField control={form.control} name="tachoAtNext100Inspection" render={({ field }) => (<FormItem><FormLabel>Next 100hr Due (Tacho)</FormLabel><FormControl><Input type="number" step="0.1" {...field} /></FormControl></FormItem>)} />
            </div>
            <DialogFooter>
              <DialogClose asChild><Button variant="outline">Cancel</Button></DialogClose>
              <Button type="submit">Save Aircraft</Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
