'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger, DialogClose } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { PlusCircle } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import type { Aircraft } from '@/types/aircraft';

const formSchema = z.object({
  make: z.string().min(1, 'Make is required'),
  model: z.string().min(1, 'Model is required'),
  tailNumber: z.string().min(1, 'Tail number is required'),
  type: z.enum(['Single-Engine', 'Multi-Engine']),
  currentHobbs: z.coerce.number().min(0),
  currentTacho: z.coerce.number().min(0),
  tachoAtNext50Inspection: z.coerce.number().min(0),
  tachoAtNext100Inspection: z.coerce.number().min(0),
});

interface AircraftFormProps {
  tenantId: string;
  existingAircraft?: Aircraft;
  onCancel?: () => void;
  trigger?: React.ReactNode;
  organizationId?: string | null;
}

export function AircraftForm({ tenantId, existingAircraft, onCancel, trigger }: AircraftFormProps) {
  const [isOpen, setIsOpen] = useState(false);
  const { toast } = useToast();
  const isEditing = Boolean(existingAircraft);

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      make: existingAircraft?.make || '',
      model: existingAircraft?.model || '',
      tailNumber: existingAircraft?.tailNumber || '',
      type: existingAircraft?.type || 'Single-Engine',
      currentHobbs: existingAircraft?.currentHobbs ?? existingAircraft?.frameHours ?? 0,
      currentTacho: existingAircraft?.currentTacho ?? existingAircraft?.engineHours ?? 0,
      tachoAtNext50Inspection: existingAircraft?.tachoAtNext50Inspection ?? 50,
      tachoAtNext100Inspection: existingAircraft?.tachoAtNext100Inspection ?? 100,
    },
  });

  const onSubmit = async (values: z.infer<typeof formSchema>) => {
    try {
      const payload = {
        aircraft: {
          ...(existingAircraft || {}),
          ...values,
          frameHours: values.currentHobbs,
          engineHours: values.currentTacho,
          components: existingAircraft?.components || [],
          documents: existingAircraft?.documents || [],
          organizationId: existingAircraft?.organizationId || tenantId,
        },
      };

      const response = await fetch(existingAircraft ? `/api/aircraft/${existingAircraft.id}` : '/api/aircraft', {
        method: existingAircraft ? 'PATCH' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const result = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(result.error || 'Failed to save aircraft.');

      window.dispatchEvent(new Event('safeviate-aircrafts-updated'));
      toast({ title: isEditing ? 'Aircraft Updated' : 'Aircraft Added', description: `${values.tailNumber} has been ${isEditing ? 'updated' : 'added to the fleet'}.` });
      setIsOpen(false);
      if (!isEditing) form.reset();
      onCancel?.();
    } catch (e) {
      toast({ variant: 'destructive', title: 'Error', description: 'Failed to save aircraft.' });
    }
  };

  const formContent = (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6 pt-4">
        <div className="grid grid-cols-2 gap-4">
          <FormField control={form.control} name="make" render={({ field }) => (
            <FormItem><FormLabel className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Manufacturer</FormLabel><FormControl><Input placeholder="e.g. Cessna" className="h-11 font-bold" {...field} /></FormControl><FormMessage /></FormItem>
          )} />
          <FormField control={form.control} name="model" render={({ field }) => (
            <FormItem><FormLabel className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Model</FormLabel><FormControl><Input placeholder="e.g. 172" className="h-11 font-bold" {...field} /></FormControl><FormMessage /></FormItem>
          )} />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <FormField control={form.control} name="tailNumber" render={({ field }) => (
            <FormItem><FormLabel className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Tail Number</FormLabel><FormControl><Input placeholder="ZS-ABC" className="h-11 font-black text-sm uppercase" {...field} /></FormControl><FormMessage /></FormItem>
          )} />
          <FormField control={form.control} name="type" render={({ field }) => (
            <FormItem><FormLabel className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Engine Type</FormLabel>
              <Select onValueChange={field.onChange} defaultValue={field.value}>
                <FormControl><SelectTrigger className="h-11 font-bold"><SelectValue /></SelectTrigger></FormControl>
                <SelectContent>
                  <SelectItem value="Single-Engine">Single-Engine</SelectItem>
                  <SelectItem value="Multi-Engine">Multi-Engine</SelectItem>
                </SelectContent>
              </Select>
            </FormItem>
          )} />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <FormField control={form.control} name="currentHobbs" render={({ field }) => (
            <FormItem><FormLabel className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Current Hobbs</FormLabel><FormControl><Input type="number" step="0.1" className="h-11 font-mono font-bold" {...field} /></FormControl><FormMessage /></FormItem>
          )} />
          <FormField control={form.control} name="currentTacho" render={({ field }) => (
            <FormItem><FormLabel className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Current Tacho</FormLabel><FormControl><Input type="number" step="0.1" className="h-11 font-mono font-bold" {...field} /></FormControl><FormMessage /></FormItem>
          )} />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <FormField control={form.control} name="tachoAtNext50Inspection" render={({ field }) => (
            <FormItem><FormLabel className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Next 50h Tacho Target</FormLabel><FormControl><Input type="number" step="0.1" className="h-11 font-mono font-bold text-primary" {...field} /></FormControl><FormMessage /></FormItem>
          )} />
          <FormField control={form.control} name="tachoAtNext100Inspection" render={({ field }) => (
            <FormItem><FormLabel className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Next 100h Tacho Target</FormLabel><FormControl><Input type="number" step="0.1" className="h-11 font-mono font-bold text-primary" {...field} /></FormControl><FormMessage /></FormItem>
          )} />
        </div>
        <DialogFooter className="pt-4">
          <DialogClose asChild><Button variant="outline" className="h-11 px-8 text-[10px] font-black uppercase border-slate-300">Cancel</Button></DialogClose>
          <Button type="submit" className="h-11 px-8 text-[10px] font-black uppercase shadow-lg">{isEditing ? 'Save Changes' : 'Register Asset'}</Button>
        </DialogFooter>
      </form>
    </Form>
  );

  if (isEditing) {
    if (trigger) {
      return (
        <Dialog open={isOpen} onOpenChange={setIsOpen}>
          <DialogTrigger asChild>{trigger}</DialogTrigger>
          <DialogContent className="sm:max-w-[550px]">
            <DialogHeader>
              <DialogTitle className="text-xl font-black uppercase tracking-tight">Edit Physical Asset</DialogTitle>
              <DialogDescription className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Update the technical details for this aircraft.</DialogDescription>
            </DialogHeader>
            {formContent}
          </DialogContent>
        </Dialog>
      );
    }

    return formContent;
  }

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button className="h-11 px-8 text-[10px] font-black uppercase shadow-lg gap-2">
          <PlusCircle className="h-4 w-4" />
          Add Aircraft
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[550px]">
        <DialogHeader>
          <DialogTitle className="text-xl font-black uppercase tracking-tight">Add New Aircraft</DialogTitle>
          <DialogDescription className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Enter the technical details for the new fleet asset.</DialogDescription>
        </DialogHeader>
        {formContent}
      </DialogContent>
    </Dialog>
  );
}
