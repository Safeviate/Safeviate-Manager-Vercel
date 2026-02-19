'use client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useFirestore, updateDocumentNonBlocking } from '@/firebase';
import { doc } from 'firebase/firestore';
import { useToast } from '@/hooks/use-toast';
import type { Aircraft } from '@/types/aircraft';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';


interface AircraftDetailsProps {
    aircraft: Aircraft;
    isEditing: boolean;
    onCancel: () => void;
}

const formSchema = z.object({
  tailNumber: z.string().min(1, 'Tail number is required'),
  model: z.string().min(1, 'Model is required'),
  type: z.enum(['Single-Engine', 'Multi-Engine']),
  initialHobbs: z.number({ coerce: true }).optional(),
  currentHobbs: z.number({ coerce: true }).optional(),
  initialTacho: z.number({ coerce: true }).optional(),
  currentTacho: z.number({ coerce: true }).optional(),
});

type FormValues = z.infer<typeof formSchema>;

export function AircraftDetails({ aircraft, isEditing, onCancel }: AircraftDetailsProps) {
    const firestore = useFirestore();
    const { toast } = useToast();

    const form = useForm<FormValues>({
        resolver: zodResolver(formSchema),
        defaultValues: {
            tailNumber: aircraft.tailNumber || '',
            model: aircraft.model || '',
            type: aircraft.type || 'Single-Engine',
            initialHobbs: aircraft.initialHobbs || 0,
            currentHobbs: aircraft.currentHobbs || 0,
            initialTacho: aircraft.initialTacho || 0,
            currentTacho: aircraft.currentTacho || 0,
        },
    });

    const onSubmit = (data: FormValues) => {
        if (!firestore) return;
        const aircraftRef = doc(firestore, `tenants/safeviate/aircrafts`, aircraft.id);
        updateDocumentNonBlocking(aircraftRef, data);
        toast({ title: 'Aircraft Updated' });
        onCancel();
    };

    if (!isEditing) {
        return (
            <Card>
                <CardHeader>
                    <CardTitle>Aircraft Details</CardTitle>
                    <CardDescription>Viewing details for {aircraft.tailNumber}.</CardDescription>
                </CardHeader>
                <CardContent className="grid grid-cols-2 gap-4">
                    <div><Label>Tail Number</Label><p>{aircraft.tailNumber}</p></div>
                    <div><Label>Model</Label><p>{aircraft.model}</p></div>
                    <div><Label>Type</Label><p>{aircraft.type}</p></div>
                    <div><Label>Current Hobbs</Label><p>{aircraft.currentHobbs || 'N/A'}</p></div>
                    <div><Label>Current Tacho</Label><p>{aircraft.currentTacho || 'N/A'}</p></div>
                </CardContent>
            </Card>
        );
    }

    return (
        <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)}>
                <Card>
                    <CardHeader>
                        <CardTitle>Edit Aircraft Details</CardTitle>
                        <CardDescription>Modify the details for {aircraft.tailNumber}.</CardDescription>
                    </CardHeader>
                    <CardContent className="grid grid-cols-2 gap-4">
                        <FormField name="tailNumber" control={form.control} render={({ field }) => ( <FormItem><FormLabel>Tail Number</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem> )} />
                        <FormField name="model" control={form.control} render={({ field }) => ( <FormItem><FormLabel>Model</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem> )} />
                        <FormField name="type" control={form.control} render={({ field }) => ( <FormItem><FormLabel>Type</FormLabel><Select onValueChange={field.onChange} defaultValue={field.value}><FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl><SelectContent><SelectItem value="Single-Engine">Single-Engine</SelectItem><SelectItem value="Multi-Engine">Multi-Engine</SelectItem></SelectContent></Select><FormMessage /></FormItem> )} />
                        <FormField name="currentHobbs" control={form.control} render={({ field }) => ( <FormItem><FormLabel>Current Hobbs</FormLabel><FormControl><Input type="number" {...field} /></FormControl><FormMessage /></FormItem> )} />
                        <FormField name="currentTacho" control={form.control} render={({ field }) => ( <FormItem><FormLabel>Current Tacho</FormLabel><FormControl><Input type="number" {...field} /></FormControl><FormMessage /></FormItem> )} />
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
