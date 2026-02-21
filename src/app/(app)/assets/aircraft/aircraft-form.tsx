
'use client';

import { useState, useEffect } from 'react';
import { useForm, useFieldArray } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { doc, collection, writeBatch } from 'firebase/firestore';
import { Button } from '@/components/ui/button';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { useFirestore, addDocumentNonBlocking, updateDocumentNonBlocking } from '@/firebase';
import { useToast } from '@/hooks/use-toast';
import type { Aircraft } from './page';
import { v4 as uuidv4 } from 'uuid';
import { Separator } from '@/components/ui/separator';
import { PlusCircle, Trash2, CalendarIcon } from 'lucide-react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { CustomCalendar } from '@/components/ui/custom-calendar';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import { ScrollArea } from '@/components/ui/scroll-area';

// --- Zod Schemas ---
const aircraftComponentSchema = z.object({
  id: z.string(),
  manufacturer: z.string().optional(),
  name: z.string().min(1, "Component name is required."),
  partNumber: z.string().optional(),
  serialNumber: z.string().optional(),
  installDate: z.date().optional(),
  installHours: z.number({ coerce: true }).optional(),
  maxHours: z.number({ coerce: true }).optional(),
  notes: z.string().optional(),
});

const formSchema = z.object({
  make: z.string().min(1, "Make is required."),
  model: z.string().min(1, "Model is required."),
  tailNumber: z.string().min(1, "Tail number is required."),
  type: z.enum(['Single-Engine', 'Multi-Engine']),
  initialHobbs: z.number({ coerce: true }).optional(),
  currentHobbs: z.number({ coerce: true }).optional(),
  initialTacho: z.number({ coerce: true }).optional(),
  currentTacho: z.number({ coerce: true }).optional(),
  tachoAtNext50Inspection: z.number({ coerce: true }).optional(),
  tachoAtNext100Inspection: z.number({ coerce: true }).optional(),
  components: z.array(aircraftComponentSchema).optional(),
});

type FormValues = z.infer<typeof formSchema>;

const mapAircraftToFormValues = (aircraft?: Aircraft | null): FormValues => ({
    make: aircraft?.make || '',
    model: aircraft?.model || '',
    tailNumber: aircraft?.tailNumber || '',
    type: aircraft?.type || 'Single-Engine',
    initialHobbs: aircraft?.initialHobbs || 0,
    currentHobbs: aircraft?.currentHobbs || 0,
    initialTacho: aircraft?.initialTacho || 0,
    currentTacho: aircraft?.currentTacho || 0,
    tachoAtNext50Inspection: aircraft?.tachoAtNext50Inspection || 0,
    tachoAtNext100Inspection: aircraft?.tachoAtNext100Inspection || 0,
    components: (aircraft?.components || []).map(c => ({
        ...c,
        installDate: c.installDate ? new Date(c.installDate) : undefined
    })),
});

interface AircraftFormProps {
  existingAircraft?: Aircraft | null;
  onCancel: () => void;
  tenantId: string;
}

export function AircraftForm({ existingAircraft, onCancel, tenantId }: AircraftFormProps) {
  const firestore = useFirestore();
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: mapAircraftToFormValues(existingAircraft),
  });
  
  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: "components",
  });

  const addComponent = () => {
    append({ 
        id: uuidv4(), 
        name: '',
        manufacturer: '',
        partNumber: '',
        serialNumber: '',
        installDate: undefined,
        installHours: 0,
        maxHours: 0,
        notes: ''
    });
  };

  const onSubmit = async (values: FormValues) => {
    if (!firestore) return;
    setIsSubmitting(true);

    const dataToSave = {
        ...values,
        components: (values.components || []).map(c => ({
            ...c,
            installDate: c.installDate ? c.installDate.toISOString() : null,
        }))
    };

    try {
      if (existingAircraft) {
        const aircraftRef = doc(firestore, `tenants/${tenantId}/aircrafts`, existingAircraft.id);
        await updateDocumentNonBlocking(aircraftRef, dataToSave);
        toast({ title: "Aircraft Updated", description: `Details for ${values.tailNumber} have been saved.` });
      } else {
        const aircraftsCollection = collection(firestore, `tenants/${tenantId}/aircrafts`);
        await addDocumentNonBlocking(aircraftsCollection, dataToSave);
        toast({ title: "Aircraft Added", description: `${values.tailNumber} has been added to the fleet.` });
      }
      onCancel(); // Close dialog/form
    } catch (error) {
      console.error("Error saving aircraft:", error);
      toast({ variant: "destructive", title: "Save Failed", description: "An error occurred while saving the aircraft." });
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
                <ScrollArea className="h-[calc(100vh-25rem)] pr-6">
                    <CardContent className="space-y-6">
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                            {Object.keys(form.getValues()).filter(key => key !== 'components').map((key) => {
                                const fieldName = key as keyof Omit<FormValues, 'components'>;
                                if (fieldName === 'type') {
                                    return (
                                        <FormField key={fieldName} control={form.control} name={fieldName} render={({ field }) => (<FormItem><FormLabel>Type</FormLabel><Select onValueChange={field.onChange} defaultValue={field.value}><FormControl><SelectTrigger><SelectValue placeholder="Select type" /></SelectTrigger></FormControl><SelectContent><SelectItem value="Single-Engine">Single-Engine</SelectItem><SelectItem value="Multi-Engine">Multi-Engine</SelectItem></SelectContent></Select><FormMessage /></FormItem>)} />
                                    )
                                }
                                return (
                                    <FormField key={fieldName} control={form.control} name={fieldName} render={({ field }) => ( <FormItem><FormLabel className="capitalize">{fieldName.replace(/([A-Z])/g, ' $1')}</FormLabel><FormControl><Input type={typeof field.value === 'number' ? 'number' : 'text'} {...field} value={field.value ?? ''} /></FormControl><FormMessage /></FormItem> )} />
                                )
                            })}
                        </div>
                        <Separator />
                        <div>
                            <div className="flex justify-between items-center mb-4">
                                <h3 className="text-lg font-medium">Tracked Components</h3>
                                <Button type="button" variant="outline" size="sm" onClick={addComponent}><PlusCircle className="mr-2 h-4 w-4" />Add Component</Button>
                            </div>
                            <div className="space-y-4">
                                {fields.map((item, index) => (
                                    <div key={item.id} className="p-4 border rounded-lg space-y-4">
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                            <FormField control={form.control} name={`components.${index}.name`} render={({ field }) => (<FormItem><FormLabel>Component Name</FormLabel><FormControl><Input placeholder="e.g., Propeller, ELT" {...field} value={field.value ?? ''} /></FormControl><FormMessage /></FormItem>)} />
                                            <FormField control={form.control} name={`components.${index}.manufacturer`} render={({ field }) => ( <FormItem><FormLabel>Manufacturer</FormLabel><FormControl><Input placeholder="e.g., Lycoming" {...field} value={field.value ?? ''} /></FormControl><FormMessage /></FormItem> )}/>
                                            <FormField control={form.control} name={`components.${index}.partNumber`} render={({ field }) => ( <FormItem><FormLabel>Part Number</FormLabel><FormControl><Input {...field} value={field.value ?? ''} /></FormControl><FormMessage /></FormItem> )}/>
                                            <FormField control={form.control} name={`components.${index}.serialNumber`} render={({ field }) => ( <FormItem><FormLabel>Serial Number</FormLabel><FormControl><Input {...field} value={field.value ?? ''} /></FormControl><FormMessage /></FormItem> )}/>
                                            <FormField control={form.control} name={`components.${index}.installHours`} render={({ field }) => ( <FormItem><FormLabel>Install Hours (Tacho)</FormLabel><FormControl><Input type="number" {...field} value={field.value ?? ''} /></FormControl><FormMessage /></FormItem> )}/>
                                            <FormField control={form.control} name={`components.${index}.maxHours`} render={({ field }) => ( <FormItem><FormLabel>Max Hours</FormLabel><FormControl><Input type="number" {...field} value={field.value ?? ''} /></FormControl><FormMessage /></FormItem> )}/>
                                            <FormField control={form.control} name={`components.${index}.installDate`} render={({ field }) => ( <FormItem className="flex flex-col"><FormLabel>Install Date</FormLabel><Popover><PopoverTrigger asChild><FormControl><Button variant={"outline"} className={cn("pl-3 text-left font-normal", !field.value && "text-muted-foreground")}>{field.value ? format(field.value, "PPP") : <span>Pick a date</span>}<CalendarIcon className="ml-auto h-4 w-4 opacity-50" /></Button></FormControl></PopoverTrigger><PopoverContent className="w-auto p-0"><CustomCalendar selectedDate={field.value} onDateSelect={field.onChange} /></PopoverContent></Popover><FormMessage /></FormItem> )}/>
                                            <FormField control={form.control} name={`components.${index}.notes`} render={({ field }) => ( <FormItem className="col-span-1 md:col-span-2"><FormLabel>Notes</FormLabel><FormControl><Textarea {...field} value={field.value ?? ''} /></FormControl><FormMessage /></FormItem> )}/>
                                        </div>
                                        <Button type="button" variant="destructive" size="sm" onClick={() => remove(index)}><Trash2 className="mr-2 h-4 w-4" />Remove Component</Button>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </CardContent>
                </ScrollArea>
                <CardFooter className="border-t pt-6 flex justify-end gap-2">
                    <Button type="button" variant="outline" onClick={onCancel}>Cancel</Button>
                    <Button type="submit" disabled={isSubmitting}>
                        {isSubmitting ? 'Saving...' : (existingAircraft ? 'Save Changes' : 'Add Aircraft')}
                    </Button>
                </CardFooter>
            </Card>
        </form>
    </Form>
  );
}
