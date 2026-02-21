
'use client';

import { useForm, useFieldArray } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogClose,
} from '@/components/ui/dialog';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { CustomCalendar } from '@/components/ui/custom-calendar';
import { CalendarIcon, PlusCircle, Trash2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import type { Aircraft } from './page';
import { v4 as uuidv4 } from 'uuid';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import { useFirestore, addDocumentNonBlocking, updateDocumentNonBlocking } from '@/firebase';
import { doc, collection } from 'firebase/firestore';
import React from 'react';


const componentSchema = z.object({
  id: z.string(),
  manufacturer: z.string().optional(),
  name: z.string().min(1, "Component name is required."),
  partNumber: z.string().optional(),
  serialNumber: z.string().optional(),
  installDate: z.date(),
  installHours: z.number({ coerce: true }).optional(),
  maxHours: z.number({ coerce: true }).optional(),
  notes: z.string().optional(),
});


const formSchema = z.object({
  make: z.string().min(1, "Make is required"),
  model: z.string().min(1, "Model is required"),
  tailNumber: z.string().min(1, "Tail number is required"),
  abbreviation: z.string().max(5, "Abbreviation must be 5 characters or less.").optional(),
  type: z.enum(['Single-Engine', 'Multi-Engine']),
  initialHobbs: z.number({ coerce: true }).optional(),
  currentHobbs: z.number({ coerce: true }).optional(),
  initialTacho: z.number({ coerce: true }).optional(),
  currentTacho: z.number({ coerce: true }).optional(),
  tachoAtNext50Inspection: z.number({ coerce: true }).optional(),
  tachoAtNext100Inspection: z.number({ coerce: true }).optional(),
  components: z.array(componentSchema).optional(),
});

type FormValues = z.infer<typeof formSchema>;

interface AircraftFormProps {
  existingAircraft?: Aircraft | null;
  tenantId: string;
  onCancel?: () => void;
  trigger?: React.ReactNode;
  isSubmitting?: boolean;
}

export function AircraftForm({ existingAircraft, tenantId, onCancel, trigger, isSubmitting: propIsSubmitting }: AircraftFormProps) {
    const { toast } = useToast();
    const firestore = useFirestore();
    const [isOpen, setIsOpen] = React.useState(false);
    const [isSubmitting, setIsSubmitting] = React.useState(propIsSubmitting || false);

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
        make: existingAircraft?.make || '',
        model: existingAircraft?.model || '',
        tailNumber: existingAircraft?.tailNumber || '',
        abbreviation: existingAircraft?.abbreviation || '',
        type: existingAircraft?.type || 'Single-Engine',
        initialHobbs: existingAircraft?.initialHobbs || 0,
        currentHobbs: existingAircraft?.currentHobbs || 0,
        initialTacho: existingAircraft?.initialTacho || 0,
        currentTacho: existingAircraft?.currentTacho || 0,
        tachoAtNext50Inspection: existingAircraft?.tachoAtNext50Inspection || 0,
        tachoAtNext100Inspection: existingAircraft?.tachoAtNext100Inspection || 0,
        components: (existingAircraft?.components || []).map(c => ({
            ...c,
            installDate: c.installDate ? new Date(c.installDate) : new Date(),
        })),
    },
  });

  const { fields: componentFields, append: appendComponent, remove: removeComponent } = useFieldArray({
      control: form.control,
      name: 'components',
  });
  
  const onOpenChange = (open: boolean) => {
    if (!open) {
      form.reset();
    }
    setIsOpen(open);
  };

  const onSubmit = async (values: FormValues) => {
    if (!firestore) return;
    setIsSubmitting(true);
    
    const dataToSave = {
        ...values,
        components: values.components?.map(c => ({
            ...c,
            installDate: c.installDate.toISOString(),
        }))
    };

    try {
        if (existingAircraft) {
            const aircraftRef = doc(firestore, `tenants/${tenantId}/aircrafts`, existingAircraft.id);
            await updateDocumentNonBlocking(aircraftRef, dataToSave);
            toast({ title: 'Aircraft Updated', description: `${values.tailNumber} has been updated.` });
        } else {
            const aircraftsCollection = collection(firestore, `tenants/${tenantId}/aircrafts`);
            await addDocumentNonBlocking(aircraftsCollection, dataToSave);
            toast({ title: 'Aircraft Added', description: `${values.tailNumber} has been added.` });
        }
        if (onCancel) onCancel();
        setIsOpen(false);
    } catch (error) {
        console.error("Error saving aircraft: ", error);
        toast({ variant: 'destructive', title: 'Error', description: 'Failed to save aircraft.' });
    } finally {
        setIsSubmitting(false);
    }
  };

  const formContent = (
    <>
      <CardHeader>
        <CardTitle>{existingAircraft ? 'Edit Aircraft' : 'Add New Aircraft'}</CardTitle>
        <CardDescription>{existingAircraft ? `Editing ${existingAircraft.tailNumber}.` : 'Add a new aircraft to your fleet.'}</CardDescription>
      </CardHeader>
      <ScrollArea className="h-[calc(100vh-22rem)]">
        <CardContent className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <FormField control={form.control} name="make" render={({ field }) => ( <FormItem><FormLabel>Make</FormLabel><FormControl><Input placeholder="e.g., Cessna" {...field} /></FormControl><FormMessage /></FormItem> )} />
            <FormField control={form.control} name="model" render={({ field }) => ( <FormItem><FormLabel>Model</FormLabel><FormControl><Input placeholder="e.g., 172S" {...field} /></FormControl><FormMessage /></FormItem> )} />
            <FormField control={form.control} name="tailNumber" render={({ field }) => ( <FormItem><FormLabel>Tail Number</FormLabel><FormControl><Input placeholder="e.g., N12345" {...field} /></FormControl><FormMessage /></FormItem> )} />
            <FormField control={form.control} name="abbreviation" render={({ field }) => ( <FormItem><FormLabel>Abbreviation (5 chars)</FormLabel><FormControl><Input maxLength={5} placeholder="e.g., C172S" {...field} /></FormControl><FormMessage /></FormItem> )} />
            <FormField control={form.control} name="type" render={({ field }) => ( <FormItem><FormLabel>Type</FormLabel><Select onValueChange={field.onChange} defaultValue={field.value}><FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl><SelectContent><SelectItem value="Single-Engine">Single-Engine</SelectItem><SelectItem value="Multi-Engine">Multi-Engine</SelectItem></SelectContent></Select><FormMessage /></FormItem> )} />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <FormField control={form.control} name="initialHobbs" render={({ field }) => ( <FormItem><FormLabel>Initial Hobbs</FormLabel><FormControl><Input type="number" {...field} /></FormControl><FormMessage /></FormItem> )} />
            <FormField control={form.control} name="currentHobbs" render={({ field }) => ( <FormItem><FormLabel>Current Hobbs</FormLabel><FormControl><Input type="number" {...field} /></FormControl><FormMessage /></FormItem> )} />
            <FormField control={form.control} name="initialTacho" render={({ field }) => ( <FormItem><FormLabel>Initial Tacho</FormLabel><FormControl><Input type="number" {...field} /></FormControl><FormMessage /></FormItem> )} />
            <FormField control={form.control} name="currentTacho" render={({ field }) => ( <FormItem><FormLabel>Current Tacho</FormLabel><FormControl><Input type="number" {...field} /></FormControl><FormMessage /></FormItem> )} />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <FormField control={form.control} name="tachoAtNext50Inspection" render={({ field }) => ( <FormItem><FormLabel>Tacho at Next 50hr Insp.</FormLabel><FormControl><Input type="number" {...field} /></FormControl><FormMessage /></FormItem> )} />
            <FormField control={form.control} name="tachoAtNext100Inspection" render={({ field }) => ( <FormItem><FormLabel>Tacho at Next 100hr Insp.</FormLabel><FormControl><Input type="number" {...field} /></FormControl><FormMessage /></FormItem> )} />
          </div>
          {/* --- Tracked Components --- */}
          <div>
            <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-semibold">Tracked Components</h3>
                <Button type="button" variant="outline" size="sm" onClick={() => appendComponent({ id: uuidv4(), name: '', partNumber: '', installDate: new Date() })}>
                    <PlusCircle className="mr-2 h-4 w-4" /> Add Component
                </Button>
            </div>
            <div className="space-y-4">
              {componentFields.map((field, index) => (
                <div key={field.id} className="p-4 border rounded-lg bg-muted/30">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <FormField control={form.control} name={`components.${index}.manufacturer`} render={({ field }) => ( <FormItem><FormLabel>Manufacturer</FormLabel><FormControl><Input placeholder="e.g., Lycoming" {...field} /></FormControl></FormItem> )}/>
                    <FormField control={form.control} name={`components.${index}.name`} render={({ field }) => ( <FormItem><FormLabel>Component Name</FormLabel><FormControl><Input placeholder="e.g., Engine" {...field} /></FormControl><FormMessage /></FormItem> )}/>
                    <FormField control={form.control} name={`components.${index}.partNumber`} render={({ field }) => ( <FormItem><FormLabel>Part Number</FormLabel><FormControl><Input {...field} /></FormControl></FormItem> )}/>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4">
                    <FormField control={form.control} name={`components.${index}.serialNumber`} render={({ field }) => ( <FormItem><FormLabel>Serial Number</FormLabel><FormControl><Input {...field} /></FormControl></FormItem> )}/>
                    <FormField control={form.control} name={`components.${index}.installDate`} render={({ field }) => ( <FormItem className='flex flex-col'><FormLabel>Install Date</FormLabel><Popover><PopoverTrigger asChild><FormControl><Button variant={"outline"} className={cn("pl-3 text-left font-normal bg-card", !field.value && "text-muted-foreground")}>{field.value ? format(field.value, "PPP") : <span>Pick a date</span>}<CalendarIcon className="ml-auto h-4 w-4 opacity-50" /></Button></FormControl></PopoverTrigger><PopoverContent className="w-auto p-0"><CustomCalendar selectedDate={field.value} onDateSelect={field.onChange} /></PopoverContent></Popover><FormMessage /></FormItem>)}/>
                    <FormField control={form.control} name={`components.${index}.installHours`} render={({ field }) => ( <FormItem><FormLabel>Install Hours (Tacho)</FormLabel><FormControl><Input type="number" {...field} /></FormControl></FormItem> )}/>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4">
                    <FormField control={form.control} name={`components.${index}.maxHours`} render={({ field }) => ( <FormItem><FormLabel>Max Hours (TBO)</FormLabel><FormControl><Input type="number" {...field} /></FormControl></FormItem> )}/>
                    <FormField control={form.control} name={`components.${index}.notes`} render={({ field }) => ( <FormItem className='col-span-2'><FormLabel>Notes</FormLabel><FormControl><Input {...field} /></FormControl></FormItem> )}/>
                  </div>
                  <div className="text-right mt-2">
                      <Button type="button" variant="destructive" size="sm" onClick={() => removeComponent(index)}>
                          <Trash2 className="mr-2 h-4 w-4" /> Remove
                      </Button>
                  </div>
                </div>
              ))}
              {componentFields.length === 0 && (
                  <div className="text-center py-8 text-muted-foreground border-2 border-dashed rounded-lg">
                      <p>No tracked components.</p>
                  </div>
              )}
            </div>
          </div>
        </CardContent>
      </ScrollArea>
      <CardFooter className="border-t pt-6 flex justify-end gap-2">
        <Button type="button" variant="outline" onClick={onCancel}>Cancel</Button>
        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting ? "Saving..." : (existingAircraft ? 'Save Changes' : 'Add Aircraft')}
        </Button>
      </CardFooter>
    </>
  );

  if (trigger) {
      return (
          <Dialog open={isOpen} onOpenChange={onOpenChange}>
              <DialogTrigger asChild>
                  {trigger}
              </DialogTrigger>
              <DialogContent className="max-w-4xl">
                  <Form {...form}>
                      <form onSubmit={form.handleSubmit(onSubmit)}>
                        {formContent}
                      </form>
                  </Form>
              </DialogContent>
          </Dialog>
      )
  }

  // Standalone form view
  return (
      <Card>
          <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)}>
                  {formContent}
              </form>
          </Form>
      </Card>
  );
}

    