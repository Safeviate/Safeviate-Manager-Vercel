'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useFirestore, addDocumentNonBlocking } from '@/firebase';
import { collection } from 'firebase/firestore';
import { useToast } from '@/hooks/use-toast';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogTrigger, DialogClose } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ChevronsUpDown, PlusCircle } from 'lucide-react';
import { useIsMobile } from '@/hooks/use-mobile';

const formSchema = z.object({
  tailNumber: z.string().min(1, 'Tail number is required.'),
  make: z.string().min(1, 'Make is required.'),
  model: z.string().min(1, 'Model is required.'),
  type: z.enum(['Single-Engine', 'Multi-Engine']),
  currentHobbs: z.coerce.number().min(0),
  currentTacho: z.coerce.number().min(0),
  tachoAtNext50Inspection: z.coerce.number().min(0),
  tachoAtNext100Inspection: z.coerce.number().min(0),
});

export function AddAircraftDialog({ tenantId }: { tenantId: string }) {
  const [isOpen, setIsOpen] = useState(false);
  const firestore = useFirestore();
  const { toast } = useToast();
  const isMobile = useIsMobile();

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      tailNumber: '',
      make: '',
      model: '',
      type: 'Single-Engine',
      currentHobbs: 0,
      currentTacho: 0,
      tachoAtNext50Inspection: 50,
      tachoAtNext100Inspection: 100,
    },
  });

  const onSubmit = (values: z.infer<typeof formSchema>) => {
    if (!firestore) return;
    const colRef = collection(firestore, `tenants/${tenantId}/aircrafts`);
    addDocumentNonBlocking(colRef, {
        ...values,
        id: values.tailNumber.replace('-', '').toUpperCase(),
        components: [],
        documents: [],
    });
    toast({ title: 'Aircraft Added', description: `${values.tailNumber} has been added to the fleet.` });
    setIsOpen(false);
    form.reset();
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button
          variant={isMobile ? "outline" : "default"}
          size={isMobile ? "sm" : "default"}
          className={isMobile ? "h-9 w-full justify-between border-slate-200 bg-white px-3 text-[10px] font-bold uppercase text-slate-900 shadow-sm hover:bg-slate-50 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-100" : "w-full sm:w-auto bg-emerald-700 hover:bg-emerald-800 text-white shadow-md gap-2 h-9 px-6 text-xs font-black uppercase"}
        >
          <span className="flex items-center gap-2">
            <PlusCircle className={isMobile ? "h-3.5 w-3.5" : "h-4 w-4"} /> Add Aircraft
          </span>
          {isMobile ? <ChevronsUpDown className="h-3.5 w-3.5 text-muted-foreground" /> : null}
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Register New Aircraft</DialogTitle>
          <DialogDescription>Enter the technical details for the new organization asset.</DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
                <FormField control={form.control} name="tailNumber" render={({ field }) => ( <FormItem><FormLabel>Tail Number</FormLabel><FormControl><Input placeholder="e.g. ZS-XYZ" {...field} /></FormControl><FormMessage /></FormItem> )} />
                <FormField control={form.control} name="type" render={({ field }) => ( <FormItem><FormLabel>Engine Type</FormLabel><Select onValueChange={field.onChange} defaultValue={field.value}><FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl><SelectContent><SelectItem value="Single-Engine">Single-Engine</SelectItem><SelectItem value="Multi-Engine">Multi-Engine</SelectItem></SelectContent></Select></FormItem> )} />
            </div>
            <div className="grid grid-cols-2 gap-4">
                <FormField control={form.control} name="make" render={({ field }) => ( <FormItem><FormLabel>Make</FormLabel><FormControl><Input {...field} /></FormControl></FormItem> )} />
                <FormField control={form.control} name="model" render={({ field }) => ( <FormItem><FormLabel>Model</FormLabel><FormControl><Input {...field} /></FormControl></FormItem> )} />
            </div>
            <div className="grid grid-cols-2 gap-4">
                <FormField control={form.control} name="currentHobbs" render={({ field }) => ( <FormItem><FormLabel>Current Hobbs</FormLabel><FormControl><Input type="number" step="0.1" {...field} /></FormControl></FormItem> )} />
                <FormField control={form.control} name="currentTacho" render={({ field }) => ( <FormItem><FormLabel>Current Tacho</FormLabel><FormControl><Input type="number" step="0.1" {...field} /></FormControl></FormItem> )} />
            </div>
            <DialogFooter className="pt-4">
              <DialogClose asChild><Button variant="outline">Cancel</Button></DialogClose>
              <Button type="submit">Register Asset</Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
