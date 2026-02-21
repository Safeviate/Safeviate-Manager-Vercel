'use client';

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
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
import { Button } from '@/components/ui/button';
import { useFirestore, addDocumentNonBlocking, updateDocumentNonBlocking } from '@/firebase';
import { useToast } from '@/hooks/use-toast';
import { collection, doc } from 'firebase/firestore';
import type { Aircraft } from '@/types/aircraft';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';

interface AircraftFormProps {
  tenantId: string;
  existingAircraft?: Aircraft | null;
  onFormSubmit: () => void;
  isOpen: boolean;
  setIsOpen: (isOpen: boolean) => void;
}

const formSchema = z.object({
  tailNumber: z.string().min(1, 'Tail number is required.'),
  model: z.string().min(1, 'Model is required.'),
  abbreviation: z.string().max(5, 'Abbreviation cannot be more than 5 characters.').optional(),
  initialHobbs: z.number({ coerce: true }).optional(),
  initialTacho: z.number({ coerce: true }).optional(),
  tachoAtNext50Inspection: z.number({ coerce: true }).optional(),
  tachoAtNext100Inspection: z.number({ coerce: true }).optional(),
});

type FormValues = z.infer<typeof formSchema>;

export function AircraftForm({
  tenantId,
  existingAircraft,
  onFormSubmit,
  isOpen,
  setIsOpen,
}: AircraftFormProps) {
  const firestore = useFirestore();
  const { toast } = useToast();

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: existingAircraft || {
      tailNumber: '',
      model: '',
      abbreviation: '',
      initialHobbs: 0,
      initialTacho: 0,
      tachoAtNext50Inspection: 50,
      tachoAtNext100Inspection: 100,
    },
  });

  const onSubmit = async (values: FormValues) => {
    if (!firestore || !tenantId) {
      toast({ variant: 'destructive', title: 'Error', description: 'Could not connect to database.' });
      return;
    }

    if (existingAircraft) {
      const docRef = doc(firestore, 'tenants', tenantId, 'aircrafts', existingAircraft.id);
      await updateDocumentNonBlocking(docRef, values);
      toast({ title: 'Aircraft Updated', description: `Details for ${values.tailNumber} have been saved.` });
    } else {
      const collectionRef = collection(firestore, 'tenants', tenantId, 'aircrafts');
      await addDocumentNonBlocking(collectionRef, {
        ...values,
        currentHobbs: values.initialHobbs || 0,
        currentTacho: values.initialTacho || 0,
      });
      toast({ title: 'Aircraft Added', description: `${values.tailNumber} has been added to the fleet.` });
    }
    onFormSubmit();
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent className="sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>{existingAircraft ? 'Edit Aircraft' : 'Add New Aircraft'}</DialogTitle>
            <DialogDescription>
              {existingAircraft ? `Editing details for ${existingAircraft.tailNumber}.` : 'Add a new aircraft to your fleet.'}
            </DialogDescription>
          </DialogHeader>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)}>
              <ScrollArea className="h-[60vh] p-1">
                <div className="space-y-6 px-4 py-2">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <FormField control={form.control} name="tailNumber" render={({ field }) => ( <FormItem><FormLabel>Tail Number</FormLabel><FormControl><Input placeholder="N12345" {...field} /></FormControl><FormMessage /></FormItem> )}/>
                    <FormField control={form.control} name="model" render={({ field }) => ( <FormItem><FormLabel>Model</FormLabel><FormControl><Input placeholder="Cessna 172" {...field} /></FormControl><FormMessage /></FormItem> )}/>
                    <FormField control={form.control} name="abbreviation" render={({ field }) => ( <FormItem><FormLabel>Abbreviation</FormLabel><FormControl><Input placeholder="C172" {...field} /></FormControl><FormMessage /></FormItem> )}/>
                  </div>
                  <Separator />
                   <h4 className='font-semibold text-base'>Initial Readings</h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                     <FormField control={form.control} name="initialHobbs" render={({ field }) => ( <FormItem><FormLabel>Initial Hobbs</FormLabel><FormControl><Input type="number" {...field} /></FormControl><FormMessage /></FormItem> )}/>
                     <FormField control={form.control} name="initialTacho" render={({ field }) => ( <FormItem><FormLabel>Initial Tacho</FormLabel><FormControl><Input type="number" {...field} /></FormControl><FormMessage /></FormItem> )}/>
                  </div>
                  <Separator />
                  <h4 className='font-semibold text-base'>Maintenance Schedule</h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                     <FormField control={form.control} name="tachoAtNext50Inspection" render={({ field }) => ( <FormItem><FormLabel>Tacho at Next 50hr</FormLabel><FormControl><Input type="number" {...field} /></FormControl><FormMessage /></FormItem> )}/>
                     <FormField control={form.control} name="tachoAtNext100Inspection" render={({ field }) => ( <FormItem><FormLabel>Tacho at Next 100hr</FormLabel><FormControl><Input type="number" {...field} /></FormControl><FormMessage /></FormItem> )}/>
                  </div>
                </div>
              </ScrollArea>
              <DialogFooter className='pt-6 border-t mt-4'>
                <Button type="button" variant="outline" onClick={() => setIsOpen(false)}>Cancel</Button>
                <Button type="submit">Save Aircraft</Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
    </Dialog>
  );
}
