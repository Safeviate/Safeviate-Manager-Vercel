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
} from '@/components/ui/dialog';
import {
  Form,
  FormControl,
  FormDescription,
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
import { collection, doc } from 'firebase/firestore';
import { useToast } from '@/hooks/use-toast';
import { PlusCircle } from 'lucide-react';
import type { Aircraft } from '@/types/aircraft';

const formSchema = z.object({
  tailNumber: z.string().min(1, 'Tail number is required.'),
  make: z.string().min(1, 'Make is required.'),
  model: z.string().min(1, 'Model is required.'),
  type: z.enum(['Single-Engine', 'Multi-Engine']),
  initialHobbs: z.string().optional(),
  currentHobbs: z.string().optional(),
  initialTacho: z.string().optional(),
  currentTacho: z.string().optional(),
});

type FormValues = z.infer<typeof formSchema>;

interface AircraftFormProps {
    existingAircraft?: Aircraft;
    isOpen?: boolean;
    onOpenChange?: (open: boolean) => void;
}

export function AircraftForm({ existingAircraft, isOpen, onOpenChange }: AircraftFormProps) {
  const firestore = useFirestore();
  const { toast } = useToast();
  const isEditing = !!existingAircraft;

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      type: 'Single-Engine',
    },
  });

  useEffect(() => {
    if (existingAircraft && isOpen) {
        form.reset({
            tailNumber: existingAircraft.tailNumber,
            make: existingAircraft.make,
            model: existingAircraft.model,
            type: existingAircraft.type,
            initialHobbs: existingAircraft.initialHobbs?.toString(),
            currentHobbs: existingAircraft.currentHobbs?.toString(),
            initialTacho: existingAircraft.initialTacho?.toString(),
            currentTacho: existingAircraft.currentTacho?.toString(),
        });
    } else if (!existingAircraft && (isOpen === undefined || isOpen)) {
        form.reset({
            tailNumber: '',
            make: '',
            model: '',
            type: 'Single-Engine',
            initialHobbs: '',
            currentHobbs: '',
            initialTacho: '',
            currentTacho: '',
        });
    }
  }, [existingAircraft, isOpen, form]);

  const onSubmit = async (values: FormValues) => {
    if (!firestore) return;

    const aircraftData = {
      ...values,
      initialHobbs: values.initialHobbs ? parseFloat(values.initialHobbs) : 0,
      currentHobbs: values.currentHobbs ? parseFloat(values.currentHobbs) : 0,
      initialTacho: values.initialTacho ? parseFloat(values.initialTacho) : 0,
      currentTacho: values.currentTacho ? parseFloat(values.currentTacho) : 0,
    };

    if (isEditing) {
        const aircraftRef = doc(firestore, `tenants/safeviate/aircrafts`, existingAircraft.id);
        updateDocumentNonBlocking(aircraftRef, aircraftData);
        toast({ title: 'Aircraft Updated', description: `Aircraft ${values.tailNumber} has been updated.` });
    } else {
        const aircraftsCollection = collection(firestore, `tenants/safeviate/aircrafts`);
        addDocumentNonBlocking(aircraftsCollection, aircraftData);
        toast({ title: 'Aircraft Created', description: `Aircraft ${values.tailNumber} has been added to the fleet.` });
    }
    
    if(onOpenChange) {
        onOpenChange(false);
    }
  };

  const handleOpenChange = (open: boolean) => {
    if (onOpenChange) {
      onOpenChange(open);
    }
  }

  const trigger = (
    <DialogTrigger asChild>
      <Button>
        <PlusCircle className="mr-2 h-4 w-4" /> Create Aircraft
      </Button>
    </DialogTrigger>
  );

  return (
    <Dialog open={isOpen} onOpenChange={handleOpenChange}>
      {!isEditing && trigger}
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{isEditing ? 'Edit Aircraft' : 'Create New Aircraft'}</DialogTitle>
          <DialogDescription>
            {isEditing ? 'Update the details for this aircraft.' : 'Add a new aircraft to your fleet.'}
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
               <FormField
                    control={form.control}
                    name="tailNumber"
                    render={({ field }) => (
                        <FormItem>
                            <FormLabel>Tail Number</FormLabel>
                            <FormControl>
                                <Input {...field} />
                            </FormControl>
                            <FormMessage />
                        </FormItem>
                    )}
                />
                 <FormField
                    control={form.control}
                    name="type"
                    render={({ field }) => (
                        <FormItem>
                        <FormLabel>Type</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                            <FormControl>
                            <SelectTrigger>
                                <SelectValue placeholder="Select aircraft type" />
                            </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                            <SelectItem value="Single-Engine">Single-Engine</SelectItem>
                            <SelectItem value="Multi-Engine">Multi-Engine</SelectItem>
                            </SelectContent>
                        </Select>
                        <FormMessage />
                        </FormItem>
                    )}
                />
                 <FormField
                    control={form.control}
                    name="make"
                    render={({ field }) => (
                        <FormItem>
                            <FormLabel>Make</FormLabel>
                            <FormControl>
                                <Input {...field} />
                            </FormControl>
                            <FormMessage />
                        </FormItem>
                    )}
                />
                <FormField
                    control={form.control}
                    name="model"
                    render={({ field }) => (
                        <FormItem>
                            <FormLabel>Model</FormLabel>
                            <FormControl>
                                <Input {...field} />
                            </FormControl>
                            <FormMessage />
                        </FormItem>
                    )}
                />
              <FormField control={form.control} name="initialHobbs" render={({ field }) => (<FormItem><FormLabel>Initial Hobbs Hours</FormLabel><FormControl><Input type="number" {...field} /></FormControl><FormMessage /></FormItem>)}/>
              <FormField control={form.control} name="currentHobbs" render={({ field }) => (<FormItem><FormLabel>Current Hobbs Hours</FormLabel><FormControl><Input type="number" {...field} /></FormControl><FormMessage /></FormItem>)} />
              <FormField control={form.control} name="initialTacho" render={({ field }) => (<FormItem><FormLabel>Initial Tacho Hours</FormLabel><FormControl><Input type="number" {...field} /></FormControl><FormMessage /></FormItem>)} />
              <FormField control={form.control} name="currentTacho" render={({ field }) => (<FormItem><FormLabel>Current Tacho Hours</FormLabel><FormControl><Input type="number" {...field} /></FormControl><FormMessage /></FormItem>)} />
            </div>
            <DialogFooter>
              <Button type="submit">{isEditing ? 'Save Changes' : 'Create Aircraft'}</Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
