
'use client';

import { useState, useEffect } from 'react';
import { useForm, useFieldArray } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { v4 as uuidv4 } from 'uuid';
import { doc, updateDoc } from 'firebase/firestore';
import { useFirestore, updateDocumentNonBlocking } from '@/firebase';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { PlusCircle, Edit, Trash2 } from 'lucide-react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import type { Aircraft, AircraftComponent } from '@/types/aircraft';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';


interface AircraftComponentsProps {
  aircraft: Aircraft;
  tenantId: string;
}

const formSchema = z.object({
  id: z.string(),
  manufacturer: z.string().optional(),
  name: z.string().min(1, 'Component name is required'),
  partNumber: z.string().min(1, 'Part number is required'),
  serialNumber: z.string().optional(),
  installHours: z.preprocess((val) => (val === "" || val === null ? undefined : val), z.number({ coerce: true }).optional().nullable()),
  maxHours: z.preprocess((val) => (val === "" || val === null ? undefined : val), z.number({ coerce: true }).optional().nullable()),
  tsn: z.preprocess((val) => (val === "" || val === null ? undefined : val), z.number({ coerce: true }).optional().nullable()),
  tso: z.preprocess((val) => (val === "" || val === null ? undefined : val), z.number({ coerce: true }).optional().nullable()),
});

type FormValues = z.infer<typeof formSchema>;

export function AircraftComponents({ aircraft, tenantId }: AircraftComponentsProps) {
  const firestore = useFirestore();
  const { toast } = useToast();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingComponent, setEditingComponent] = useState<AircraftComponent | null>(null);
  const [isDeleteConfirmOpen, setIsDeleteConfirmOpen] = useState(false);
  const [componentToDelete, setComponentToDelete] = useState<AircraftComponent | null>(null);

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
  });

  useEffect(() => {
    if (isDialogOpen) {
      if (editingComponent) {
        form.reset({
          id: editingComponent.id,
          manufacturer: editingComponent.manufacturer || '',
          name: editingComponent.name || '',
          partNumber: editingComponent.partNumber || '',
          serialNumber: editingComponent.serialNumber || '',
          installHours: editingComponent.installHours ?? '',
          maxHours: editingComponent.maxHours ?? '',
          tsn: editingComponent.tsn ?? '',
          tso: editingComponent.tso ?? '',
        });
      } else {
        form.reset({
          id: uuidv4(),
          manufacturer: '',
          name: '',
          partNumber: '',
          serialNumber: '',
          installHours: '',
          maxHours: '',
          tsn: '',
          tso: '',
        });
      }
    }
  }, [isDialogOpen, editingComponent, form]);

  const openDialog = (component: AircraftComponent | null = null) => {
    setEditingComponent(component);
    setIsDialogOpen(true);
  };

  const openDeleteDialog = (component: AircraftComponent) => {
    setComponentToDelete(component);
    setIsDeleteConfirmOpen(true);
  };

  const onSubmit = async (values: FormValues) => {
    if (!firestore) return;

    const aircraftRef = doc(firestore, 'tenants', tenantId, 'aircrafts', aircraft.id);
    
    const data: Partial<AircraftComponent> = {
      id: values.id,
      manufacturer: values.manufacturer || null,
      name: values.name,
      partNumber: values.partNumber,
      serialNumber: values.serialNumber || null,
      installHours: values.installHours,
      maxHours: values.maxHours,
      tsn: values.tsn,
      tso: values.tso,
    };
    
    const currentComponents = aircraft.components || [];
    let updatedComponents: AircraftComponent[];

    if (editingComponent) {
      // Update existing component
      updatedComponents = currentComponents.map(c => c.id === editingComponent.id ? { ...c, ...data } as AircraftComponent : c);
    } else {
      // Add new component
      updatedComponents = [...currentComponents, data as AircraftComponent];
    }
    
    await updateDocumentNonBlocking(aircraftRef, { components: updatedComponents });

    toast({
      title: editingComponent ? 'Component Updated' : 'Component Added',
      description: `The component "${values.name}" has been saved.`,
    });

    setIsDialogOpen(false);
    setEditingComponent(null);
  };
  
  const handleDelete = async () => {
    if (!firestore || !componentToDelete) return;
    const aircraftRef = doc(firestore, 'tenants', tenantId, 'aircrafts', aircraft.id);

    const updatedComponents = (aircraft.components || []).filter(c => c.id !== componentToDelete.id);
    
    await updateDocumentNonBlocking(aircraftRef, { components: updatedComponents });

    toast({
      title: 'Component Deleted',
      description: `The component "${componentToDelete.name}" has been removed.`,
    });
    
    setIsDeleteConfirmOpen(false);
    setComponentToDelete(null);
  }

  const components = aircraft.components || [];

  return (
    <>
      <div className="flex justify-end mb-4">
         <Button onClick={() => openDialog()}>
          <PlusCircle className="mr-2" />
          Add New Component
        </Button>
      </div>
      <Card>
        <CardHeader>
          <CardTitle>Tracked Components</CardTitle>
          <CardDescription>A list of all tracked components installed on this aircraft.</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Component Name</TableHead>
                <TableHead>Part No.</TableHead>
                <TableHead>Serial No.</TableHead>
                <TableHead>TSN</TableHead>
                <TableHead>TSO</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {components.length > 0 ? (
                components.map((component) => (
                  <TableRow key={component.id}>
                    <TableCell>{component.name}</TableCell>
                    <TableCell>{component.partNumber}</TableCell>
                    <TableCell>{component.serialNumber || 'N/A'}</TableCell>
                    <TableCell>{component.tsn ?? 'N/A'}</TableCell>
                    <TableCell>{component.tso ?? 'N/A'}</TableCell>
                    <TableCell className="text-right">
                       <Button variant="ghost" size="icon" className="mr-2" onClick={() => openDialog(component)}>
                         <Edit className="h-4 w-4" />
                       </Button>
                       <Button variant="ghost" size="icon" className="text-destructive" onClick={() => openDeleteDialog(component)}>
                         <Trash2 className="h-4 w-4" />
                       </Button>
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={6} className="h-24 text-center">
                    No components found.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
      
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogContent>
              <DialogHeader>
                  <DialogTitle>{editingComponent ? 'Edit Component' : 'Add New Component'}</DialogTitle>
              </DialogHeader>
              <Form {...form}>
                  <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                      <div className="grid grid-cols-2 gap-4">
                          <FormField control={form.control} name="name" render={({ field }) => ( <FormItem><FormLabel>Component Name</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem> )} />
                          <FormField control={form.control} name="partNumber" render={({ field }) => ( <FormItem><FormLabel>Part Number</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem> )} />
                          <FormField control={form.control} name="serialNumber" render={({ field }) => ( <FormItem><FormLabel>Serial Number</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem> )} />
                          <FormField control={form.control} name="manufacturer" render={({ field }) => ( <FormItem><FormLabel>Manufacturer</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem> )} />
                          <FormField control={form.control} name="installHours" render={({ field }) => ( <FormItem><FormLabel>Install Hours</FormLabel><FormControl><Input type="number" {...field} /></FormControl><FormMessage /></FormItem> )} />
                          <FormField control={form.control} name="maxHours" render={({ field }) => ( <FormItem><FormLabel>Max Hours</FormLabel><FormControl><Input type="number" {...field} /></FormControl><FormMessage /></FormItem> )} />
                          <FormField control={form.control} name="tsn" render={({ field }) => ( <FormItem><FormLabel>TSN</FormLabel><FormControl><Input type="number" {...field} /></FormControl><FormMessage /></FormItem> )} />
                          <FormField control={form.control} name="tso" render={({ field }) => ( <FormItem><FormLabel>TSO</FormLabel><FormControl><Input type="number" {...field} /></FormControl><FormMessage /></FormItem> )} />
                      </div>
                      <DialogFooter>
                          <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>Cancel</Button>
                          <Button type="submit">Save Component</Button>
                      </DialogFooter>
                  </form>
              </Form>
          </DialogContent>
      </Dialog>
      
      <AlertDialog open={isDeleteConfirmOpen} onOpenChange={setIsDeleteConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete the component
              &quot;{componentToDelete?.name}&quot;.
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
