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
import { PlusCircle } from 'lucide-react';
import { useFirestore, addDocumentNonBlocking } from '@/firebase';
import { collection } from 'firebase/firestore';
import { useToast } from '@/hooks/use-toast';

const aircraftSchema = z.object({
  tailNumber: z.string().min(1, 'Tail number is required.'),
  make: z.string().min(1, 'Manufacturer is required.'),
  model: z.string().min(1, 'Model is required.'),
  type: z.enum(['Single-Engine', 'Multi-Engine']),
  currentHobbs: z.number({ coerce: true }).min(0),
  currentTacho: z.number({ coerce: true }).min(0),
});

type AircraftFormValues = z.infer<typeof aircraftSchema>;

export function AircraftForm({ tenantId }: { tenantId: string }) {
  const [isOpen, setIsOpen] = useState(false);
  const firestore = useFirestore();
  const { toast } = useToast();

  const form = useForm<AircraftFormValues>({
    resolver: zodResolver(aircraftSchema),
    defaultValues: {
      tailNumber: '',
      make: '',
      model: '',
      type: 'Single-Engine',
      currentHobbs: 0,
      currentTacho: 0,
    },
  });

  const onSubmit = (values: AircraftFormValues) => {
    if (!firestore) return;
    const aircraftCollection = collection(firestore, `tenants/${tenantId}/aircrafts`);
    addDocumentNonBlocking(aircraftCollection, values);
    toast({
      title: 'Aircraft Added',
      description: `${values.tailNumber} has been added to the fleet.`,
    });
    setIsOpen(false);
    form.reset();
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button>
          <PlusCircle className="mr-2 h-4 w-4" />
          Add Aircraft
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Add New Aircraft</DialogTitle>
          <DialogDescription>Enter the details for the new fleet asset.</DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 pt-4">
            <FormField control={form.control} name="tailNumber" render={({ field }) => ( <FormItem><FormLabel>Tail Number</FormLabel><FormControl><Input placeholder="e.g. ZS-ABC" {...field} /></FormControl><FormMessage /></FormItem> )} />
            <div className="grid grid-cols-2 gap-4">
              <FormField control={form.control} name="make" render={({ field }) => ( <FormItem><FormLabel>Manufacturer</FormLabel><FormControl><Input placeholder="e.g. Cessna" {...field} /></FormControl><FormMessage /></FormItem> )} />
              <FormField control={form.control} name="model" render={({ field }) => ( <FormItem><FormLabel>Model</FormLabel><FormControl><Input placeholder="e.g. 172R" {...field} /></FormControl><FormMessage /></FormItem> )} />
            </div>
            <FormField control={form.control} name="type" render={({ field }) => ( <FormItem><FormLabel>Engine Type</FormLabel><Select onValueChange={field.onChange} defaultValue={field.value}><FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl><SelectContent><SelectItem value="Single-Engine">Single-Engine</SelectItem><SelectItem value="Multi-Engine">Multi-Engine</SelectItem></SelectContent></Select><FormMessage /></FormItem> )} />
            <div className="grid grid-cols-2 gap-4">
              <FormField control={form.control} name="currentHobbs" render={({ field }) => ( <FormItem><FormLabel>Current Hobbs</FormLabel><FormControl><Input type="number" step="0.1" {...field} /></FormControl><FormMessage /></FormItem> )} />
              <FormField control={form.control} name="currentTacho" render={({ field }) => ( <FormItem><FormLabel>Current Tacho</FormLabel><FormControl><Input type="number" step="0.1" {...field} /></FormControl><FormMessage /></FormItem> )} />
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
