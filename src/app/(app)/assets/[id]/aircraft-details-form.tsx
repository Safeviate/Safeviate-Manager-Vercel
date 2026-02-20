
'use client';

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
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import type { Aircraft } from '../page';

interface AircraftDetailsFormProps {
    aircraft: Aircraft;
    onSave: (data: Partial<Aircraft>) => void;
    onCancel: () => void;
}

const formSchema = z.object({
  tailNumber: z.string().min(1, 'Tail number is required.'),
  model: z.string().min(1, 'Model is required.'),
  abbreviation: z.string().optional(),
  type: z.enum(['Single-Engine', 'Multi-Engine']),
  currentHobbs: z.number({ coerce: true }).min(0, "Must be a positive number.").optional(),
  currentTacho: z.number({ coerce: true }).min(0, "Must be a positive number.").optional(),
  tachoAtNext50Inspection: z.number({ coerce: true }).min(0, "Must be a positive number.").optional(),
  tachoAtNext100Inspection: z.number({ coerce: true }).min(0, "Must be a positive number.").optional(),
});

type FormValues = z.infer<typeof formSchema>;

export function AircraftDetailsForm({ aircraft, onSave, onCancel }: AircraftDetailsFormProps) {
  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      tailNumber: aircraft.tailNumber || '',
      model: aircraft.model || '',
      abbreviation: aircraft.abbreviation || '',
      type: aircraft.type || 'Single-Engine',
      currentHobbs: aircraft.currentHobbs || 0,
      currentTacho: aircraft.currentTacho || 0,
      tachoAtNext50Inspection: aircraft.tachoAtNext50Inspection || 0,
      tachoAtNext100Inspection: aircraft.tachoAtNext100Inspection || 0,
    },
  });

  const handleSubmit = (values: FormValues) => {
    onSave(values);
  };

  return (
    <Form {...form}>
        <form onSubmit={form.handleSubmit(handleSubmit)}>
            <Card>
                <CardHeader>
                    <CardTitle>Edit Aircraft Details</CardTitle>
                    <CardDescription>Make changes to the aircraft's information below.</CardDescription>
                </CardHeader>
                <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <FormField control={form.control} name="tailNumber" render={({ field }) => ( <FormItem><FormLabel>Tail Number</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem> )}/>
                    <FormField control={form.control} name="model" render={({ field }) => ( <FormItem><FormLabel>Model</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem> )}/>
                    <FormField control={form.control} name="abbreviation" render={({ field }) => ( <FormItem><FormLabel>Abbreviation (5 Chars)</FormLabel><FormControl><Input maxLength={5} {...field} /></FormControl><FormMessage /></FormItem> )}/>
                    <FormField control={form.control} name="type" render={({ field }) => ( <FormItem><FormLabel>Type</FormLabel><Select onValueChange={field.onChange} defaultValue={field.value}><FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl><SelectContent><SelectItem value="Single-Engine">Single-Engine</SelectItem><SelectItem value="Multi-Engine">Multi-Engine</SelectItem></SelectContent></Select><FormMessage /></FormItem> )}/>
                    <FormField control={form.control} name="currentHobbs" render={({ field }) => ( <FormItem><FormLabel>Current Hobbs</FormLabel><FormControl><Input type="number" {...field} /></FormControl><FormMessage /></FormItem> )}/>
                    <FormField control={form.control} name="currentTacho" render={({ field }) => ( <FormItem><FormLabel>Current Tacho</FormLabel><FormControl><Input type="number" {...field} /></FormControl><FormMessage /></FormItem> )}/>
                    <FormField control={form.control} name="tachoAtNext50Inspection" render={({ field }) => ( <FormItem><FormLabel>Next 50hr Tacho</FormLabel><FormControl><Input type="number" {...field} /></FormControl><FormMessage /></FormItem> )}/>
                    <FormField control={form.control} name="tachoAtNext100Inspection" render={({ field }) => ( <FormItem><FormLabel>Next 100hr Tacho</FormLabel><FormControl><Input type="number" {...field} /></FormControl><FormMessage /></FormItem> )}/>
                </CardContent>
                <CardFooter className="flex justify-end gap-2">
                    <Button type="button" variant="outline" onClick={onCancel}>Cancel</Button>
                    <Button type="submit">Save Changes</Button>
                </CardFooter>
            </Card>
        </form>
    </Form>
  );
}
