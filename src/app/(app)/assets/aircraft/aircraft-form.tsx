
'use client';

import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogTrigger, DialogClose } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useFirestore, addDocumentNonBlocking, updateDocumentNonBlocking } from '@/firebase';
import { useToast } from '@/hooks/use-toast';
import { collection, doc } from 'firebase/firestore';
import { PlusCircle, Pencil } from 'lucide-react';
import type { Aircraft } from '@/types/aircraft';

const aircraftFormSchema = z.object({
  make: z.string().min(1, 'Make is required'),
  model: z.string().min(1, 'Model is required'),
  tailNumber: z.string().min(1, 'Tail number is required').toUpperCase(),
  type: z.enum(['Single-Engine', 'Multi-Engine']),
  initialHobbs: z.number({ coerce: true }).min(0),
  currentHobbs: z.number({ coerce: true }).min(0),
  initialTacho: z.number({ coerce: true }).min(0),
  currentTacho: z.number({ coerce: true }).min(0),
});

type AircraftFormValues = z.infer<typeof aircraftFormSchema>;

interface AircraftFormProps {
  tenantId: string;
  existingAircraft?: Aircraft;
  trigger?: React.ReactNode;
}

export function AircraftForm({ tenantId, existingAircraft, trigger }: AircraftFormProps) {
  const [isOpen, setIsOpen] = useState(false);
  const firestore = useFirestore();
  const { toast } = useToast();

  const form = useForm<AircraftFormValues>({
    resolver: zodResolver(aircraftFormSchema),
    defaultValues: {
      make: existingAircraft?.make || '',
      model: existingAircraft?.model || '',
      tailNumber: existingAircraft?.tailNumber || '',
      type: existingAircraft?.type || 'Single-Engine',
      initialHobbs: existingAircraft?.initialHobbs || 0,
      currentHobbs: existingAircraft?.currentHobbs || 0,
      initialTacho: existingAircraft?.initialTacho || 0,
      currentTacho: existingAircraft?.currentTacho || 0,
    },
  });

  useEffect(() => {
    if (isOpen && existingAircraft) {
      form.reset({
        make: existingAircraft.make,
        model: existingAircraft.model,
        tailNumber: existingAircraft.tailNumber,
        type: existingAircraft.type,
        initialHobbs: existingAircraft.initialHobbs,
        currentHobbs: existingAircraft.currentHobbs,
        initialTacho: existingAircraft.initialTacho,
        currentTacho: existingAircraft.currentTacho,
      });
    }
  }, [isOpen, existingAircraft, form]);

  const onSubmit = async (values: AircraftFormValues) => {
    if (!firestore) return;

    try {
      if (existingAircraft) {
        const aircraftRef = doc(firestore, `tenants/${tenantId}/aircrafts`, existingAircraft.id);
        updateDocumentNonBlocking(aircraftRef, values);
        toast({ title: 'Aircraft Updated' });
      } else {
        const aircraftCollection = collection(firestore, `tenants/${tenantId}/aircrafts`);
        addDocumentNonBlocking(aircraftCollection, values);
        toast({ title: 'Aircraft Added' });
      }
      setIsOpen(false);
    } catch (error: any) {
      toast({ variant: 'destructive', title: 'Error', description: error.message });
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        {trigger || (
          <Button variant={existingAircraft ? "outline" : "default"}>
            {existingAircraft ? (
              <><Pencil className="mr-2 h-4 w-4" /> Edit Aircraft</>
            ) : (
              <><PlusCircle className="mr-2 h-4 w-4" /> Add Aircraft</>
            )}
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>{existingAircraft ? 'Edit Aircraft' : 'Add New Aircraft'}</DialogTitle>
          <DialogDescription>
            Enter the details for the aircraft in your fleet.
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField control={form.control} name="make" render={({ field }) => (
                <FormItem><FormLabel>Make</FormLabel><FormControl><Input placeholder="e.g., Cessna" {...field} /></FormControl><FormMessage /></FormItem>
              )} />
              <FormField control={form.control} name="model" render={({ field }) => (
                <FormItem><FormLabel>Model</FormLabel><FormControl><Input placeholder="e.g., 172S" {...field} /></FormControl><FormMessage /></FormItem>
              )} />
              <FormField control={form.control} name="tailNumber" render={({ field }) => (
                <FormItem><FormLabel>Tail Number</FormLabel><FormControl><Input placeholder="e.g., ZS-TEZT" {...field} /></FormControl><FormMessage /></FormItem>
              )} />
              <FormField control={form.control} name="type" render={({ field }) => (
                <FormItem><FormLabel>Engine Type</FormLabel><Select onValueChange={field.onChange} value={field.value}><FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl><SelectContent><SelectItem value="Single-Engine">Single-Engine</SelectItem><SelectItem value="Multi-Engine">Multi-Engine</SelectItem></SelectContent></Select><FormMessage /></FormItem>
              )} />
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 p-4 border rounded-md bg-muted/20">
              <h4 className="col-span-full font-semibold text-sm">Meter Readings</h4>
              <FormField control={form.control} name="initialHobbs" render={({ field }) => (
                <FormItem><FormLabel className="text-xs">Initial Hobbs</FormLabel><FormControl><Input type="number" step="0.1" {...field} /></FormControl></FormItem>
              )} />
              <FormField control={form.control} name="currentHobbs" render={({ field }) => (
                <FormItem><FormLabel className="text-xs">Current Hobbs</FormLabel><FormControl><Input type="number" step="0.1" {...field} /></FormControl></FormItem>
              )} />
              <FormField control={form.control} name="initialTacho" render={({ field }) => (
                <FormItem><FormLabel className="text-xs">Initial Tacho</FormLabel><FormControl><Input type="number" step="0.1" {...field} /></FormControl></FormItem>
              )} />
              <FormField control={form.control} name="currentTacho" render={({ field }) => (
                <FormItem><FormLabel className="text-xs">Current Tacho</FormLabel><FormControl><Input type="number" step="0.1" {...field} /></FormControl></FormItem>
              )} />
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
