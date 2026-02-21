'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useFirestore, updateDocumentNonBlocking } from '@/firebase';
import { doc } from 'firebase/firestore';
import { useToast } from '@/hooks/use-toast';
import type { Aircraft } from '../page';

const formSchema = z.object({
  tailNumber: z.string().min(1, 'Tail number is required'),
  model: z.string().min(1, 'Model is required'),
  abbreviation: z.string().optional(),
  type: z.enum(['Single-Engine', 'Multi-Engine']),
  frameHours: z.number({ coerce: true }).optional(),
  engineHours: z.number({ coerce: true }).optional(),
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
  onFinished: () => void;
}

export function EditAircraftForm({ aircraft, onFinished }: EditAircraftFormProps) {
  const firestore = useFirestore();
  const { toast } = useToast();
  const [add50, setAdd50] = useState('');
  const [add100, setAdd100] = useState('');

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
        tailNumber: aircraft.tailNumber,
        model: aircraft.model,
        abbreviation: aircraft.abbreviation,
        type: aircraft.type || 'Single-Engine',
        frameHours: aircraft.frameHours,
        engineHours: aircraft.engineHours,
        initialHobbs: aircraft.initialHobbs,
        currentHobbs: aircraft.currentHobbs,
        initialTacho: aircraft.initialTacho,
        currentTacho: aircraft.currentTacho,
        tachoAtNext50Inspection: aircraft.tachoAtNext50Inspection,
        tachoAtNext100Inspection: aircraft.tachoAtNext100Inspection,
    },
  });

  const onSubmit = async (values: FormValues) => {
    if (!firestore) return;
    const aircraftRef = doc(firestore, `tenants/safeviate/aircrafts`, aircraft.id);
    await updateDocumentNonBlocking(aircraftRef, values);
    toast({ title: 'Aircraft Updated', description: 'The aircraft details have been saved.' });
    onFinished();
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <FormField control={form.control} name="tailNumber" render={({ field }) => ( <FormItem><FormLabel>Tail Number</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem> )}/>
            <FormField control={form.control} name="model" render={({ field }) => ( <FormItem><FormLabel>Model</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem> )}/>
            <FormField control={form.control} name="abbreviation" render={({ field }) => ( <FormItem><FormLabel>Abbreviation</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem> )}/>
            <FormField control={form.control} name="type" render={({ field }) => ( <FormItem><FormLabel>Type</FormLabel><Select onValueChange={field.onChange} defaultValue={field.value}><FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl><SelectContent><SelectItem value="Single-Engine">Single-Engine</SelectItem><SelectItem value="Multi-Engine">Multi-Engine</SelectItem></SelectContent></Select><FormMessage /></FormItem> )}/>
            <FormField control={form.control} name="frameHours" render={({ field }) => ( <FormItem><FormLabel>Frame Hours</FormLabel><FormControl><Input type="number" {...field} /></FormControl><FormMessage /></FormItem> )}/>
            <FormField control={form.control} name="engineHours" render={({ field }) => ( <FormItem><FormLabel>Engine Hours</FormLabel><FormControl><Input type="number" {...field} /></FormControl><FormMessage /></FormItem> )}/>
            <FormField control={form.control} name="initialHobbs" render={({ field }) => ( <FormItem><FormLabel>Initial Hobbs</FormLabel><FormControl><Input type="number" {...field} /></FormControl><FormMessage /></FormItem> )}/>
            <FormField control={form.control} name="currentHobbs" render={({ field }) => ( <FormItem><FormLabel>Current Hobbs</FormLabel><FormControl><Input type="number" {...field} /></FormControl><FormMessage /></FormItem> )}/>
            <FormField control={form.control} name="initialTacho" render={({ field }) => ( <FormItem><FormLabel>Initial Tacho</FormLabel><FormControl><Input type="number" {...field} /></FormControl><FormMessage /></FormItem> )}/>
            <FormField control={form.control} name="currentTacho" render={({ field }) => ( <FormItem><FormLabel>Current Tacho</FormLabel><FormControl><Input type="number" {...field} /></FormControl><FormMessage /></FormItem> )}/>
            <FormField
                control={form.control}
                name="tachoAtNext50Inspection"
                render={({ field }) => (
                    <FormItem>
                    <FormLabel>Next 50hr Insp. (Tacho)</FormLabel>
                    <FormControl>
                        <Input type="number" {...field} />
                    </FormControl>
                     <div className="flex items-center gap-2 mt-2">
                        <Input 
                            type="number" 
                            placeholder="Add 50" 
                            className="w-28"
                            value={add50}
                            onChange={(e) => {
                                setAdd50(e.target.value);
                                const hoursToAdd = Number(e.target.value);
                                if (!isNaN(hoursToAdd) && aircraft.currentTacho) {
                                    field.onChange(aircraft.currentTacho + hoursToAdd);
                                }
                            }}
                        />
                        <span className="text-sm text-muted-foreground">
                            (Current: {aircraft.currentTacho?.toFixed(1) || 'N/A'})
                        </span>
                    </div>
                    <FormMessage />
                    </FormItem>
                )}
            />
            <FormField
                control={form.control}
                name="tachoAtNext100Inspection"
                render={({ field }) => (
                    <FormItem>
                    <FormLabel>Next 100hr Insp. (Tacho)</FormLabel>
                    <FormControl>
                        <Input type="number" {...field} />
                    </FormControl>
                    <div className="flex items-center gap-2 mt-2">
                        <Input 
                            type="number" 
                            placeholder="Add 100" 
                            className="w-28"
                            value={add100}
                            onChange={(e) => {
                                setAdd100(e.target.value);
                                const hoursToAdd = Number(e.target.value);
                                if (!isNaN(hoursToAdd) && aircraft.currentTacho) {
                                    field.onChange(aircraft.currentTacho + hoursToAdd);
                                }
                            }}
                        />
                        <span className="text-sm text-muted-foreground">
                            (Current: {aircraft.currentTacho?.toFixed(1) || 'N/A'})
                        </span>
                    </div>
                    <FormMessage />
                    </FormItem>
                )}
            />
        </div>

        <div className="flex justify-end gap-2 pt-4">
            <Button type="button" variant="outline" onClick={onFinished}>Cancel</Button>
            <Button type="submit">Save Changes</Button>
        </div>
      </form>
    </Form>
  );
}
