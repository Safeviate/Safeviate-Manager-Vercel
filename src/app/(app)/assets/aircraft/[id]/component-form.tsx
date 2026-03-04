
'use client';

import { useState, useEffect } from 'react';
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
import { Input } from '@/components/ui/input';
import { useFirestore, addDocumentNonBlocking, updateDocumentNonBlocking } from '@/firebase';
import { collection, doc } from 'firebase/firestore';
import { useToast } from '@/hooks/use-toast';
import { PlusCircle, CalendarIcon } from 'lucide-react';
import type { AircraftComponent } from '@/types/aircraft';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { CustomCalendar } from '@/components/ui/custom-calendar';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';

const componentFormSchema = z.object({
  name: z.string().min(1, 'Name is required.'),
  manufacturer: z.string().min(1, 'Manufacturer is required.'),
  partNumber: z.string().min(1, 'Part number is required.'),
  serialNumber: z.string().min(1, 'Serial number is required.'),
  installDate: z.date({ required_error: 'Install date is required.' }),
  installHours: z.number({ coerce: true }).min(0),
  maxHours: z.number({ coerce: true }).min(0),
  tsn: z.number({ coerce: true }).min(0),
  tso: z.number({ coerce: true }).min(0),
  totalTime: z.number({ coerce: true }).min(0),
});

type ComponentFormValues = z.infer<typeof componentFormSchema>;

interface ComponentFormProps {
  tenantId: string;
  aircraftId: string;
  existingComponent?: AircraftComponent;
  trigger?: React.ReactNode;
}

export function ComponentForm({ tenantId, aircraftId, existingComponent, trigger }: ComponentFormProps) {
  const [isOpen, setIsOpen] = useState(false);
  const firestore = useFirestore();
  const { toast } = useToast();

  const form = useForm<ComponentFormValues>({
    resolver: zodResolver(componentFormSchema),
    defaultValues: existingComponent ? {
        ...existingComponent,
        installDate: new Date(existingComponent.installDate),
    } : {
      name: '',
      manufacturer: '',
      partNumber: '',
      serialNumber: '',
      installDate: new Date(),
      installHours: 0,
      maxHours: 0,
      tsn: 0,
      tso: 0,
      totalTime: 0,
    },
  });

  useEffect(() => {
    if (isOpen && existingComponent) {
      form.reset({
          ...existingComponent,
          installDate: new Date(existingComponent.installDate),
      });
    }
  }, [isOpen, existingComponent, form]);

  const onSubmit = async (values: ComponentFormValues) => {
    if (!firestore) return;

    const componentsCollection = collection(firestore, 'tenants', tenantId, 'aircrafts', aircraftId, 'components');
    const dataToSave = {
        ...values,
        installDate: values.installDate.toISOString(),
    };

    if (existingComponent) {
      const compRef = doc(firestore, 'tenants', tenantId, 'aircrafts', aircraftId, 'components', existingComponent.id);
      updateDocumentNonBlocking(compRef, dataToSave);
      toast({ title: 'Component Updated' });
    } else {
      addDocumentNonBlocking(componentsCollection, dataToSave);
      toast({ title: 'Component Added' });
    }
    setIsOpen(false);
    form.reset();
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      {trigger ? (
        <DialogTrigger asChild>{trigger}</DialogTrigger>
      ) : (
        <DialogTrigger asChild>
          <Button variant="outline">
            <PlusCircle className="mr-2 h-4 w-4" />
            Add Component
          </Button>
        </DialogTrigger>
      )}
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>{existingComponent ? 'Edit' : 'Add New'} Tracked Component</DialogTitle>
          <DialogDescription>
            Record details for a life-limited or tracked component on this aircraft.
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField control={form.control} name="name" render={({ field }) => ( <FormItem><FormLabel>Component Name</FormLabel><FormControl><Input placeholder="e.g., Magneto" {...field} /></FormControl><FormMessage /></FormItem> )} />
              <FormField control={form.control} name="manufacturer" render={({ field }) => ( <FormItem><FormLabel>Manufacturer</FormLabel><FormControl><Input placeholder="e.g., Slick" {...field} /></FormControl><FormMessage /></FormItem> )} />
              <FormField control={form.control} name="partNumber" render={({ field }) => ( <FormItem><FormLabel>Part Number</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem> )} />
              <FormField control={form.control} name="serialNumber" render={({ field }) => ( <FormItem><FormLabel>Serial Number</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem> )} />
              <FormField
                    control={form.control}
                    name="installDate"
                    render={({ field }) => (
                        <FormItem className="flex flex-col">
                        <FormLabel>Install Date</FormLabel>
                        <Popover>
                            <PopoverTrigger asChild>
                            <FormControl>
                                <Button
                                variant={"outline"}
                                className={cn("w-full pl-3 text-left font-normal", !field.value && "text-muted-foreground")}
                                >
                                {field.value ? format(field.value, "PPP") : <span>Pick a date</span>}
                                <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                                </Button>
                            </FormControl>
                            </PopoverTrigger>
                            <PopoverContent className="w-auto p-0" align="start">
                            <CustomCalendar selectedDate={field.value} onDateSelect={field.onChange} />
                            </PopoverContent>
                        </Popover>
                        <FormMessage />
                        </FormItem>
                    )}
                />
              <FormField control={form.control} name="maxHours" render={({ field }) => ( <FormItem><FormLabel>Service Life (Max Hours)</FormLabel><FormControl><Input type="number" {...field} /></FormControl><FormMessage /></FormItem> )} />
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <FormField control={form.control} name="tsn" render={({ field }) => ( <FormItem><FormLabel>TSN (Time Since New)</FormLabel><FormControl><Input type="number" step="0.1" {...field} /></FormControl><FormMessage /></FormItem> )} />
                <FormField control={form.control} name="tso" render={({ field }) => ( <FormItem><FormLabel>TSO (Time Since Overhaul)</FormLabel><FormControl><Input type="number" step="0.1" {...field} /></FormControl><FormMessage /></FormItem> )} />
                <FormField control={form.control} name="totalTime" render={({ field }) => ( <FormItem><FormLabel>Total Time</FormLabel><FormControl><Input type="number" step="0.1" {...field} /></FormControl><FormMessage /></FormItem> )} />
            </div>

            <DialogFooter>
              <DialogClose asChild><Button type="button" variant="outline">Cancel</Button></DialogClose>
              <Button type="submit">Save Component</Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
