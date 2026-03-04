
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
import { Textarea } from '@/components/ui/textarea';
import { useFirestore, addDocumentNonBlocking } from '@/firebase';
import { collection } from 'firebase/firestore';
import { useToast } from '@/hooks/use-toast';
import { History, CalendarIcon } from 'lucide-react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { CustomCalendar } from '@/components/ui/custom-calendar';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';

const logFormSchema = z.object({
  maintenanceType: z.string().min(1, 'Maintenance type is required.'),
  date: z.date({ required_error: 'Date is required.' }),
  details: z.string().min(1, 'Work details are required.'),
  ameNo: z.string().min(1, 'AME No. is required.'),
  amoNo: z.string().min(1, 'AMO No. is required.'),
});

type LogFormValues = z.infer<typeof logFormSchema>;

interface MaintenanceLogFormProps {
  tenantId: string;
  aircraftId: string;
}

export function MaintenanceLogForm({ tenantId, aircraftId }: MaintenanceLogFormProps) {
  const [isOpen, setIsOpen] = useState(false);
  const firestore = useFirestore();
  const { toast } = useToast();

  const form = useForm<LogFormValues>({
    resolver: zodResolver(logFormSchema),
    defaultValues: {
      maintenanceType: '',
      date: new Date(),
      details: '',
      ameNo: '',
      amoNo: '',
    },
  });

  const onSubmit = async (values: LogFormValues) => {
    if (!firestore) return;

    const logsCollection = collection(firestore, 'tenants', tenantId, 'aircrafts', aircraftId, 'maintenanceLogs');
    const dataToSave = {
        ...values,
        aircraftId,
        date: values.date.toISOString(),
    };

    addDocumentNonBlocking(logsCollection, dataToSave);
    toast({ title: 'Maintenance Activity Logged' });
    setIsOpen(false);
    form.reset();
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button>
          <History className="mr-2 h-4 w-4" />
          Log Activity
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Log Maintenance Activity</DialogTitle>
          <DialogDescription>
            Record maintenance work performed on this aircraft.
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField control={form.control} name="maintenanceType" render={({ field }) => ( <FormItem><FormLabel>Maintenance Type</FormLabel><FormControl><Input placeholder="e.g., 50hr Inspection" {...field} /></FormControl><FormMessage /></FormItem> )} />
                <FormField
                    control={form.control}
                    name="date"
                    render={({ field }) => (
                        <FormItem className="flex flex-col">
                        <FormLabel>Date</FormLabel>
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
            </div>
            <FormField control={form.control} name="details" render={({ field }) => ( <FormItem><FormLabel>Work Details</FormLabel><FormControl><Textarea className="min-h-32" placeholder="Describe the work performed, parts replaced, etc." {...field} /></FormControl><FormMessage /></FormItem> )} />
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField control={form.control} name="ameNo" render={({ field }) => ( <FormItem><FormLabel>AME License No.</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem> )} />
                <FormField control={form.control} name="amoNo" render={({ field }) => ( <FormItem><FormLabel>AMO No.</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem> )} />
            </div>
            <DialogFooter>
              <DialogClose asChild><Button type="button" variant="outline">Cancel</Button></DialogClose>
              <Button type="submit">Save Activity</Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
