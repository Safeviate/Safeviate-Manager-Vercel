
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
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useFirestore, addDocumentNonBlocking, updateDocumentNonBlocking } from '@/firebase';
import { doc, collection } from 'firebase/firestore';
import { useToast } from '@/hooks/use-toast';
import { PlusCircle, Trash2 } from 'lucide-react';
import { v4 as uuidv4 } from 'uuid';
import type { Aircraft, AircraftComponent } from '@/types/aircraft';
import { useState } from 'react';

const componentSchema = z.object({
  id: z.string(),
  name: z.string().min(1, { message: 'Component name is required.' }),
  partNumber: z.string().min(1, { message: 'Part number is required.' }),
  serialNumber: z.string().optional(),
  installDate: z.string().optional(),
  installHours: z.number().optional(),
  maxHours: z.number().optional(),
});

const formSchema = z.object({
  make: z.string().min(1, { message: "Make is required." }),
  model: z.string().min(1, { message: "Model is required." }),
  tailNumber: z.string().min(1, { message: "Tail number is required." }),
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
  tenantId: string;
  existingAircraft?: Aircraft | null;
  trigger?: React.ReactNode;
  onFormSubmit?: () => void;
}

export function AircraftForm({
  tenantId,
  existingAircraft,
  trigger,
  onFormSubmit,
}: AircraftFormProps) {
  const firestore = useFirestore();
  const { toast } = useToast();
  const [isOpen, setIsOpen] = useState(false);

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      make: existingAircraft?.make || '',
      model: existingAircraft?.model || '',
      tailNumber: existingAircraft?.tailNumber || '',
      type: existingAircraft?.type || 'Single-Engine',
      initialHobbs: existingAircraft?.initialHobbs || 0,
      currentHobbs: existingAircraft?.currentHobbs || 0,
      initialTacho: existingAircraft?.initialTacho || 0,
      currentTacho: existingAircraft?.currentTacho || 0,
      tachoAtNext50Inspection: existingAircraft?.tachoAtNext50Inspection || 0,
      tachoAtNext100Inspection: existingAircraft?.tachoAtNext100Inspection || 0,
      components: existingAircraft?.components || [],
    },
  });

  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: 'components',
  });

  const onSubmit = (values: FormValues) => {
    if (!firestore || !tenantId) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Could not connect to the database.',
      });
      return;
    }

    if (existingAircraft) {
      const aircraftRef = doc(firestore, 'tenants', tenantId, 'aircrafts', existingAircraft.id);
      updateDocumentNonBlocking(aircraftRef, values);
      toast({
        title: 'Aircraft Updated',
        description: `${values.tailNumber} has been updated.`,
      });
    } else {
      const aircraftsCollection = collection(firestore, 'tenants', tenantId, 'aircrafts');
      addDocumentNonBlocking(aircraftsCollection, values);
      toast({
        title: 'Aircraft Added',
        description: `${values.tailNumber} has been added to your fleet.`,
      });
    }

    if(onFormSubmit) {
      onFormSubmit();
    } else {
      setIsOpen(false);
    }
  };

  const handleOpenChange = (open: boolean) => {
    if (!open) {
      form.reset();
    }
    setIsOpen(open);
  }

  const formContent = (
    <ScrollArea className="h-[70vh] pr-6">
        <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                 <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <FormField control={form.control} name="make" render={({ field }) => (<FormItem><FormLabel>Make</FormLabel><FormControl><Input placeholder="e.g., Cessna" {...field} value={field.value ?? ''} /></FormControl><FormMessage /></FormItem>)} />
                    <FormField control={form.control} name="model" render={({ field }) => (<FormItem><FormLabel>Model</FormLabel><FormControl><Input placeholder="e.g., 172 Skyhawk" {...field} value={field.value ?? ''} /></FormControl><FormMessage /></FormItem>)} />
                    <FormField control={form.control} name="tailNumber" render={({ field }) => (<FormItem><FormLabel>Tail Number</FormLabel><FormControl><Input placeholder="e.g., N12345" {...field} value={field.value ?? ''} /></FormControl><FormMessage /></FormItem>)} />
                    <FormField control={form.control} name="type" render={({ field }) => (<FormItem><FormLabel>Type</FormLabel><Select onValueChange={field.onChange} defaultValue={field.value}><FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl><SelectContent><SelectItem value="Single-Engine">Single-Engine</SelectItem><SelectItem value="Multi-Engine">Multi-Engine</SelectItem></SelectContent></Select><FormMessage /></FormItem>)} />
                </div>
                
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                    <FormField control={form.control} name="initialHobbs" render={({ field }) => (<FormItem><FormLabel>Initial Hobbs</FormLabel><FormControl><Input type="number" {...field} value={field.value ?? 0} /></FormControl><FormMessage /></FormItem>)} />
                    <FormField control={form.control} name="currentHobbs" render={({ field }) => (<FormItem><FormLabel>Current Hobbs</FormLabel><FormControl><Input type="number" {...field} value={field.value ?? 0} /></FormControl><FormMessage /></FormItem>)} />
                    <FormField control={form.control} name="initialTacho" render={({ field }) => (<FormItem><FormLabel>Initial Tacho</FormLabel><FormControl><Input type="number" {...field} value={field.value ?? 0} /></FormControl><FormMessage /></FormItem>)} />
                    <FormField control={form.control} name="currentTacho" render={({ field }) => (<FormItem><FormLabel>Current Tacho</FormLabel><FormControl><Input type="number" {...field} value={field.value ?? 0} /></FormControl><FormMessage /></FormItem>)} />
                    <FormField control={form.control} name="tachoAtNext50Inspection" render={({ field }) => (<FormItem><FormLabel>Next 50hr Insp.</FormLabel><FormControl><Input type="number" {...field} value={field.value ?? 0} /></FormControl><FormMessage /></FormItem>)} />
                    <FormField control={form.control} name="tachoAtNext100Inspection" render={({ field }) => (<FormItem><FormLabel>Next 100hr Insp.</FormLabel><FormControl><Input type="number" {...field} value={field.value ?? 0} /></FormControl><FormMessage /></FormItem>)} />
                </div>

                <div>
                    <Button type="submit" className="w-full mt-4">{existingAircraft ? 'Save Changes' : 'Add Aircraft'}</Button>
                </div>
            </form>
        </Form>
    </ScrollArea>
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
    <Dialog open={isOpen} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>{existingAircraft ? 'Edit Aircraft' : 'Add New Aircraft'}</DialogTitle>
          <DialogDescription>
            {existingAircraft ? `Editing ${existingAircraft.tailNumber}.` : 'Add a new aircraft to your fleet.'}
          </DialogDescription>
        </DialogHeader>
        {formContent}
      </DialogContent>
    </Dialog>
  );
}
