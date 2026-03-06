'use client';

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogDescription, 
  DialogFooter, 
  DialogClose,
  DialogTrigger
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useFirestore, addDocumentNonBlocking, updateDocumentNonBlocking } from '@/firebase';
import { collection, doc } from 'firebase/firestore';
import { useToast } from '@/hooks/use-toast';
import type { Aircraft } from '@/types/aircraft';

const aircraftSchema = z.object({
  tailNumber: z.string().min(1, "Tail number is required"),
  make: z.string().min(1, "Manufacturer is required"),
  model: z.string().min(1, "Model is required"),
  type: z.enum(["Single-Engine", "Multi-Engine"]),
  currentHobbs: z.number({ coerce: true }).min(0),
  currentTacho: z.number({ coerce: true }).min(0),
  tachoAtNext50Inspection: z.number({ coerce: true }).min(0),
  tachoAtNext100Inspection: z.number({ coerce: true }).min(0),
});

type FormValues = z.infer<typeof aircraftSchema>;

interface AircraftFormProps {
  tenantId: string;
  isOpen: boolean;
  setIsOpen: (open: boolean) => void;
  existingAircraft?: Aircraft;
  trigger?: React.ReactNode;
}

export function AircraftForm({ tenantId, isOpen, setIsOpen, existingAircraft, trigger }: AircraftFormProps) {
  const firestore = useFirestore();
  const { toast } = useToast();

  const form = useForm<FormValues>({
    resolver: zodResolver(aircraftSchema),
    defaultValues: existingAircraft ? {
      tailNumber: existingAircraft.tailNumber,
      make: existingAircraft.make,
      model: existingAircraft.model,
      type: existingAircraft.type as any,
      currentHobbs: existingAircraft.currentHobbs || 0,
      currentTacho: existingAircraft.currentTacho || 0,
      tachoAtNext50Inspection: existingAircraft.tachoAtNext50Inspection || 0,
      tachoAtNext100Inspection: existingAircraft.tachoAtNext100Inspection || 0,
    } : {
      tailNumber: '',
      make: '',
      model: '',
      type: 'Single-Engine',
      currentHobbs: 0,
      currentTacho: 0,
      tachoAtNext50Inspection: 0,
      tachoAtNext100Inspection: 0,
    },
  });

  const onSubmit = (values: FormValues) => {
    if (!firestore) return;

    if (existingAircraft) {
      const aircraftRef = doc(firestore, `tenants/${tenantId}/aircrafts`, existingAircraft.id);
      updateDocumentNonBlocking(aircraftRef, values);
      toast({ title: "Aircraft Updated" });
    } else {
      const fleetRef = collection(firestore, `tenants/${tenantId}/aircrafts`);
      addDocumentNonBlocking(fleetRef, values);
      toast({ title: "Aircraft Added" });
    }
    setIsOpen(false);
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      {trigger && <DialogTrigger asChild>{trigger}</DialogTrigger>}
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{existingAircraft ? 'Edit' : 'Add'} Aircraft</DialogTitle>
          <DialogDescription>Define basic aircraft details and current meter readings.</DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <FormField control={form.control} name="tailNumber" render={({ field }) => ( <FormItem><FormLabel>Tail Number</FormLabel><FormControl><Input placeholder="e.g. ZS-ABC" {...field} /></FormControl><FormMessage /></FormItem> )} />
              <FormField control={form.control} name="type" render={({ field }) => ( <FormItem><FormLabel>Engine Type</FormLabel><Select onValueChange={field.onChange} defaultValue={field.value}><FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl><SelectContent><SelectItem value="Single-Engine">Single-Engine</SelectItem><SelectItem value="Multi-Engine">Multi-Engine</SelectItem></SelectContent></Select><FormMessage /></FormItem> )} />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <FormField control={form.control} name="make" render={({ field }) => ( <FormItem><FormLabel>Manufacturer</FormLabel><FormControl><Input placeholder="e.g. Cessna" {...field} /></FormControl><FormMessage /></FormItem> )} />
              <FormField control={form.control} name="model" render={({ field }) => ( <FormItem><FormLabel>Model</FormLabel><FormControl><Input placeholder="e.g. 172R" {...field} /></FormControl><FormMessage /></FormItem> )} />
            </div>
            <div className="grid grid-cols-2 gap-4 border-t pt-4">
              <FormField control={form.control} name="currentHobbs" render={({ field }) => ( <FormItem><FormLabel>Current Hobbs</FormLabel><FormControl><Input type="number" step="0.1" {...field} /></FormControl><FormMessage /></FormItem> )} />
              <FormField control={form.control} name="currentTacho" render={({ field }) => ( <FormItem><FormLabel>Current Tacho</FormLabel><FormControl><Input type="number" step="0.1" {...field} /></FormControl><FormMessage /></FormItem> )} />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <FormField control={form.control} name="tachoAtNext50Inspection" render={({ field }) => ( <FormItem><FormLabel>Next 50hr Due (Tacho)</FormLabel><FormControl><Input type="number" step="0.1" {...field} /></FormControl><FormMessage /></FormItem> )} />
              <FormField control={form.control} name="tachoAtNext100Inspection" render={({ field }) => ( <FormItem><FormLabel>Next 100hr Due (Tacho)</FormLabel><FormControl><Input type="number" step="0.1" {...field} /></FormControl><FormMessage /></FormItem> )} />
            </div>
            <DialogFooter className="pt-4">
              <DialogClose asChild><Button variant="outline">Cancel</Button></DialogClose>
              <Button type="submit">Save Aircraft</Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
