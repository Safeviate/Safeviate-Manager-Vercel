'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { collection } from 'firebase/firestore';
import { ChevronsUpDown, PlusCircle } from 'lucide-react';
import { useFirestore, addDocumentNonBlocking } from '@/firebase';
import { useToast } from '@/hooks/use-toast';
import { useIsMobile } from '@/hooks/use-mobile';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogClose,
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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

const formSchema = z.object({
  registrationNumber: z.string().min(1, 'Registration number is required.'),
  make: z.string().min(1, 'Make is required.'),
  model: z.string().min(1, 'Model is required.'),
  type: z.enum(['Car', 'Truck', 'Van', 'Bus', 'Utility', 'Other']),
  vin: z.string().optional(),
  currentOdometer: z.coerce.number().min(0),
  nextServiceDueDate: z.string().optional(),
  nextServiceDueOdometer: z.union([z.coerce.number().min(0), z.literal('')]).optional(),
});

export function AddVehicleDialog({ tenantId }: { tenantId: string }) {
  const [isOpen, setIsOpen] = useState(false);
  const firestore = useFirestore();
  const { toast } = useToast();
  const isMobile = useIsMobile();

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      registrationNumber: '',
      make: '',
      model: '',
      type: 'Car',
      vin: '',
      currentOdometer: 0,
      nextServiceDueDate: '',
      nextServiceDueOdometer: '',
    },
  });

  const onSubmit = (values: z.infer<typeof formSchema>) => {
    if (!firestore || !tenantId) return;

    const vehiclesRef = collection(firestore, `tenants/${tenantId}/vehicles`);
    addDocumentNonBlocking(vehiclesRef, {
      ...values,
      id: values.registrationNumber.replace(/[^a-zA-Z0-9]/g, '').toUpperCase(),
      nextServiceDueDate: values.nextServiceDueDate || null,
      nextServiceDueOdometer: values.nextServiceDueOdometer === '' ? null : values.nextServiceDueOdometer,
      documents: [],
    });

    toast({
      title: 'Vehicle Added',
      description: `${values.registrationNumber} has been added to the fleet.`,
    });
    setIsOpen(false);
    form.reset();
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button
          variant={isMobile ? 'outline' : 'default'}
          size={isMobile ? 'sm' : 'default'}
          className={isMobile ? 'h-9 w-full justify-between border-input bg-background px-3 text-[10px] font-bold uppercase text-foreground shadow-sm hover:bg-accent/40' : 'w-full sm:w-auto shadow-md gap-2 h-9 px-6 text-xs font-black uppercase'}
        >
          <span className="flex items-center gap-2">
            <PlusCircle className={isMobile ? 'h-3.5 w-3.5' : 'h-4 w-4'} /> Add Vehicle
          </span>
          {isMobile ? <ChevronsUpDown className="h-3.5 w-3.5 text-muted-foreground" /> : null}
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Register New Vehicle</DialogTitle>
          <DialogDescription>Enter the operational details for the new ground asset.</DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <FormField control={form.control} name="registrationNumber" render={({ field }) => (
                <FormItem><FormLabel>Registration</FormLabel><FormControl><Input placeholder="CA 123-456" {...field} /></FormControl><FormMessage /></FormItem>
              )} />
              <FormField control={form.control} name="type" render={({ field }) => (
                <FormItem><FormLabel>Vehicle Type</FormLabel><Select onValueChange={field.onChange} defaultValue={field.value}><FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl><SelectContent><SelectItem value="Car">Car</SelectItem><SelectItem value="Truck">Truck</SelectItem><SelectItem value="Van">Van</SelectItem><SelectItem value="Bus">Bus</SelectItem><SelectItem value="Utility">Utility</SelectItem><SelectItem value="Other">Other</SelectItem></SelectContent></Select><FormMessage /></FormItem>
              )} />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <FormField control={form.control} name="make" render={({ field }) => (
                <FormItem><FormLabel>Make</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
              )} />
              <FormField control={form.control} name="model" render={({ field }) => (
                <FormItem><FormLabel>Model</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
              )} />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <FormField control={form.control} name="vin" render={({ field }) => (
                <FormItem><FormLabel>VIN</FormLabel><FormControl><Input placeholder="Optional" {...field} /></FormControl><FormMessage /></FormItem>
              )} />
              <FormField control={form.control} name="currentOdometer" render={({ field }) => (
                <FormItem><FormLabel>Current Odometer</FormLabel><FormControl><Input type="number" step="1" {...field} /></FormControl><FormMessage /></FormItem>
              )} />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <FormField control={form.control} name="nextServiceDueDate" render={({ field }) => (
                <FormItem><FormLabel>Next Service Due Date</FormLabel><FormControl><Input type="date" {...field} /></FormControl><FormMessage /></FormItem>
              )} />
              <FormField control={form.control} name="nextServiceDueOdometer" render={({ field }) => (
                <FormItem><FormLabel>Next Service Due Odometer</FormLabel><FormControl><Input type="number" step="1" value={field.value} onChange={(e) => field.onChange(e.target.value === '' ? '' : Number(e.target.value))} /></FormControl><FormMessage /></FormItem>
              )} />
            </div>
            <DialogFooter className="pt-4">
              <DialogClose asChild><Button variant="outline">Cancel</Button></DialogClose>
              <Button type="submit">Register Vehicle</Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
