'use client';

import { useForm, useFieldArray } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
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
import { Separator } from '@/components/ui/separator';
import { useFirestore, addDocumentNonBlocking, updateDocumentNonBlocking } from '@/firebase';
import { collection, doc } from 'firebase/firestore';
import { useToast } from '@/hooks/use-toast';
import { useEffect } from 'react';
import { PlusCircle, Trash2 } from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import type { Aircraft, AircraftComponent } from '@/types/aircraft';

const componentSchema = z.object({
  id: z.string(),
  name: z.string().min(1, 'Component name is required'),
  partNumber: z.string().min(1, 'Part number is required'),
  serialNumber: z.string().optional().nullable(),
  installDate: z.string().optional().nullable(),
  installHours: z.number({ coerce: true }).optional().nullable(),
  maxHours: z.number({ coerce: true }).optional().nullable(),
  notes: z.string().optional().nullable(),
});

const formSchema = z.object({
  tailNumber: z.string().min(1, 'Tail number is required'),
  model: z.string().min(1, 'Model is required'),
  type: z.enum(['Single-Engine', 'Multi-Engine']),
  initialHobbs: z.number({ coerce: true }).optional().nullable(),
  currentHobbs: z.number({ coerce: true }).optional().nullable(),
  initialTacho: z.number({ coerce: true }).optional().nullable(),
  currentTacho: z.number({ coerce: true }).optional().nullable(),
  tachoAtNext50Inspection: z.number({ coerce: true }).optional().nullable(),
  tachoAtNext100Inspection: z.number({ coerce: true }).optional().nullable(),
  components: z.array(componentSchema).optional(),
});

type FormValues = z.infer<typeof formSchema>;

interface AircraftFormProps {
  isOpen: boolean;
  aircraft: Aircraft | null;
  onCancel: () => void;
  tenantId: string;
}

export function AircraftForm({
  isOpen,
  aircraft,
  onCancel,
  tenantId,
}: AircraftFormProps) {
  const firestore = useFirestore();
  const { toast } = useToast();

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      tailNumber: '',
      model: '',
      type: 'Single-Engine',
      initialHobbs: 0,
      currentHobbs: 0,
      initialTacho: 0,
      currentTacho: 0,
      tachoAtNext50Inspection: 0,
      tachoAtNext100Inspection: 0,
      components: [],
    },
  });

  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: 'components',
  });

  useEffect(() => {
    if (aircraft) {
      form.reset({
        tailNumber: aircraft.tailNumber || '',
        model: aircraft.model || '',
        type: aircraft.type || 'Single-Engine',
        initialHobbs: aircraft.initialHobbs ?? 0,
        currentHobbs: aircraft.currentHobbs ?? 0,
        initialTacho: aircraft.initialTacho ?? 0,
        currentTacho: aircraft.currentTacho ?? 0,
        tachoAtNext50Inspection: aircraft.tachoAtNext50Inspection ?? 0,
        tachoAtNext100Inspection: aircraft.tachoAtNext100Inspection ?? 0,
        components: aircraft.components || [],
      });
    } else {
      form.reset({
        tailNumber: '',
        model: '',
        type: 'Single-Engine',
        initialHobbs: 0,
        currentHobbs: 0,
        initialTacho: 0,
        currentTacho: 0,
        tachoAtNext50Inspection: 0,
        tachoAtNext100Inspection: 0,
        components: [],
      });
    }
  }, [aircraft, form]);


  const onSubmit = (data: FormValues) => {
    if (!firestore) return;
    const collectionRef = collection(firestore, `tenants/${tenantId}/aircrafts`);

    if (aircraft) {
      // Update existing
      const docRef = doc(collectionRef, aircraft.id);
      updateDocumentNonBlocking(docRef, data);
      toast({ title: 'Aircraft Updated', description: `${data.tailNumber} has been updated.` });
    } else {
      // Create new
      addDocumentNonBlocking(collectionRef, data);
      toast({ title: 'Aircraft Created', description: `${data.tailNumber} has been added.` });
    }
    onCancel();
  };

  const handleOpenChange = (open: boolean) => {
    if (!open) {
      onCancel();
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-4xl">
        <DialogHeader>
          <DialogTitle>{aircraft ? 'Edit Aircraft' : 'Add New Aircraft'}</DialogTitle>
          <DialogDescription>
            {aircraft ? `Editing ${aircraft.tailNumber}` : 'Enter the details for the new aircraft.'}
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <ScrollArea className="h-[70vh] pr-6">
              <div className="space-y-6 p-1">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  <FormField control={form.control} name="tailNumber" render={({ field }) => ( <FormItem><FormLabel>Tail Number</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem> )}/>
                  <FormField control={form.control} name="model" render={({ field }) => ( <FormItem><FormLabel>Model</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem> )}/>
                  <FormField control={form.control} name="type" render={({ field }) => ( <FormItem><FormLabel>Type</FormLabel><Select onValueChange={field.onChange} defaultValue={field.value}><FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl><SelectContent><SelectItem value="Single-Engine">Single-Engine</SelectItem><SelectItem value="Multi-Engine">Multi-Engine</SelectItem></SelectContent></Select><FormMessage /></FormItem> )}/>
                </div>
                <Separator />
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <FormField control={form.control} name="initialHobbs" render={({ field }) => (<FormItem><FormLabel>Initial Hobbs</FormLabel><FormControl><Input type="number" {...field} /></FormControl><FormMessage /></FormItem> )} />
                  <FormField control={form.control} name="currentHobbs" render={({ field }) => (<FormItem><FormLabel>Current Hobbs</FormLabel><FormControl><Input type="number" {...field} /></FormControl><FormMessage /></FormItem> )} />
                  <FormField control={form.control} name="initialTacho" render={({ field }) => (<FormItem><FormLabel>Initial Tacho</FormLabel><FormControl><Input type="number" {...field} /></FormControl><FormMessage /></FormItem> )} />
                  <FormField control={form.control} name="currentTacho" render={({ field }) => (<FormItem><FormLabel>Current Tacho</FormLabel><FormControl><Input type="number" {...field} /></FormControl><FormMessage /></FormItem> )} />
                </div>
                <Separator />
                 <div className="grid grid-cols-2 gap-4">
                  <FormField control={form.control} name="tachoAtNext50Inspection" render={({ field }) => (<FormItem><FormLabel>Tacho at Next 50hr</FormLabel><FormControl><Input type="number" {...field} /></FormControl><FormMessage /></FormItem> )} />
                  <FormField control={form.control} name="tachoAtNext100Inspection" render={({ field }) => (<FormItem><FormLabel>Tacho at Next 100hr</FormLabel><FormControl><Input type="number" {...field} /></FormControl><FormMessage /></FormItem> )} />
                 </div>
                 <Separator />
                 <div>
                    <div className='flex justify-between items-center'>
                      <h3 className="text-lg font-medium">Tracked Components</h3>
                      <Button type="button" size="sm" variant="outline" onClick={() => append({ id: new Date().toISOString(), name: '', partNumber: '' })}><PlusCircle className="mr-2" />Add</Button>
                    </div>
                     <div className="space-y-4 mt-4">
                        {fields.map((field, index) => (
                           <div key={field.id} className="p-4 border rounded-lg space-y-4">
                              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                <FormField control={form.control} name={`components.${index}.name`} render={({ field }) => (<FormItem><FormLabel>Component Name</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>)} />
                                <FormField control={form.control} name={`components.${index}.partNumber`} render={({ field }) => (<FormItem><FormLabel>Part #</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>)} />
                                <FormField control={form.control} name={`components.${index}.serialNumber`} render={({ field }) => (<FormItem><FormLabel>Serial #</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>)} />
                                <FormField control={form.control} name={`components.${index}.installHours`} render={({ field }) => (<FormItem><FormLabel>Install Hours (Tacho)</FormLabel><FormControl><Input type="number" {...field} /></FormControl><FormMessage /></FormItem>)} />
                                <FormField control={form.control} name={`components.${index}.maxHours`} render={({ field }) => (<FormItem><FormLabel>Life Limit (Hours)</FormLabel><FormControl><Input type="number" {...field} /></FormControl><FormMessage /></FormItem>)} />
                              </div>
                              <Button type="button" variant="destructive" size="sm" onClick={() => remove(index)}><Trash2 className="mr-2" />Remove Component</Button>
                           </div>
                        ))}
                     </div>
                 </div>
              </div>
            </ScrollArea>
            <DialogFooter className="border-t pt-6">
              <Button type="button" variant="outline" onClick={onCancel}>
                Cancel
              </Button>
              <Button type="submit">
                {aircraft ? 'Save Changes' : 'Create Aircraft'}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
