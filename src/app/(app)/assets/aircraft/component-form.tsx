'use client';

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { useFirestore, addDocumentNonBlocking } from '@/firebase';
import { collection } from 'firebase/firestore';
import { useToast } from '@/hooks/use-toast';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { CustomCalendar } from '@/components/ui/custom-calendar';
import { format } from 'date-fns';
import { CalendarIcon } from 'lucide-react';
import { cn } from '@/lib/utils';

const componentSchema = z.object({
  name: z.string().min(1, 'Name is required.'),
  manufacturer: z.string().min(1, 'Manufacturer is required.'),
  serialNumber: z.string().min(1, 'Serial number is required.'),
  partNumber: z.string().min(1, 'Part number is required.'),
  installDate: z.date(),
  tsn: z.number({ coerce: true }).default(0),
  tso: z.number({ coerce: true }).default(0),
  totalTime: z.number({ coerce: true }).default(0),
});

type ComponentFormValues = z.infer<typeof componentSchema>;

interface ComponentFormProps {
  tenantId: string;
  aircraftId: string;
  onComplete: () => void;
}

export function ComponentForm({ tenantId, aircraftId, onComplete }: ComponentFormProps) {
  const firestore = useFirestore();
  const { toast } = useToast();

  const form = useForm<ComponentFormValues>({
    resolver: zodResolver(componentSchema),
    defaultValues: {
      name: '',
      manufacturer: '',
      serialNumber: '',
      partNumber: '',
      installDate: new Date(),
      tsn: 0,
      tso: 0,
      totalTime: 0,
    },
  });

  const onSubmit = (values: ComponentFormValues) => {
    if (!firestore) return;
    const componentsCollection = collection(firestore, `tenants/${tenantId}/aircrafts/${aircraftId}/components`);
    addDocumentNonBlocking(componentsCollection, {
        ...values,
        installDate: values.installDate.toISOString()
    });
    toast({ title: 'Component Added' });
    onComplete();
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <FormField control={form.control} name="name" render={({ field }) => (<FormItem><FormLabel>Component Name</FormLabel><FormControl><Input placeholder="e.g., Engine, Propeller" {...field} /></FormControl><FormMessage /></FormItem>)} />
          <FormField control={form.control} name="manufacturer" render={({ field }) => (<FormItem><FormLabel>Manufacturer</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>)} />
          <FormField control={form.control} name="serialNumber" render={({ field }) => (<FormItem><FormLabel>Serial Number</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>)} />
          <FormField control={form.control} name="partNumber" render={({ field }) => (<FormItem><FormLabel>Part Number</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>)} />
          
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
                        {field.value ? format(field.value, "PP") : <span>Pick a date</span>}<CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                      </Button>
                    </FormControl>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start"><CustomCalendar selectedDate={field.value} onDateSelect={field.onChange} /></PopoverContent>
                </Popover>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>
        <div className="grid grid-cols-3 gap-4">
            <FormField control={form.control} name="tsn" render={({ field }) => (<FormItem><FormLabel>TSN</FormLabel><FormControl><Input type="number" step="0.1" {...field} /></FormControl></FormItem>)} />
            <FormField control={form.control} name="tso" render={({ field }) => (<FormItem><FormLabel>TSO</FormLabel><FormControl><Input type="number" step="0.1" {...field} /></FormControl></FormItem>)} />
            <FormField control={form.control} name="totalTime" render={({ field }) => (<FormItem><FormLabel>Total Time</FormLabel><FormControl><Input type="number" step="0.1" {...field} /></FormControl></FormItem>)} />
        </div>
        <div className="flex justify-end gap-2 pt-4">
          <Button type="button" variant="outline" onClick={onComplete}>Cancel</Button>
          <Button type="submit">Add Component</Button>
        </div>
      </form>
    </Form>
  );
}