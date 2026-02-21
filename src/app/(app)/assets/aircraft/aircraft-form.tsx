
'use client';

import { useState, useMemo } from 'react';
import { useForm, useFieldArray } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { v4 as uuidv4 } from 'uuid';
import { format, parseISO } from 'date-fns';

import { useFirestore, addDocumentNonBlocking, updateDocumentNonBlocking } from '@/firebase';
import { doc, collection } from 'firebase/firestore';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import type { Aircraft, AircraftComponent } from '@/types/aircraft';

import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui/card';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { CustomCalendar } from '@/components/ui/custom-calendar';
import { PlusCircle, Trash2, CalendarIcon } from 'lucide-react';


// --- Zod Schemas for Validation ---
const componentSchema = z.object({
  id: z.string(),
  manufacturer: z.string().optional(),
  name: z.string().min(1, "Component name is required."),
  partNumber: z.string().optional(),
  serialNumber: z.string().optional(),
  installDate: z.date().optional(),
  installHours: z.coerce.number().optional(),
  maxHours: z.coerce.number().optional(),
  notes: z.string().optional(),
  tsn: z.coerce.number().optional(),
  tso: z.coerce.number().optional(),
});

const aircraftFormSchema = z.object({
  make: z.string().min(1, "Make is required."),
  model: z.string().min(1, "Model is required."),
  tailNumber: z.string().min(1, "Tail Number is required."),
  abbreviation: z.string().optional(),
  type: z.enum(['Single-Engine', 'Multi-Engine']).optional(),
  frameHours: z.coerce.number().optional(),
  engineHours: z.coerce.number().optional(),
  initialHobbs: z.coerce.number().optional(),
  currentHobbs: z.coerce.number().optional(),
  initialTacho: z.coerce.number().optional(),
  currentTacho: z.coerce.number().optional(),
  tachoAtNext50Inspection: z.coerce.number().optional(),
  tachoAtNext100Inspection: z.coerce.number().optional(),
  components: z.array(componentSchema).optional(),
});

type AircraftFormValues = z.infer<typeof aircraftFormSchema>;

// --- Component Props ---
interface AircraftFormProps {
  existingAircraft?: Aircraft | null;
  onCancel: () => void;
  tenantId: string;
}

// --- Helper Functions ---
const mapAircraftToFormValues = (aircraft?: Aircraft | null): AircraftFormValues => {
    return {
        make: aircraft?.make || '',
        model: aircraft?.model || '',
        tailNumber: aircraft?.tailNumber || '',
        abbreviation: aircraft?.abbreviation || '',
        type: aircraft?.type,
        frameHours: aircraft?.frameHours || 0,
        engineHours: aircraft?.engineHours || 0,
        initialHobbs: aircraft?.initialHobbs || 0,
        currentHobbs: aircraft?.currentHobbs || 0,
        initialTacho: aircraft?.initialTacho || 0,
        currentTacho: aircraft?.currentTacho || 0,
        tachoAtNext50Inspection: aircraft?.tachoAtNext50Inspection || 0,
        tachoAtNext100Inspection: aircraft?.tachoAtNext100Inspection || 0,
        components: (aircraft?.components || []).map(comp => ({
            id: comp.id || uuidv4(),
            manufacturer: comp.manufacturer || '',
            name: comp.name || '',
            partNumber: comp.partNumber || '',
            serialNumber: comp.serialNumber || '',
            installDate: comp.installDate ? parseISO(comp.installDate) : new Date(),
            installHours: comp.installHours || 0,
            maxHours: comp.maxHours || 0,
            notes: comp.notes || '',
            tsn: comp.tsn || 0,
            tso: comp.tso || 0,
        }))
    };
};

const transformDataForFirestore = (data: any): any => {
    if (data === undefined) {
      return null;
    }
    if (data === null || typeof data !== 'object') {
      return data;
    }
    if (Array.isArray(data)) {
      return data.map(transformDataForFirestore);
    }
    const cleanedObject: { [key: string]: any } = {};
    for (const key in data) {
      if (Object.prototype.hasOwnProperty.call(data, key)) {
        const value = data[key];
        if (value !== undefined) {
          cleanedObject[key] = transformDataForFirestore(value);
        } else {
          cleanedObject[key] = null; // Explicitly set undefined to null
        }
      }
    }
    return cleanedObject;
};


// --- Main Component ---
export function AircraftForm(props: AircraftFormProps) {
  const { existingAircraft, onCancel, tenantId } = props;
  const [isSubmitting, setIsSubmitting] = useState(false);
  const firestore = useFirestore();
  const { toast } = useToast();

  const form = useForm<AircraftFormValues>({
    resolver: zodResolver(aircraftFormSchema),
    defaultValues: useMemo(() => mapAircraftToFormValues(existingAircraft), [existingAircraft]),
  });

  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: 'components',
  });

  const onSubmit = async (data: AircraftFormValues) => {
    if (!firestore) return;
    setIsSubmitting(true);

    const dataWithDatesFormatted = {
      ...data,
      components: data.components?.map(comp => ({
        ...comp,
        installDate: comp.installDate ? format(new Date(comp.installDate), 'yyyy-MM-dd') : null,
      })),
    };

    const dataToSave = transformDataForFirestore(dataWithDatesFormatted);

    try {
      if (existingAircraft) {
        const aircraftRef = doc(firestore, `tenants/${tenantId}/aircrafts`, existingAircraft.id);
        await updateDocumentNonBlocking(aircraftRef, dataToSave);
        toast({ title: 'Aircraft Updated' });
      } else {
        const aircraftsCollection = collection(firestore, `tenants/${tenantId}/aircrafts`);
        await addDocumentNonBlocking(aircraftsCollection, dataToSave);
        toast({ title: 'Aircraft Added' });
      }
      onCancel();
    } catch (error) {
      console.error("Error saving aircraft:", error);
      toast({ variant: "destructive", title: "Error", description: "Could not save the aircraft." });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)}>
        <Card>
          <CardHeader>
            <CardTitle>{existingAircraft ? 'Edit Aircraft' : 'Add New Aircraft'}</CardTitle>
            <CardDescription>{existingAircraft ? `Editing ${existingAircraft.tailNumber}.` : 'Add a new aircraft to your fleet.'}</CardDescription>
          </CardHeader>
          <CardContent>
            <ScrollArea className="h-[calc(100vh-25rem)] pr-6">
              <div className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <FormField control={form.control} name="make" render={({ field }) => ( <FormItem><FormLabel>Make</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem> )} />
                  <FormField control={form.control} name="model" render={({ field }) => ( <FormItem><FormLabel>Model</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem> )} />
                  <FormField control={form.control} name="tailNumber" render={({ field }) => ( <FormItem><FormLabel>Tail Number</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem> )} />
                  <FormField control={form.control} name="abbreviation" render={({ field }) => ( <FormItem><FormLabel>Abbreviation</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem> )} />
                  <FormField control={form.control} name="type" render={({ field }) => ( <FormItem><FormLabel>Type</FormLabel><Select onValueChange={field.onChange} value={field.value}><FormControl><SelectTrigger><SelectValue placeholder="Select a type" /></SelectTrigger></FormControl><SelectContent><SelectItem value="Single-Engine">Single-Engine</SelectItem><SelectItem value="Multi-Engine">Multi-Engine</SelectItem></SelectContent></Select><FormMessage /></FormItem> )} />
                </div>
                
                <Separator />
                
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <FormField control={form.control} name="initialHobbs" render={({ field }) => ( <FormItem><FormLabel>Initial Hobbs</FormLabel><FormControl><Input type="number" {...field} /></FormControl><FormMessage /></FormItem> )} />
                    <FormField control={form.control} name="currentHobbs" render={({ field }) => ( <FormItem><FormLabel>Current Hobbs</FormLabel><FormControl><Input type="number" {...field} /></FormControl><FormMessage /></FormItem> )} />
                    <FormField control={form.control} name="initialTacho" render={({ field }) => ( <FormItem><FormLabel>Initial Tacho</FormLabel><FormControl><Input type="number" {...field} /></FormControl><FormMessage /></FormItem> )} />
                    <FormField control={form.control} name="currentTacho" render={({ field }) => ( <FormItem><FormLabel>Current Tacho</FormLabel><FormControl><Input type="number" {...field} /></FormControl><FormMessage /></FormItem> )} />
                    <FormField control={form.control} name="frameHours" render={({ field }) => ( <FormItem><FormLabel>Airframe Hours</FormLabel><FormControl><Input type="number" {...field} /></FormControl><FormMessage /></FormItem> )} />
                    <FormField control={form.control} name="engineHours" render={({ field }) => ( <FormItem><FormLabel>Engine Hours</FormLabel><FormControl><Input type="number" {...field} /></FormControl><FormMessage /></FormItem> )} />
                </div>
                
                <Separator />
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <FormField control={form.control} name="tachoAtNext50Inspection" render={({ field }) => ( <FormItem><FormLabel>Next 50hr Insp. at Tacho</FormLabel><FormControl><Input type="number" {...field} /></FormControl><FormMessage /></FormItem> )} />
                  <FormField control={form.control} name="tachoAtNext100Inspection" render={({ field }) => ( <FormItem><FormLabel>Next 100hr Insp. at Tacho</FormLabel><FormControl><Input type="number" {...field} /></FormControl><FormMessage /></FormItem> )} />
                </div>
                
                <Separator />
                
                <div>
                  <div className="flex justify-between items-center mb-4">
                    <h3 className="text-lg font-medium">Tracked Components</h3>
                    <Button type="button" variant="outline" size="sm" onClick={() => append({ id: uuidv4(), name: '' })}>
                      <PlusCircle className="mr-2 h-4 w-4" /> Add Component
                    </Button>
                  </div>
                  <div className="space-y-4">
                    {fields.map((field, index) => (
                      <div key={field.id} className="p-4 border rounded-lg space-y-4">
                        <div className="flex justify-between items-center">
                          <h4 className="font-semibold">Component #{index + 1}</h4>
                          <Button type="button" variant="destructive" size="icon" onClick={() => remove(index)}>
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                          <FormField control={form.control} name={`components.${index}.name`} render={({ field }) => ( <FormItem><FormLabel>Name</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem> )} />
                          <FormField control={form.control} name={`components.${index}.manufacturer`} render={({ field }) => ( <FormItem><FormLabel>Manufacturer</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem> )} />
                          <FormField control={form.control} name={`components.${index}.partNumber`} render={({ field }) => ( <FormItem><FormLabel>Part Number</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem> )} />
                          <FormField control={form.control} name={`components.${index}.serialNumber`} render={({ field }) => ( <FormItem><FormLabel>Serial Number</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem> )} />
                           <FormField control={form.control} name={`components.${index}.installDate`} render={({ field }) => ( <FormItem className="flex flex-col"><FormLabel>Install Date</FormLabel><Popover><PopoverTrigger asChild><FormControl><Button variant={"outline"} className={cn("pl-3 text-left font-normal", !field.value && "text-muted-foreground")}>{field.value ? format(field.value, "PPP") : <span>Pick a date</span>}<CalendarIcon className="ml-auto h-4 w-4 opacity-50" /></Button></FormControl></PopoverTrigger><PopoverContent className="w-auto p-0"><CustomCalendar selectedDate={field.value} onDateSelect={field.onChange} /></PopoverContent></Popover><FormMessage /></FormItem> )} />
                          <FormField control={form.control} name={`components.${index}.installHours`} render={({ field }) => ( <FormItem><FormLabel>Install Hours (Tacho)</FormLabel><FormControl><Input type="number" {...field} /></FormControl><FormMessage /></FormItem> )} />
                          <FormField control={form.control} name={`components.${index}.maxHours`} render={({ field }) => ( <FormItem><FormLabel>Max Hours (TBO/TBO)</FormLabel><FormControl><Input type="number" {...field} /></FormControl><FormMessage /></FormItem> )} />
                          <FormField control={form.control} name={`components.${index}.tsn`} render={({ field }) => ( <FormItem><FormLabel>Time Since New (TSN)</FormLabel><FormControl><Input type="number" {...field} /></FormControl><FormMessage /></FormItem> )} />
                          <FormField control={form.control} name={`components.${index}.tso`} render={({ field }) => ( <FormItem><FormLabel>Time Since Overhaul (TSO)</FormLabel><FormControl><Input type="number" {...field} /></FormControl><FormMessage /></FormItem> )} />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </ScrollArea>
          </CardContent>
          <CardFooter className="border-t pt-6 flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={onCancel}>Cancel</Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? 'Saving...' : 'Save Aircraft'}
            </Button>
          </CardFooter>
        </Card>
      </form>
    </Form>
  );
}

