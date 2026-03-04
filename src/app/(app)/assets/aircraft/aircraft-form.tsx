
'use client';

import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { doc, collection } from 'firebase/firestore';
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useFirestore, addDocumentNonBlocking, updateDocumentNonBlocking } from '@/firebase';
import { useToast } from '@/hooks/use-toast';
import { PlusCircle } from 'lucide-react';
import type { Aircraft } from '@/types/aircraft';
import { Separator } from '@/components/ui/separator';

const aircraftFormSchema = z.object({
  make: z.string().min(1, 'Make is required.'),
  model: z.string().min(1, 'Model is required.'),
  tailNumber: z.string().min(1, 'Tail number is required.'),
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
  tenantId: string;
  existingAircraft?: Aircraft;
  trigger?: React.ReactNode;
}

export function AircraftForm({ tenantId, existingAircraft, trigger }: AircraftFormProps) {
  const firestore = useFirestore();
  const { toast } = useToast();
  const [isOpen, setIsOpen] = useState(false);

  const form = useForm<AircraftFormValues>({
    resolver: zodResolver(aircraftFormSchema),
    defaultValues: existingAircraft ? {
        make: existingAircraft.make,
        model: existingAircraft.model,
        tailNumber: existingAircraft.tailNumber,
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
      type: 'Single-Engine',
      initialHobbs: 0,
      currentHobbs: 0,
      initialTacho: 0,
      currentTacho: 0,
    },
  });

  useEffect(() => {
    if (isOpen) {
        form.reset(existingAircraft ? {
            make: existingAircraft.make,
            model: existingAircraft.model,
            tailNumber: existingAircraft.tailNumber,
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
            type: 'Single-Engine',
            initialHobbs: 0,
            currentHobbs: 0,
            initialTacho: 0,
            currentTacho: 0,
        });
    }
  }, [isOpen, existingAircraft, form]);

  const onSubmit = async (values: AircraftFormValues) => {
    if (!firestore) return;

    if (existingAircraft) {
      const aircraftRef = doc(firestore, 'tenants', tenantId, 'aircrafts', existingAircraft.id);
      updateDocumentNonBlocking(aircraftRef, values);
      toast({ title: 'Aircraft Updated', description: `${values.tailNumber} details have been saved.` });
    } else {
      const aircraftCollection = collection(firestore, 'tenants', tenantId, 'aircrafts');
      addDocumentNonBlocking(aircraftCollection, values);
      toast({ title: 'Aircraft Added', description: `New aircraft ${values.tailNumber} has been created.` });
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
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>{existingAircraft ? 'Edit' : 'Add'} Aircraft</DialogTitle>
          <DialogDescription>
            {existingAircraft ? 'Update registration and meter details.' : 'Register a new aircraft in your fleet.'}
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <FormField control={form.control} name="make" render={({ field }) => (<FormItem><FormLabel>Make</FormLabel><FormControl><Input placeholder="e.g., Cessna" {...field} /></FormControl><FormMessage /></FormItem>)} />
              <FormField control={form.control} name="model" render={({ field }) => (<FormItem><FormLabel>Model</FormLabel><FormControl><Input placeholder="e.g., 172S" {...field} /></FormControl><FormMessage /></FormItem>)} />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <FormField control={form.control} name="tailNumber" render={({ field }) => (<FormItem><FormLabel>Tail Number</FormLabel><FormControl><Input placeholder="e.g., ZS-FST" {...field} /></FormControl><FormMessage /></FormItem>)} />
              <FormField control={form.control} name="type" render={({ field }) => (<FormItem><FormLabel>Type</FormLabel><Select onValueChange={field.onChange} value={field.value}><FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl><SelectContent><SelectItem value="Single-Engine">Single-Engine</SelectItem><SelectItem value="Multi-Engine">Multi-Engine</SelectItem></SelectContent></Select><FormMessage /></FormItem>)} />
            </div>
            
            <Separator />
            
            <div className="grid grid-cols-2 gap-4">
              <FormField control={form.control} name="initialHobbs" render={({ field }) => (<FormItem><FormLabel>Initial Hobbs</FormLabel><FormControl><Input type="number" step="0.1" {...field} /></FormControl></FormItem>)} />
              <FormField control={form.control} name="currentHobbs" render={({ field }) => (<FormItem><FormLabel>Current Hobbs</FormLabel><FormControl><Input type="number" step="0.1" {...field} /></FormControl></FormItem>)} />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <FormField control={form.control} name="initialTacho" render={({ field }) => (<FormItem><FormLabel>Initial Tacho</FormLabel><FormControl><Input type="number" step="0.1" {...field} /></FormControl></FormItem>)} />
              <FormField control={form.control} name="currentTacho" render={({ field }) => (<FormItem><FormLabel>Current Tacho</FormLabel><FormControl><Input type="number" step="0.1" {...field} /></FormControl></FormItem>)} />
            </div>
            
            <Separator />
            
            <div className="grid grid-cols-2 gap-4">
              <FormField control={form.control} name="tachoAtNext50Inspection" render={({ field }) => (<FormItem><FormLabel>Next 50hr Due (Tacho)</FormLabel><FormControl><Input type="number" step="0.1" {...field} /></FormControl></FormItem>)} />
              <FormField control={form.control} name="tachoAtNext100Inspection" render={({ field }) => (<FormItem><FormLabel>Next 100hr Due (Tacho)</FormLabel><FormControl><Input type="number" step="0.1" {...field} /></FormControl></FormItem>)} />
            </div>

            <DialogFooter>
              <DialogClose asChild>
                <Button type="button" variant="outline">Cancel</Button>
              </DialogClose>
              <Button type="submit">Save Aircraft</Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
