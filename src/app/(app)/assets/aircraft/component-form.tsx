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
import { useToast } from '@/hooks/use-toast';
import { format } from 'date-fns';
import { Settings2, Tag } from 'lucide-react';
import type { Aircraft, AircraftComponent } from '@/types/aircraft';

const componentSchema = z.object({
  name: z.string().min(1, 'Component name is required.'),
  manufacturer: z.string().min(1, 'Manufacturer is required.'),
  serialNumber: z.string().min(1, 'Serial number is required.'),
  installDate: z.string().min(1, 'Install date is required.'),
  tsn: z.number({ coerce: true }).default(0),
  tso: z.number({ coerce: true }).default(0),
  totalTime: z.number({ coerce: true }).default(0),
});

type FormValues = z.infer<typeof componentSchema>;

interface ComponentFormProps {
  tenantId: string;
  aircraftId: string;
  trigger: React.ReactNode;
}

export function ComponentForm({ aircraftId, trigger }: ComponentFormProps) {
  const { toast } = useToast();
  const [isOpen, setIsOpen] = useState(false);

  const form = useForm<FormValues>({
    resolver: zodResolver(componentSchema),
    defaultValues: {
      name: '',
      manufacturer: '',
      serialNumber: '',
      installDate: format(new Date(), 'yyyy-MM-dd'),
      tsn: 0,
      tso: 0,
      totalTime: 0,
    },
  });

  const onSubmit = async (values: FormValues) => {
    try {
        const newComponent: AircraftComponent = {
            ...values,
            id: crypto.randomUUID(),
            partNumber: '',
            installHours: 0,
            maxHours: 0,
            notes: '',
        };

        const response = await fetch(`/api/aircraft/${aircraftId}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ aircraft: { components: [newComponent] } }),
        });
        const result = await response.json().catch(() => ({}));
        if (!response.ok) throw new Error(result.error || 'Failed to save component.');
        window.dispatchEvent(new Event('safeviate-aircrafts-updated'));

        toast({ title: 'Component Registered', description: `"${values.name}" has been mapped to the airframe serial ${values.serialNumber}.` });
        setIsOpen(false);
        form.reset();
    } catch (e) {
        toast({ variant: 'destructive', title: 'Error', description: 'Failed to record component data.' });
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent className="max-w-2xl rounded-3xl p-8">
        <DialogHeader>
          <DialogTitle className="text-xl font-black uppercase tracking-tight flex items-center gap-2">
            <Settings2 className="h-5 w-5 text-primary" />
            Register Life-Limited Part
          </DialogTitle>
          <DialogDescription className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Add a tracked component with specific maintenance thresholds.</DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6 pt-4">
            <div className="grid grid-cols-2 gap-6">
              <FormField control={form.control} name="name" render={({ field }) => ( 
                <FormItem className="col-span-2">
                    <FormLabel className="text-[10px] font-black uppercase tracking-widest opacity-70">Component Official Name</FormLabel>
                    <FormControl><Input placeholder="e.g. Lycoming IO-360-L2A" className="h-11 font-black uppercase" {...field} /></FormControl>
                    <FormMessage />
                </FormItem> 
              )} />
              <FormField control={form.control} name="manufacturer" render={({ field }) => ( 
                <FormItem><FormLabel className="text-[10px] font-black uppercase tracking-widest opacity-70">Manufacturer</FormLabel><FormControl><Input placeholder="e.g. Lycoming" className="h-11 font-bold" {...field} /></FormControl><FormMessage /></FormItem> 
              )} />
              <FormField control={form.control} name="serialNumber" render={({ field }) => ( 
                <FormItem>
                    <FormLabel className="text-[10px] font-black uppercase tracking-widest opacity-70 flex items-center gap-1.5"><Tag className="h-3 w-3" /> Part Serial Number</FormLabel>
                    <FormControl><Input placeholder="e.g. L-12345-51A" className="h-11 font-mono font-bold uppercase" {...field} /></FormControl>
                    <FormMessage />
                </FormItem> 
              )} />
              <FormField control={form.control} name="installDate" render={({ field }) => ( 
                <FormItem><FormLabel className="text-[10px] font-black uppercase tracking-widest opacity-70">Installation Date</FormLabel><FormControl><Input type="date" className="h-11 font-bold" {...field} /></FormControl><FormMessage /></FormItem> 
              )} />
              <FormField control={form.control} name="tsn" render={({ field }) => ( 
                <FormItem><FormLabel className="text-[10px] font-black uppercase tracking-widest opacity-70">TSN (Time Since New)</FormLabel><FormControl><Input type="number" step="0.1" className="h-11 font-mono font-black" {...field} /></FormControl><FormMessage /></FormItem> 
              )} />
              <FormField control={form.control} name="tso" render={({ field }) => ( 
                <FormItem><FormLabel className="text-[10px] font-black uppercase tracking-widest opacity-70">TSO (Time Since Overhaul)</FormLabel><FormControl><Input type="number" step="0.1" className="h-11 font-mono font-black" {...field} /></FormControl><FormMessage /></FormItem> 
              )} />
              <FormField control={form.control} name="totalTime" render={({ field }) => ( 
                <FormItem><FormLabel className="text-[10px] font-black uppercase tracking-widest opacity-70">Total Operational Time</FormLabel><FormControl><Input type="number" step="0.1" className="h-11 font-mono font-black" {...field} /></FormControl><FormMessage /></FormItem> 
              )} />
            </div>
            <DialogFooter className="pt-4">
              <DialogClose asChild><Button type="button" variant="outline" className="h-11 px-10 text-[10px] font-black uppercase border-slate-300">Cancel</Button></DialogClose>
              <Button type="submit" className="h-11 px-10 text-[10px] font-black uppercase shadow-lg">Register Component</Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
