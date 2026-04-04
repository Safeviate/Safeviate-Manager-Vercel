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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ChevronsUpDown, PlusCircle, Plane, Zap, Timer, Gauge, Box, ShieldCheck } from 'lucide-react';
import { useIsMobile } from '@/hooks/use-mobile';
import type { Aircraft } from '@/types/aircraft';

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
    try {
        const stored = localStorage.getItem('safeviate.aircrafts');
        const aircrafts = stored ? JSON.parse(stored) as Aircraft[] : [];
        
        const newAircraft: Aircraft = {
            ...values,
            id: values.tailNumber.replace('-', '').toUpperCase() + '-' + crypto.randomUUID().slice(0, 4),
            components: [],
            documents: [],
            initialHobbs: values.currentHobbs,
            initialTacho: values.currentTacho,
            organizationId: tenantId,
        };

        const nextAircrafts = [...aircrafts, newAircraft];
        localStorage.setItem('safeviate.aircrafts', JSON.stringify(nextAircrafts));
        window.dispatchEvent(new Event('safeviate-aircrafts-updated'));

        toast({ title: 'Aircraft Registered', description: `${values.tailNumber} is now live in the organization fleet.` });
        setIsOpen(false);
        form.reset();
    } catch (e) {
        toast({ variant: 'destructive', title: 'Registration Failed' });
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button
          variant={isMobile ? "outline" : "default"}
          size={isMobile ? "sm" : "default"}
          className={isMobile ? "h-11 w-full justify-between items-center px-4 rounded-xl border-2 text-[10px] font-black uppercase tracking-widest bg-background" : "h-11 px-8 rounded-2xl shadow-xl shadow-primary/20 text-[10px] font-black uppercase tracking-widest gap-2 bg-primary hover:bg-primary/90 text-white"}
        >
          <span className="flex items-center gap-2">
            <PlusCircle className={isMobile ? "h-4 w-4" : "h-5 w-5"} /> Register New Asset
          </span>
          {isMobile ? <ChevronsUpDown className="h-4 w-4 opacity-30" /> : null}
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl p-0 overflow-hidden rounded-[2.5rem] border-2 shadow-2xl">
        <DialogHeader className="p-10 border-b bg-muted/5">
            <div className="flex items-center gap-6">
                <div className="h-14 w-14 rounded-[1.5rem] bg-primary flex items-center justify-center text-white shadow-xl shadow-primary/20 rotate-3">
                    <Plane className="h-7 w-7" />
                </div>
                <div>
                  <DialogTitle className="text-2xl font-black uppercase tracking-tight">Fleet Initialization</DialogTitle>
                  <DialogDescription className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mt-1">Register a new organization asset for airworthiness tracking.</DialogDescription>
                </div>
            </div>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="p-10 space-y-8">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <FormField control={form.control} name="tailNumber" render={({ field }) => ( <FormItem><FormLabel className="text-[10px] font-black uppercase tracking-widest flex items-center gap-2 opacity-60"><ShieldCheck className="h-3.5 w-3.5 text-primary" /> Registration Identification</FormLabel><FormControl><Input placeholder="e.g. ZS-XYZ" className="h-12 font-black text-lg uppercase tracking-tight shadow-inner" {...field} /></FormControl><FormMessage /></FormItem> )} />
              <FormField control={form.control} name="type" render={({ field }) => ( <FormItem><FormLabel className="text-[10px] font-black uppercase tracking-widest flex items-center gap-2 opacity-60"><Box className="h-3.5 w-3.5 text-primary" /> Engine Configuration</FormLabel><Select onValueChange={field.onChange} defaultValue={field.value}><FormControl><SelectTrigger className="h-12 font-black uppercase border-2 shadow-sm"><SelectValue /></SelectTrigger></FormControl><SelectContent className="rounded-2xl border-2"><SelectItem value="Single-Engine">Single-Engine</SelectItem><SelectItem value="Multi-Engine">Multi-Engine</SelectItem></SelectContent></Select></FormItem> )} />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 pt-2">
                <FormField control={form.control} name="make" render={({ field }) => ( <FormItem><FormLabel className="text-[10px] font-black uppercase tracking-widest opacity-60">Manufacturer</FormLabel><FormControl><Input className="h-11 font-bold" placeholder="e.g. Cessna" {...field} /></FormControl></FormItem> )} />
                <FormField control={form.control} name="model" render={({ field }) => ( <FormItem><FormLabel className="text-[10px] font-black uppercase tracking-widest opacity-60">Designation / Model</FormLabel><FormControl><Input className="h-11 font-bold" placeholder="e.g. 172S Skyhawk" {...field} /></FormControl></FormItem> )} />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 pt-4 pb-4 px-8 py-8 rounded-[2rem] bg-muted/5 border-2 shadow-inner">
                <FormField control={form.control} name="currentHobbs" render={({ field }) => ( <FormItem><FormLabel className="text-[10px] font-black uppercase tracking-widest flex items-center gap-2 text-primary opacity-60"><Timer className="h-3 w-3" /> Initial Hobbs</FormLabel><FormControl><Input type="number" step="0.1" className="h-11 font-mono font-black" {...field} /></FormControl></FormItem> )} />
                <FormField control={form.control} name="currentTacho" render={({ field }) => ( <FormItem><FormLabel className="text-[10px] font-black uppercase tracking-widest flex items-center gap-2 text-primary opacity-60"><Gauge className="h-3 w-3" /> Initial Tacho</FormLabel><FormControl><Input type="number" step="0.1" className="h-11 font-mono font-black" {...field} /></FormControl></FormItem> )} />
            </div>
            <DialogFooter className="pt-8 border-t flex flex-row gap-4">
              <DialogClose asChild><Button variant="outline" className="flex-1 h-12 text-[10px] font-black uppercase tracking-widest border-2 rounded-2xl hover:bg-muted/50">Cancel</Button></DialogClose>
              <Button type="submit" className="flex-1 h-12 text-[10px] font-black uppercase tracking-widest shadow-xl rounded-2xl">Confirm Registration</Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
