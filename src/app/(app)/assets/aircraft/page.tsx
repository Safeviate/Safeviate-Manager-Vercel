
'use client';

import { useState, useMemo, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { collection, query, doc } from 'firebase/firestore';
import { useCollection, useFirestore, useMemoFirebase, addDocumentNonBlocking, updateDocumentNonBlocking } from '@/firebase';
import { Button } from '@/components/ui/button';
import { PlusCircle } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { AircraftTable } from './aircraft-table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogClose } from '@/components/ui/dialog';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import type { Aircraft } from '@/types/aircraft';

// Schema for form validation
const formSchema = z.object({
  make: z.string().min(1, 'Make is required.'),
  model: z.string().min(1, 'Model is required.'),
  tailNumber: z.string().min(1, 'Tail number is required.'),
  type: z.enum(['Single-Engine', 'Multi-Engine']),
  frameHours: z.string().optional(),
  engineHours: z.string().optional(),
  initialHobbs: z.string().optional(),
  currentHobbs: z.string().optional(),
  initialTacho: z.string().optional(),
  currentTacho: z.string().optional(),
});
type FormValues = z.infer<typeof formSchema>;

export default function AssetsPage() {
  const firestore = useFirestore();
  const { toast } = useToast();
  const tenantId = 'safeviate';

  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingAircraft, setEditingAircraft] = useState<Aircraft | null>(null);

  const aircraftsQuery = useMemoFirebase(
    () => (firestore ? query(collection(firestore, `tenants/${tenantId}/aircrafts`)) : null),
    [firestore, tenantId]
  );
  const { data: aircrafts, isLoading, error } = useCollection<Aircraft>(aircraftsQuery);

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      make: '',
      model: '',
      tailNumber: '',
      type: 'Single-Engine',
      frameHours: '',
      engineHours: '',
      initialHobbs: '',
      currentHobbs: '',
      initialTacho: '',
      currentTacho: '',
    },
  });

  useEffect(() => {
    if (isFormOpen) {
      form.reset(
        editingAircraft
          ? {
              ...editingAircraft,
              frameHours: editingAircraft.frameHours?.toString() ?? '',
              engineHours: editingAircraft.engineHours?.toString() ?? '',
              initialHobbs: editingAircraft.initialHobbs?.toString() ?? '',
              currentHobbs: editingAircraft.currentHobbs?.toString() ?? '',
              initialTacho: editingAircraft.initialTacho?.toString() ?? '',
              currentTacho: editingAircraft.currentTacho?.toString() ?? '',
            }
          : {
              make: '', model: '', tailNumber: '', type: 'Single-Engine',
              frameHours: '', engineHours: '',
              initialHobbs: '', currentHobbs: '', initialTacho: '', currentTacho: '',
            }
      );
    }
  }, [isFormOpen, editingAircraft, form]);

  const handleCreate = () => {
    setEditingAircraft(null);
    setIsFormOpen(true);
  };

  const handleEdit = (aircraft: Aircraft) => {
    setEditingAircraft(aircraft);
    setIsFormOpen(true);
  };

  const handleCloseForm = () => {
    setIsFormOpen(false);
    setEditingAircraft(null);
  };

  const onSubmit = async (values: FormValues) => {
    if (!firestore) return;

    const dataToSave = {
      ...values,
      frameHours: parseFloat(values.frameHours || '0') || 0,
      engineHours: parseFloat(values.engineHours || '0') || 0,
      initialHobbs: parseFloat(values.initialHobbs || '0') || 0,
      currentHobbs: parseFloat(values.currentHobbs || '0') || 0,
      initialTacho: parseFloat(values.initialTacho || '0') || 0,
      currentTacho: parseFloat(values.currentTacho || '0') || 0,
    };

    try {
      if (editingAircraft) {
        const aircraftRef = doc(firestore, 'tenants', tenantId, 'aircrafts', editingAircraft.id);
        await updateDocumentNonBlocking(aircraftRef, dataToSave);
        toast({ title: 'Aircraft Updated', description: `The aircraft ${values.tailNumber} has been updated.` });
      } else {
        const aircraftsCollection = collection(firestore, `tenants/${tenantId}/aircrafts`);
        await addDocumentNonBlocking(aircraftsCollection, dataToSave);
        toast({ title: 'Aircraft Created', description: `The aircraft ${values.tailNumber} has been created.` });
      }
      handleCloseForm();
    } catch (e: any) {
      toast({ variant: 'destructive', title: 'Save Failed', description: e.message });
    }
  };

  return (
    <>
      <div className="flex flex-col gap-6 h-full">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Aircraft</h1>
            <p className="text-muted-foreground">Manage your fleet of aircraft.</p>
          </div>
          <Button onClick={handleCreate}>
            <PlusCircle className="mr-2 h-4 w-4" />
            Create Aircraft
          </Button>
        </div>
        <Card>
          <CardHeader>
            <CardTitle>Aircraft Fleet</CardTitle>
            <CardDescription>A list of all aircraft in your organization.</CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading && <Skeleton className="h-40 w-full" />}
            {error && <p className="text-destructive text-center">Error: {error.message}</p>}
            {!isLoading && !error && aircrafts && (
              <AircraftTable
                data={aircrafts}
                tenantId={tenantId}
                onEdit={handleEdit}
              />
            )}
          </CardContent>
        </Card>
      </div>

      <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
        <DialogContent className="sm:max-w-[625px]">
          <DialogHeader>
            <DialogTitle>{editingAircraft ? 'Edit Aircraft' : 'Create Aircraft'}</DialogTitle>
            <DialogDescription>
              {editingAircraft ? 'Update the details for this aircraft.' : 'Add a new aircraft to your fleet.'}
            </DialogDescription>
          </DialogHeader>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 py-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField control={form.control} name="make" render={({ field }) => ( <FormItem><FormLabel>Make</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem> )} />
                <FormField control={form.control} name="model" render={({ field }) => ( <FormItem><FormLabel>Model</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem> )} />
              </div>
              <FormField control={form.control} name="tailNumber" render={({ field }) => ( <FormItem><FormLabel>Tail Number</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem> )} />
              <FormField control={form.control} name="type" render={({ field }) => ( <FormItem><FormLabel>Type</FormLabel><Select onValueChange={field.onChange} defaultValue={field.value}><FormControl><SelectTrigger><SelectValue placeholder="Select aircraft type" /></SelectTrigger></FormControl><SelectContent><SelectItem value="Single-Engine">Single-Engine</SelectItem><SelectItem value="Multi-Engine">Multi-Engine</SelectItem></SelectContent></Select><FormMessage /></FormItem> )} />
               <div className="grid grid-cols-2 gap-4">
                <FormField control={form.control} name="frameHours" render={({ field }) => ( <FormItem><FormLabel>Frame Hours</FormLabel><FormControl><Input type="number" {...field} /></FormControl><FormMessage /></FormItem> )} />
                <FormField control={form.control} name="engineHours" render={({ field }) => ( <FormItem><FormLabel>Engine Hours</FormLabel><FormControl><Input type="number" {...field} /></FormControl><FormMessage /></FormItem> )} />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <FormField control={form.control} name="initialHobbs" render={({ field }) => ( <FormItem><FormLabel>Initial Hobbs</FormLabel><FormControl><Input type="number" {...field} /></FormControl><FormMessage /></FormItem> )} />
                <FormField control={form.control} name="currentHobbs" render={({ field }) => ( <FormItem><FormLabel>Current Hobbs</FormLabel><FormControl><Input type="number" {...field} /></FormControl><FormMessage /></FormItem> )} />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <FormField control={form.control} name="initialTacho" render={({ field }) => ( <FormItem><FormLabel>Initial Tacho</FormLabel><FormControl><Input type="number" {...field} /></FormControl><FormMessage /></FormItem> )} />
                <FormField control={form.control} name="currentTacho" render={({ field }) => ( <FormItem><FormLabel>Current Tacho</FormLabel><FormControl><Input type="number" {...field} /></FormControl><FormMessage /></FormItem> )} />
              </div>
              <DialogFooter>
                <Button type="button" variant="outline" onClick={handleCloseForm}>Cancel</Button>
                <Button type="submit">{editingAircraft ? 'Save Changes' : 'Create Aircraft'}</Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </>
  );
}
