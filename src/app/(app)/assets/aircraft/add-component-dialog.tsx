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
import { useToast } from '@/hooks/use-toast';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { CustomCalendar } from '@/components/ui/custom-calendar';
import { CalendarIcon, Settings2 } from 'lucide-react';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import { useUserProfile } from '@/hooks/use-user-profile';
import type { Aircraft, AircraftComponent } from '@/types/aircraft';

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
    try {
        const stored = localStorage.getItem('safeviate.aircrafts');
        if (!stored) throw new Error("Fleet record not found.");
        
        const aircrafts = JSON.parse(stored) as Aircraft[];
        const acIndex = aircrafts.findIndex(a => a.id === aircraftId);
        if (acIndex === -1) throw new Error("Aircraft not found.");

        const newComponent: AircraftComponent = {
            ...values,
            id: crypto.randomUUID(),
            installDate: values.installDate.toISOString(),
        };

        const aircraft = aircrafts[acIndex];
        aircraft.components = [...(aircraft.components || []), newComponent];
        
        aircrafts[acIndex] = aircraft;
        localStorage.setItem('safeviate.aircrafts', JSON.stringify(aircrafts));
        window.dispatchEvent(new Event('safeviate-aircrafts-updated'));

        toast({ title: 'Component Registered', description: `"${values.name}" has been added to the airframe inventory.` });
        setIsOpen(false);
        form.reset();
    } catch (e: any) {
        toast({ variant: 'destructive', title: 'Registration Failed', description: e.message || 'Failed to save component.' });
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogContent className="max-w-xl rounded-3xl p-8">
        <DialogHeader>
          <DialogTitle className="text-xl font-black uppercase tracking-tight flex items-center gap-2">
            <Settings2 className="h-5 w-5 text-primary" />
            Track New Component
          </DialogTitle>
          <DialogDescription className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
            Register a serialized asset for specialized maintenance tracking.
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6 pt-4">
            <FormField control={form.control} name="name" render={({ field }) => (
                <FormItem><FormLabel className="text-[10px] font-black uppercase tracking-widest opacity-70">Component Official Name</FormLabel><FormControl><Input placeholder="e.g. Engine No. 1" className="h-11 font-black uppercase" {...field} /></FormControl><FormMessage /></FormItem>
            )} />
            <div className="grid grid-cols-2 gap-4">
              <FormField control={form.control} name="manufacturer" render={({ field }) => (
                <FormItem><FormLabel className="text-[10px] font-black uppercase tracking-widest opacity-70">Manufacturer</FormLabel><FormControl><Input className="h-11 font-bold" {...field} /></FormControl><FormMessage /></FormItem>
              )} />
              <FormField control={form.control} name="serialNumber" render={({ field }) => (
                <FormItem><FormLabel className="text-[10px] font-black uppercase tracking-widest opacity-70">Serial Number</FormLabel><FormControl><Input className="h-11 font-mono font-bold uppercase" {...field} /></FormControl><FormMessage /></FormItem>
              )} />
            </div>
            <FormField
              control={form.control}
              name="installDate"
              render={({ field }) => (
                <FormItem className="flex flex-col">
                  <FormLabel className="text-[10px] font-black uppercase tracking-widest opacity-70">Installation Date</FormLabel>
                  <Popover>
                    <PopoverTrigger asChild>
                      <FormControl>
                        <Button variant="outline" className={cn("h-11 pl-4 text-left font-bold border-2", !field.value && "text-muted-foreground")}>
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
              <FormField control={form.control} name="tsn" render={({ field }) => (<FormItem><FormLabel className="text-[10px] font-black uppercase tracking-widest opacity-70">TSN (Total)</FormLabel><FormControl><Input type="number" step="0.1" className="h-11 font-mono font-bold" {...field} /></FormControl></FormItem>)} />
              <FormField control={form.control} name="tso" render={({ field }) => (<FormItem><FormLabel className="text-[10px] font-black uppercase tracking-widest opacity-70">TSO (Overhaul)</FormLabel><FormControl><Input type="number" step="0.1" className="h-11 font-mono font-bold" {...field} /></FormControl></FormItem>)} />
              <FormField control={form.control} name="totalTime" render={({ field }) => (<FormItem><FormLabel className="text-[10px] font-black uppercase tracking-widest opacity-70">Current Airframe Time</FormLabel><FormControl><Input type="number" step="0.1" className="h-11 font-mono font-bold" {...field} /></FormControl></FormItem>)} />
            </div>
            <DialogFooter className="pt-4">
              <Button type="submit" className="h-11 px-10 text-[10px] font-black uppercase shadow-lg">Save Component Record</Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
