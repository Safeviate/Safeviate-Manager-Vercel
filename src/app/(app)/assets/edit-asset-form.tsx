
'use client';

import { useForm } from 'react-hook-form';
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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useFirestore, updateDocumentNonBlocking } from '@/firebase';
import { doc } from 'firebase/firestore';
import { useToast } from '@/hooks/use-toast';
import type { Aircraft } from '../page';

const formSchema = z.object({
  tailNumber: z.string().min(1, 'Tail number is required.'),
  model: z.string().min(1, 'Model is required.'),
  abbreviation: z.string().optional(),
  type: z.enum(['Single-Engine', 'Multi-Engine']),
  initialHobbs: z.number({ coerce: true }).optional(),
  currentHobbs: z.number({ coerce: true }).optional(),
  initialTacho: z.number({ coerce: true }).optional(),
  currentTacho: z.number({ coerce: true }).optional(),
  tachoAtNext50Inspection: z.number({ coerce: true }).optional(),
  tachoAtNext100Inspection: z.number({ coerce: true }).optional(),
});

type FormValues = z.infer<typeof formSchema>;

interface EditAircraftFormProps {
  isOpen: boolean;
  setIsOpen: (open: boolean) => void;
  existingAircraft: Aircraft;
  tenantId: string;
}

export function EditAircraftForm({ isOpen, setIsOpen, existingAircraft, tenantId }: EditAircraftFormProps) {
  const firestore = useFirestore();
  const { toast } = useToast();

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      tailNumber: existingAircraft.tailNumber || '',
      model: existingAircraft.model || '',
      abbreviation: existingAircraft.abbreviation || '',
      type: existingAircraft.type || 'Single-Engine',
      initialHobbs: existingAircraft.initialHobbs || 0,
      currentHobbs: existingAircraft.currentHobbs || 0,
      initialTacho: existingAircraft.initialTacho || 0,
      currentTacho: existingAircraft.currentTacho || 0,
      tachoAtNext50Inspection: existingAircraft.tachoAtNext50Inspection || 0,
      tachoAtNext100Inspection: existingAircraft.tachoAtNext100Inspection || 0,
    },
  });

  const onSubmit = (values: FormValues) => {
    if (!firestore) return;

    const aircraftRef = doc(firestore, 'tenants', tenantId, 'aircrafts', existingAircraft.id);
    updateDocumentNonBlocking(aircraftRef, values);

    toast({
      title: 'Aircraft Updated',
      description: `Details for ${values.tailNumber} have been updated.`,
    });
    setIsOpen(false);
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>Edit Aircraft: {existingAircraft.tailNumber}</DialogTitle>
          <DialogDescription>
            Update the details for this aircraft.
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)}>
            <ScrollArea className="h-[60vh] pr-6">
                <div className="space-y-6 py-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <FormField control={form.control} name="tailNumber" render={({ field }) => ( <FormItem><FormLabel>Tail Number</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem> )} />
                        <FormField control={form.control} name="model" render={({ field }) => ( <FormItem><FormLabel>Model</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem> )} />
                        <FormField control={form.control} name="abbreviation" render={({ field }) => ( <FormItem><FormLabel>Abbreviation (5 Chars)</FormLabel><FormControl><Input maxLength={5} {...field} /></FormControl><FormMessage /></FormItem> )} />
                        <FormField control={form.control} name="type" render={({ field }) => ( <FormItem><FormLabel>Type</FormLabel><Select onValueChange={field.onChange} defaultValue={field.value}><FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl><SelectContent><SelectItem value="Single-Engine">Single-Engine</SelectItem><SelectItem value="Multi-Engine">Multi-Engine</SelectItem></SelectContent></Select><FormMessage /></FormItem> )} />
                    </div>
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                        <FormField control={form.control} name="initialHobbs" render={({ field }) => ( <FormItem><FormLabel>Initial Hobbs</FormLabel><FormControl><Input type="number" {...field} /></FormControl><FormMessage /></FormItem> )} />
                        <FormField control={form.control} name="currentHobbs" render={({ field }) => ( <FormItem><FormLabel>Current Hobbs</FormLabel><FormControl><Input type="number" {...field} /></FormControl><FormMessage /></FormItem> )} />
                        <FormField control={form.control} name="initialTacho" render={({ field }) => ( <FormItem><FormLabel>Initial Tacho</FormLabel><FormControl><Input type="number" {...field} /></FormControl><FormMessage /></FormItem> )} />
                        <FormField control={form.control} name="currentTacho" render={({ field }) => ( <FormItem><FormLabel>Current Tacho</FormLabel><FormControl><Input type="number" {...field} /></FormControl><FormMessage /></FormItem> )} />
                        <FormField control={form.control} name="tachoAtNext50Inspection" render={({ field }) => ( <FormItem><FormLabel>Next 50hr Tacho</FormLabel><FormControl><Input type="number" {...field} /></FormControl><FormMessage /></FormItem> )} />
                        <FormField control={form.control} name="tachoAtNext100Inspection" render={({ field }) => ( <FormItem><FormLabel>Next 100hr Tacho</FormLabel><FormControl><Input type="number" {...field} /></FormControl><FormMessage /></FormItem> )} />
                    </div>
                </div>
            </ScrollArea>
            <DialogFooter className="pt-6 border-t">
                <DialogClose asChild>
                    <Button type="button" variant="outline">Cancel</Button>
                </DialogClose>
                <Button type="submit">Save Changes</Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
