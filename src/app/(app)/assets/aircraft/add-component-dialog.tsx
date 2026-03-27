
'use client';

import { useState } from 'react';
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
import { useFirestore, addDocumentNonBlocking } from '@/firebase';
import { collection } from 'firebase/firestore';
import { useToast } from '@/hooks/use-toast';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { CustomCalendar } from '@/components/ui/custom-calendar';
import { CalendarIcon } from 'lucide-react';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import { useUserProfile } from '@/hooks/use-user-profile';

const componentFormSchema = z.object({
  name: z.string().min(1, 'Component name is required.'),
  manufacturer: z.string().min(1, 'Manufacturer is required.'),
  serialNumber: z.string().min(1, 'Serial number is required.'),
  installDate: z.date(),
  tsn: z.number({ coerce: true }).min(0),
  tso: z.number({ coerce: true }).min(0),
  totalTime: z.number({ coerce: true }).min(0),
});

type ComponentFormValues = z.infer<typeof componentFormSchema>;

interface AddComponentDialogProps {
  aircraftId: string;
  isOpen: boolean;
  setIsOpen: (open: boolean) => void;
}

export function AddComponentDialog({ aircraftId, isOpen, setIsOpen }: AddComponentDialogProps) {
  const firestore = useFirestore();
  const { toast } = useToast();
  const { tenantId } = useUserProfile();

  const form = useForm<ComponentFormValues>({
    resolver: zodResolver(componentFormSchema),
    defaultValues: {
      name: '',
      manufacturer: '',
      serialNumber: '',
      installDate: new Date(),
      tsn: 0,
      tso: 0,
      totalTime: 0,
    },
  });

  const onSubmit = async (values: ComponentFormValues) => {
    if (!firestore || !tenantId) return;
    const componentsRef = collection(firestore, `tenants/${tenantId}/aircrafts/${aircraftId}/components`);
    addDocumentNonBlocking(componentsRef, {
      ...values,
      installDate: values.installDate.toISOString(),
    });
    toast({ title: 'Component Added' });
    setIsOpen(false);
    form.reset();
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Add Tracked Component</DialogTitle>
          <DialogDescription>
            Register a new component for maintenance tracking.
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField control={form.control} name="name" render={({ field }) => (<FormItem><FormLabel>Component Name</FormLabel><FormControl><Input placeholder="e.g., Engine No. 1" {...field} /></FormControl><FormMessage /></FormItem>)} />
            <div className="grid grid-cols-2 gap-4">
              <FormField control={form.control} name="manufacturer" render={({ field }) => (<FormItem><FormLabel>Manufacturer</FormLabel><FormControl><Input {...field} /></FormControl></FormItem>)} />
              <FormField control={form.control} name="serialNumber" render={({ field }) => (<FormItem><FormLabel>Serial Number</FormLabel><FormControl><Input {...field} /></FormControl></FormItem>)} />
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
              <FormField control={form.control} name="tsn" render={({ field }) => (<FormItem><FormLabel>TSN</FormLabel><FormControl><Input type="number" step="0.1" {...field} /></FormControl></FormItem>)} />
              <FormField control={form.control} name="tso" render={({ field }) => (<FormItem><FormLabel>TSO</FormLabel><FormControl><Input type="number" step="0.1" {...field} /></FormControl></FormItem>)} />
              <FormField control={form.control} name="totalTime" render={({ field }) => (<FormItem><FormLabel>Total Time</FormLabel><FormControl><Input type="number" step="0.1" {...field} /></FormControl></FormItem>)} />
            </div>
            <DialogFooter className="pt-4">
              <Button type="submit">Save Component</Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
