'use client';

import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
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
import { doc } from 'firebase/firestore';
import { useFirestore, updateDocumentNonBlocking } from '@/firebase';
import { useToast } from '@/hooks/use-toast';
import type { Aircraft } from './page';
import { ScrollArea } from '@/components/ui/scroll-area';

const formSchema = z.object({
  tailNumber: z.string().min(1, 'Tail number is required.'),
  model: z.string().min(1, 'Model is required.'),
  abbreviation: z.string().optional(),
  type: z.enum(['Single-Engine', 'Multi-Engine']),
  initialHobbs: z.number({ coerce: true }).optional(),
  currentHobbs: z.number({ coerce: true }).optional(),
  initialTacho: z.number({ coerce: true }).optional(),
  currentTacho: z.number({ coerce: true }).optional(),
  tachoAtNext50Inspection: z.number({ coerce: true }).optional(),
  tachoAtNext100Inspection: z.number({ coerce: true }).optional(),
});

type FormValues = z.infer<typeof formSchema>;

interface EditAircraftFormProps {
  aircraft: Aircraft;
  tenantId: string;
  onSave: () => void;
}

export function EditAircraftForm({ aircraft, tenantId, onSave }: EditAircraftFormProps) {
  const firestore = useFirestore();
  const { toast } = useToast();

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {},
  });
  
  useEffect(() => {
    if (aircraft) {
        form.reset({
            tailNumber: aircraft.tailNumber || '',
            model: aircraft.model || '',
            abbreviation: aircraft.abbreviation || '',
            type: aircraft.type || 'Single-Engine',
            initialHobbs: aircraft.initialHobbs || 0,
            currentHobbs: aircraft.currentHobbs || 0,
            initialTacho: aircraft.initialTacho || 0,
            currentTacho: aircraft.currentTacho || 0,
            tachoAtNext50Inspection: aircraft.tachoAtNext50Inspection || 0,
            tachoAtNext100Inspection: aircraft.tachoAtNext100Inspection || 0,
        });
    }
  }, [aircraft, form]);


  const onSubmit = (values: FormValues) => {
    if (!firestore) return;

    const aircraftRef = doc(firestore, 'tenants', tenantId, 'aircrafts', aircraft.id);
    updateDocumentNonBlocking(aircraftRef, values);

    toast({
      title: 'Aircraft Updated',
      description: `Details for ${values.tailNumber} have been updated.`,
    });
    onSave();
  };
  
  if (!aircraft) {
      return null;
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        <ScrollArea className="h-[60vh] pr-6">
            <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <FormField control={form.control} name="tailNumber" render={({ field }) => ( <FormItem><FormLabel>Tail Number</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem> )} />
                    <FormField control={form.control} name="model" render={({ field }) => ( <FormItem><FormLabel>Model</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem> )} />
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <FormField control={form.control} name="abbreviation" render={({ field }) => ( <FormItem><FormLabel>Abbreviation (5 chars)</FormLabel><FormControl><Input maxLength={5} {...field} value={field.value ?? ''} /></FormControl><FormMessage /></FormItem> )} />
                    <FormField control={form.control} name="type" render={({ field }) => ( <FormItem><FormLabel>Type</FormLabel><Select onValueChange={field.onChange} value={field.value}><FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl><SelectContent><SelectItem value="Single-Engine">Single-Engine</SelectItem><SelectItem value="Multi-Engine">Multi-Engine</SelectItem></SelectContent></Select><FormMessage /></FormItem> )} />
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                     <FormField control={form.control} name="initialHobbs" render={({ field }) => ( <FormItem><FormLabel>Initial Hobbs</FormLabel><FormControl><Input type="number" {...field} /></FormControl><FormMessage /></FormItem> )} />
                     <FormField control={form.control} name="currentHobbs" render={({ field }) => ( <FormItem><FormLabel>Current Hobbs</FormLabel><FormControl><Input type="number" {...field} /></FormControl><FormMessage /></FormItem> )} />
                </div>
                 <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <FormField control={form.control} name="initialTacho" render={({ field }) => ( <FormItem><FormLabel>Initial Tacho</FormLabel><FormControl><Input type="number" {...field} /></FormControl><FormMessage /></FormItem> )} />
                    <FormField control={form.control} name="currentTacho" render={({ field }) => ( <FormItem><FormLabel>Current Tacho</FormLabel><FormControl><Input type="number" {...field} /></FormControl><FormMessage /></FormItem> )} />
                </div>
                 <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <FormField control={form.control} name="tachoAtNext50Inspection" render={({ field }) => ( <FormItem><FormLabel>Tacho at next 50hr Insp</FormLabel><FormControl><Input type="number" {...field} /></FormControl><FormMessage /></FormItem> )} />
                    <FormField control={form.control} name="tachoAtNext100Inspection" render={({ field }) => ( <FormItem><FormLabel>Tacho at next 100hr Insp</FormLabel><FormControl><Input type="number" {...field} /></FormControl><FormMessage /></FormItem> )} />
                </div>
            </div>
        </ScrollArea>
        <div className="flex justify-end gap-2 pt-4 border-t">
            <Button type="button" variant="outline" onClick={onSave}>Cancel</Button>
            <Button type="submit">Save Changes</Button>
        </div>
      </form>
    </Form>
  );
}
