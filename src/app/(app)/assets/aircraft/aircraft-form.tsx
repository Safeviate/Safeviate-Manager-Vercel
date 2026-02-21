
'use client';

import { useState, useEffect } from 'react';
import { useForm, useFieldArray } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { v4 as uuidv4 } from 'uuid';
import { useFirestore, addDocumentNonBlocking, updateDocumentNonBlocking } from '@/firebase';
import { doc, collection } from 'firebase/firestore';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { PlusCircle, Trash2 } from 'lucide-react';
import type { Aircraft, AircraftComponent } from '@/types/aircraft';

const componentSchema = z.object({
  id: z.string(),
  name: z.string().min(1, "Component name is required."),
  partNumber: z.string().min(1, "Part number is required."),
  serialNumber: z.string().optional(),
  manufacturer: z.string().optional(),
  installDate: z.date().optional(),
  installHours: z.number({ coerce: true }).optional(),
  maxHours: z.number({ coerce: true }).optional(),
  tsn: z.number({ coerce: true }).optional(),
  tso: z.number({ coerce: true }).optional(),
  notes: z.string().optional(),
});

const formSchema = z.object({
  make: z.string().min(1, "Make is required."),
  model: z.string().min(1, "Model is required."),
  tailNumber: z.string().min(1, "Tail number is required."),
  abbreviation: z.string().optional(),
  type: z.enum(['Single-Engine', 'Multi-Engine']).optional(),
  frameHours: z.number({ coerce: true }).optional(),
  engineHours: z.number({ coerce: true }).optional(),
  currentHobbs: z.number({ coerce: true }).optional(),
  currentTacho: z.number({ coerce: true }).optional(),
  tachoAtNext50Inspection: z.number({ coerce: true }).optional(),
  tachoAtNext100Inspection: z.number({ coerce: true }).optional(),
  components: z.array(componentSchema).optional(),
});

type FormValues = z.infer<typeof formSchema>;

interface AircraftFormProps {
  existingAircraft?: Aircraft | null;
  onCancel: () => void;
}

const mapDatesToObjects = (aircraft?: Aircraft | null): Partial<FormValues> => {
    if (!aircraft) return {};
    return {
        ...aircraft,
        components: aircraft.components?.map(c => ({
            ...c,
            installDate: c.installDate ? new Date(c.installDate) : undefined,
        }))
    }
}

const mapDatesToStrings = (values: FormValues): Partial<Aircraft> => {
    return {
        ...values,
        components: values.components?.map(c => ({
            ...c,
            installDate: c.installDate ? c.installDate.toISOString() : '',
        }))
    }
}

export function AircraftForm({ existingAircraft, onCancel }: AircraftFormProps) {
  const firestore = useFirestore();
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const tenantId = 'safeviate';

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: mapDatesToObjects(existingAircraft) || {
        make: '',
        model: '',
        tailNumber: '',
        components: [],
    },
  });
  
  const { fields, append, remove } = useFieldArray({
      control: form.control,
      name: "components",
  });

  const onSubmit = async (values: FormValues) => {
    if (!firestore) return;
    setIsSubmitting(true);

    const dataToSave = mapDatesToStrings(values);

    try {
      if (existingAircraft) {
        const aircraftRef = doc(firestore, `tenants/${tenantId}/aircrafts`, existingAircraft.id);
        await updateDocumentNonBlocking(aircraftRef, dataToSave);
        toast({ title: "Aircraft Updated" });
      } else {
        const aircraftsCollection = collection(firestore, `tenants/${tenantId}/aircrafts`);
        await addDocumentNonBlocking(aircraftsCollection, dataToSave);
        toast({ title: "Aircraft Created" });
      }
      onCancel();
    } catch (e: any) {
      toast({
        variant: "destructive",
        title: "Submission Failed",
        description: e.message,
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
        <Card>
          <CardHeader>
            <CardTitle>Aircraft Details</CardTitle>
            <CardDescription>
              {existingAircraft ? 'Edit the details of this aircraft.' : 'Enter the details for a new aircraft.'}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                <FormField control={form.control} name="make" render={({ field }) => ( <FormItem><FormLabel>Make</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem> )}/>
                <FormField control={form.control} name="model" render={({ field }) => ( <FormItem><FormLabel>Model</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem> )}/>
                <FormField control={form.control} name="tailNumber" render={({ field }) => ( <FormItem><FormLabel>Tail Number</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem> )}/>
                <FormField control={form.control} name="abbreviation" render={({ field }) => ( <FormItem><FormLabel>Abbreviation</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem> )}/>
                <FormField control={form.control} name="type" render={({ field }) => ( <FormItem><FormLabel>Type</FormLabel><Select onValueChange={field.onChange} defaultValue={field.value}><FormControl><SelectTrigger><SelectValue placeholder="Select type..." /></SelectTrigger></FormControl><SelectContent><SelectItem value="Single-Engine">Single-Engine</SelectItem><SelectItem value="Multi-Engine">Multi-Engine</SelectItem></SelectContent></Select><FormMessage /></FormItem> )}/>
            </div>
             <Separator className="my-6" />
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                 <FormField control={form.control} name="currentHobbs" render={({ field }) => ( <FormItem><FormLabel>Current Hobbs</FormLabel><FormControl><Input type="number" {...field} /></FormControl><FormMessage /></FormItem> )}/>
                 <FormField control={form.control} name="currentTacho" render={({ field }) => ( <FormItem><FormLabel>Current Tacho</FormLabel><FormControl><Input type="number" {...field} /></FormControl><FormMessage /></FormItem> )}/>
                 <FormField control={form.control} name="tachoAtNext50Inspection" render={({ field }) => ( <FormItem><FormLabel>Next 50hr Tacho</FormLabel><FormControl><Input type="number" {...field} /></FormControl><FormMessage /></FormItem> )}/>
                 <FormField control={form.control} name="tachoAtNext100Inspection" render={({ field }) => ( <FormItem><FormLabel>Next 100hr Tacho</FormLabel><FormControl><Input type="number" {...field} /></FormControl><FormMessage /></FormItem> )}/>
            </div>
          </CardContent>
        </Card>
        
        <Card>
            <CardHeader>
                <div className="flex justify-between items-center">
                    <div>
                        <CardTitle>Tracked Components</CardTitle>
                        <CardDescription>Manage major components installed on this aircraft.</CardDescription>
                    </div>
                    <Button type="button" variant="outline" onClick={() => append({ id: uuidv4(), name: '', partNumber: '' })}>
                        <PlusCircle className="mr-2 h-4 w-4" /> Add Component
                    </Button>
                </div>
            </CardHeader>
            <CardContent className="space-y-4">
                {fields.map((field, index) => (
                    <div key={field.id} className="p-4 border rounded-lg space-y-4 relative">
                        <Button type="button" variant="ghost" size="icon" className="absolute top-2 right-2 text-destructive" onClick={() => remove(index)}>
                            <Trash2 className="h-4 w-4" />
                        </Button>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                             <FormField control={form.control} name={`components.${index}.name`} render={({ field }) => ( <FormItem><FormLabel>Name</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem> )}/>
                             <FormField control={form.control} name={`components.${index}.partNumber`} render={({ field }) => ( <FormItem><FormLabel>Part No.</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem> )}/>
                             <FormField control={form.control} name={`components.${index}.serialNumber`} render={({ field }) => ( <FormItem><FormLabel>Serial No.</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem> )}/>
                             <FormField control={form.control} name={`components.${index}.tsn`} render={({ field }) => ( <FormItem><FormLabel>TSN</FormLabel><FormControl><Input type="number" {...field} /></FormControl><FormMessage /></FormItem> )}/>
                             <FormField control={form.control} name={`components.${index}.tso`} render={({ field }) => ( <FormItem><FormLabel>TSO</FormLabel><FormControl><Input type="number" {...field} /></FormControl><FormMessage /></FormItem> )}/>
                        </div>
                    </div>
                ))}
                {fields.length === 0 && <p className="text-muted-foreground text-center py-4">No components added.</p>}
            </CardContent>
        </Card>
        
        <div className="flex justify-end gap-2">
          <Button type="button" variant="outline" onClick={onCancel} disabled={isSubmitting}>Cancel</Button>
          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting ? 'Saving...' : (existingAircraft ? 'Save Changes' : 'Create Aircraft')}
          </Button>
        </div>
      </form>
    </Form>
  );
}

    