'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogDescription, 
  DialogFooter, 
  DialogClose,
  DialogTrigger
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { useFirestore, useDoc, useMemoFirebase } from '@/firebase';
import { doc, updateDoc } from 'firebase/firestore';
import { useToast } from '@/hooks/use-toast';
import { v4 as uuidv4 } from 'uuid';
import type { Aircraft, AircraftComponent } from '@/types/aircraft';

const componentSchema = z.object({
  name: z.string().min(1, "Component name is required"),
  manufacturer: z.string().min(1, "Manufacturer is required"),
  serialNumber: z.string().min(1, "Serial number is required"),
  partNumber: z.string().min(1, "Part number is required"),
  installDate: z.string().min(1, "Install date is required"),
  tsn: z.number({ coerce: true }).min(0),
  tso: z.number({ coerce: true }).min(0),
  totalTime: z.number({ coerce: true }).min(0),
  installHours: z.number({ coerce: true }).min(0).default(0),
  maxHours: z.number({ coerce: true }).min(0).default(0),
  notes: z.string().default(''),
});

type FormValues = z.infer<typeof componentSchema>;

interface ComponentFormProps {
  tenantId: string;
  aircraftId: string;
  isOpen?: boolean;
  setIsOpen?: (open: boolean) => void;
  existingComponent?: AircraftComponent;
  trigger?: React.ReactNode;
}

export function ComponentForm({ tenantId, aircraftId, isOpen, setIsOpen, existingComponent, trigger }: ComponentFormProps) {
  const firestore = useFirestore();
  const { toast } = useToast();
  const [internalIsOpen, setInternalIsOpen] = useState(false);
  const dialogOpen = isOpen ?? internalIsOpen;
  const handleOpenChange = setIsOpen ?? setInternalIsOpen;

  const aircraftRef = useMemoFirebase(
    () => (firestore ? doc(firestore, 'tenants', tenantId, 'aircrafts', aircraftId) : null),
    [firestore, tenantId, aircraftId]
  );
  const { data: aircraft } = useDoc<Aircraft>(aircraftRef);

  const form = useForm<FormValues>({
    resolver: zodResolver(componentSchema),
    defaultValues: {
      name: existingComponent?.name || '',
      manufacturer: existingComponent?.manufacturer || '',
      serialNumber: existingComponent?.serialNumber || '',
      partNumber: existingComponent?.partNumber || '',
      installDate: existingComponent?.installDate?.split('T')[0] || new Date().toISOString().split('T')[0],
      tsn: existingComponent?.tsn || 0,
      tso: existingComponent?.tso || 0,
      totalTime: existingComponent?.totalTime || 0,
      installHours: existingComponent?.installHours || 0,
      maxHours: existingComponent?.maxHours || 0,
      notes: existingComponent?.notes || '',
    },
  });

  const onSubmit = async (values: FormValues) => {
    if (!firestore || !aircraftRef || !aircraft) return;

    const nextComponent: AircraftComponent = {
      ...values,
      id: existingComponent?.id || uuidv4(),
    };
    const updatedComponents = (aircraft.components || []).filter((component) => component.id !== existingComponent?.id);
    updatedComponents.push(nextComponent);

    try {
      await updateDoc(aircraftRef, { components: updatedComponents });
      toast({ title: existingComponent ? 'Component Updated' : 'Component Added' });
      handleOpenChange(false);
      form.reset();
    } catch (error) {
      toast({
        variant: 'destructive',
        title: existingComponent ? 'Update failed' : 'Create failed',
        description: error instanceof Error ? error.message : 'Unable to save this component.',
      });
    }
  };

  return (
    <Dialog open={dialogOpen} onOpenChange={handleOpenChange}>
      {trigger && <DialogTrigger asChild>{trigger}</DialogTrigger>}
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{existingComponent ? 'Edit Component' : 'Track New Component'}</DialogTitle>
          <DialogDescription>Enter maintenance details for lifecyle tracking.</DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField control={form.control} name="name" render={({ field }) => ( <FormItem><FormLabel>Component Name</FormLabel><FormControl><Input placeholder="e.g. Magneto" {...field} /></FormControl><FormMessage /></FormItem> )} />
            <div className="grid grid-cols-2 gap-4">
              <FormField control={form.control} name="manufacturer" render={({ field }) => ( <FormItem><FormLabel>Manufacturer</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem> )} />
              <FormField control={form.control} name="serialNumber" render={({ field }) => ( <FormItem><FormLabel>Serial Number</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem> )} />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <FormField control={form.control} name="partNumber" render={({ field }) => ( <FormItem><FormLabel>Part Number</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem> )} />
              <FormField control={form.control} name="installDate" render={({ field }) => ( <FormItem><FormLabel>Install Date</FormLabel><FormControl><Input type="date" {...field} /></FormControl><FormMessage /></FormItem> )} />
            </div>
            <div className="grid grid-cols-3 gap-4">
              <FormField control={form.control} name="tsn" render={({ field }) => ( <FormItem><FormLabel>TSN</FormLabel><FormControl><Input type="number" {...field} /></FormControl><FormMessage /></FormItem> )} />
              <FormField control={form.control} name="tso" render={({ field }) => ( <FormItem><FormLabel>TSO</FormLabel><FormControl><Input type="number" {...field} /></FormControl><FormMessage /></FormItem> )} />
              <FormField control={form.control} name="totalTime" render={({ field }) => ( <FormItem><FormLabel>Total Time</FormLabel><FormControl><Input type="number" {...field} /></FormControl><FormMessage /></FormItem> )} />
            </div>
            <DialogFooter>
              <DialogClose asChild><Button variant="outline">Cancel</Button></DialogClose>
              <Button type="submit">{existingComponent ? 'Save Component' : 'Add Component'}</Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
