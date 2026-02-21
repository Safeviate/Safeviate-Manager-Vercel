
'use client';

import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import {
  Form,
  FormControl,
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
import { addDocumentNonBlocking, updateDocumentNonBlocking } from '@/firebase/non-blocking-updates';
import { useToast } from '@/hooks/use-toast';
import { doc, collection } from 'firebase/firestore';
import { useFirestore } from '@/firebase';
import type { Aircraft } from './aircraft-type';

const formSchema = z.object({
  tailNumber: z.string().min(1, 'Tail number is required'),
  model: z.string().min(1, 'Model is required'),
  type: z.enum(['Single-Engine', 'Multi-Engine']),
  tachoAtNext50Inspection: z.number({ coerce: true }).optional(),
  tachoAtNext100Inspection: z.number({ coerce: true }).optional(),
  currentTacho: z.number({ coerce: true }).optional(),
  currentHobbs: z.number({ coerce: true }).optional(),
});

type FormValues = z.infer<typeof formSchema>;

interface AircraftFormProps {
  tenantId: string;
  existingAircraft?: Aircraft | null;
  onFormSubmit: () => void;
  onCancel: () => void;
}

export function AircraftForm({ tenantId, existingAircraft, onFormSubmit, onCancel }: AircraftFormProps) {
  const { toast } = useToast();
  const firestore = useFirestore();

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
  });

  useEffect(() => {
    const defaultValues = {
      tailNumber: existingAircraft?.tailNumber || '',
      model: existingAircraft?.model || '',
      type: existingAircraft?.type || 'Single-Engine',
      currentTacho: existingAircraft?.currentTacho ?? '',
      currentHobbs: existingAircraft?.currentHobbs ?? '',
      tachoAtNext50Inspection: existingAircraft?.tachoAtNext50Inspection ?? '',
      tachoAtNext100Inspection: existingAircraft?.tachoAtNext100Inspection ?? '',
    };
    form.reset(defaultValues);
  }, [existingAircraft, form]);

  const onSubmit = async (values: FormValues) => {
    if (!firestore) return;

    try {
      if (existingAircraft) {
        // Update
        const aircraftRef = doc(firestore, `tenants/${tenantId}/aircrafts`, existingAircraft.id);
        await updateDocumentNonBlocking(aircraftRef, values);
        toast({ title: 'Aircraft Updated' });
      } else {
        // Create
        const aircraftsCollection = collection(firestore, `tenants/${tenantId}/aircrafts`);
        await addDocumentNonBlocking(aircraftsCollection, values);
        toast({ title: 'Aircraft Added' });
      }
      onFormSubmit();
    } catch (e: any) {
      toast({
        variant: 'destructive',
        title: 'An error occurred.',
        description: e.message,
      });
    }
  };

  return (
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
          <FormField
            control={form.control}
            name="type"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Type</FormLabel>
                <Select onValueChange={field.onChange} value={field.value}>
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
            name="currentTacho"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Current Tacho</FormLabel>
                <FormControl>
                  <Input type="number" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="currentHobbs"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Current Hobbs</FormLabel>
                <FormControl>
                  <Input type="number" {...field} />
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
                  <Input type="number" {...field} />
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
                  <Input type="number" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>
        <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={onCancel}>Cancel</Button>
            <Button type="submit">{existingAircraft ? 'Save Changes' : 'Add Aircraft'}</Button>
        </div>
      </form>
    </Form>
  );
}
