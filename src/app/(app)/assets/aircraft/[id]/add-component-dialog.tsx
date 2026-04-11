'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useToast } from '@/hooks/use-toast';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogTrigger, DialogClose } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { PlusCircle, Box, PenTool, Hash, Timer } from 'lucide-react';
import { v4 as uuidv4 } from 'uuid';
import type { AircraftComponent } from '@/types/aircraft';

const toNoonUtcIso = (date: Date) =>
  new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate(), 12)).toISOString();

const formSchema = z.object({
  name: z.string().min(1, 'Component name is required.'),
  manufacturer: z.string().min(1),
  partNumber: z.string().min(1),
  serialNumber: z.string().min(1),
  tsn: z.coerce.number().min(0),
  maxHours: z.coerce.number().min(0),
});

export function AddComponentDialog({ aircraftId }: { tenantId: string, aircraftId: string }) {
  const [isOpen, setIsOpen] = useState(false);
  const { toast } = useToast();

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: '',
      manufacturer: '',
      partNumber: '',
      serialNumber: '',
      tsn: 0,
      maxHours: 2000,
    },
  });

  const onSubmit = async (values: z.infer<typeof formSchema>) => {
    try {
        const newComp: AircraftComponent = { 
            ...values, 
            id: uuidv4(), 
            installDate: toNoonUtcIso(new Date()),
            tso: 0,
            totalTime: values.tsn,
            installHours: 0,
            notes: '',
        };

        const response = await fetch(`/api/aircraft/${aircraftId}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ aircraft: { components: [newComp] } }),
        });
        const result = await response.json().catch(() => ({}));
        if (!response.ok) throw new Error(result.error || 'Failed to save component.');
        window.dispatchEvent(new Event('safeviate-aircrafts-updated'));
        
        toast({ title: 'Component Registered', description: `${values.name} is now being tracked in the fleet record.` });
        setIsOpen(false);
        form.reset();
    } catch (e) {
        toast({ variant: 'destructive', title: 'Registration Failed' });
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button size="sm" variant="outline" className="h-10 px-6 text-[10px] font-black uppercase tracking-widest shadow-md gap-2 border-2 hover:bg-muted/50">
          <PlusCircle className="h-4 w-4" /> Add Tracked Part
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-xl p-0 overflow-hidden rounded-3xl border-2 shadow-2xl">
        <DialogHeader className="p-8 border-b bg-muted/5">
          <DialogTitle className="text-xl font-black uppercase tracking-tight">Lifecycle Initialization</DialogTitle>
          <DialogDescription className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mt-1">
            Define a critical component for airworthiness monitoring.
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6 p-8">
            <FormField control={form.control} name="name" render={({ field }) => ( <FormItem><FormLabel className="text-[10px] font-black uppercase tracking-widest flex items-center gap-2"><Box className="h-3.5 w-3.5 text-primary" /> Component Nomenclature</FormLabel><FormControl><Input className="h-11 font-bold" placeholder="e.g. Lycoming IO-360-L2A" {...field} /></FormControl></FormItem> )} />
            <div className="grid grid-cols-2 gap-6">
                <FormField control={form.control} name="manufacturer" render={({ field }) => ( <FormItem><FormLabel className="text-[10px] font-black uppercase tracking-widest flex items-center gap-2"><PenTool className="h-3.5 w-3.5 text-primary" /> OEM / Manufacturer</FormLabel><FormControl><Input className="h-10 font-bold" {...field} /></FormControl></FormItem> )} />
                <FormField control={form.control} name="serialNumber" render={({ field }) => ( <FormItem><FormLabel className="text-[10px] font-black uppercase tracking-widest flex items-center gap-2"><Hash className="h-3.5 w-3.5 text-primary" /> Serial Number</FormLabel><FormControl><Input className="h-10 font-mono font-black border-primary/20 bg-primary/5 text-primary" {...field} /></FormControl></FormItem> )} />
            </div>
            <div className="grid grid-cols-2 gap-6 pt-2">
                <FormField control={form.control} name="tsn" render={({ field }) => ( <FormItem><FormLabel className="text-[10px] font-black uppercase tracking-widest flex items-center gap-2"><Timer className="h-3.5 w-3.5 text-primary" /> Current TSN (Hrs)</FormLabel><FormControl><Input className="h-10 font-mono font-bold" type="number" step="0.1" {...field} /></FormControl></FormItem> )} />
                <FormField control={form.control} name="maxHours" render={({ field }) => ( <FormItem><FormLabel className="text-[10px] font-black uppercase tracking-widest flex items-center gap-2"><Timer className="h-3.5 w-3.5 text-primary" /> TBO / Life Limit</FormLabel><FormControl><Input className="h-10 font-mono font-bold" type="number" {...field} /></FormControl></FormItem> )} />
            </div>
            <DialogFooter className="pt-8 border-t mt-4 flex flex-row gap-3">
              <DialogClose asChild><Button type="button" variant="outline" className="flex-1 text-[10px] font-black uppercase">Cancel</Button></DialogClose>
              <Button type="submit" className="flex-1 text-[10px] font-black uppercase shadow-lg">Initialize Tracking</Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
