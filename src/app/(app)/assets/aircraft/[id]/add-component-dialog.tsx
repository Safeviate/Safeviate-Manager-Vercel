'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useFirestore, updateDocumentNonBlocking, useDoc, useMemoFirebase } from '@/firebase';
import { doc } from 'firebase/firestore';
import { useToast } from '@/hooks/use-toast';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogTrigger, DialogClose } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { PlusCircle } from 'lucide-react';
import { v4 as uuidv4 } from 'uuid';
import type { Aircraft } from '@/types/aircraft';

const formSchema = z.object({
  name: z.string().min(1, 'Component name is required.'),
  manufacturer: z.string().min(1),
  partNumber: z.string().min(1),
  serialNumber: z.string().min(1),
  tsn: z.coerce.number().min(0),
  maxHours: z.coerce.number().min(0),
});

export function AddComponentDialog({ tenantId, aircraftId }: { tenantId: string, aircraftId: string }) {
  const [isOpen, setIsOpen] = useState(false);
  const firestore = useFirestore();
  const { toast } = useToast();

  const aircraftRef = useMemoFirebase(
    () => (firestore ? doc(firestore, `tenants/${tenantId}/aircrafts`, aircraftId) : null),
    [firestore, tenantId, aircraftId]
  );
  const { data: aircraft } = useDoc<Aircraft>(aircraftRef);

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: '',
      manufacturer: '',
      partNumber: '',
      serialNumber: '',
      tsn: 0,
      maxHours: 2000,
    },
  });

  const onSubmit = (values: z.infer<typeof formSchema>) => {
    if (!firestore || !aircraft) return;
    
    const newComp = { ...values, id: uuidv4(), installDate: new Date().toISOString() };
    const updatedComponents = [...(aircraft.components || []), newComp];
    
    updateDocumentNonBlocking(aircraftRef!, { components: updatedComponents });
    
    toast({ title: 'Component Added', description: `${values.name} is now being tracked.` });
    setIsOpen(false);
    form.reset();
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button size="sm" variant="outline">
          <PlusCircle className="mr-2 h-4 w-4" /> Add Component
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Track New Component</DialogTitle>
          <DialogDescription>Define a critical part for lifecycle monitoring.</DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField control={form.control} name="name" render={({ field }) => ( <FormItem><FormLabel>Component Name</FormLabel><FormControl><Input placeholder="e.g. Lycoming IO-360" {...field} /></FormControl></FormItem> )} />
            <div className="grid grid-cols-2 gap-4">
                <FormField control={form.control} name="manufacturer" render={({ field }) => ( <FormItem><FormLabel>Manufacturer</FormLabel><FormControl><Input {...field} /></FormControl></FormItem> )} />
                <FormField control={form.control} name="serialNumber" render={({ field }) => ( <FormItem><FormLabel>Serial Number</FormLabel><FormControl><Input {...field} /></FormControl></FormItem> )} />
            </div>
            <div className="grid grid-cols-2 gap-4">
                <FormField control={form.control} name="tsn" render={({ field }) => ( <FormItem><FormLabel>Current TSN</FormLabel><FormControl><Input type="number" step="0.1" {...field} /></FormControl></FormItem> )} />
                <FormField control={form.control} name="maxHours" render={({ field }) => ( <FormItem><FormLabel>Life Limit (Hours)</FormLabel><FormControl><Input type="number" {...field} /></FormControl></FormItem> )} />
            </div>
            <DialogFooter className="pt-4">
              <DialogClose asChild><Button variant="outline">Cancel</Button></DialogClose>
              <Button type="submit">Add Component</Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}