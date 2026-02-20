
'use client';

import { useState, useCallback, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useFirestore, updateDocumentNonBlocking } from '@/firebase';
import { doc } from 'firebase/firestore';
import { useToast } from '@/hooks/use-toast';
import { v4 as uuidv4 } from 'uuid';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
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
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
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
import { PlusCircle, Edit, Trash2 } from 'lucide-react';
import type { Aircraft, AircraftComponent } from '@/types/aircraft';

// --- Zod Schema for Validation ---
const componentFormSchema = z.object({
  id: z.string().optional(),
  manufacturer: z.string().optional(),
  name: z.string().optional(),
  partNumber: z.string().optional(),
  serialNumber: z.string().optional(),
  installHours: z.preprocess(
    (a) => (a === '' || a === null ? undefined : parseFloat(String(a))),
    z.number({ invalid_type_error: "Must be a number" }).optional()
  ),
  maxHours: z.preprocess(
    (a) => (a === '' || a === null ? undefined : parseFloat(String(a))),
    z.number({ invalid_type_error: "Must be a number" }).optional()
  ),
  tsn: z.preprocess(
    (a) => (a === '' || a === null ? undefined : parseFloat(String(a))),
    z.number({ invalid_type_error: "Must be a number" }).optional()
  ),
  tso: z.preprocess(
    (a) => (a === '' || a === null ? undefined : parseFloat(String(a))),
    z.number({ invalid_type_error: "Must be a number" }).optional()
  ),
});

type FormValues = z.infer<typeof componentFormSchema>;

interface AircraftComponentsProps {
  aircraft: Aircraft;
  tenantId: string;
  onUpdate: () => void;
}

export function AircraftComponents({ aircraft, tenantId, onUpdate }: AircraftComponentsProps) {
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isDeleteConfirmOpen, setIsDeleteConfirmOpen] = useState(false);
  const [editingComponent, setEditingComponent] = useState<AircraftComponent | null>(null);
  const [componentToDelete, setComponentToDelete] = useState<AircraftComponent | null>(null);
  
  const firestore = useFirestore();
  const { toast } = useToast();

  const form = useForm<FormValues>({
    resolver: zodResolver(componentFormSchema),
  });

  useEffect(() => {
    if (isFormOpen) {
      const defaultValues = editingComponent
        ? {
            ...editingComponent,
            installHours: editingComponent.installHours ?? '',
            maxHours: editingComponent.maxHours ?? '',
            tsn: editingComponent.tsn ?? '',
            tso: editingComponent.tso ?? '',
          }
        : {
            id: uuidv4(),
            manufacturer: '',
            name: '',
            partNumber: '',
            serialNumber: '',
            installHours: '',
            maxHours: '',
            tsn: '',
            tso: '',
          };
      form.reset(defaultValues as any);
    }
  }, [isFormOpen, editingComponent, form]);

  const openFormForNew = () => {
    setEditingComponent(null);
    setIsFormOpen(true);
  };

  const openFormForEdit = (component: AircraftComponent) => {
    setEditingComponent(component);
    setIsFormOpen(true);
  };
  
  const openDeleteConfirmation = (component: AircraftComponent) => {
    setComponentToDelete(component);
    setIsDeleteConfirmOpen(true);
  };

  const onSubmit = useCallback(async (values: FormValues) => {
    if (!aircraft || !aircraft.id) {
        toast({
            variant: "destructive",
            title: "Fatal Error",
            description: "Aircraft data is missing. Cannot save component.",
        });
        return;
    }

    if (!firestore) return;

    const currentComponents = aircraft.components || [];
    const isEditing = !!editingComponent;
    
    let updatedComponents: AircraftComponent[];

    const componentData: AircraftComponent = {
      id: values.id || uuidv4(),
      name: values.name || '',
      partNumber: values.partNumber || '',
      manufacturer: values.manufacturer || '',
      serialNumber: values.serialNumber || undefined,
      installHours: values.installHours ?? undefined,
      maxHours: values.maxHours ?? undefined,
      tsn: values.tsn ?? undefined,
      tso: values.tso ?? undefined,
    };
    
    if (isEditing) {
      updatedComponents = currentComponents.map(c => c.id === componentData.id ? componentData : c);
    } else {
      updatedComponents = [...currentComponents, componentData];
    }
    
    const aircraftRef = doc(firestore, 'tenants', tenantId, 'aircrafts', aircraft.id);
    
    updateDocumentNonBlocking(aircraftRef, { components: updatedComponents });

    toast({
        title: isEditing ? "Component Updated" : "Component Added",
        description: `The component "${componentData.name}" has been saved.`,
    });

    onUpdate();
    setIsFormOpen(false);

  }, [firestore, tenantId, aircraft, editingComponent, onUpdate, toast]);
  
  const handleDelete = () => {
    if (!componentToDelete || !aircraft || !aircraft.id) return;

    const updatedComponents = (aircraft.components || []).filter(c => c.id !== componentToDelete.id);
    const aircraftRef = doc(firestore, 'tenants', tenantId, 'aircrafts', aircraft.id);

    updateDocumentNonBlocking(aircraftRef, { components: updatedComponents });

    toast({
        title: 'Component Deleted',
        description: `The component "${componentToDelete.name}" has been removed.`,
    });
    
    onUpdate();
    setIsDeleteConfirmOpen(false);
    setComponentToDelete(null);
  };


  return (
    <>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle>Tracked Components</CardTitle>
            <CardDescription>A list of all trackable components installed on this aircraft.</CardDescription>
          </div>
          <Button onClick={openFormForNew}>
            <PlusCircle className="mr-2 h-4 w-4" /> Add New Component
          </Button>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Manufacturer</TableHead>
                <TableHead>Component</TableHead>
                <TableHead>Part No.</TableHead>
                <TableHead>Serial No.</TableHead>
                <TableHead>Install Hrs</TableHead>
                <TableHead>Max Hrs</TableHead>
                <TableHead>TSN</TableHead>
                <TableHead>TSO</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {(aircraft.components || []).length > 0 ? (
                aircraft.components?.map(component => (
                  <TableRow key={component.id}>
                    <TableCell>{component.manufacturer || 'N/A'}</TableCell>
                    <TableCell className="font-medium">{component.name}</TableCell>
                    <TableCell>{component.partNumber}</TableCell>
                    <TableCell>{component.serialNumber || 'N/A'}</TableCell>
                    <TableCell>{component.installHours || 'N/A'}</TableCell>
                    <TableCell>{component.maxHours || 'N/A'}</TableCell>
                    <TableCell>{component.tsn || 'N/A'}</TableCell>
                    <TableCell>{component.tso || 'N/A'}</TableCell>
                    <TableCell className="text-right">
                      <Button variant="ghost" size="icon" onClick={() => openFormForEdit(component)}><Edit className="h-4 w-4" /></Button>
                      <Button variant="ghost" size="icon" onClick={() => openDeleteConfirmation(component)}><Trash2 className="h-4 w-4 text-destructive" /></Button>
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={9} className="h-24 text-center">No components added yet.</TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingComponent ? 'Edit Component' : 'Add New Component'}</DialogTitle>
          </DialogHeader>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormField control={form.control} name="manufacturer" render={({ field }) => ( <FormItem><FormLabel>Manufacturer</FormLabel><FormControl><Input placeholder="e.g., Lycoming" {...field} value={field.value ?? ''} /></FormControl><FormMessage /></FormItem> )} />
              <FormField control={form.control} name="name" render={({ field }) => ( <FormItem><FormLabel>Component Name</FormLabel><FormControl><Input placeholder="e.g., Engine" {...field} value={field.value ?? ''} /></FormControl><FormMessage /></FormItem> )} />
              <FormField control={form.control} name="partNumber" render={({ field }) => ( <FormItem><FormLabel>Part Number</FormLabel><FormControl><Input placeholder="e.g., O-360-A4M" {...field} value={field.value ?? ''} /></FormControl><FormMessage /></FormItem> )} />
              <FormField control={form.control} name="serialNumber" render={({ field }) => ( <FormItem><FormLabel>Serial Number</FormLabel><FormControl><Input placeholder="e.g., L-12345-51A" {...field} value={field.value ?? ''} /></FormControl><FormMessage /></FormItem> )} />
              <div className="grid grid-cols-2 gap-4">
                <FormField control={form.control} name="installHours" render={({ field }) => ( <FormItem><FormLabel>Install Hours</FormLabel><FormControl><Input type="number" {...field} value={field.value ?? ''} /></FormControl><FormMessage /></FormItem> )} />
                <FormField control={form.control} name="maxHours" render={({ field }) => ( <FormItem><FormLabel>Max Hours</FormLabel><FormControl><Input type="number" {...field} value={field.value ?? ''} /></FormControl><FormMessage /></FormItem> )} />
                <FormField control={form.control} name="tsn" render={({ field }) => ( <FormItem><FormLabel>TSN</FormLabel><FormControl><Input type="number" {...field} value={field.value ?? ''} /></FormControl><FormMessage /></FormItem> )} />
                <FormField control={form.control} name="tso" render={({ field }) => ( <FormItem><FormLabel>TSO</FormLabel><FormControl><Input type="number" {...field} value={field.value ?? ''} /></FormControl><FormMessage /></FormItem> )} />
              </div>
              <DialogFooter>
                <DialogClose asChild><Button type="button" variant="outline">Cancel</Button></DialogClose>
                <Button type="submit">{editingComponent ? 'Save Changes' : 'Add Component'}</Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
      
       <AlertDialog open={isDeleteConfirmOpen} onOpenChange={setIsDeleteConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete the component &quot;{componentToDelete?.name}&quot;.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive hover:bg-destructive/90">Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

