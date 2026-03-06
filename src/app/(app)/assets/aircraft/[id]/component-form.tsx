'use client';

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogDescription, 
  DialogFooter, 
  DialogClose,
  DialogTrigger
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { useFirestore, updateDocumentNonBlocking, useDoc, useMemoFirebase } from '@/firebase';
import { doc, arrayUnion } from 'firebase/firestore';
import { useToast } from '@/hooks/use-toast';
import { v4 as uuidv4 } from 'uuid';
import type { Aircraft } from '@/types/aircraft';

const componentSchema = z.object({
  name: z.string().min(1, "Component name is required"),
  manufacturer: z.string().min(1, "Manufacturer is required"),
  serialNumber: z.string().min(1, "Serial number is required"),
  partNumber: z.string().min(1, "Part number is required"),
  installDate: z.string().min(1, "Install date is required"),
  tsn: z.number({ coerce: true }).min(0),
  tso: z.number({ coerce: true }).min(0),
  totalTime: z.number({ coerce: true }).min(0),
});

type FormValues = z.infer<typeof componentSchema>;

interface ComponentFormProps {
  tenantId: string;
  aircraftId: string;
  isOpen: boolean;
  setIsOpen: (open: boolean) => void;
  trigger?: React.ReactNode;
}

export function ComponentForm({ tenantId, aircraftId, isOpen, setIsOpen, trigger }: ComponentFormProps) {
  const firestore = useFirestore();
  const { toast } = useToast();

  const form = useForm<FormValues>({
    resolver: zodResolver(componentSchema),
    defaultValues: {
      name: '',
      manufacturer: '',
      serialNumber: '',
      partNumber: '',
      installDate: new Date().toISOString().split('T')[0],
      tsn: 0,
      tso: 0,
      totalTime: 0,
    },
  });

  const onSubmit = (values: FormValues) => {
    if (!firestore) return;
    const aircraftRef = doc(firestore, 'tenants', tenantId, 'aircrafts', aircraftId);
    
    updateDocumentNonBlocking(aircraftRef, {
      components: arrayUnion({ ...values, id: uuidv4() })
    });

    toast({ title: "Component Added" });
    setIsOpen(false);
    form.reset();
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      {trigger && <DialogTrigger asChild>{trigger}</DialogTrigger>}
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Track New Component</DialogTitle>
          <DialogDescription>Enter maintenance details for lifecyle tracking.</DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField control={form.control} name="name" render={({ field }) => ( <FormItem><FormLabel>Component Name</FormLabel><FormControl><Input placeholder="e.g. Magneto" {...field} /></FormControl><FormMessage /></FormItem> )} />
            <div className="grid grid-cols-2 gap-4">
              <FormField control={form.control} name="manufacturer" render={({ field }) => ( <FormItem><FormLabel>Manufacturer</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem> )} />
              <FormField control={form.control} name="serialNumber" render={({ field }) => ( <FormItem><FormLabel>Serial Number</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem> )} />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <FormField control={form.control} name="partNumber" render={({ field }) => ( <FormItem><FormLabel>Part Number</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem> )} />
              <FormField control={form.control} name="installDate" render={({ field }) => ( <FormItem><FormLabel>Install Date</FormLabel><FormControl><Input type="date" {...field} /></FormControl><FormMessage /></FormItem> )} />
            </div>
            <div className="grid grid-cols-3 gap-4">
              <FormField control={form.control} name="tsn" render={({ field }) => ( <FormItem><FormLabel>TSN</FormLabel><FormControl><Input type="number" {...field} /></FormControl><FormMessage /></FormItem> )} />
              <FormField control={form.control} name="tso" render={({ field }) => ( <FormItem><FormLabel>TSO</FormLabel><FormControl><Input type="number" {...field} /></FormControl><FormMessage /></FormItem> )} />
              <FormField control={form.control} name="totalTime" render={({ field }) => ( <FormItem><FormLabel>Total Time</FormLabel><FormControl><Input type="number" {...field} /></FormControl><FormMessage /></FormItem> )} />
            </div>
            <DialogFooter>
              <DialogClose asChild><Button variant="outline">Cancel</Button></DialogClose>
              <Button type="submit">Add Component</Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
