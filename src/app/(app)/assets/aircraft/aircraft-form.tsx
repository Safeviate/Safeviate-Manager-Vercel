
'use client';

import { useState, useMemo, useEffect } from 'react';
import { useForm, useFieldArray } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { doc, collection, writeBatch } from 'firebase/firestore';
import { createUserWithEmailAndPassword } from 'firebase/auth';
import { v4 as uuidv4 } from 'uuid';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { PlusCircle, Trash2, CalendarIcon, ChevronsUpDown } from 'lucide-react';
import { useFirestore, useAuth, addDocumentNonBlocking, updateDocumentNonBlocking } from '@/firebase';
import { useToast } from '@/hooks/use-toast';
import type { Aircraft } from '@/types/aircraft';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Collapsible, CollapsibleTrigger, CollapsibleContent } from '@/components/ui/collapsible';
import { Textarea } from '@/components/ui/textarea';
import { Popover, PopoverTrigger, PopoverContent } from '@/components/ui/popover';
import { CustomCalendar } from '@/components/ui/custom-calendar';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';

// Zod Schemas
const aircraftComponentSchema = z.object({
  id: z.string(),
  manufacturer: z.string().optional(),
  name: z.string().min(1, "Component name is required"),
  partNumber: z.string().min(1, "Part number is required"),
  serialNumber: z.string().optional(),
  installDate: z.date().optional(),
  installHours: z.coerce.number().optional(),
  maxHours: z.coerce.number().optional(),
  notes: z.string().optional(),
  tsn: z.coerce.number().optional(),
  tso: z.coerce.number().optional(),
});

const formSchema = z.object({
  make: z.string().min(1, 'Make is required'),
  model: z.string().min(1, 'Model is required'),
  tailNumber: z.string().min(1, 'Tail Number is required'),
  abbreviation: z.string().optional(),
  type: z.enum(['Single-Engine', 'Multi-Engine']),
  initialHobbs: z.coerce.number().optional(),
  currentHobbs: z.coerce.number().optional(),
  initialTacho: z.coerce.number().optional(),
  currentTacho: z.coerce.number().optional(),
  tachoAtNext50Inspection: z.coerce.number().optional(),
  tachoAtNext100Inspection: z.coerce.number().optional(),
  components: z.array(aircraftComponentSchema).optional(),
});

type FormValues = z.infer<typeof formSchema>;

interface AircraftFormProps {
  tenantId: string;
  existingAircraft?: Aircraft | null;
  trigger?: React.ReactNode;
  onFormSubmit?: () => void;
  hideHeader?: boolean;
}

export function AircraftForm({
  tenantId,
  existingAircraft,
  trigger,
  onFormSubmit,
  hideHeader = false,
}: AircraftFormProps) {
  const firestore = useFirestore();
  const { toast } = useToast();
  const [isOpen, setIsOpen] = useState(false);

  const defaultValues = useMemo(() => ({
    make: existingAircraft?.make ?? '',
    model: existingAircraft?.model ?? '',
    tailNumber: existingAircraft?.tailNumber ?? '',
    abbreviation: existingAircraft?.abbreviation ?? '',
    type: existingAircraft?.type ?? 'Single-Engine',
    initialHobbs: existingAircraft?.initialHobbs ?? 0,
    currentHobbs: existingAircraft?.currentHobbs ?? 0,
    initialTacho: existingAircraft?.initialTacho ?? 0,
    currentTacho: existingAircraft?.currentTacho ?? 0,
    tachoAtNext50Inspection: existingAircraft?.tachoAtNext50Inspection ?? 0,
    tachoAtNext100Inspection: existingAircraft?.tachoAtNext100Inspection ?? 0,
    components: existingAircraft?.components?.map(c => ({
        ...c,
        installDate: c.installDate ? new Date(c.installDate) : undefined,
    })) || [],
  }), [existingAircraft]);

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues,
  });

  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: 'components'
  });

  useEffect(() => {
    if (isOpen || !trigger) {
      form.reset(defaultValues);
    }
  }, [isOpen, trigger, defaultValues, form]);

  const onSubmit = (values: FormValues) => {
    if (!firestore) return;

    const dataToSave = {
        ...values,
        components: values.components?.map(c => ({
            ...c,
            installDate: c.installDate ? c.installDate.toISOString() : undefined,
        }))
    };

    if (existingAircraft) {
      const aircraftRef = doc(firestore, 'tenants', tenantId, 'aircrafts', existingAircraft.id);
      updateDocumentNonBlocking(aircraftRef, dataToSave);
      toast({ title: 'Aircraft Updated', description: `${values.tailNumber} has been updated.` });
    } else {
      addDocumentNonBlocking(collection(firestore, 'tenants', tenantId, 'aircrafts'), dataToSave);
      toast({ title: 'Aircraft Added', description: `${values.tailNumber} has been added to the fleet.` });
    }

    if (onFormSubmit) {
      onFormSubmit();
    } else {
      setIsOpen(false);
    }
  };

  const formContent = (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        <ScrollArea className="max-h-[70vh] pr-6">
          <div className="space-y-6 p-1">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                <FormField control={form.control} name="make" render={({ field }) => ( <FormItem><FormLabel>Make</FormLabel><FormControl><Input placeholder="e.g., Cessna" {...field} /></FormControl><FormMessage /></FormItem> )}/>
                <FormField control={form.control} name="model" render={({ field }) => ( <FormItem><FormLabel>Model</FormLabel><FormControl><Input placeholder="e.g., 172S" {...field} /></FormControl><FormMessage /></FormItem> )}/>
                <FormField control={form.control} name="tailNumber" render={({ field }) => ( <FormItem><FormLabel>Tail Number</FormLabel><FormControl><Input placeholder="e.g., N12345" {...field} /></FormControl><FormMessage /></FormItem> )}/>
                <FormField control={form.control} name="abbreviation" render={({ field }) => ( <FormItem><FormLabel>Abbreviation</FormLabel><FormControl><Input placeholder="e.g., C172" {...field} /></FormControl><FormMessage /></FormItem> )}/>
                <FormField control={form.control} name="type" render={({ field }) => ( <FormItem><FormLabel>Type</FormLabel><Select onValueChange={field.onChange} defaultValue={field.value}><FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl><SelectContent><SelectItem value="Single-Engine">Single-Engine</SelectItem><SelectItem value="Multi-Engine">Multi-Engine</SelectItem></SelectContent></Select><FormMessage /></FormItem> )}/>
            </div>
            <Separator />
            <h4 className="text-md font-medium">Meter Readings</h4>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <FormField control={form.control} name="initialHobbs" render={({ field }) => ( <FormItem><FormLabel>Initial Hobbs</FormLabel><FormControl><Input type="number" {...field} /></FormControl><FormMessage /></FormItem> )}/>
                <FormField control={form.control} name="currentHobbs" render={({ field }) => ( <FormItem><FormLabel>Current Hobbs</FormLabel><FormControl><Input type="number" {...field} /></FormControl><FormMessage /></FormItem> )}/>
                <FormField control={form.control} name="initialTacho" render={({ field }) => ( <FormItem><FormLabel>Initial Tacho</FormLabel><FormControl><Input type="number" {...field} /></FormControl><FormMessage /></FormItem> )}/>
                <FormField control={form.control} name="currentTacho" render={({ field }) => ( <FormItem><FormLabel>Current Tacho</FormLabel><FormControl><Input type="number" {...field} /></FormControl><FormMessage /></FormItem> )}/>
            </div>
            <Separator />
            <h4 className="text-md font-medium">Inspections</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField control={form.control} name="tachoAtNext50Inspection" render={({ field }) => ( <FormItem><FormLabel>Next 50hr Insp. at</FormLabel><FormControl><Input type="number" {...field} /></FormControl><FormMessage /></FormItem> )}/>
                <FormField control={form.control} name="tachoAtNext100Inspection" render={({ field }) => ( <FormItem><FormLabel>Next 100hr Insp. at</FormLabel><FormControl><Input type="number" {...field} /></FormControl><FormMessage /></FormItem> )}/>
            </div>
            
            <Separator />
            <Collapsible>
                <div className='flex items-center gap-2 mb-4'>
                    <CollapsibleTrigger asChild>
                        <Button variant="ghost" size="sm" className="w-auto p-1 h-auto flex items-center gap-2 text-lg font-semibold">
                            Tracked Components
                            <ChevronsUpDown className="h-4 w-4" />
                        </Button>
                    </CollapsibleTrigger>
                </div>
                <CollapsibleContent className="space-y-4">
                    {fields.map((item, index) => (
                        <Card key={item.id} className="bg-muted/30">
                            <CardHeader className="flex flex-row items-center justify-between">
                                <CardTitle className="text-base">Component {index + 1}</CardTitle>
                                <Button type="button" variant="destructive" size="icon" onClick={() => remove(index)}>
                                    <Trash2 className="h-4 w-4" />
                                </Button>
                            </CardHeader>
                            <CardContent className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                <FormField control={form.control} name={`components.${index}.name`} render={({ field }) => (<FormItem><FormLabel>Name</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>)} />
                                <FormField control={form.control} name={`components.${index}.partNumber`} render={({ field }) => (<FormItem><FormLabel>Part Number</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>)} />
                                <FormField control={form.control} name={`components.${index}.serialNumber`} render={({ field }) => (<FormItem><FormLabel>Serial Number</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>)} />
                                <FormField control={form.control} name={`components.${index}.manufacturer`} render={({ field }) => (<FormItem><FormLabel>Manufacturer</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>)} />
                                <FormField control={form.control} name={`components.${index}.installDate`} render={({ field }) => ( <FormItem className="flex flex-col"><FormLabel>Install Date</FormLabel><Popover><PopoverTrigger asChild><FormControl><Button variant={"outline"} className={cn("pl-3 text-left font-normal", !field.value && "text-muted-foreground")}>{field.value ? format(new Date(field.value), "PPP") : <span>Pick a date</span>}<CalendarIcon className="ml-auto h-4 w-4 opacity-50" /></Button></FormControl></PopoverTrigger><PopoverContent className="w-auto p-0"><CustomCalendar selectedDate={field.value} onDateSelect={field.onChange} /></PopoverContent></Popover><FormMessage /></FormItem>)}/>
                                <FormField control={form.control} name={`components.${index}.installHours`} render={({ field }) => (<FormItem><FormLabel>Install Hours</FormLabel><FormControl><Input type="number" {...field} /></FormControl><FormMessage /></FormItem>)} />
                                <FormField control={form.control} name={`components.${index}.maxHours`} render={({ field }) => (<FormItem><FormLabel>Max Hours</FormLabel><FormControl><Input type="number" {...field} /></FormControl><FormMessage /></FormItem>)} />
                                <FormField control={form.control} name={`components.${index}.tsn`} render={({ field }) => (<FormItem><FormLabel>Time Since New</FormLabel><FormControl><Input type="number" {...field} /></FormControl><FormMessage /></FormItem>)} />
                                <FormField control={form.control} name={`components.${index}.tso`} render={({ field }) => (<FormItem><FormLabel>Time Since Overhaul</FormLabel><FormControl><Input type="number" {...field} /></FormControl><FormMessage /></FormItem>)} />
                                <FormField control={form.control} name={`components.${index}.notes`} render={({ field }) => (<FormItem className="lg:col-span-3"><FormLabel>Notes</FormLabel><FormControl><Textarea {...field} /></FormControl><FormMessage /></FormItem>)} />
                            </CardContent>
                        </Card>
                    ))}
                    <Button type="button" variant="outline" onClick={() => append({ id: uuidv4(), name: '', partNumber: ''})}>
                        <PlusCircle className="mr-2 h-4 w-4" /> Add Component
                    </Button>
                </CollapsibleContent>
            </Collapsible>
          </div>
        </ScrollArea>
        <DialogFooter className="mt-4">
          <DialogClose asChild>
            <Button type="button" variant="outline">Cancel</Button>
          </DialogClose>
          <Button type="submit">Save Aircraft</Button>
        </DialogFooter>
      </form>
    </Form>
  );

  if (!trigger) {
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
      )
  }

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent className="max-w-4xl">
        <DialogHeader>
          <DialogTitle>{existingAircraft ? 'Edit Aircraft' : 'Add New Aircraft'}</DialogTitle>
          <DialogDescription>
            {existingAircraft ? `Editing details for ${existingAircraft.tailNumber}.` : 'Fill out the form to add a new aircraft.'}
          </DialogDescription>
        </DialogHeader>
        {formContent}
      </DialogContent>
    </Dialog>
  );
}

    