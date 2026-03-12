
'use client';

import { useState, useEffect } from 'react';
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
import { useFirestore, addDocumentNonBlocking, updateDocumentNonBlocking } from '@/firebase';
import { doc, collection } from 'firebase/firestore';
import { useToast } from '@/hooks/use-toast';
import type { Aircraft } from '@/types/aircraft';

const formSchema = z.object({
  make: z.string().min(1, 'Make is required.'),
  model: z.string().min(1, 'Model is required.'),
  tailNumber: z.string().min(1, 'Tail Number is required.'),
  type: z.enum(['Single-Engine', 'Multi-Engine']),
  currentHobbs: z.number({ coerce: true }).min(0),
  currentTacho: z.number({ coerce: true }).min(0),
  tachoAtNext50Inspection: z.number({ coerce: true }).optional(),
  tachoAtNext100Inspection: z.number({ coerce: true }).optional(),
});

type FormValues = z.infer<typeof formSchema>;

interface AircraftFormProps {
  tenantId: string;
  organizationId: string | null;
  existingAircraft?: Aircraft;
  trigger?: React.ReactNode;
}

export function AircraftForm({ tenantId, organizationId, existingAircraft, trigger }: AircraftFormProps) {
  const firestore = useFirestore();
  const { toast } = useToast();
  const [isOpen, setIsOpen] = useState(false);

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: existingAircraft ? {
        make: existingAircraft.make,
        model: existingAircraft.model,
        tailNumber: existingAircraft.tailNumber,
        type: existingAircraft.type || 'Single-Engine',
        currentHobbs: existingAircraft.currentHobbs || 0,
        currentTacho: existingAircraft.currentTacho || 0,
        tachoAtNext50Inspection: existingAircraft.tachoAtNext50Inspection,
        tachoAtNext100Inspection: existingAircraft.tachoAtNext100Inspection,
    } : {
      make: '',
      model: '',
      tailNumber: '',
      type: 'Single-Engine',
      currentHobbs: 0,
      currentTacho: 0,
    },
  });

  useEffect(() => {
    if (isOpen && existingAircraft) {
        form.reset(existingAircraft);
    }
  }, [isOpen, existingAircraft, form]);

  const onSubmit = async (values: FormValues) => {
    if (!firestore || !tenantId) return;

    const dataToSave = {
        ...values,
        organizationId: organizationId,
    };

    try {
        if (existingAircraft) {
            const aircraftRef = doc(firestore, `tenants/${tenantId}/aircrafts`, existingAircraft.id);
            updateDocumentNonBlocking(aircraftRef, dataToSave);
            toast({ title: 'Aircraft Updated' });
        } else {
            const aircraftsCollection = collection(firestore, `tenants/${tenantId}/aircrafts`);
            addDocumentNonBlocking(aircraftsCollection, dataToSave);
            toast({ title: 'Aircraft Added' });
        }
        setIsOpen(false);
        if (!existingAircraft) form.reset();
    } catch (error: any) {
        toast({ variant: 'destructive', title: 'Save Failed', description: error.message });
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      {trigger ? (
        <DialogTrigger asChild>{trigger}</DialogTrigger>
      ) : (
        <DialogTrigger asChild>
          <Button>
            <PlusCircle className="mr-2 h-4 w-4" /> Add Aircraft
          </Button>
        </DialogTrigger>
      )}
      <DialogContent className="sm:max-w-xl">
        <DialogHeader>
          <DialogTitle>{existingAircraft ? 'Edit Aircraft' : 'Add New Aircraft'}</DialogTitle>
          <DialogDescription>
            Enter the technical details and current hours for the aircraft.
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 pt-4">
            <div className="grid grid-cols-2 gap-4">
                <FormField control={form.control} name="make" render={({ field }) => ( <FormItem><FormLabel>Manufacturer</FormLabel><FormControl><Input placeholder="e.g., Piper" {...field} /></FormControl><FormMessage /></FormItem> )} />
                <FormField control={form.control} name="model" render={({ field }) => ( <FormItem><FormLabel>Model</FormLabel><FormControl><Input placeholder="e.g., PA-28-181" {...field} /></FormControl><FormMessage /></FormItem> )} />
                <FormField control={form.control} name="tailNumber" render={({ field }) => ( <FormItem><FormLabel>Registration</FormLabel><FormControl><Input placeholder="e.g., G-ABCD" {...field} /></FormControl><FormMessage /></FormItem> )} />
                <FormField control={form.control} name="type" render={({ field }) => ( <FormItem><FormLabel>Type</FormLabel><Select onValueChange={field.onChange} defaultValue={field.value}><FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl><SelectContent><SelectItem value="Single-Engine">Single-Engine</SelectItem><SelectItem value="Multi-Engine">Multi-Engine</SelectItem></SelectContent></Select><FormMessage /></FormItem> )} />
            </div>
            
            <div className="grid grid-cols-2 gap-4 border-t pt-4">
                <FormField control={form.control} name="currentHobbs" render={({ field }) => ( <FormItem><FormLabel>Current Hobbs</FormLabel><FormControl><Input type="number" step="0.1" {...field} /></FormControl><FormMessage /></FormItem> )} />
                <FormField control={form.control} name="currentTacho" render={({ field }) => ( <FormItem><FormLabel>Current Tacho</FormLabel><FormControl><Input type="number" step="0.1" {...field} /></FormControl><FormMessage /></FormItem> )} />
                <FormField control={form.control} name="tachoAtNext50Inspection" render={({ field }) => ( <FormItem><FormLabel>Next 50hr (Tacho)</FormLabel><FormControl><Input type="number" step="0.1" {...field} /></FormControl><FormMessage /></FormItem> )} />
                <FormField control={form.control} name="tachoAtNext100Inspection" render={({ field }) => ( <FormItem><FormLabel>Next 100hr (Tacho)</FormLabel><FormControl><Input type="number" step="0.1" {...field} /></FormControl><FormMessage /></FormItem> )} />
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
