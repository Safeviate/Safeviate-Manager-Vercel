'use client';

import { useForm, useFieldArray, Controller, FormProvider, useFormContext } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { useFirestore, addDocumentNonBlocking, updateDocumentNonBlocking } from '@/firebase';
import { collection, doc } from 'firebase/firestore';
import { useToast } from '@/hooks/use-toast';
import { useRouter } from 'next/navigation';
import React, { useState } from 'react';
import type { Aircraft, AircraftComponent } from '@/types/aircraft';
import { PlusCircle, Trash2, CalendarIcon } from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { v4 as uuidv4 } from 'uuid';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { CustomCalendar } from '@/components/ui/custom-calendar';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';

const componentSchema = z.object({
    id: z.string(),
    manufacturer: z.string().optional(),
    name: z.string().optional(),
    partNumber: z.string().optional(),
    serialNumber: z.string().optional(),
    installDate: z.date().optional(),
    installHours: z.number({ coerce: true }).optional(),
    maxHours: z.number({ coerce: true }).optional(),
    notes: z.string().optional(),
    tsn: z.number({ coerce: true }).optional(),
    tso: z.number({ coerce: true }).optional(),
});

const formSchema = z.object({
    make: z.string().min(1, 'Make is required'),
    model: z.string().min(1, 'Model is required'),
    tailNumber: z.string().min(1, 'Tail Number is required'),
    abbreviation: z.string().optional(),
    type: z.string().optional(),
    frameHours: z.number({ coerce: true }).optional(),
    engineHours: z.number({ coerce: true }).optional(),
    initialHobbs: z.number({ coerce: true }).optional(),
    currentHobbs: z.number({ coerce: true }).optional(),
    initialTacho: z.number({ coerce: true }).optional(),
    currentTacho: z.number({ coerce: true }).optional(),
    tachoAtNext50Inspection: z.number({ coerce: true }).optional(),
    tachoAtNext100Inspection: z.number({ coerce: true }).optional(),
    components: z.array(componentSchema).optional(),
});

type AircraftFormValues = z.infer<typeof formSchema>;

interface AircraftFormProps {
  trigger?: React.ReactNode;
  existingAircraft?: Aircraft | null;
  onCancel?: () => void;
  tenantId: string;
}

const mapDatesToObjects = (aircraft?: Aircraft | null): AircraftFormValues => {
    if (!aircraft) {
        return {
            make: '',
            model: '',
            tailNumber: '',
            components: [],
        };
    }
    return {
        ...aircraft,
        frameHours: aircraft.frameHours || 0,
        engineHours: aircraft.engineHours || 0,
        initialHobbs: aircraft.initialHobbs || 0,
        currentHobbs: aircraft.currentHobbs || 0,
        initialTacho: aircraft.initialTacho || 0,
        currentTacho: aircraft.currentTacho || 0,
        tachoAtNext50Inspection: aircraft.tachoAtNext50Inspection || 0,
        tachoAtNext100Inspection: aircraft.tachoAtNext100Inspection || 0,
        components: (aircraft.components || []).map(comp => ({
            ...comp,
            installDate: comp.installDate ? new Date(comp.installDate) : undefined,
            installHours: comp.installHours || 0,
            maxHours: comp.maxHours || 0,
            tsn: comp.tsn || 0,
            tso: comp.tso || 0,
        })),
    };
};

export function AircraftForm({ trigger, existingAircraft, onCancel, tenantId }: AircraftFormProps) {
  const [isOpen, setIsOpen] = React.useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const firestore = useFirestore();
  const { toast } = useToast();
  const router = useRouter();

  const form = useForm<AircraftFormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: mapDatesToObjects(existingAircraft),
  });
  
  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: "components",
  });

  const onSubmit = async (data: AircraftFormValues) => {
    if (!firestore) return;
    setIsSubmitting(true);

    const cleanData = (obj: any): any => {
        if (obj === undefined) return null;
        if (obj === null) return null;
        if (Array.isArray(obj)) {
            return obj.map(v => cleanData(v));
        }
        if (obj instanceof Date) {
            return format(obj, 'yyyy-MM-dd');
        }
        if (typeof obj === 'object' && obj.constructor === Object) {
            const cleanedObj: { [key: string]: any } = {};
            for (const key in obj) {
                if (Object.prototype.hasOwnProperty.call(obj, key)) {
                    const value = obj[key];
                    if (value !== undefined) {
                        cleanedObj[key] = cleanData(value);
                    }
                }
            }
            return cleanedObj;
        }
        return obj;
    };
    
    const dataToSave = cleanData(data);

    try {
        if (existingAircraft) {
            const aircraftRef = doc(firestore, `tenants/${tenantId}/aircrafts`, existingAircraft.id);
            await updateDocumentNonBlocking(aircraftRef, dataToSave);
            toast({ title: "Aircraft Updated", description: `The aircraft ${dataToSave.tailNumber} has been updated.` });
        } else {
            const aircraftCollection = collection(firestore, `tenants/${tenantId}/aircrafts`);
            await addDocumentNonBlocking(aircraftCollection, dataToSave);
            toast({ title: "Aircraft Added", description: `The aircraft ${dataToSave.tailNumber} has been added.` });
        }
        if (onCancel) onCancel();
        setIsOpen(false);
        form.reset();
    } catch (error) {
        console.error("Error saving aircraft:", error);
        toast({ variant: "destructive", title: "Error", description: "Could not save the aircraft." });
    } finally {
        setIsSubmitting(false);
    }
  };
  
  const formContent = (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        <ScrollArea className="h-[60vh] p-1">
          <div className="space-y-6 px-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <FormField control={form.control} name="make" render={({ field }) => ( <FormItem><FormLabel>Make</FormLabel><FormControl><Input placeholder="e.g., Cessna" {...field} value={field.value || ''} /></FormControl><FormMessage /></FormItem> )} />
                <FormField control={form.control} name="model" render={({ field }) => ( <FormItem><FormLabel>Model</FormLabel><FormControl><Input placeholder="e.g., 172S" {...field} value={field.value || ''} /></FormControl><FormMessage /></FormItem> )} />
                <FormField control={form.control} name="tailNumber" render={({ field }) => ( <FormItem><FormLabel>Tail Number</FormLabel><FormControl><Input placeholder="e.g., N12345" {...field} value={field.value || ''} /></FormControl><FormMessage /></FormItem> )} />
                <FormField control={form.control} name="abbreviation" render={({ field }) => ( <FormItem><FormLabel>Abbreviation</FormLabel><FormControl><Input placeholder="e.g., C172S" {...field} value={field.value || ''} /></FormControl><FormMessage /></FormItem> )} />
                <FormField control={form.control} name="type" render={({ field }) => ( <FormItem><FormLabel>Type</FormLabel><Select onValueChange={field.onChange} defaultValue={field.value}><FormControl><SelectTrigger><SelectValue placeholder="Select type" /></SelectTrigger></FormControl><SelectContent><SelectItem value="Single-Engine">Single-Engine</SelectItem><SelectItem value="Multi-Engine">Multi-Engine</SelectItem></SelectContent></Select><FormMessage /></FormItem> )}/>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <FormField control={form.control} name="frameHours" render={({ field }) => ( <FormItem><FormLabel>Frame Hours</FormLabel><FormControl><Input type="number" {...field} value={field.value || 0} /></FormControl><FormMessage /></FormItem> )} />
                <FormField control={form.control} name="engineHours" render={({ field }) => ( <FormItem><FormLabel>Engine Hours</FormLabel><FormControl><Input type="number" {...field} value={field.value || 0} /></FormControl><FormMessage /></FormItem> )} />
                <FormField control={form.control} name="initialHobbs" render={({ field }) => ( <FormItem><FormLabel>Initial Hobbs</FormLabel><FormControl><Input type="number" {...field} value={field.value || 0} /></FormControl><FormMessage /></FormItem> )} />
                <FormField control={form.control} name="currentHobbs" render={({ field }) => ( <FormItem><FormLabel>Current Hobbs</FormLabel><FormControl><Input type="number" {...field} value={field.value || 0} /></FormControl><FormMessage /></FormItem> )} />
                <FormField control={form.control} name="initialTacho" render={({ field }) => ( <FormItem><FormLabel>Initial Tacho</FormLabel><FormControl><Input type="number" {...field} value={field.value || 0} /></FormControl><FormMessage /></FormItem> )} />
                <FormField control={form.control} name="currentTacho" render={({ field }) => ( <FormItem><FormLabel>Current Tacho</FormLabel><FormControl><Input type="number" {...field} value={field.value || 0} /></FormControl><FormMessage /></FormItem> )} />
                <FormField control={form.control} name="tachoAtNext50Inspection" render={({ field }) => ( <FormItem><FormLabel>Next 50hr Tacho</FormLabel><FormControl><Input type="number" {...field} value={field.value || 0} /></FormControl><FormMessage /></FormItem> )} />
                <FormField control={form.control} name="tachoAtNext100Inspection" render={({ field }) => ( <FormItem><FormLabel>Next 100hr Tacho</FormLabel><FormControl><Input type="number" {...field} value={field.value || 0} /></FormControl><FormMessage /></FormItem> )} />
            </div>

            <div>
              <h3 className="text-lg font-medium mb-4">Tracked Components</h3>
                {fields.map((field, index) => (
                  <div key={field.id} className="p-4 border rounded-lg mb-4 space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <FormField control={form.control} name={`components.${index}.manufacturer`} render={({ field }) => (<FormItem><FormLabel>Manufacturer</FormLabel><FormControl><Input {...field} value={field.value || ''} /></FormControl></FormItem>)} />
                        <FormField control={form.control} name={`components.${index}.name`} render={({ field }) => (<FormItem><FormLabel>Name</FormLabel><FormControl><Input {...field} value={field.value || ''} /></FormControl></FormItem>)} />
                        <FormField control={form.control} name={`components.${index}.partNumber`} render={({ field }) => (<FormItem><FormLabel>Part Number</FormLabel><FormControl><Input {...field} value={field.value || ''} /></FormControl></FormItem>)} />
                    </div>
                    <div className="grid grid-cols-2 md:grid-cols-5 gap-4 items-end">
                        <FormField control={form.control} name={`components.${index}.serialNumber`} render={({ field }) => (<FormItem><FormLabel>Serial Number</FormLabel><FormControl><Input {...field} value={field.value || ''} /></FormControl></FormItem>)} />
                        <FormField control={form.control} name={`components.${index}.installDate`} render={({ field }) => (<FormItem className="flex flex-col"><FormLabel>Install Date</FormLabel><Popover><PopoverTrigger asChild><FormControl><Button variant="outline" className={cn("pl-3 text-left font-normal", !field.value && "text-muted-foreground")}>{field.value ? format(field.value, "PPP") : <span>Pick a date</span>}<CalendarIcon className="ml-auto h-4 w-4 opacity-50" /></Button></FormControl></PopoverTrigger><PopoverContent className="w-auto p-0"><CustomCalendar selectedDate={field.value} onDateSelect={field.onChange} /></PopoverContent></Popover></FormItem>)} />
                        <FormField control={form.control} name={`components.${index}.tsn`} render={({ field }) => (<FormItem><FormLabel>TSN</FormLabel><FormControl><Input type="number" {...field} value={field.value || 0} /></FormControl></FormItem>)} />
                        <FormField control={form.control} name={`components.${index}.tso`} render={({ field }) => (<FormItem><FormLabel>TSO</FormLabel><FormControl><Input type="number" {...field} value={field.value || 0} /></FormControl></FormItem>)} />
                        <Button type="button" variant="destructive" size="icon" onClick={() => remove(index)}><Trash2 className="h-4 w-4" /></Button>
                    </div>
                  </div>
                ))}
                <Button type="button" variant="outline" size="sm" onClick={() => append({ id: uuidv4(), manufacturer: '', name: '', partNumber: '', serialNumber: '', installDate: new Date(), tsn: 0, tso: 0 })}>
                  <PlusCircle className="mr-2 h-4 w-4" /> Add Component
                </Button>
            </div>
          </div>
        </ScrollArea>
        {trigger ? (
            <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setIsOpen(false)}>Cancel</Button>
                <Button type="submit" disabled={isSubmitting}>Save Aircraft</Button>
            </DialogFooter>
        ) : (
             <CardFooter className="border-t pt-6 flex justify-end gap-2">
                <Button type="button" variant="outline" onClick={onCancel}>Cancel</Button>
                <Button type="submit" disabled={isSubmitting}>{isSubmitting ? 'Saving...' : 'Save Changes'}</Button>
            </CardFooter>
        )}
      </form>
    </Form>
  );

  if (trigger) {
    return (
      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogTrigger asChild>{trigger}</DialogTrigger>
        <DialogContent className="max-w-4xl">
          <DialogHeader>
            <DialogTitle>{existingAircraft ? 'Edit Aircraft' : 'Add New Aircraft'}</DialogTitle>
            <DialogDescription>{existingAircraft ? `Editing ${existingAircraft.tailNumber}.` : 'Add a new aircraft to your fleet.'}</DialogDescription>
          </DialogHeader>
          {formContent}
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Card>
        <CardHeader>
            <CardTitle>{existingAircraft ? 'Edit Aircraft' : 'Add New Aircraft'}</CardTitle>
            <CardDescription>{existingAircraft ? `Editing ${existingAircraft.tailNumber}.` : 'Add a new aircraft to your fleet.'}</CardDescription>
        </CardHeader>
        <CardContent>
            {formContent}
        </CardContent>
    </Card>
  );
}

