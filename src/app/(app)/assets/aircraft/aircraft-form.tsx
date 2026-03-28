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
import { useFirestore } from '@/firebase';
import { collection, doc, addDoc, updateDoc } from 'firebase/firestore';
import { useToast } from '@/hooks/use-toast';
import type { Aircraft } from '@/types/aircraft';

const formSchema = z.object({
  make: z.string().min(1, 'Make is required'),
  model: z.string().min(1, 'Model is required'),
  tailNumber: z.string().min(1, 'Tail number is required'),
  type: z.enum(['Single-Engine', 'Multi-Engine']),
  currentHobbs: z.coerce.number().min(0),
  currentTacho: z.coerce.number().min(0),
  tachoAtNext50Inspection: z.coerce.number().min(0),
  tachoAtNext100Inspection: z.coerce.number().min(0),
});

interface AircraftFormProps {
  tenantId: string;
  existingAircraft?: Aircraft;
  onCancel?: () => void;
  trigger?: React.ReactNode;
  organizationId?: string | null;
}

export function AircraftForm({ tenantId, existingAircraft, onCancel, trigger }: AircraftFormProps) {
  const [isOpen, setIsOpen] = useState(false);
  const firestore = useFirestore();
  const { toast } = useToast();
  const isEditing = Boolean(existingAircraft);

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      make: existingAircraft?.make || '',
      model: existingAircraft?.model || '',
      tailNumber: existingAircraft?.tailNumber || '',
      type: existingAircraft?.type || 'Single-Engine',
      currentHobbs: existingAircraft?.currentHobbs ?? existingAircraft?.frameHours ?? 0,
      currentTacho: existingAircraft?.currentTacho ?? existingAircraft?.engineHours ?? 0,
      tachoAtNext50Inspection: existingAircraft?.tachoAtNext50Inspection ?? 50,
      tachoAtNext100Inspection: existingAircraft?.tachoAtNext100Inspection ?? 100,
    },
  });

  const onSubmit = async (values: z.infer<typeof formSchema>) => {
    if (!firestore) return;

    try {
      const payload = {
        ...values,
        frameHours: values.currentHobbs,
        engineHours: values.currentTacho,
      };

      if (existingAircraft) {
        await updateDoc(doc(firestore, `tenants/${tenantId}/aircrafts`, existingAircraft.id), payload);
        toast({ title: 'Aircraft Updated', description: `${values.tailNumber} has been updated.` });
        onCancel?.();
      } else {
        const colRef = collection(firestore, `tenants/${tenantId}/aircrafts`);
        await addDoc(colRef, {
          ...payload,
          components: [],
          documents: [],
        });
        toast({ title: 'Aircraft Added', description: `${values.tailNumber} has been added to the fleet.` });
        setIsOpen(false);
        form.reset();
      }
    } catch (error: any) {
      toast({ variant: 'destructive', title: 'Error', description: error.message });
    }
  };

  const formContent = (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <FormField control={form.control} name="make" render={({ field }) => (
            <FormItem><FormLabel>Make</FormLabel><FormControl><Input placeholder="e.g. Cessna" {...field} /></FormControl><FormMessage /></FormItem>
          )} />
          <FormField control={form.control} name="model" render={({ field }) => (
            <FormItem><FormLabel>Model</FormLabel><FormControl><Input placeholder="e.g. 172" {...field} /></FormControl><FormMessage /></FormItem>
          )} />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <FormField control={form.control} name="tailNumber" render={({ field }) => (
            <FormItem><FormLabel>Tail Number</FormLabel><FormControl><Input placeholder="ZS-ABC" {...field} /></FormControl><FormMessage /></FormItem>
          )} />
          <FormField control={form.control} name="type" render={({ field }) => (
            <FormItem><FormLabel>Engine Type</FormLabel>
              <Select onValueChange={field.onChange} defaultValue={field.value}>
                <FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl>
                <SelectContent>
                  <SelectItem value="Single-Engine">Single-Engine</SelectItem>
                  <SelectItem value="Multi-Engine">Multi-Engine</SelectItem>
                </SelectContent>
              </Select>
            </FormItem>
          )} />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <FormField control={form.control} name="currentHobbs" render={({ field }) => (
            <FormItem><FormLabel>Current Hobbs</FormLabel><FormControl><Input type="number" step="0.1" {...field} /></FormControl><FormMessage /></FormItem>
          )} />
          <FormField control={form.control} name="currentTacho" render={({ field }) => (
            <FormItem><FormLabel>Current Tacho</FormLabel><FormControl><Input type="number" step="0.1" {...field} /></FormControl><FormMessage /></FormItem>
          )} />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <FormField control={form.control} name="tachoAtNext50Inspection" render={({ field }) => (
            <FormItem><FormLabel>Next 50h Tacho</FormLabel><FormControl><Input type="number" step="0.1" {...field} /></FormControl><FormMessage /></FormItem>
          )} />
          <FormField control={form.control} name="tachoAtNext100Inspection" render={({ field }) => (
            <FormItem><FormLabel>Next 100h Tacho</FormLabel><FormControl><Input type="number" step="0.1" {...field} /></FormControl><FormMessage /></FormItem>
          )} />
        </div>
        <DialogFooter>
          {isEditing ? (
            <Button type="button" variant="outline" onClick={() => onCancel?.()}>Cancel</Button>
          ) : (
            <DialogClose asChild><Button variant="outline">Cancel</Button></DialogClose>
          )}
          <Button type="submit">{isEditing ? 'Save Changes' : 'Save Aircraft'}</Button>
        </DialogFooter>
      </form>
    </Form>
  );

  if (isEditing) {
    if (trigger) {
      return (
        <Dialog open={isOpen} onOpenChange={setIsOpen}>
          <DialogTrigger asChild>{trigger}</DialogTrigger>
          <DialogContent className="sm:max-w-[500px]">
            <DialogHeader>
              <DialogTitle>Edit Aircraft</DialogTitle>
              <DialogDescription>Update the technical details for this aircraft.</DialogDescription>
            </DialogHeader>
            {formContent}
          </DialogContent>
        </Dialog>
      );
    }

    return formContent;
  }

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button>
          <PlusCircle className="mr-2 h-4 w-4" />
          Add Aircraft
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Add New Aircraft</DialogTitle>
          <DialogDescription>Enter the technical details for the new fleet asset.</DialogDescription>
        </DialogHeader>
        {formContent}
      </DialogContent>
    </Dialog>
  );
}
