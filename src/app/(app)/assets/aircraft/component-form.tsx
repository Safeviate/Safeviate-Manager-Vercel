
'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { collection, doc } from 'firebase/firestore';
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
import { useFirestore, addDocumentNonBlocking } from '@/firebase';
import { useToast } from '@/hooks/use-toast';
import { PlusCircle, CalendarIcon } from 'lucide-react';
import { format } from 'date-fns';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { CustomCalendar } from '@/components/ui/custom-calendar';
import { cn } from '@/lib/utils';

const componentFormSchema = z.object({
  name: z.string().min(1, 'Component name is required.'),
  manufacturer: z.string().min(1, 'Manufacturer is required.'),
  serialNumber: z.string().min(1, 'Serial number is required.'),
  installDate: z.date({ required_error: 'Install date is required.' }),
  tsn: z.number({ coerce: true }).min(0),
  tso: z.number({ coerce: true }).min(0),
  totalTime: z.number({ coerce: true }).min(0),
});

type ComponentFormValues = z.infer<typeof componentFormSchema>;

interface ComponentFormProps {
  tenantId: string;
  aircraftId: string;
}

export function ComponentForm({ tenantId, aircraftId }: ComponentFormProps) {
  const firestore = useFirestore();
  const { toast } = useToast();
  const [isOpen, setIsOpen] = useState(false);

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
    if (!firestore) return;

    const componentsCollection = collection(firestore, `tenants/${tenantId}/aircrafts/${aircraftId}/components`);
    
    const dataToSave = {
        ...values,
        installDate: values.installDate.toISOString(),
    };

    addDocumentNonBlocking(componentsCollection, dataToSave);
    toast({ title: 'Component Added', description: `${values.name} has been added to tracking.` });
    setIsOpen(false);
    form.reset();
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button size="sm">
          <PlusCircle className="mr-2 h-4 w-4" />
          Add Component
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Add Tracked Component</DialogTitle>
          <DialogDescription>
            Register a life-limited or major component for this aircraft.
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField control={form.control} name="name" render={({ field }) => (<FormItem><FormLabel>Component Name</FormLabel><FormControl><Input placeholder="e.g., Left Engine" {...field} /></FormControl><FormMessage /></FormItem>)} />
            
            <div className="grid grid-cols-2 gap-4">
              <FormField control={form.control} name="manufacturer" render={({ field }) => (<FormItem><FormLabel>Manufacturer</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>)} />
              <FormField control={form.control} name="serialNumber" render={({ field }) => (<FormItem><FormLabel>Serial Number</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>)} />
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
                            <Button variant={"outline"} className={cn("w-full pl-3 text-left font-normal", !field.value && "text-muted-foreground")}>
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

            <div className="grid grid-cols-3 gap-4">
              <FormField control={form.control} name="tsn" render={({ field }) => (<FormItem><FormLabel>TSN</FormLabel><FormControl><Input type="number" step="0.1" {...field} /></FormControl></FormItem>)} />
              <FormField control={form.control} name="tso" render={({ field }) => (<FormItem><FormLabel>TSO</FormLabel><FormControl><Input type="number" step="0.1" {...field} /></FormControl></FormItem>)} />
              <FormField control={form.control} name="totalTime" render={({ field }) => (<FormItem><FormLabel>Total Time</FormLabel><FormControl><Input type="number" step="0.1" {...field} /></FormControl></FormItem>)} />
            </div>

            <DialogFooter>
              <DialogClose asChild>
                <Button type="button" variant="outline">Cancel</Button>
              </DialogClose>
              <Button type="submit">Add Component</Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
