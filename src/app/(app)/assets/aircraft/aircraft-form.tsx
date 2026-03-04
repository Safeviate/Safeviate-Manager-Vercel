
'use client';

import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogClose } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useFirestore } from '@/firebase';
import { useToast } from '@/hooks/use-toast';
import { doc, collection } from 'firebase/firestore';
import { addDocumentNonBlocking, updateDocumentNonBlocking } from '@/firebase/non-blocking-updates';
import type { Aircraft } from '@/types/aircraft';

const aircraftFormSchema = z.object({
  tailNumber: z.string().min(1, 'Tail number is required.'),
  make: z.string().min(1, 'Make is required.'),
  model: z.string().min(1, 'Model is required.'),
  type: z.enum(['Single-Engine', 'Multi-Engine']),
  initialHobbs: z.number({ coerce: true }).min(0),
  currentHobbs: z.number({ coerce: true }).min(0),
  initialTacho: z.number({ coerce: true }).min(0),
  currentTacho: z.number({ coerce: true }).min(0),
  tachoAtNext50Inspection: z.number({ coerce: true }).optional(),
  tachoAtNext100Inspection: z.number({ coerce: true }).optional(),
});

type AircraftFormValues = z.infer<typeof aircraftFormSchema>;

interface AircraftFormProps {
  isOpen: boolean;
  onClose: () => void;
  existingAircraft?: Aircraft;
  tenantId: string;
}

export function AircraftForm({ isOpen, onClose, existingAircraft, tenantId }: AircraftFormProps) {
  const firestore = useFirestore();
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const form = useForm<AircraftFormValues>({
    resolver: zodResolver(aircraftFormSchema),
    defaultValues: {
      tailNumber: existingAircraft?.tailNumber || '',
      make: existingAircraft?.make || '',
      model: existingAircraft?.model || '',
      type: existingAircraft?.type || 'Single-Engine',
      initialHobbs: existingAircraft?.initialHobbs || 0,
      currentHobbs: existingAircraft?.currentHobbs || 0,
      initialTacho: existingAircraft?.initialTacho || 0,
      currentTacho: existingAircraft?.currentTacho || 0,
      tachoAtNext50Inspection: existingAircraft?.tachoAtNext50Inspection || 0,
      tachoAtNext100Inspection: existingAircraft?.tachoAtNext100Inspection || 0,
    },
  });

  useEffect(() => {
    if (isOpen && existingAircraft) {
      form.reset({
        tailNumber: existingAircraft.tailNumber,
        make: existingAircraft.make,
        model: existingAircraft.model,
        type: existingAircraft.type || 'Single-Engine',
        initialHobbs: existingAircraft.initialHobbs || 0,
        currentHobbs: existingAircraft.currentHobbs || 0,
        initialTacho: existingAircraft.initialTacho || 0,
        currentTacho: existingAircraft.currentTacho || 0,
        tachoAtNext50Inspection: existingAircraft.tachoAtNext50Inspection || 0,
        tachoAtNext100Inspection: existingAircraft.tachoAtNext100Inspection || 0,
      });
    } else if (isOpen) {
      form.reset({
        tailNumber: '',
        make: '',
        model: '',
        type: 'Single-Engine',
        initialHobbs: 0,
        currentHobbs: 0,
        initialTacho: 0,
        currentTacho: 0,
        tachoAtNext50Inspection: 0,
        tachoAtNext100Inspection: 0,
      });
    }
  }, [isOpen, existingAircraft, form]);

  const onSubmit = async (data: AircraftFormValues) => {
    if (!firestore) return;
    setIsSubmitting(true);

    try {
      if (existingAircraft) {
        const aircraftRef = doc(firestore, `tenants/${tenantId}/aircrafts`, existingAircraft.id);
        updateDocumentNonBlocking(aircraftRef, data);
        toast({ title: 'Aircraft Updated' });
      } else {
        const aircraftsCol = collection(firestore, `tenants/${tenantId}/aircrafts`);
        addDocumentNonBlocking(aircraftsCol, data);
        toast({ title: 'Aircraft Added' });
      }
      onClose();
    } catch (error: any) {
      toast({ variant: 'destructive', title: 'Error', description: error.message });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>{existingAircraft ? 'Edit Aircraft' : 'Add New Aircraft'}</DialogTitle>
          <DialogDescription>Update fleet details and hour tracking.</DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <FormField control={form.control} name="tailNumber" render={({ field }) => ( <FormItem><FormLabel>Tail Number</FormLabel><FormControl><Input placeholder="e.g., ZS-ABC" {...field} /></FormControl><FormMessage /></FormItem> )} />
              <FormField control={form.control} name="type" render={({ field }) => ( <FormItem><FormLabel>Type</FormLabel><Select onValueChange={field.onChange} value={field.value}><FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl><SelectContent><SelectItem value="Single-Engine">Single-Engine</SelectItem><SelectItem value="Multi-Engine">Multi-Engine</SelectItem></SelectContent></Select><FormMessage /></FormItem> )} />
              <FormField control={form.control} name="make" render={({ field }) => ( <FormItem><FormLabel>Make</FormLabel><FormControl><Input placeholder="e.g., Cessna" {...field} /></FormControl><FormMessage /></FormItem> )} />
              <FormField control={form.control} name="model" render={({ field }) => ( <FormItem><FormLabel>Model</FormLabel><FormControl><Input placeholder="e.g., 172N" {...field} /></FormControl><FormMessage /></FormItem> )} />
            </div>
            <Separator className="my-4" />
            <h4 className="font-semibold text-sm uppercase text-muted-foreground">Meter Readings</h4>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <FormField control={form.control} name="currentHobbs" render={({ field }) => ( <FormItem><FormLabel>Current Hobbs</FormLabel><FormControl><Input type="number" step="0.1" {...field} /></FormControl></FormItem> )} />
              <FormField control={form.control} name="currentTacho" render={({ field }) => ( <FormItem><FormLabel>Current Tacho</FormLabel><FormControl><Input type="number" step="0.1" {...field} /></FormControl></FormItem> )} />
              <FormField control={form.control} name="tachoAtNext50Inspection" render={({ field }) => ( <FormItem><FormLabel>Next 50hr</FormLabel><FormControl><Input type="number" step="0.1" {...field} /></FormControl></FormItem> )} />
              <FormField control={form.control} name="tachoAtNext100Inspection" render={({ field }) => ( <FormItem><FormLabel>Next 100hr</FormLabel><FormControl><Input type="number" step="0.1" {...field} /></FormControl></FormItem> )} />
            </div>
            <DialogFooter className="pt-4">
              <DialogClose asChild><Button variant="outline">Cancel</Button></DialogClose>
              <Button type="submit" disabled={isSubmitting}>{isSubmitting ? 'Saving...' : 'Save Aircraft'}</Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}

const Separator = ({ className }: { className?: string }) => <div className={cn("h-px bg-border", className)} />;
