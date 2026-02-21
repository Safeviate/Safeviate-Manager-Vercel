
'use client';

import { useState, useEffect } from 'react';
import { useForm, useFieldArray } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
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
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useFirestore, addDocumentNonBlocking, updateDocumentNonBlocking } from '@/firebase';
import { doc, collection } from 'firebase/firestore';
import { useToast } from '@/hooks/use-toast';
import { PlusCircle, Trash2 } from 'lucide-react';
import { Separator } from '@/components/ui/separator';
import type { Aircraft, AircraftComponent } from '@/types/aircraft';

const componentSchema = z.object({
  id: z.string(),
  name: z.string().min(1, 'Component name is required'),
  partNumber: z.string().min(1, 'Part number is required'),
  serialNumber: z.string().optional(),
  installDate: z.string().optional(),
  installHours: z.number({ coerce: true }).optional(),
  maxHours: z.number({ coerce: true }).optional(),
  tsn: z.number({ coerce: true }).optional(),
  tso: z.number({ coerce: true }).optional(),
  notes: z.string().optional(),
});

const formSchema = z.object({
  tailNumber: z.string().min(1, 'Tail number is required.'),
  model: z.string().min(1, 'Model is required.'),
  type: z.enum(['Single-Engine', 'Multi-Engine']).optional(),
  abbreviation: z.string().optional(),
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
  isOpen: boolean;
  onClose: () => void;
  existingAircraft: Aircraft | null;
  tenantId: string;
}

export function AircraftForm({
  isOpen,
  onClose,
  existingAircraft,
  tenantId,
}: AircraftFormProps) {
  const { toast } = useToast();
  const firestore = useFirestore();

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
        tailNumber: existingAircraft?.tailNumber || '',
        model: existingAircraft?.model || '',
        type: existingAircraft?.type || undefined,
        abbreviation: existingAircraft?.abbreviation || '',
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
    if (!firestore) {
      toast({ variant: 'destructive', title: 'Error', description: 'Database not available' });
      return;
    }

    if (existingAircraft) {
      const docRef = doc(firestore, `tenants/${tenantId}/aircrafts`, existingAircraft.id);
      updateDocumentNonBlocking(docRef, values);
      toast({ title: 'Aircraft Updated' });
    } else {
      const collectionRef = collection(firestore, `tenants/${tenantId}/aircrafts`);
      addDocumentNonBlocking(collectionRef, values);
      toast({ title: 'Aircraft Created' });
    }
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-4xl">
        <DialogHeader>
          <DialogTitle>{existingAircraft ? 'Edit Aircraft' : 'Add New Aircraft'}</DialogTitle>
          <DialogDescription>
            {existingAircraft ? `Editing details for ${existingAircraft.tailNumber}` : 'Enter the details for the new aircraft.'}
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <ScrollArea className="h-[70vh] pr-6">
              <div className="space-y-6 py-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <FormField control={form.control} name="tailNumber" render={({ field }) => <FormItem><FormLabel>Tail Number</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>} />
                  <FormField control={form.control} name="model" render={({ field }) => <FormItem><FormLabel>Model</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>} />
                  <FormField control={form.control} name="abbreviation" render={({ field }) => <FormItem><FormLabel>Abbreviation</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>} />
                  <FormField control={form.control} name="type" render={({ field }) => <FormItem><FormLabel>Type</FormLabel><Select onValueChange={field.onChange} defaultValue={field.value}><FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl><SelectContent><SelectItem value="Single-Engine">Single-Engine</SelectItem><SelectItem value="Multi-Engine">Multi-Engine</SelectItem></SelectContent></Select><FormMessage /></FormItem>} />
                </div>
                <Separator />
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <FormField control={form.control} name="initialHobbs" render={({ field }) => <FormItem><FormLabel>Initial Hobbs</FormLabel><FormControl><Input type="number" {...field} /></FormControl><FormMessage /></FormItem>} />
                  <FormField control={form.control} name="currentHobbs" render={({ field }) => <FormItem><FormLabel>Current Hobbs</FormLabel><FormControl><Input type="number" {...field} /></FormControl><FormMessage /></FormItem>} />
                  <FormField control={form.control} name="initialTacho" render={({ field }) => <FormItem><FormLabel>Initial Tacho</FormLabel><FormControl><Input type="number" {...field} /></FormControl><FormMessage /></FormItem>} />
                  <FormField control={form.control} name="currentTacho" render={({ field }) => <FormItem><FormLabel>Current Tacho</FormLabel><FormControl><Input type="number" {...field} /></FormControl><FormMessage /></FormItem>} />
                </div>
                <Separator />
                 <div className="grid grid-cols-2 gap-4">
                  <FormField control={form.control} name="tachoAtNext50Inspection" render={({ field }) => <FormItem><FormLabel>Next 50hr Tacho</FormLabel><FormControl><Input type="number" {...field} /></FormControl><FormMessage /></FormItem>} />
                  <FormField control={form.control} name="tachoAtNext100Inspection" render={({ field }) => <FormItem><FormLabel>Next 100hr Tacho</FormLabel><FormControl><Input type="number" {...field} /></FormControl><FormMessage /></FormItem>} />
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
                             <div key={field.id} className="p-4 border rounded-md space-y-4 relative">
                                 <Button type="button" variant="ghost" size="icon" className="absolute top-2 right-2 text-destructive" onClick={() => remove(index)}>
                                    <Trash2 className="h-4 w-4" />
                                </Button>
                                <div className="grid grid-cols-2 gap-4">
                                     <FormField control={form.control} name={`components.${index}.name`} render={({ field }) => <FormItem><FormLabel>Name</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>} />
                                     <FormField control={form.control} name={`components.${index}.partNumber`} render={({ field }) => <FormItem><FormLabel>Part No.</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>} />
                                </div>
                             </div>
                        ))}
                     </div>
                </div>
              </div>
            </ScrollArea>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
              <Button type="submit">{existingAircraft ? 'Save Changes' : 'Create Aircraft'}</Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
