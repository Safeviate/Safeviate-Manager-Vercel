'use client';

import { useState, useCallback, useEffect } from 'react';
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
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { v4 as uuidv4 } from 'uuid';
import type { AircraftComponent } from '@/types/aircraft';

const componentSchema = z.object({
  name: z.string().min(1, "Component name is required"),
  manufacturer: z.string().min(1, "Manufacturer is required"),
  serialNumber: z.string().min(1, "Serial number is required"),
  partNumber: z.string().min(1, "Part number is required"),
  installDate: z.string().min(1, "Install date is required"),
  tsn: z.number({ coerce: true }).min(0),
  tso: z.number({ coerce: true }).min(0),
  totalTime: z.number({ coerce: true }).min(0),
  installHours: z.number({ coerce: true }).min(0).default(0),
  maxHours: z.number({ coerce: true }).min(0).default(0),
  notes: z.string().default(''),
});

type FormValues = z.infer<typeof componentSchema>;

interface ComponentFormProps {
  aircraftId: string;
  isOpen?: boolean;
  setIsOpen?: (open: boolean) => void;
  existingComponent?: AircraftComponent;
  trigger?: React.ReactNode;
}

export function ComponentForm({ aircraftId, isOpen, setIsOpen, existingComponent, trigger }: ComponentFormProps) {
  const { toast } = useToast();
  const [internalIsOpen, setInternalIsOpen] = useState(false);
  const dialogOpen = isOpen ?? internalIsOpen;
  const handleOpenChange = setIsOpen ?? setInternalIsOpen;

  const form = useForm<FormValues>({
    resolver: zodResolver(componentSchema),
    defaultValues: {
      name: existingComponent?.name || '',
      manufacturer: existingComponent?.manufacturer || '',
      serialNumber: existingComponent?.serialNumber || '',
      partNumber: existingComponent?.partNumber || '',
      installDate: existingComponent?.installDate?.split('T')[0] || new Date().toISOString().split('T')[0],
      tsn: existingComponent?.tsn || 0,
      tso: existingComponent?.tso || 0,
      totalTime: existingComponent?.totalTime || 0,
      installHours: existingComponent?.installHours || 0,
      maxHours: existingComponent?.maxHours || 0,
      notes: existingComponent?.notes || '',
    },
  });

  const onSubmit = async (values: FormValues) => {
    try {
        const nextComponent: AircraftComponent = {
          ...values,
          id: existingComponent?.id || uuidv4(),
        };

        const response = await fetch(`/api/aircraft/${aircraftId}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ aircraft: { components: [nextComponent] } }),
        });
        const result = await response.json().catch(() => ({}));
        if (!response.ok) throw new Error(result.error || 'Failed to save component.');
        window.dispatchEvent(new Event('safeviate-aircrafts-updated'));

        toast({ 
            title: existingComponent ? 'Component Updated' : 'Component Registered',
            description: `The tracking metadata for ${values.name} has been synchronized.`
        });
        
        handleOpenChange(false);
        form.reset();
    } catch (error) {
      toast({
        variant: 'destructive',
        title: 'Save Failed',
        description: 'Unable to commit the component update.',
      });
    }
  };

  return (
    <Dialog open={dialogOpen} onOpenChange={handleOpenChange}>
      {trigger && <DialogTrigger asChild>{trigger}</DialogTrigger>}
      <DialogContent className="sm:max-w-xl max-h-[90vh] flex flex-col p-0 overflow-hidden rounded-3xl border-2 shadow-2xl">
        <DialogHeader className="p-8 border-b bg-muted/5">
          <DialogTitle className="text-xl font-black uppercase tracking-tight">
            {existingComponent ? 'Refine Tracked Entity' : 'Initialize Component Tracking'}
          </DialogTitle>
          <DialogDescription className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mt-1">
            Configure life-limit parameters and installation metadata for precision tracking.
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6 flex-1 overflow-auto p-8">
            <FormField control={form.control} name="name" render={({ field }) => ( 
                <FormItem>
                    <FormLabel className="text-[10px] font-black uppercase tracking-widest">Part Nomenclature</FormLabel>
                    <FormControl><Input className="h-10 font-bold" placeholder="e.g. Right Magneto" {...field} /></FormControl>
                    <FormMessage />
                </FormItem> 
            )} />
            
            <div className="grid grid-cols-2 gap-6">
              <FormField control={form.control} name="manufacturer" render={({ field }) => ( <FormItem><FormLabel className="text-[10px] font-black uppercase tracking-widest">Manufacturer</FormLabel><FormControl><Input className="h-10 font-bold" {...field} /></FormControl><FormMessage /></FormItem> )} />
              <FormField control={form.control} name="serialNumber" render={({ field }) => ( <FormItem><FormLabel className="text-[10px] font-black uppercase tracking-widest">Serial Number</FormLabel><FormControl><Input className="h-10 font-mono font-bold" {...field} /></FormControl><FormMessage /></FormItem> )} />
            </div>
            
            <div className="grid grid-cols-2 gap-6">
              <FormField control={form.control} name="partNumber" render={({ field }) => ( <FormItem><FormLabel className="text-[10px] font-black uppercase tracking-widest">Part Number</FormLabel><FormControl><Input className="h-10 font-mono font-bold" {...field} /></FormControl><FormMessage /></FormItem> )} />
              <FormField control={form.control} name="installDate" render={({ field }) => ( <FormItem><FormLabel className="text-[10px] font-black uppercase tracking-widest">Install Date</FormLabel><FormControl><Input className="h-10 font-bold" type="date" {...field} /></FormControl><FormMessage /></FormItem> )} />
            </div>
            
            <div className="grid grid-cols-3 gap-6 bg-muted/5 p-4 rounded-2xl border-2">
              <FormField control={form.control} name="tsn" render={({ field }) => ( <FormItem><FormLabel className="text-[10px] font-black uppercase tracking-widest text-center block">TSN (New)</FormLabel><FormControl><Input className="h-10 font-mono font-black text-center" type="number" {...field} /></FormControl><FormMessage /></FormItem> )} />
              <FormField control={form.control} name="tso" render={({ field }) => ( <FormItem><FormLabel className="text-[10px] font-black uppercase tracking-widest text-center block">TSO (Overhaul)</FormLabel><FormControl><Input className="h-10 font-mono font-black text-center" type="number" {...field} /></FormControl><FormMessage /></FormItem> )} />
              <FormField control={form.control} name="totalTime" render={({ field }) => ( <FormItem><FormLabel className="text-[10px] font-black uppercase tracking-widest text-center block">Total Accrued</FormLabel><FormControl><Input className="h-10 font-mono font-black text-center border-primary/20 bg-primary/5 text-primary" type="number" {...field} /></FormControl><FormMessage /></FormItem> )} />
            </div>

            <FormField control={form.control} name="notes" render={({ field }) => ( 
                <FormItem>
                    <FormLabel className="text-[10px] font-black uppercase tracking-widest">Technical Notes / Service Bulletins</FormLabel>
                    <FormControl><Textarea className="min-h-[80px] font-medium" placeholder="Record ADs, SBs, or physical condition notes..." {...field} /></FormControl>
                    <FormMessage />
                </FormItem> 
            )} />

            <DialogFooter className="pt-6 border-t mt-4">
              <DialogClose asChild><Button type="button" variant="outline" className="text-[10px] font-black uppercase">Cancel</Button></DialogClose>
              <Button type="submit" className="text-[10px] font-black uppercase px-10 shadow-lg">
                {existingComponent ? 'Update Tracking Data' : 'Initialize Tracking'}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
