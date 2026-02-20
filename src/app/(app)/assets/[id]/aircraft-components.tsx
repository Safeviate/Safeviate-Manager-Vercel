
'use client';

import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { doc, collection, addDoc } from 'firebase/firestore';
import { useFirestore, updateDocumentNonBlocking, addDocumentNonBlocking } from '@/firebase';
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
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import { PlusCircle, Edit, Trash2 } from 'lucide-react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
    AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import type { Aircraft, AircraftComponent } from '@/types/aircraft';

interface AircraftComponentsProps {
  aircraft: Aircraft;
  tenantId: string;
}

const formSchema = z.object({
  name: z.string().min(1, 'Component name is required.'),
  manufacturer: z.string().optional(),
  partNumber: z.string().min(1, 'Part number is required.'),
  serialNumber: z.string().optional(),
  installHours: z.number({ coerce: true }).optional(),
  maxHours: z.number({ coerce: true }).optional(),
  tsn: z.number({ coerce: true }).optional(),
  tso: z.number({ coerce: true }).optional(),
});

type FormValues = z.infer<typeof formSchema>;

export function AircraftComponents({ aircraft, tenantId }: AircraftComponentsProps) {
  const firestore = useFirestore();
  const { toast } = useToast();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingComponentId, setEditingComponentId] = useState<string | null>(null);
  const [componentToDelete, setComponentToDelete] = useState<AircraftComponent | null>(null);
  const [components, setComponents] = useState<AircraftComponent[]>([]);
  
  useEffect(() => {
    setComponents(aircraft.components || []);
  }, [aircraft.components]);

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: '',
      manufacturer: '',
      partNumber: '',
      serialNumber: '',
      installHours: undefined,
      maxHours: undefined,
      tsn: undefined,
      tso: undefined,
    },
  });

  const onAddNew = () => {
    form.reset();
    setEditingComponentId(null);
    setIsDialogOpen(true);
  };
  
  const onEdit = (component: AircraftComponent) => {
    form.reset({
      name: component.name,
      manufacturer: component.manufacturer ?? '',
      partNumber: component.partNumber,
      serialNumber: component.serialNumber ?? '',
      installHours: component.installHours ?? undefined,
      maxHours: component.maxHours ?? undefined,
      tsn: component.tsn ?? undefined,
      tso: component.tso ?? undefined,
    });
    setEditingComponentId(component.id);
    setIsDialogOpen(true);
  };

  const onSubmit = async (values: FormValues) => {
    if (!firestore) return;
    const aircraftRef = doc(firestore, 'tenants', tenantId, 'aircrafts', aircraft.id);

    const data: Partial<AircraftComponent> = {
      name: values.name,
      manufacturer: values.manufacturer || null,
      partNumber: values.partNumber,
      serialNumber: values.serialNumber || null,
      installHours: values.installHours || null,
      maxHours: values.maxHours || null,
      tsn: values.tsn || null,
      tso: values.tso || null,
    };

    let updatedComponents;

    if (editingComponentId) {
      // Update existing component
      updatedComponents = components.map(c => 
        c.id === editingComponentId ? { ...c, ...data } : c
      );
      toast({ title: 'Component Updated', description: `Component "${values.name}" has been updated.` });
    } else {
      // Add new component
      const newComponent: AircraftComponent = {
        ...data,
        id: new Date().getTime().toString(), // Simple unique ID for local state
      } as AircraftComponent;
      updatedComponents = [...components, newComponent];
      toast({ title: 'Component Added', description: `Component "${values.name}" has been added.` });
    }

    setComponents(updatedComponents);
    updateDocumentNonBlocking(aircraftRef, { components: updatedComponents });
    setIsDialogOpen(false);
  };
  
  const handleDelete = () => {
    if (!firestore || !componentToDelete) return;
    const aircraftRef = doc(firestore, 'tenants', tenantId, 'aircrafts', aircraft.id);
    
    const updatedComponents = components.filter(c => c.id !== componentToDelete.id);
    setComponents(updatedComponents);
    updateDocumentNonBlocking(aircraftRef, { components: updatedComponents });
    
    toast({ title: 'Component Deleted', description: `Component "${componentToDelete.name}" has been deleted.` });
    setComponentToDelete(null);
  };

  return (
    <>
      <div className="flex justify-end mb-4">
        <Button onClick={onAddNew}>
          <PlusCircle className="mr-2 h-4 w-4" />
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
                <TableHead>Manufacturer</TableHead>
                <TableHead>Part Number</TableHead>
                <TableHead>Serial Number</TableHead>
                <TableHead>Install Hours</TableHead>
                <TableHead>Max Hours</TableHead>
                <TableHead>TSN</TableHead>
                <TableHead>TSO</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {components.map((component) => (
                <TableRow key={component.id}>
                  <TableCell>{component.name}</TableCell>
                  <TableCell>{component.manufacturer || 'N/A'}</TableCell>
                  <TableCell>{component.partNumber}</TableCell>
                  <TableCell>{component.serialNumber || 'N/A'}</TableCell>
                  <TableCell>{component.installHours || 'N/A'}</TableCell>
                  <TableCell>{component.maxHours || 'N/A'}</TableCell>
                  <TableCell>{component.tsn || 'N/A'}</TableCell>
                  <TableCell>{component.tso || 'N/A'}</TableCell>
                  <TableCell className="text-right">
                     <div className="flex justify-end gap-2">
                        <Button variant="ghost" size="icon" onClick={() => onEdit(component)}>
                            <Edit className="h-4 w-4" />
                        </Button>
                        <AlertDialogTrigger asChild>
                            <Button variant="ghost" size="icon" onClick={() => setComponentToDelete(component)}>
                                <Trash2 className="h-4 w-4 text-destructive" />
                            </Button>
                        </AlertDialogTrigger>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
              {components.length === 0 && (
                <TableRow>
                    <TableCell colSpan={9} className="text-center h-24">
                        No components added yet.
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
            <DialogTitle>{editingComponentId ? 'Edit Component' : 'Add New Component'}</DialogTitle>
          </DialogHeader>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                    <FormField control={form.control} name="name" render={({ field }) => ( <FormItem><FormLabel>Component Name</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem> )} />
                    <FormField control={form.control} name="manufacturer" render={({ field }) => ( <FormItem><FormLabel>Manufacturer</FormLabel><FormControl><Input placeholder="e.g., Lycoming" {...field} value={field.value ?? ''} /></FormControl><FormMessage /></FormItem> )} />
                    <FormField control={form.control} name="partNumber" render={({ field }) => ( <FormItem><FormLabel>Part Number</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem> )} />
                    <FormField control={form.control} name="serialNumber" render={({ field }) => ( <FormItem><FormLabel>Serial Number</FormLabel><FormControl><Input {...field} value={field.value ?? ''} /></FormControl><FormMessage /></FormItem> )} />
                    <FormField control={form.control} name="installHours" render={({ field }) => ( <FormItem><FormLabel>Install Hours</FormLabel><FormControl><Input type="number" {...field} value={field.value ?? ''} /></FormControl><FormMessage /></FormItem> )} />
                    <FormField control={form.control} name="maxHours" render={({ field }) => ( <FormItem><FormLabel>Max Hours</FormLabel><FormControl><Input type="number" {...field} value={field.value ?? ''} /></FormControl><FormMessage /></FormItem> )} />
                    <FormField control={form.control} name="tsn" render={({ field }) => ( <FormItem><FormLabel>TSN (Time Since New)</FormLabel><FormControl><Input type="number" {...field} value={field.value ?? ''} /></FormControl><FormMessage /></FormItem> )} />
                    <FormField control={form.control} name="tso" render={({ field }) => ( <FormItem><FormLabel>TSO (Time Since Overhaul)</FormLabel><FormControl><Input type="number" {...field} value={field.value ?? ''} /></FormControl><FormMessage /></FormItem> )} />
                </div>
                <DialogFooter>
                    <DialogClose asChild>
                        <Button type="button" variant="outline">Cancel</Button>
                    </DialogClose>
                    <Button type="submit">{editingComponentId ? 'Save Changes' : 'Add Component'}</Button>
                </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
      
       <AlertDialog open={!!componentToDelete} onOpenChange={(isOpen) => !isOpen && setComponentToDelete(null)}>
            <AlertDialogContent>
                <AlertDialogHeader>
                    <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                    <AlertDialogDescription>
                        This action cannot be undone. This will permanently delete the component &quot;{componentToDelete?.name}&quot;.
                    </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction onClick={handleDelete}>Delete</AlertDialogAction>
                </AlertDialogFooter>
            </AlertDialogContent>
        </AlertDialog>
    </>
  );
}
