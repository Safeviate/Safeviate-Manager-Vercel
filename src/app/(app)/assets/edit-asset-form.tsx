'use client';

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useFirestore, updateDocumentNonBlocking, addDocumentNonBlocking } from '@/firebase';
import { doc, collection } from 'firebase/firestore';
import { useToast } from '@/hooks/use-toast';
import type { Aircraft } from './page';

const formSchema = z.object({
  tailNumber: z.string().min(1, 'Tail number is required.'),
  model: z.string().min(1, 'Model is required.'),
  abbreviation: z.string().optional(),
  type: z.enum(['Single-Engine', 'Multi-Engine']),
  frameHours: z.number({ coerce: true }).optional(),
  engineHours: z.number({ coerce: true }).optional(),
  currentHobbs: z.number({ coerce: true }).optional(),
  currentTacho: z.number({ coerce: true }).optional(),
  tachoAtNext50Inspection: z.number({ coerce: true }).optional(),
  tachoAtNext100Inspection: z.number({ coerce: true }).optional(),
});

type FormValues = z.infer<typeof formSchema>;

interface EditAircraftFormProps {
  aircraft: Partial<Aircraft>;
  onCancel: () => void;
}

export function EditAircraftForm({ aircraft, onCancel }: EditAircraftFormProps) {
  const firestore = useFirestore();
  const { toast } = useToast();
  const tenantId = 'safeviate';
  const isNew = !aircraft.id;

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      tailNumber: aircraft?.tailNumber || '',
      model: aircraft?.model || '',
      abbreviation: aircraft?.abbreviation || '',
      type: aircraft?.type || 'Single-Engine',
      frameHours: aircraft?.frameHours || 0,
      engineHours: aircraft?.engineHours || 0,
      currentHobbs: aircraft?.currentHobbs || 0,
      currentTacho: aircraft?.currentTacho || 0,
      tachoAtNext50Inspection: aircraft?.tachoAtNext50Inspection || 0,
      tachoAtNext100Inspection: aircraft?.tachoAtNext100Inspection || 0,
    },
  });

  const onSubmit = (values: FormValues) => {
    if (!firestore) return;

    if (isNew) {
        const aircraftsCollection = collection(firestore, 'tenants', tenantId, 'aircrafts');
        addDocumentNonBlocking(aircraftsCollection, values);
        toast({
            title: "Aircraft Added",
            description: `${values.tailNumber} has been added to the fleet.`
        });
    } else {
        const aircraftRef = doc(firestore, 'tenants', tenantId, 'aircrafts', aircraft.id!);
        updateDocumentNonBlocking(aircraftRef, values);
        toast({
            title: "Aircraft Updated",
            description: `${values.tailNumber} has been updated.`
        });
    }
    onCancel();
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)}>
        <Card>
          <CardHeader>
            <CardTitle>{isNew ? 'Add New Aircraft' : 'Edit Aircraft'}</CardTitle>
            <CardDescription>{isNew ? 'Enter the details for the new aircraft.' : `Update the details for ${aircraft.tailNumber}.`}</CardDescription>
          </CardHeader>
          <CardContent className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <FormField control={form.control} name="tailNumber" render={({ field }) => ( <FormItem><FormLabel>Tail Number</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem> )}/>
            <FormField control={form.control} name="model" render={({ field }) => ( <FormItem><FormLabel>Model</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem> )}/>
            <FormField control={form.control} name="abbreviation" render={({ field }) => ( <FormItem><FormLabel>Abbreviation</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem> )}/>
            <FormField control={form.control} name="type" render={({ field }) => ( <FormItem><FormLabel>Type</FormLabel><Select onValueChange={field.onChange} defaultValue={field.value}><FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl><SelectContent><SelectItem value="Single-Engine">Single-Engine</SelectItem><SelectItem value="Multi-Engine">Multi-Engine</SelectItem></SelectContent></Select><FormMessage /></FormItem> )}/>
            <FormField control={form.control} name="frameHours" render={({ field }) => ( <FormItem><FormLabel>Frame Hours</FormLabel><FormControl><Input type="number" {...field} /></FormControl><FormMessage /></FormItem> )}/>
            <FormField control={form.control} name="engineHours" render={({ field }) => ( <FormItem><FormLabel>Engine Hours</FormLabel><FormControl><Input type="number" {...field} /></FormControl><FormMessage /></FormItem> )}/>
            <FormField control={form.control} name="currentHobbs" render={({ field }) => ( <FormItem><FormLabel>Current Hobbs</FormLabel><FormControl><Input type="number" {...field} /></FormControl><FormMessage /></FormItem> )}/>
            <FormField control={form.control} name="currentTacho" render={({ field }) => ( <FormItem><FormLabel>Current Tacho</FormLabel><FormControl><Input type="number" {...field} /></FormControl><FormMessage /></FormItem> )}/>
            <FormField control={form.control} name="tachoAtNext50Inspection" render={({ field }) => ( <FormItem><FormLabel>Tacho at Next 50hr</FormLabel><FormControl><Input type="number" {...field} /></FormControl><FormMessage /></FormItem> )}/>
            <FormField control={form.control} name="tachoAtNext100Inspection" render={({ field }) => ( <FormItem><FormLabel>Tacho at Next 100hr</FormLabel><FormControl><Input type="number" {...field} /></FormControl><FormMessage /></FormItem> )}/>
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
