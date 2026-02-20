
'use client';

import { useState, useMemo, useCallback } from 'react';
import { doc, updateDoc } from 'firebase/firestore';
import { useFirestore, updateDocumentNonBlocking } from '@/firebase';
import { useToast } from '@/hooks/use-toast';
import { useFieldArray, useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { v4 as uuidv4 } from 'uuid';

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogClose,
} from '@/components/ui/dialog';
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { PlusCircle, Trash2 } from 'lucide-react';
import type { Aircraft, AircraftComponent } from '@/types/aircraft';

// Zod schema for validation
const componentFormSchema = z.object({
  id: z.string(),
  name: z.string().optional(),
  manufacturer: z.string().optional(),
  partNumber: z.string().optional(),
  serialNumber: z.string().optional(),
  installHours: z.preprocess(
    (val) => (val === '' ? undefined : val),
    z.number({ coerce: true }).optional()
  ),
  maxHours: z.preprocess(
    (val) => (val === '' ? undefined : val),
    z.number({ coerce: true }).optional()
  ),
  tsn: z.preprocess(
    (val) => (val === '' ? undefined : val),
    z.number({ coerce: true }).optional()
  ),
  tso: z.preprocess(
    (val) => (val === '' ? undefined : val),
    z.number({ coerce: true }).optional()
  ),
});

type FormValues = z.infer<typeof componentFormSchema>;

interface AircraftComponentsProps {
  aircraftId: string;
  components: AircraftComponent[];
}

export function AircraftComponents({ aircraftId, components }: AircraftComponentsProps) {
  const firestore = useFirestore();
  const { toast } = useToast();
  const tenantId = 'safeviate';

  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [componentToDelete, setComponentToDelete] = useState<AircraftComponent | null>(null);
  const [editingComponent, setEditingComponent] = useState<AircraftComponent | null>(null);

  const form = useForm<FormValues>({
    resolver: zodResolver(componentFormSchema),
    defaultValues: {
      id: '',
      name: '',
      manufacturer: '',
      partNumber: '',
      serialNumber: '',
      installHours: '',
      maxHours: '',
      tsn: '',
      tso: '',
    },
  });

  const handleAddNew = () => {
    setEditingComponent(null);
    form.reset({
      id: uuidv4(),
      name: '',
      manufacturer: '',
      partNumber: '',
      serialNumber: '',
      installHours: '',
      maxHours: '',
      tsn: '',
      tso: '',
    });
    setIsDialogOpen(true);
  };

  const handleEdit = (component: AircraftComponent) => {
    setEditingComponent(component);
    form.reset({
      id: component.id,
      name: component.name,
      manufacturer: component.manufacturer || '',
      partNumber: component.partNumber,
      serialNumber: component.serialNumber || '',
      installHours: component.installHours ?? '',
      maxHours: component.maxHours ?? '',
      tsn: component.tsn ?? '',
      tso: component.tso ?? '',
    });
    setIsDialogOpen(true);
  };

  const handleDeleteClick = (component: AircraftComponent) => {
    setComponentToDelete(component);
    setIsDeleteDialogOpen(true);
  };

  const handleDeleteConfirm = useCallback(async () => {
    if (!firestore || !componentToDelete) return;
    const aircraftRef = doc(firestore, 'tenants', tenantId, 'aircrafts', aircraftId);
    const updatedComponents = components.filter((c) => c.id !== componentToDelete.id);
    await updateDocumentNonBlocking(aircraftRef, { components: updatedComponents });
    toast({
      title: 'Component Deleted',
      description: `Component "${componentToDelete.name}" has been deleted.`,
    });
    setIsDeleteDialogOpen(false);
    setComponentToDelete(null);
  }, [firestore, tenantId, aircraftId, components, componentToDelete, toast]);

  const onSubmit = useCallback(async (values: FormValues) => {
    if (!firestore) return;
    const aircraftRef = doc(firestore, 'tenants', tenantId, 'aircrafts', aircraftId);
    
    const data: Partial<AircraftComponent> = {
      id: values.id,
      name: values.name || '',
      manufacturer: values.manufacturer || '',
      partNumber: values.partNumber || '',
      serialNumber: values.serialNumber || '',
      installHours: values.installHours,
      maxHours: values.maxHours,
      tsn: values.tsn,
      tso: values.tso,
    };

    let updatedComponents: AircraftComponent[];
    if (editingComponent) {
      // Editing existing
      updatedComponents = components.map((c) => (c.id === editingComponent.id ? { ...c, ...data } : c));
    } else {
      // Adding new
      updatedComponents = [...components, data as AircraftComponent];
    }
    
    await updateDocumentNonBlocking(aircraftRef, { components: updatedComponents });
    toast({
      title: editingComponent ? 'Component Updated' : 'Component Added',
      description: `Component "${data.name}" has been saved.`,
    });
    
    setIsDialogOpen(false);
    setEditingComponent(null);
  }, [firestore, tenantId, aircraftId, components, editingComponent, toast]);

  return (
    <>
      <div className="flex justify-end mb-4">
        <Button onClick={handleAddNew}>
          <PlusCircle className="mr-2" /> Add New Component
        </Button>
      </div>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Component Name</TableHead>
            <TableHead>Manufacturer</TableHead>
            <TableHead>Part No.</TableHead>
            <TableHead>Serial No.</TableHead>
            <TableHead>Install Hours</TableHead>
            <TableHead>Max Hours</TableHead>
            <TableHead>TSN</TableHead>
            <TableHead>TSO</TableHead>
            <TableHead className="text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {(components || []).map((component) => (
            <TableRow key={component.id}>
              <TableCell>{component.name}</TableCell>
              <TableCell>{component.manufacturer}</TableCell>
              <TableCell>{component.partNumber}</TableCell>
              <TableCell>{component.serialNumber}</TableCell>
              <TableCell>{component.installHours}</TableCell>
              <TableCell>{component.maxHours}</TableCell>
              <TableCell>{component.tsn}</TableCell>
              <TableCell>{component.tso}</TableCell>
              <TableCell className="text-right">
                <Button variant="ghost" size="sm" onClick={() => handleEdit(component)}>Edit</Button>
                <Button variant="ghost" size="sm" className="text-destructive" onClick={() => handleDeleteClick(component)}>Delete</Button>
              </TableCell>
            </TableRow>
          ))}
          {(components?.length === 0) && (
            <TableRow>
                <TableCell colSpan={9} className="h-24 text-center">No components added yet.</TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
      
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingComponent ? 'Edit Component' : 'Add New Component'}</DialogTitle>
            <DialogDescription>
              Fill in the details for the aircraft component.
            </DialogDescription>
          </DialogHeader>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormField control={form.control} name="name" render={({ field }) => ( <FormItem><FormLabel>Component Name</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem> )} />
              <FormField control={form.control} name="manufacturer" render={({ field }) => ( <FormItem><FormLabel>Manufacturer</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem> )} />
              <FormField control={form.control} name="partNumber" render={({ field }) => ( <FormItem><FormLabel>Part Number</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem> )} />
              <FormField control={form.control} name="serialNumber" render={({ field }) => ( <FormItem><FormLabel>Serial Number</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem> )} />
              <div className="grid grid-cols-2 gap-4">
                <FormField control={form.control} name="installHours" render={({ field }) => ( <FormItem><FormLabel>Install Hours</FormLabel><FormControl><Input type="number" {...field} /></FormControl><FormMessage /></FormItem> )} />
                <FormField control={form.control} name="maxHours" render={({ field }) => ( <FormItem><FormLabel>Max Hours</FormLabel><FormControl><Input type="number" {...field} /></FormControl><FormMessage /></FormItem> )} />
                <FormField control={form.control} name="tsn" render={({ field }) => ( <FormItem><FormLabel>TSN</FormLabel><FormControl><Input type="number" {...field} /></FormControl><FormMessage /></FormItem> )} />
                <FormField control={form.control} name="tso" render={({ field }) => ( <FormItem><FormLabel>TSO</FormLabel><FormControl><Input type="number" {...field} /></FormControl><FormMessage /></FormItem> )} />
              </div>
              <DialogFooter>
                <DialogClose asChild><Button type="button" variant="outline">Cancel</Button></DialogClose>
                <Button type="submit">Save Component</Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
      
      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete the component &quot;{componentToDelete?.name}&quot;.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteConfirm}>Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
