
'use client';

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogClose } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { useFirestore, addDocumentNonBlocking, updateDocumentNonBlocking } from '@/firebase';
import { useToast } from '@/hooks/use-toast';
import { collection, doc } from 'firebase/firestore';
import type { AircraftComponent } from '@/types/aircraft';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { CustomCalendar } from '@/components/ui/custom-calendar';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import { CalendarIcon } from 'lucide-react';

const formSchema = z.object({
  name: z.string().min(1, 'Component name is required.'),
  manufacturer: z.string().optional(),
  serialNumber: z.string().optional(),
  installDate: z.date().optional(),
  tsn: z.number({ coerce: true }).default(0),
  tso: z.number({ coerce: true }).default(0),
  totalTime: z.number({ coerce: true }).default(0),
});

type FormValues = z.infer<typeof formSchema>;

interface ComponentFormProps {
  isOpen: boolean;
  setIsOpen: (open: boolean) => void;
  aircraftId: string;
  tenantId: string;
  existingComponent?: AircraftComponent;
}

export function ComponentForm({ isOpen, setIsOpen, aircraftId, tenantId, existingComponent }: ComponentFormProps) {
  const firestore = useFirestore();
  const { toast } = useToast();

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: existingComponent?.name || '',
      manufacturer: existingComponent?.manufacturer || '',
      serialNumber: existingComponent?.serialNumber || '',
      installDate: existingComponent?.installDate ? new Date(existingComponent.installDate) : undefined,
      tsn: existingComponent?.tsn || 0,
      tso: existingComponent?.tso || 0,
      totalTime: existingComponent?.totalTime || 0,
    },
  });

  const onSubmit = (values: FormValues) => {
    if (!firestore) return;

    const dataToSave = {
      ...values,
      installDate: values.installDate ? values.installDate.toISOString() : null,
    };

    if (existingComponent) {
      const compRef = doc(firestore, 'tenants', tenantId, 'aircrafts', aircraftId, 'components', existingComponent.id);
      updateDocumentNonBlocking(compRef, dataToSave);
      toast({ title: 'Component Updated' });
    } else {
      const colRef = collection(firestore, 'tenants', tenantId, 'aircrafts', aircraftId, 'components');
      addDocumentNonBlocking(colRef, dataToSave);
      toast({ title: 'Component Added' });
    }
    setIsOpen(false);
    form.reset();
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogContent className="max-w-xl">
        <DialogHeader>
          <DialogTitle>{existingComponent ? 'Edit Component' : 'Add New Component'}</DialogTitle>
          <DialogDescription>Track specific aircraft parts and their maintenance intervals.</DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 pt-4">
            <FormField control={form.control} name="name" render={({ field }) => ( <FormItem><FormLabel>Component Name</FormLabel><FormControl><Input placeholder="e.g., Engine #1, Left Magneto" {...field} /></FormControl><FormMessage /></FormItem> )} />
            <div className="grid grid-cols-2 gap-4">
              <FormField control={form.control} name="manufacturer" render={({ field }) => ( <FormItem><FormLabel>Manufacturer</FormLabel><FormControl><Input {...field} /></FormControl></FormItem> )} />
              <FormField control={form.control} name="serialNumber" render={({ field }) => ( <FormItem><FormLabel>Serial Number</FormLabel><FormControl><Input {...field} /></FormControl></FormItem> )} />
            </div>
            <FormField
              control={form.control}
              name="installDate"
              render={({ field }) => (
                <FormItem className="flex flex-col">
                  <FormLabel>Install Date</FormLabel>
                  <Popover>
                    <PopoverTrigger asChild>
                      <FormControl>
                        <Button variant="outline" className={cn("pl-3 text-left font-normal", !field.value && "text-muted-foreground")}>
                          {field.value ? format(field.value, "PPP") : <span>Pick a date</span>}
                          <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                        </Button>
                      </FormControl>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <CustomCalendar selectedDate={field.value} onDateSelect={field.onChange} />
                    </PopoverContent>
                  </Popover>
                </FormItem>
              )}
            />
            <div className="grid grid-cols-3 gap-4">
              <FormField control={form.control} name="tsn" render={({ field }) => ( <FormItem><FormLabel>TSN</FormLabel><FormControl><Input type="number" step="0.1" {...field} /></FormControl></FormItem> )} />
              <FormField control={form.control} name="tso" render={({ field }) => ( <FormItem><FormLabel>TSO</FormLabel><FormControl><Input type="number" step="0.1" {...field} /></FormControl></FormItem> )} />
              <FormField control={form.control} name="totalTime" render={({ field }) => ( <FormItem><FormLabel>Total Time</FormLabel><FormControl><Input type="number" step="0.1" {...field} /></FormControl></FormItem> )} />
            </div>
            <DialogFooter>
              <DialogClose asChild><Button variant="outline">Cancel</Button></DialogClose>
              <Button type="submit">Save Component</Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
