'use client';

import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useFirestore, addDocumentNonBlocking, updateDocumentNonBlocking } from '@/firebase';
import { collection, doc } from 'firebase/firestore';
import { useToast } from '@/hooks/use-toast';
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
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ScrollArea } from '@/components/ui/scroll-area';
import { v4 as uuidv4 } from 'uuid';

import type { Aircraft } from './page';

const formSchema = z.object({
  tailNumber: z.string().min(1, 'Tail number is required.'),
  model: z.string().min(1, 'Model is required.'),
  abbreviation: z.string().max(5, 'Abbreviation can be at most 5 characters.').optional(),
  type: z.enum(['Single-Engine', 'Multi-Engine']),
  initialHobbs: z.number({ coerce: true }).optional(),
  initialTacho: z.number({ coerce: true }).optional(),
  tachoAtNext50Inspection: z.number({ coerce: true }).optional(),
  tachoAtNext100Inspection: z.number({ coerce: true }).optional(),
});

type FormValues = z.infer<typeof formSchema>;

interface AssetFormProps {
  tenantId: string;
  trigger?: React.ReactNode;
  existingAircraft?: Aircraft | null;
  onFormSubmit?: () => void;
}

export function AssetForm({ tenantId, trigger, existingAircraft, onFormSubmit }: AssetFormProps) {
  const firestore = useFirestore();
  const { toast } = useToast();
  const [isOpen, setIsOpen] = useState(false);

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: existingAircraft || {
      tailNumber: '',
      model: '',
      abbreviation: '',
      type: 'Single-Engine',
    },
  });

  useEffect(() => {
    if (isOpen) {
        form.reset(existingAircraft || {
            tailNumber: '',
            model: '',
            abbreviation: '',
            type: 'Single-Engine',
            initialHobbs: 0,
            initialTacho: 0,
        });
    }
  }, [isOpen, existingAircraft, form]);

  const onSubmit = (values: FormValues) => {
    if (!firestore) return;
    
    const data = {
        ...values,
        id: existingAircraft?.id || uuidv4(),
        currentHobbs: values.initialHobbs || 0,
        currentTacho: values.initialTacho || 0,
    }

    if (existingAircraft) {
        const docRef = doc(firestore, `tenants/${tenantId}/aircrafts`, existingAircraft.id);
        updateDocumentNonBlocking(docRef, data);
        toast({ title: "Aircraft Updated", description: `${values.tailNumber} has been updated.`});
    } else {
        const collectionRef = collection(firestore, `tenants/${tenantId}/aircrafts`);
        addDocumentNonBlocking(collectionRef, data);
        toast({ title: "Aircraft Added", description: `${values.tailNumber} has been added.`});
    }

    setIsOpen(false);
    onFormSubmit?.();
  };
  
  return (
      <Dialog open={isOpen} onOpenChange={setIsOpen}>
          <DialogTrigger asChild>{trigger}</DialogTrigger>
          <DialogContent>
              <DialogHeader>
                  <DialogTitle>{existingAircraft ? 'Edit Aircraft' : 'Add New Aircraft'}</DialogTitle>
              </DialogHeader>
              <Form {...form}>
                  <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                      <ScrollArea className="h-96 pr-6">
                           <div className="space-y-4">
                            <FormField control={form.control} name="tailNumber" render={({ field }) => ( <FormItem><FormLabel>Tail Number</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem> )}/>
                            <FormField control={form.control} name="model" render={({ field }) => ( <FormItem><FormLabel>Aircraft Model</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem> )}/>
                            <FormField control={form.control} name="abbreviation" render={({ field }) => ( <FormItem><FormLabel>Abbreviation (5 chars)</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem> )}/>
                            <FormField control={form.control} name="type" render={({ field }) => ( <FormItem><FormLabel>Type</FormLabel><Select onValueChange={field.onChange} defaultValue={field.value}><FormControl><SelectTrigger><SelectValue/></SelectTrigger></FormControl><SelectContent><SelectItem value="Single-Engine">Single-Engine</SelectItem><SelectItem value="Multi-Engine">Multi-Engine</SelectItem></SelectContent></Select><FormMessage /></FormItem> )}/>
                            <FormField control={form.control} name="initialHobbs" render={({ field }) => ( <FormItem><FormLabel>Initial Hobbs</FormLabel><FormControl><Input type="number" {...field} /></FormControl><FormMessage /></FormItem> )}/>
                            <FormField control={form.control} name="initialTacho" render={({ field }) => ( <FormItem><FormLabel>Initial Tacho</FormLabel><FormControl><Input type="number" {...field} /></FormControl><FormMessage /></FormItem> )}/>
                            <FormField control={form.control} name="tachoAtNext50Inspection" render={({ field }) => ( <FormItem><FormLabel>Tacho at Next 50hr</FormLabel><FormControl><Input type="number" {...field} /></FormControl><FormMessage /></FormItem> )}/>
                            <FormField control={form.control} name="tachoAtNext100Inspection" render={({ field }) => ( <FormItem><FormLabel>Tacho at Next 100hr</FormLabel><FormControl><Input type="number" {...field} /></FormControl><FormMessage /></FormItem> )}/>
                           </div>
                      </ScrollArea>
                      <DialogFooter>
                          <DialogClose asChild><Button type="button" variant="outline">Cancel</Button></DialogClose>
                          <Button type="submit">Save Aircraft</Button>
                      </DialogFooter>
                  </form>
              </Form>
          </DialogContent>
      </Dialog>
  );
}