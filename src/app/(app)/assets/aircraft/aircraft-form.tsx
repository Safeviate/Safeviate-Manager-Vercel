
'use client';

import * as React from 'react';
import { useForm, useFieldArray, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useFirestore, addDocumentNonBlocking, updateDocumentNonBlocking } from '@/firebase';
import { doc, collection } from 'firebase/firestore';
import { useToast } from '@/hooks/use-toast';
import { useRouter } from 'next/navigation';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { CustomCalendar } from '@/components/ui/custom-calendar';
import { CalendarIcon, PlusCircle, Trash2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';

import type { Aircraft, AircraftComponent } from '@/types/aircraft';
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { v4 as uuidv4 } from 'uuid';


const componentSchema = z.object({
    id: z.string(),
    manufacturer: z.string().optional(),
    name: z.string().min(1, 'Component name is required.'),
    partNumber: z.string().min(1, 'Part number is required.'),
    serialNumber: z.string().optional(),
    installDate: z.date().optional(),
    installHours: z.number({ coerce: true }).optional(),
    maxHours: z.number({ coerce: true }).optional(),
    notes: z.string().optional(),
    tsn: z.number({ coerce: true }).optional(),
    tso: z.number({ coerce: true }).optional(),
});

const formSchema = z.object({
    make: z.string().min(1, 'Make is required.'),
    model: z.string().min(1, 'Model is required.'),
    tailNumber: z.string().min(1, 'Tail number is required.'),
    abbreviation: z.string().optional(),
    type: z.string().optional(),
    initialHobbs: z.number({ coerce: true }).optional(),
    currentHobbs: z.number({ coerce: true }).optional(),
    initialTacho: z.number({ coerce: true }).optional(),
    currentTacho: z.number({ coerce: true }).optional(),
    tachoAtNext50Inspection: z.number({ coerce: true }).optional(),
    tachoAtNext100Inspection: z.number({ coerce: true }).optional(),
    components: z.array(componentSchema).optional(),
});

export type AircraftFormValues = z.infer<typeof formSchema>;

interface AircraftFormProps {
  tenantId: string;
  existingAircraft?: Aircraft | null;
  onCancel: () => void;
}

export function AircraftForm({ tenantId, existingAircraft, onCancel }: AircraftFormProps) {
  const firestore = useFirestore();
  const { toast } = useToast();
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = React.useState(false);

  const form = useForm<AircraftFormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      make: existingAircraft?.make || '',
      model: existingAircraft?.model || '',
      tailNumber: existingAircraft?.tailNumber || '',
      abbreviation: existingAircraft?.abbreviation || '',
      type: existingAircraft?.type || '',
      initialHobbs: existingAircraft?.initialHobbs || 0,
      currentHobbs: existingAircraft?.currentHobbs || 0,
      initialTacho: existingAircraft?.initialTacho || 0,
      currentTacho: existingAircraft?.currentTacho || 0,
      tachoAtNext50Inspection: existingAircraft?.tachoAtNext50Inspection || 0,
      tachoAtNext100Inspection: existingAircraft?.tachoAtNext100Inspection || 0,
      components: existingAircraft?.components?.map(c => ({
        ...c,
        installDate: c.installDate ? new Date(c.installDate) : undefined,
      })) || [],
    },
  });

  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: 'components',
  });

  const onSubmit = async (data: AircraftFormValues) => {
    if (!firestore) return;
    setIsSubmitting(true);

    const dataToSave = {
      ...data,
      components: data.components?.map(c => ({
        ...c,
        installDate: c.installDate ? c.installDate.toISOString() : null,
      })),
    };

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
      onCancel(); // Close dialog or navigate back
    } catch (error: any) {
      toast({ variant: 'destructive', title: 'Error', description: error.message });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>{existingAircraft ? 'Edit Aircraft' : 'Add New Aircraft'}</CardTitle>
        <CardDescription>
          {existingAircraft ? `Editing ${existingAircraft.tailNumber}.` : 'Add a new aircraft to your fleet.'}
        </CardDescription>
      </CardHeader>
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)}>
          <CardContent>
            <ScrollArea className="max-h-[70vh] pr-4">
              <div className="space-y-6 p-1">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <FormField control={form.control} name="make" render={({ field }) => <FormItem><FormLabel>Make</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>} />
                  <FormField control={form.control} name="model" render={({ field }) => <FormItem><FormLabel>Model</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>} />
                  <FormField control={form.control} name="tailNumber" render={({ field }) => <FormItem><FormLabel>Tail Number</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>} />
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <FormField control={form.control} name="abbreviation" render={({ field }) => <FormItem><FormLabel>Abbreviation (5-char)</FormLabel><FormControl><Input maxLength={5} {...field} /></FormControl><FormMessage /></FormItem>} />
                  <FormField control={form.control} name="type" render={({ field }) => <FormItem><FormLabel>Type</FormLabel><Select onValueChange={field.onChange} defaultValue={field.value}><FormControl><SelectTrigger><SelectValue placeholder="Select type" /></SelectTrigger></FormControl><SelectContent><SelectItem value="Single-Engine">Single-Engine</SelectItem><SelectItem value="Multi-Engine">Multi-Engine</SelectItem></SelectContent></Select><FormMessage /></FormItem>} />
                </div>
                <Separator />
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <FormField control={form.control} name="initialHobbs" render={({ field }) => <FormItem><FormLabel>Initial Hobbs</FormLabel><FormControl><Input type="number" {...field} /></FormControl><FormMessage /></FormItem>} />
                  <FormField control={form.control} name="currentHobbs" render={({ field }) => <FormItem><FormLabel>Current Hobbs</FormLabel><FormControl><Input type="number" {...field} /></FormControl><FormMessage /></FormItem>} />
                  <FormField control={form.control} name="initialTacho" render={({ field }) => <FormItem><FormLabel>Initial Tacho</FormLabel><FormControl><Input type="number" {...field} /></FormControl><FormMessage /></FormItem>} />
                  <FormField control={form.control} name="currentTacho" render={({ field }) => <FormItem><FormLabel>Current Tacho</FormLabel><FormControl><Input type="number" {...field} /></FormControl><FormMessage /></FormItem>} />
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <FormField control={form.control} name="tachoAtNext50Inspection" render={({ field }) => <FormItem><FormLabel>Tacho at Next 50hr Insp.</FormLabel><FormControl><Input type="number" {...field} /></FormControl><FormMessage /></FormItem>} />
                    <FormField control={form.control} name="tachoAtNext100Inspection" render={({ field }) => <FormItem><FormLabel>Tacho at Next 100hr Insp.</FormLabel><FormControl><Input type="number" {...field} /></FormControl><FormMessage /></FormItem>} />
                </div>
                 <Separator />
                <div>
                  <div className="flex justify-between items-center mb-4">
                      <h3 className="text-lg font-medium">Tracked Components</h3>
                      <Button type="button" variant="outline" size="sm" onClick={() => append({ id: uuidv4(), name: '', partNumber: '' })}>
                          <PlusCircle className="mr-2 h-4 w-4" /> Add Component
                      </Button>
                  </div>
                  <div className="space-y-4">
                      {fields.map((field, index) => (
                           <Card key={field.id} className="bg-muted/30">
                              <CardHeader className="flex-row items-center justify-between py-3">
                                <CardTitle className="text-base">Component {index + 1}</CardTitle>
                                <Button type="button" variant="ghost" size="icon" onClick={() => remove(index)}>
                                  <Trash2 className="h-4 w-4 text-destructive" />
                                </Button>
                              </CardHeader>
                              <CardContent className="space-y-4">
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                  <FormField control={form.control} name={`components.${index}.name`} render={({ field }) => <FormItem><FormLabel>Name</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>} />
                                  <FormField control={form.control} name={`components.${index}.partNumber`} render={({ field }) => <FormItem><FormLabel>Part Number</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>} />
                                  <FormField control={form.control} name={`components.${index}.manufacturer`} render={({ field }) => <FormItem><FormLabel>Manufacturer</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>} />
                                </div>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                  <FormField control={form.control} name={`components.${index}.serialNumber`} render={({ field }) => <FormItem><FormLabel>Serial Number</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>} />
                                   <FormField control={form.control} name={`components.${index}.installDate`} render={({ field }) => <FormItem className="flex flex-col"><FormLabel>Install Date</FormLabel><Popover><PopoverTrigger asChild><FormControl><Button variant={"outline"} className={cn("pl-3 text-left font-normal", !field.value && "text-muted-foreground")}>{field.value ? format(new Date(field.value), "PPP") : <span>Pick a date</span>}<CalendarIcon className="ml-auto h-4 w-4 opacity-50" /></Button></FormControl></PopoverTrigger><PopoverContent className="w-auto p-0"><CustomCalendar selectedDate={field.value} onDateSelect={field.onChange} /></PopoverContent></Popover><FormMessage /></FormItem>} />
                                </div>
                                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                  <FormField control={form.control} name={`components.${index}.installHours`} render={({ field }) => <FormItem><FormLabel>Install Hours</FormLabel><FormControl><Input type="number" {...field} /></FormControl><FormMessage /></FormItem>} />
                                  <FormField control={form.control} name={`components.${index}.maxHours`} render={({ field }) => <FormItem><FormLabel>Max Hours</FormLabel><FormControl><Input type="number" {...field} /></FormControl><FormMessage /></FormItem>} />
                                  <FormField control={form.control} name={`components.${index}.tsn`} render={({ field }) => <FormItem><FormLabel>TSN</FormLabel><FormControl><Input type="number" {...field} /></FormControl><FormMessage /></FormItem>} />
                                  <FormField control={form.control} name={`components.${index}.tso`} render={({ field }) => <FormItem><FormLabel>TSO</FormLabel><FormControl><Input type="number" {...field} /></FormControl><FormMessage /></FormItem>} />
                                </div>
                              </CardContent>
                           </Card>
                      ))}
                  </div>
                </div>
              </div>
            </ScrollArea>
          </CardContent>
          <CardFooter className="border-t pt-6 flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={onCancel}>
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? 'Saving...' : existingAircraft ? 'Save Changes' : 'Create Aircraft'}
            </Button>
          </CardFooter>
        </form>
      </Form>
    </Card>
  );
}

    