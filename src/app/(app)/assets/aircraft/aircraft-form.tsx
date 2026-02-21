'use client';

import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
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
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useFirestore, addDocumentNonBlocking, updateDocumentNonBlocking } from '@/firebase';
import { doc, collection } from 'firebase/firestore';
import { useToast } from '@/hooks/use-toast';
import type { Aircraft } from '@/types/aircraft';

const formSchema = z.object({
  tailNumber: z.string().min(1, 'Tail number is required.'),
  make: z.string().min(1, 'Make is required.'),
  model: z.string().min(1, 'Model is required.'),
  type: z.enum(['Single-Engine', 'Multi-Engine']),
  initialHobbs: z.coerce.number().optional(),
  currentHobbs: z.coerce.number().optional(),
  initialTacho: z.coerce.number().optional(),
  currentTacho: z.coerce.number().optional(),
});

type FormValues = z.infer<typeof formSchema>;

interface AircraftFormProps {
  isOpen: boolean;
  onClose: () => void;
  aircraft: Aircraft | null;
  tenantId: string;
}

export function AircraftForm({ isOpen, onClose, aircraft, tenantId }: AircraftFormProps) {
  const firestore = useFirestore();
  const { toast } = useToast();

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
        tailNumber: '',
        make: '',
        model: '',
        type: 'Single-Engine',
        initialHobbs: 0,
        currentHobbs: 0,
        initialTacho: 0,
        currentTacho: 0,
    },
  });

  useEffect(() => {
    if (isOpen) {
        if (aircraft) {
            form.reset(aircraft);
        } else {
            form.reset({
                tailNumber: '',
                make: '',
                model: '',
                type: 'Single-Engine',
                initialHobbs: 0,
                currentHobbs: 0,
                initialTacho: 0,
                currentTacho: 0,
            });
        }
    }
  }, [isOpen, aircraft, form]);


  const onSubmit = (values: FormValues) => {
    if (!firestore) return;
    
    if (aircraft) {
      // Update existing aircraft
      const aircraftRef = doc(firestore, `tenants/${tenantId}/aircrafts`, aircraft.id);
      updateDocumentNonBlocking(aircraftRef, values);
      toast({ title: 'Aircraft Updated' });
    } else {
      // Create new aircraft
      const aircraftsCollection = collection(firestore, `tenants/${tenantId}/aircrafts`);
      addDocumentNonBlocking(aircraftsCollection, values);
      toast({ title: 'Aircraft Created' });
    }
    onClose();
  };
  
  const handleOpenChange = (open: boolean) => {
    if (!open) {
      onClose();
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={handleOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{aircraft ? 'Edit Aircraft' : 'Create Aircraft'}</DialogTitle>
          <DialogDescription>
            {aircraft ? 'Update the details for this aircraft.' : 'Add a new aircraft to your fleet.'}
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <FormField control={form.control} name="tailNumber" render={({ field }) => ( <FormItem><FormLabel>Tail Number</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem> )} />
              <FormField control={form.control} name="type" render={({ field }) => ( <FormItem><FormLabel>Type</FormLabel><Select onValueChange={field.onChange} defaultValue={field.value}><FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl><SelectContent><SelectItem value="Single-Engine">Single-Engine</SelectItem><SelectItem value="Multi-Engine">Multi-Engine</SelectItem></SelectContent></Select><FormMessage /></FormItem> )}/>
              <FormField control={form.control} name="make" render={({ field }) => ( <FormItem><FormLabel>Make</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem> )} />
              <FormField control={form.control} name="model" render={({ field }) => ( <FormItem><FormLabel>Model</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem> )} />
              <FormField control={form.control} name="initialHobbs" render={({ field }) => ( <FormItem><FormLabel>Initial Hobbs</FormLabel><FormControl><Input type="number" {...field} /></FormControl><FormMessage /></FormItem> )} />
              <FormField control={form.control} name="currentHobbs" render={({ field }) => ( <FormItem><FormLabel>Current Hobbs</FormLabel><FormControl><Input type="number" {...field} /></FormControl><FormMessage /></FormItem> )} />
              <FormField control={form.control} name="initialTacho" render={({ field }) => ( <FormItem><FormLabel>Initial Tacho</FormLabel><FormControl><Input type="number" {...field} /></FormControl><FormMessage /></FormItem> )} />
              <FormField control={form.control} name="currentTacho" render={({ field }) => ( <FormItem><FormLabel>Current Tacho</FormLabel><FormControl><Input type="number" {...field} /></FormControl><FormMessage /></FormItem> )} />
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
              <Button type="submit">Save</Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
