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

const componentFormSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  manufacturer: z.string().min(1, 'Manufacturer is required'),
  partNumber: z.string().min(1, 'Part number is required'),
  serialNumber: z.string().min(1, 'Serial number is required'),
  installHours: z.number({ coerce: true }).min(0),
  tsn: z.number({ coerce: true }).min(0),
  tso: z.number({ coerce: true }).min(0),
  maxHours: z.number({ coerce: true }).min(0),
  installDate: z.string().min(1, 'Install date is required'),
});

type ComponentFormValues = z.infer<typeof componentFormSchema>;

interface ComponentFormProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  tenantId: string;
  aircraftId: string;
}

export function ComponentForm({ isOpen, onOpenChange, tenantId, aircraftId }: ComponentFormProps) {
  const firestore = useFirestore();
  const { toast } = useToast();

  const form = useForm<ComponentFormValues>({
    resolver: zodResolver(componentFormSchema),
    defaultValues: {
      name: '',
      manufacturer: '',
      partNumber: '',
      serialNumber: '',
      installHours: 0,
      tsn: 0,
      tso: 0,
      maxHours: 2000,
      installDate: new Date().toISOString().split('T')[0],
    },
  });

  const onSubmit = (values: ComponentFormValues) => {
    if (!firestore) return;
    const componentCollection = collection(firestore, 'tenants', tenantId, 'aircrafts', aircraftId, 'components');
    addDocumentNonBlocking(componentCollection, values);
    toast({ title: 'Component Added' });
    onOpenChange(false);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-xl">
        <DialogHeader>
          <DialogTitle>Add Aircraft Component</DialogTitle>
          <DialogDescription>Track engine, propeller, or avionics life cycles.</DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <FormField control={form.control} name="name" render={({ field }) => (<FormItem><FormLabel>Component Name</FormLabel><FormControl><Input placeholder="Engine #1" {...field} /></FormControl><FormMessage /></FormItem>)} />
              <FormField control={form.control} name="manufacturer" render={({ field }) => (<FormItem><FormLabel>Manufacturer</FormLabel><FormControl><Input placeholder="Lycoming" {...field} /></FormControl><FormMessage /></FormItem>)} />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <FormField control={form.control} name="partNumber" render={({ field }) => (<FormItem><FormLabel>Part Number</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>)} />
              <FormField control={form.control} name="serialNumber" render={({ field }) => (<FormItem><FormLabel>Serial Number</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>)} />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <FormField control={form.control} name="tsn" render={({ field }) => (<FormItem><FormLabel>Time Since New</FormLabel><FormControl><Input type="number" step="0.1" {...field} /></FormControl><FormMessage /></FormItem>)} />
              <FormField control={form.control} name="maxHours" render={({ field }) => (<FormItem><FormLabel>TBO / Life Limit</FormLabel><FormControl><Input type="number" step="0.1" {...field} /></FormControl><FormMessage /></FormItem>)} />
            </div>
            <FormField control={form.control} name="installDate" render={({ field }) => (<FormItem><FormLabel>Install Date</FormLabel><FormControl><Input type="date" {...field} /></FormControl><FormMessage /></FormItem>)} />
            <DialogFooter><Button type="submit">Add Component</Button></DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
