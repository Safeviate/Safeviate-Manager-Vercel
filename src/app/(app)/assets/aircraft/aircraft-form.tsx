'use client';

import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useFirestore, addDocumentNonBlocking, updateDocumentNonBlocking } from '@/firebase';
import { collection, doc } from 'firebase/firestore';
import { useToast } from '@/hooks/use-toast';
import type { Aircraft } from '@/types/aircraft';
import { Separator } from '@/components/ui/separator';

const aircraftSchema = z.object({
  make: z.string().min(1, 'Make is required.'),
  model: z.string().min(1, 'Model is required.'),
  tailNumber: z.string().min(1, 'Tail number is required.'),
  type: z.enum(['Single-Engine', 'Multi-Engine'], { required_error: 'Aircraft type is required.' }),
  abbreviation: z.string().optional(),
  frameHours: z.coerce.number().optional(),
  engineHours: z.coerce.number().optional(),
  initialHobbs: z.coerce.number().optional(),
  currentHobbs: z.coerce.number().optional(),
  initialTacho: z.coerce.number().optional(),
  currentTacho: z.coerce.number().optional(),
  tachoAtNext50Inspection: z.coerce.number().optional(),
  tachoAtNext100Inspection: z.coerce.number().optional(),
});

type AircraftFormValues = z.infer<typeof aircraftSchema>;

interface AircraftFormProps {
  existingAircraft?: Aircraft | null;
  onSave: () => void;
  onCancel: () => void;
}

export function AircraftForm({ existingAircraft, onSave, onCancel }: AircraftFormProps) {
  const firestore = useFirestore();
  const { toast } = useToast();
  const tenantId = 'safeviate'; // Hardcoded

  const form = useForm<AircraftFormValues>({
    resolver: zodResolver(aircraftSchema),
    defaultValues: {
      make: existingAircraft?.make || '',
      model: existingAircraft?.model || '',
      tailNumber: existingAircraft?.tailNumber || '',
      type: existingAircraft?.type || 'Single-Engine',
      abbreviation: existingAircraft?.abbreviation || '',
      frameHours: existingAircraft?.frameHours || 0,
      engineHours: existingAircraft?.engineHours || 0,
      initialHobbs: existingAircraft?.initialHobbs || 0,
      currentHobbs: existingAircraft?.currentHobbs || 0,
      initialTacho: existingAircraft?.initialTacho || 0,
      currentTacho: existingAircraft?.currentTacho || 0,
      tachoAtNext50Inspection: existingAircraft?.tachoAtNext50Inspection || 0,
      tachoAtNext100Inspection: existingAircraft?.tachoAtNext100Inspection || 0,
    },
  });

  const onSubmit = async (data: AircraftFormValues) => {
    if (!firestore) return;

    try {
      if (existingAircraft) {
        const aircraftRef = doc(firestore, 'tenants', tenantId, 'aircrafts', existingAircraft.id);
        await updateDocumentNonBlocking(aircraftRef, data);
        toast({ title: 'Success', description: 'Aircraft updated successfully.' });
      } else {
        const aircraftsCollection = collection(firestore, 'tenants', tenantId, 'aircrafts');
        await addDocumentNonBlocking(aircraftsCollection, data);
        toast({ title: 'Success', description: 'Aircraft created successfully.' });
      }
      onSave(); // Call the onSave callback to signal success
    } catch (error) {
      console.error("Error saving aircraft: ", error);
      toast({ variant: 'destructive', title: 'Error', description: 'Could not save aircraft details.' });
    }
  };

  return (
    <Card>
      <form onSubmit={form.handleSubmit(onSubmit)}>
        <CardHeader>
          <CardTitle>{existingAircraft ? `Edit Aircraft: ${existingAircraft.tailNumber}` : 'Create New Aircraft'}</CardTitle>
          <CardDescription>
            {existingAircraft ? 'Update the details for this aircraft.' : 'Enter the details for the new aircraft.'}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                <div className="space-y-2">
                    <Label htmlFor="make">Make</Label>
                    <Input id="make" {...form.register('make')} />
                    {form.formState.errors.make && <p className="text-sm text-destructive">{form.formState.errors.make.message}</p>}
                </div>
                <div className="space-y-2">
                    <Label htmlFor="model">Model</Label>
                    <Input id="model" {...form.register('model')} />
                     {form.formState.errors.model && <p className="text-sm text-destructive">{form.formState.errors.model.message}</p>}
                </div>
                <div className="space-y-2">
                    <Label htmlFor="tailNumber">Tail Number</Label>
                    <Input id="tailNumber" {...form.register('tailNumber')} />
                     {form.formState.errors.tailNumber && <p className="text-sm text-destructive">{form.formState.errors.tailNumber.message}</p>}
                </div>
                <div className="space-y-2">
                    <Label htmlFor="type">Type</Label>
                     <Controller
                        control={form.control}
                        name="type"
                        render={({ field }) => (
                          <Select onValueChange={field.onChange} value={field.value}>
                            <SelectTrigger id="type">
                              <SelectValue placeholder="Select type" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="Single-Engine">Single-Engine</SelectItem>
                              <SelectItem value="Multi-Engine">Multi-Engine</SelectItem>
                            </SelectContent>
                          </Select>
                        )}
                      />
                </div>
                 <div className="space-y-2">
                    <Label htmlFor="abbreviation">Abbreviation (5 chars)</Label>
                    <Input id="abbreviation" {...form.register('abbreviation')} maxLength={5} />
                </div>
            </div>
            <Separator />
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                 <div className="space-y-2">
                    <Label htmlFor="frameHours">Frame Hours</Label>
                    <Input id="frameHours" type="number" {...form.register('frameHours')} />
                </div>
                 <div className="space-y-2">
                    <Label htmlFor="engineHours">Engine Hours</Label>
                    <Input id="engineHours" type="number" {...form.register('engineHours')} />
                </div>
                <div className="space-y-2">
                    <Label htmlFor="initialHobbs">Initial Hobbs Hours</Label>
                    <Input id="initialHobbs" type="number" {...form.register('initialHobbs')} />
                </div>
                <div className="space-y-2">
                    <Label htmlFor="currentHobbs">Current Hobbs Hours</Label>
                    <Input id="currentHobbs" type="number" {...form.register('currentHobbs')} />
                </div>
                <div className="space-y-2">
                    <Label htmlFor="initialTacho">Initial Tacho Hours</Label>
                    <Input id="initialTacho" type="number" {...form.register('initialTacho')} />
                </div>
                <div className="space-y-2">
                    <Label htmlFor="currentTacho">Current Tacho Hours</Label>
                    <Input id="currentTacho" type="number" {...form.register('currentTacho')} />
                </div>
            </div>
             <Separator />
             <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                 <div className="space-y-2">
                    <Label htmlFor="tachoAtNext50Inspection">Tacho at Next 50hr Inspection</Label>
                    <Input id="tachoAtNext50Inspection" type="number" {...form.register('tachoAtNext50Inspection')} />
                </div>
                 <div className="space-y-2">
                    <Label htmlFor="tachoAtNext100Inspection">Tacho at Next 100hr Inspection</Label>
                    <Input id="tachoAtNext100Inspection" type="number" {...form.register('tachoAtNext100Inspection')} />
                </div>
            </div>
        </CardContent>
        <CardFooter className="flex justify-end gap-2">
          <Button type="button" variant="outline" onClick={onCancel}>
            Cancel
          </Button>
          <Button type="submit">Save Changes</Button>
        </CardFooter>
      </form>
    </Card>
  );
}
