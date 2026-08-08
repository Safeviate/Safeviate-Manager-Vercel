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
  operatingCurrency: z.string().max(8),
  aircraftCostPerHour: z.coerce.number().min(0),
  fuelCostPerHour: z.coerce.number().min(0),
  maintenanceReservePerHour: z.coerce.number().min(0),
  crewCostPerHour: z.coerce.number().min(0),
  insuranceOverheadPerHour: z.coerce.number().min(0),
  landingFeesDefault: z.coerce.number().min(0),
  handlingFeesDefault: z.coerce.number().min(0),
  otherCostDefault: z.coerce.number().min(0),
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
      operatingCurrency: existingAircraft?.operatingCostProfile?.currency || 'ZAR',
      aircraftCostPerHour: existingAircraft?.operatingCostProfile?.aircraftCostPerHour ?? 0,
      fuelCostPerHour: existingAircraft?.operatingCostProfile?.fuelCostPerHour ?? 0,
      maintenanceReservePerHour: existingAircraft?.operatingCostProfile?.maintenanceReservePerHour ?? 0,
      crewCostPerHour: existingAircraft?.operatingCostProfile?.crewCostPerHour ?? 0,
      insuranceOverheadPerHour: existingAircraft?.operatingCostProfile?.insuranceOverheadPerHour ?? 0,
      landingFeesDefault: existingAircraft?.operatingCostProfile?.landingFeesDefault ?? 0,
      handlingFeesDefault: existingAircraft?.operatingCostProfile?.handlingFeesDefault ?? 0,
      otherCostDefault: existingAircraft?.operatingCostProfile?.otherCostDefault ?? 0,
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
          operatingCostProfile: {
            currency: values.operatingCurrency.trim().toUpperCase() || 'ZAR',
            aircraftCostPerHour: values.aircraftCostPerHour,
            fuelCostPerHour: values.fuelCostPerHour,
            maintenanceReservePerHour: values.maintenanceReservePerHour,
            crewCostPerHour: values.crewCostPerHour,
            insuranceOverheadPerHour: values.insuranceOverheadPerHour,
            landingFeesDefault: values.landingFeesDefault,
            handlingFeesDefault: values.handlingFeesDefault,
            otherCostDefault: values.otherCostDefault,
          },
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
        <div className="space-y-4 rounded-xl border border-emerald-200 bg-emerald-50/40 p-4">
          <div>
            <p className="text-[10px] font-black uppercase tracking-widest text-emerald-800">Operating Cost Profile</p>
            <p className="mt-1 text-xs text-emerald-900/70">These values prefill charter estimates for this aircraft. They can still be overridden on an individual booking.</p>
          </div>
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
            {([
              ['operatingCurrency', 'Currency', 'ZAR'],
              ['aircraftCostPerHour', 'Aircraft / hour', '0.00'],
              ['fuelCostPerHour', 'Fuel / hour', '0.00'],
              ['maintenanceReservePerHour', 'Maintenance reserve / hour', '0.00'],
              ['crewCostPerHour', 'Crew / hour', '0.00'],
              ['insuranceOverheadPerHour', 'Insurance / overhead / hour', '0.00'],
              ['landingFeesDefault', 'Landing fees / trip', '0.00'],
              ['handlingFeesDefault', 'Handling / trip', '0.00'],
              ['otherCostDefault', 'Other / trip', '0.00'],
            ] as const).map(([fieldName, label, placeholder]) => (
              <FormField key={fieldName} control={form.control} name={fieldName} render={({ field }) => (
                <FormItem><FormLabel className="text-[9px] font-black uppercase tracking-wider">{label}</FormLabel><FormControl><Input type={fieldName === 'operatingCurrency' ? 'text' : 'number'} min={fieldName === 'operatingCurrency' ? undefined : 0} step={fieldName === 'operatingCurrency' ? undefined : '0.01'} placeholder={placeholder} className="h-10" {...field} /></FormControl><FormMessage /></FormItem>
              )} />
            ))}
          </div>
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
          <DialogContent className="max-h-[calc(100dvh-2rem)] overflow-y-auto sm:max-w-[550px]">
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
      <DialogContent className="max-h-[calc(100dvh-2rem)] overflow-y-auto sm:max-w-[550px]">
        <DialogHeader>
          <DialogTitle className="text-xl font-black uppercase tracking-tight">Add New Aircraft</DialogTitle>
          <DialogDescription className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Enter the technical details for the new fleet asset.</DialogDescription>
        </DialogHeader>
        {formContent}
      </DialogContent>
    </Dialog>
  );
}
