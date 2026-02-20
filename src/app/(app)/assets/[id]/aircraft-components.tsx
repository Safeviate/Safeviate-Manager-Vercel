'use client';

import { useState, useEffect } from 'react';
import { doc, updateDoc } from 'firebase/firestore';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { v4 as uuidv4 } from 'uuid';

import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
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
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { useFirestore, updateDocumentNonBlocking } from '@/firebase';
import { useToast } from '@/hooks/use-toast';
import type { Aircraft, AircraftComponent } from '@/types/aircraft';
import { PlusCircle, Edit, Trash2 } from 'lucide-react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';

const formSchema = z.object({
  manufacturer: z.string().optional(),
  name: z.string().min(1, 'Component name is required.'),
  partNumber: z.string().min(1, 'Part number is required.'),
  serialNumber: z.string().optional(),
  installHours: z.number({ coerce: true }).optional(),
  maxHours: z.number({ coerce: true }).optional(),
  tsn: z.number({ coerce: true }).optional(),
  tso: z.number({ coerce: true }).optional(),
});

type FormValues = z.infer<typeof formSchema>;

interface AircraftComponentsProps {
  aircraft: Aircraft;
  tenantId: string;
}

export function AircraftComponents({ aircraft, tenantId }: AircraftComponentsProps) {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [editingComponent, setEditingComponent] = useState<AircraftComponent | null>(null);
  const [componentToDelete, setComponentToDelete] = useState<AircraftComponent | null>(null);
  
  const firestore = useFirestore();
  const { toast } = useToast();

  const components = aircraft.components || [];

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
  });

  const openAddDialog = () => {
    setEditingComponent(null);
    form.reset({
      manufacturer: '', name: '', partNumber: '', serialNumber: '',
      installHours: undefined, maxHours: undefined, tsn: undefined, tso: undefined,
    });
    setIsDialogOpen(true);
  };

  const openEditDialog = (component: AircraftComponent) => {
    setEditingComponent(component);
    form.reset({
      manufacturer: component.manufacturer ?? '',
      name: component.name ?? '',
      partNumber: component.partNumber ?? '',
      serialNumber: component.serialNumber ?? '',
      installHours: component.installHours ?? undefined,
      maxHours: component.maxHours ?? undefined,
      tsn: component.tsn ?? undefined,
      tso: component.tso ?? undefined,
    });
    setIsDialogOpen(true);
  };
  
  const openDeleteDialog = (component: AircraftComponent) => {
    setComponentToDelete(component);
    setIsDeleteDialogOpen(true);
  }

  const handleUpdateComponents = (updatedComponents: AircraftComponent[]) => {
    if (!firestore || !aircraft) return;
    const aircraftRef = doc(firestore, 'tenants', tenantId, 'aircrafts', aircraft.id);
    updateDocumentNonBlocking(aircraftRef, { components: updatedComponents });
    toast({ title: 'Components Updated' });
  };
  
  const handleDeleteComponent = () => {
    if (!componentToDelete) return;
    const updatedComponents = components.filter(c => c.id !== componentToDelete.id);
    handleUpdateComponents(updatedComponents);
    setIsDeleteDialogOpen(false);
    setComponentToDelete(null);
  };


  const onSubmit = async (values: FormValues) => {
    if (!firestore || !aircraft) {
        toast({
            variant: "destructive",
            title: "Error",
            description: "Aircraft data is not available. Cannot save component.",
        });
        return;
    }

    const data: Partial<AircraftComponent> = {
      manufacturer: values.manufacturer || null,
      name: values.name,
      partNumber: values.partNumber,
      serialNumber: values.serialNumber || null,
      installHours: values.installHours || null,
      maxHours: values.maxHours || null,
      tsn: values.tsn || null,
      tso: values.tso || null,
    };

    let updatedComponents: AircraftComponent[];

    if (editingComponent) {
      updatedComponents = components.map(c =>
        c.id === editingComponent.id ? { ...c, ...data } : c
      );
    } else {
      updatedComponents = [...components, { ...data, id: uuidv4() } as AircraftComponent];
    }
    
    handleUpdateComponents(updatedComponents);
    setIsDialogOpen(false);
  };

  return (
    <>
      <div className="flex justify-end">
        <Button onClick={openAddDialog}>
          <PlusCircle className="mr-2 h-4 w-4" />
          Add Component
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
                <TableHead>Component</TableHead>
                <TableHead>Part No.</TableHead>
                <TableHead>Serial No.</TableHead>
                <TableHead>TSN</TableHead>
                <TableHead>TSO</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {components.map((component) => (
                <TableRow key={component.id}>
                  <TableCell>{component.name}</TableCell>
                  <TableCell>{component.partNumber}</TableCell>
                  <TableCell>{component.serialNumber ?? 'N/A'}</TableCell>
                  <TableCell>{component.tsn ?? 'N/A'}</TableCell>
                  <TableCell>{component.tso ?? 'N/A'}</TableCell>
                  <TableCell className="text-right">
                    <Button variant="ghost" size="icon" onClick={() => openEditDialog(component)} className="mr-2">
                        <Edit className="h-4 w-4" />
                    </Button>
                     <Button variant="ghost" size="icon" onClick={() => openDeleteDialog(component)}>
                        <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
               {components.length === 0 && (
                <TableRow>
                    <TableCell colSpan={6} className="h-24 text-center">
                        No components tracked for this aircraft.
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
            <DialogTitle>{editingComponent ? 'Edit' : 'Add'} Component</DialogTitle>
          </DialogHeader>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                    <FormField control={form.control} name="name" render={({ field }) => ( <FormItem><FormLabel>Component Name</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem> )} />
                    <FormField control={form.control} name="manufacturer" render={({ field }) => ( <FormItem><FormLabel>Manufacturer</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem> )} />
                    <FormField control={form.control} name="partNumber" render={({ field }) => ( <FormItem><FormLabel>Part Number</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem> )} />
                    <FormField control={form.control} name="serialNumber" render={({ field }) => ( <FormItem><FormLabel>Serial Number</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem> )} />
                    <FormField control={form.control} name="installHours" render={({ field }) => ( <FormItem><FormLabel>Install Hours</FormLabel><FormControl><Input type="number" {...field} /></FormControl><FormMessage /></FormItem> )} />
                    <FormField control={form.control} name="maxHours" render={({ field }) => ( <FormItem><FormLabel>Max Hours</FormLabel><FormControl><Input type="number" {...field} /></FormControl><FormMessage /></FormItem> )} />
                    <FormField control={form.control} name="tsn" render={({ field }) => ( <FormItem><FormLabel>Time Since New (TSN)</FormLabel><FormControl><Input type="number" {...field} /></FormControl><FormMessage /></FormItem> )} />
                    <FormField control={form.control} name="tso" render={({ field }) => ( <FormItem><FormLabel>Time Since Overhaul (TSO)</FormLabel><FormControl><Input type="number" {...field} /></FormControl><FormMessage /></FormItem> )} />
                </div>
                <DialogFooter>
                    <DialogClose asChild>
                        <Button type="button" variant="outline">Cancel</Button>
                    </DialogClose>
                    <Button type="submit">{editingComponent ? 'Save Changes' : 'Add Component'}</Button>
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
                    This will permanently delete the component &quot;{componentToDelete?.name}&quot;.
                </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction onClick={handleDeleteComponent} className='bg-destructive text-destructive-foreground hover:bg-destructive/90'>
                    Delete
                </AlertDialogAction>
            </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
