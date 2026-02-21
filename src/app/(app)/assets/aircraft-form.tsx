
'use client';

import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { useFirestore, addDocumentNonBlocking, updateDocumentNonBlocking } from '@/firebase';
import { collection, doc } from 'firebase/firestore';
import type { Aircraft } from '@/types/aircraft';

const formSchema = z.object({
  tailNumber: z.string().min(1, "Tail number is required."),
  model: z.string().min(1, "Model is required."),
  type: z.string().optional(),
  currentHobbs: z.number({ coerce: true }).optional(),
  currentTacho: z.number({ coerce: true }).optional(),
  tachoAtNext50Inspection: z.number({ coerce: true }).optional(),
  tachoAtNext100Inspection: z.number({ coerce: true }).optional(),
});

type AircraftFormValues = z.infer<typeof formSchema>;

interface AircraftFormProps {
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
  tenantId: string;
  onFormSubmit: () => void;
  existingAircraft?: Aircraft | null;
}

export function AircraftForm({ isOpen, onOpenChange, tenantId, onFormSubmit, existingAircraft }: AircraftFormProps) {
  const firestore = useFirestore();
  const { toast } = useToast();

  const form = useForm<AircraftFormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      tailNumber: '',
      model: '',
      type: '',
      currentHobbs: 0,
      currentTacho: 0,
      tachoAtNext50Inspection: 0,
      tachoAtNext100Inspection: 0,
    }
  });

  useEffect(() => {
    if (isOpen) {
      if (existingAircraft) {
        form.reset({
          tailNumber: existingAircraft.tailNumber || '',
          model: existingAircraft.model || '',
          type: (existingAircraft as any).type || '',
          currentHobbs: existingAircraft.currentHobbs ?? 0,
          currentTacho: existingAircraft.currentTacho ?? 0,
          tachoAtNext50Inspection: existingAircraft.tachoAtNext50Inspection ?? 0,
          tachoAtNext100Inspection: existingAircraft.tachoAtNext100Inspection ?? 0,
        });
      } else {
        form.reset({
          tailNumber: '',
          model: '',
          type: '',
          currentHobbs: 0,
          currentTacho: 0,
          tachoAtNext50Inspection: 0,
          tachoAtNext100Inspection: 0,
        });
      }
    }
  }, [isOpen, existingAircraft, form]);
  

  const onSubmit = async (values: AircraftFormValues) => {
    if (!firestore) return;
    
    const dataToSave = {
        ...values,
        currentHobbs: values.currentHobbs ?? 0,
        currentTacho: values.currentTacho ?? 0,
        tachoAtNext50Inspection: values.tachoAtNext50Inspection ?? 0,
        tachoAtNext100Inspection: values.tachoAtNext100Inspection ?? 0,
    };

    if (existingAircraft) {
      const aircraftRef = doc(firestore, 'tenants', tenantId, 'aircrafts', existingAircraft.id);
      updateDocumentNonBlocking(aircraftRef, dataToSave);
      toast({ title: 'Aircraft Updated', description: 'The aircraft details have been saved.' });
    } else {
      const aircraftsCollection = collection(firestore, 'tenants', tenantId, 'aircrafts');
      addDocumentNonBlocking(aircraftsCollection, dataToSave);
      toast({ title: 'Aircraft Added', description: 'The new aircraft has been added to the fleet.' });
    }
    onFormSubmit();
  };

  const handleOpenChange = (open: boolean) => {
    if (!open) {
      form.reset();
    }
    onOpenChange(open);
  }

  return (
    <Dialog open={isOpen} onOpenChange={handleOpenChange}>
      <DialogContent>
        {isOpen && (
            <>
                <DialogHeader>
                  <DialogTitle>{existingAircraft ? 'Edit Aircraft' : 'Add New Aircraft'}</DialogTitle>
                  <DialogDescription>
                    {existingAircraft ? `Update details for ${existingAircraft.tailNumber}.` : 'Enter the details for the new aircraft.'}
                  </DialogDescription>
                </DialogHeader>
                <Form {...form}>
                  <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <FormField
                        control={form.control}
                        name="tailNumber"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Tail Number</FormLabel>
                            <FormControl>
                              <Input placeholder="N12345" {...field} />
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
                              <Input placeholder="Cessna 172" {...field} />
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
                            <FormControl>
                              <Input placeholder="Single-Engine Piston" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <FormField
                        control={form.control}
                        name="currentHobbs"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Current Hobbs</FormLabel>
                            <FormControl>
                              <Input type="number" {...field} value={field.value ?? ''} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name="currentTacho"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Current Tacho</FormLabel>
                            <FormControl>
                              <Input type="number" {...field} value={field.value ?? ''} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name="tachoAtNext50Inspection"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Tacho at Next 50hr</FormLabel>
                            <FormControl>
                              <Input type="number" {...field} value={field.value ?? ''} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name="tachoAtNext100Inspection"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Tacho at Next 100hr</FormLabel>
                            <FormControl>
                              <Input type="number" {...field} value={field.value ?? ''} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                    <DialogFooter>
                      <Button type="submit">Save</Button>
                    </DialogFooter>
                  </form>
                </Form>
            </>
        )}
      </DialogContent>
    </Dialog>
  );
}
