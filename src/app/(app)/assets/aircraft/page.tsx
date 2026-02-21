'use client';

import { useState, useMemo } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { collection, doc, query, writeBatch } from 'firebase/firestore';
import { useCollection, useFirestore, useMemoFirebase, updateDocumentNonBlocking, deleteDocumentNonBlocking } from '@/firebase';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { PlusCircle, Edit, Trash2 } from 'lucide-react';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { MoreHorizontal } from 'lucide-react';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import type { Aircraft } from '@/types/aircraft';
import { usePermissions } from '@/hooks/use-permissions';

// --- Zod Schema for Form Validation ---
const formSchema = z.object({
  make: z.string().min(1, 'Make is required'),
  model: z.string().min(1, 'Model is required'),
  tailNumber: z.string().min(1, 'Tail number is required'),
  initialHobbs: z.number({ coerce: true }).optional(),
  currentHobbs: z.number({ coerce: true }).optional(),
  initialTacho: z.number({ coerce: true }).optional(),
  currentTacho: z.number({ coerce: true }).optional(),
  tachoAtNext50Inspection: z.number({ coerce: true }).optional(),
  tachoAtNext100Inspection: z.number({ coerce: true }).optional(),
});
type FormValues = z.infer<typeof formSchema>;

const defaultValues: Partial<FormValues> = {
  make: '',
  model: '',
  tailNumber: '',
  initialHobbs: 0,
  currentHobbs: 0,
  initialTacho: 0,
  currentTacho: 0,
  tachoAtNext50Inspection: 0,
  tachoAtNext100Inspection: 0,
};

const mapAircraftToForm = (aircraft: Aircraft): FormValues => ({
  make: aircraft.make,
  model: aircraft.model,
  tailNumber: aircraft.tailNumber,
  initialHobbs: aircraft.initialHobbs || 0,
  currentHobbs: aircraft.currentHobbs || 0,
  initialTacho: aircraft.initialTacho || 0,
  currentTacho: aircraft.currentTacho || 0,
  tachoAtNext50Inspection: aircraft.tachoAtNext50Inspection || 0,
  tachoAtNext100Inspection: aircraft.tachoAtNext100Inspection || 0,
});


// --- Reusable Form Component (internal to this page) ---
interface AircraftFormProps {
    editingAircraft: Aircraft | null;
    onFinished: () => void;
}
function AircraftForm({ editingAircraft, onFinished }: AircraftFormProps) {
    const firestore = useFirestore();
    const { toast } = useToast();
    const [isSubmitting, setIsSubmitting] = useState(false);

    const form = useForm<FormValues>({
        resolver: zodResolver(formSchema),
        defaultValues: editingAircraft ? mapAircraftToForm(editingAircraft) : defaultValues,
    });

    const onSubmit = async (values: FormValues) => {
        if (!firestore) return;
        setIsSubmitting(true);

        const collectionRef = collection(firestore, 'tenants/safeviate/aircrafts');

        try {
            if (editingAircraft) {
                const docRef = doc(collectionRef, editingAircraft.id);
                await updateDocumentNonBlocking(docRef, values);
                toast({ title: 'Aircraft Updated', description: `Details for ${values.tailNumber} have been saved.` });
            } else {
                const newDocRef = doc(collectionRef);
                const batch = writeBatch(firestore);
                batch.set(newDocRef, { ...values, id: newDocRef.id });
                await batch.commit();
                toast({ title: 'Aircraft Created', description: `${values.tailNumber} has been added to the fleet.` });
            }
            onFinished();
        } catch (e: any) {
            console.error(e);
            toast({ variant: 'destructive', title: 'Error saving aircraft', description: e.message });
        } finally {
            setIsSubmitting(false);
        }
    };
    
    return (
        <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <FormField control={form.control} name="make" render={({ field }) => ( <FormItem><FormLabel>Make</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem> )} />
                    <FormField control={form.control} name="model" render={({ field }) => ( <FormItem><FormLabel>Model</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem> )} />
                </div>
                <FormField control={form.control} name="tailNumber" render={({ field }) => ( <FormItem><FormLabel>Tail Number</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem> )} />
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <FormField control={form.control} name="initialHobbs" render={({ field }) => ( <FormItem><FormLabel>Initial Hobbs</FormLabel><FormControl><Input type="number" {...field} /></FormControl><FormMessage /></FormItem> )} />
                    <FormField control={form.control} name="currentHobbs" render={({ field }) => ( <FormItem><FormLabel>Current Hobbs</FormLabel><FormControl><Input type="number" {...field} /></FormControl><FormMessage /></FormItem> )} />
                    <FormField control={form.control} name="initialTacho" render={({ field }) => ( <FormItem><FormLabel>Initial Tacho</FormLabel><FormControl><Input type="number" {...field} /></FormControl><FormMessage /></FormItem> )} />
                    <FormField control={form.control} name="currentTacho" render={({ field }) => ( <FormItem><FormLabel>Current Tacho</FormLabel><FormControl><Input type="number" {...field} /></FormControl><FormMessage /></FormItem> )} />
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <FormField control={form.control} name="tachoAtNext50Inspection" render={({ field }) => ( <FormItem><FormLabel>Tacho at Next 50hr</FormLabel><FormControl><Input type="number" {...field} /></FormControl><FormMessage /></FormItem> )} />
                    <FormField control={form.control} name="tachoAtNext100Inspection" render={({ field }) => ( <FormItem><FormLabel>Tacho at Next 100hr</FormLabel><FormControl><Input type="number" {...field} /></FormControl><FormMessage /></FormItem> )} />
                </div>

                <DialogFooter>
                    <Button type="button" variant="outline" onClick={onFinished} disabled={isSubmitting}>Cancel</Button>
                    <Button type="submit" disabled={isSubmitting}>
                        {isSubmitting ? 'Saving...' : 'Save Aircraft'}
                    </Button>
                </DialogFooter>
            </form>
        </Form>
    );
}

// --- Main Page Component ---
export default function AssetsPage() {
  const firestore = useFirestore();
  const { hasPermission } = usePermissions();
  const { toast } = useToast();
  
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingAircraft, setEditingAircraft] = useState<Aircraft | null>(null);
  const [deletingAircraft, setDeletingAircraft] = useState<Aircraft | null>(null);

  const canCreate = hasPermission('assets-create');
  const canEdit = hasPermission('assets-edit');
  const canDelete = hasPermission('assets-delete');

  const aircraftsQuery = useMemoFirebase(
    () => (firestore ? query(collection(firestore, "tenants/safeviate/aircrafts")) : null),
    [firestore]
  );
  const { data: aircrafts, isLoading, error } = useCollection<Aircraft>(aircraftsQuery);

  const handleCreate = () => {
    setEditingAircraft(null);
    setIsFormOpen(true);
  };

  const handleEdit = (aircraft: Aircraft) => {
    setEditingAircraft(aircraft);
    setIsFormOpen(true);
  };

  const handleDelete = async () => {
    if (!firestore || !deletingAircraft) return;
    const docRef = doc(firestore, 'tenants/safeviate/aircrafts', deletingAircraft.id);
    await deleteDocumentNonBlocking(docRef);
    toast({ title: 'Aircraft Deleted', description: `${deletingAircraft.tailNumber} has been removed from the fleet.` });
    setDeletingAircraft(null);
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Aircraft Fleet</h1>
          <p className="text-muted-foreground">Manage all aircraft in your organization.</p>
        </div>
        {canCreate && (
            <Button onClick={handleCreate}>
                <PlusCircle className="mr-2 h-4 w-4" />
                Create Aircraft
            </Button>
        )}
      </div>

      <div className="border rounded-lg">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Tail Number</TableHead>
              <TableHead>Make</TableHead>
              <TableHead>Model</TableHead>
              <TableHead>Current Hobbs</TableHead>
              <TableHead>Current Tacho</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading && (
              <TableRow>
                <TableCell colSpan={6} className="h-24 text-center">
                  <Skeleton className="h-4 w-1/4 mx-auto" />
                </TableCell>
              </TableRow>
            )}
            {error && (
              <TableRow>
                <TableCell colSpan={6} className="h-24 text-center text-destructive">
                  Error loading aircraft: {error.message}
                </TableCell>
              </TableRow>
            )}
            {!isLoading && aircrafts?.length === 0 && (
              <TableRow>
                <TableCell colSpan={6} className="h-24 text-center">
                  No aircraft found.
                </TableCell>
              </TableRow>
            )}
            {aircrafts?.map((aircraft) => (
              <TableRow key={aircraft.id}>
                <TableCell className="font-medium">{aircraft.tailNumber}</TableCell>
                <TableCell>{aircraft.make}</TableCell>
                <TableCell>{aircraft.model}</TableCell>
                <TableCell>{aircraft.currentHobbs?.toFixed(1) ?? 'N/A'}</TableCell>
                <TableCell>{aircraft.currentTacho?.toFixed(1) ?? 'N/A'}</TableCell>
                <TableCell className="text-right">
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" className="h-8 w-8 p-0" disabled={!canEdit && !canDelete}>
                        <span className="sr-only">Open menu</span>
                        <MoreHorizontal className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      {canEdit && <DropdownMenuItem onSelect={() => handleEdit(aircraft)}><Edit className="mr-2 h-4 w-4"/>Edit</DropdownMenuItem>}
                      {canDelete && <DropdownMenuItem onSelect={() => setDeletingAircraft(aircraft)} className="text-destructive"><Trash2 className="mr-2 h-4 w-4" />Delete</DropdownMenuItem>}
                    </DropdownMenuContent>
                  </DropdownMenu>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
        <DialogContent key={editingAircraft?.id || 'new-aircraft'}>
            <DialogHeader>
                <DialogTitle>{editingAircraft ? `Edit ${editingAircraft.tailNumber}` : 'Create New Aircraft'}</DialogTitle>
                <DialogDescription>
                    {editingAircraft ? 'Update the details for this aircraft.' : 'Fill out the form to add a new aircraft to the fleet.'}
                </DialogDescription>
            </DialogHeader>
            <AircraftForm 
                editingAircraft={editingAircraft} 
                onFinished={() => setIsFormOpen(false)}
            />
        </DialogContent>
      </Dialog>
      
      <AlertDialog open={!!deletingAircraft} onOpenChange={(open) => !open && setDeletingAircraft(null)}>
        <AlertDialogContent>
            <AlertDialogHeader>
                <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                <AlertDialogDescription>
                    This action cannot be undone. This will permanently delete the aircraft &quot;{deletingAircraft?.tailNumber}&quot;.
                </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
                <AlertDialogCancel onClick={() => setDeletingAircraft(null)}>Cancel</AlertDialogCancel>
                <AlertDialogAction onClick={handleDelete}>Delete</AlertDialogAction>
            </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
