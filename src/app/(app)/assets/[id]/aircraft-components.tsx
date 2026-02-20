'use client';

import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { doc } from 'firebase/firestore';
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
  DialogTrigger,
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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from '@/components/ui/card';
import { PlusCircle, Edit, Trash2 } from 'lucide-react';
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
import type { Aircraft, AircraftComponent } from '@/types/aircraft';
import { format } from 'date-fns';

const componentSchema = z.object({
  id: z.string().optional(),
  name: z.string().min(1, 'Component name is required.'),
  manufacturer: z.string().optional(),
  partNumber: z.string().min(1, 'Part number is required.'),
  serialNumber: z.string().optional(),
  installHours: z.number({ coerce: true }).optional(),
  maxHours: z.number({ coerce: true }).optional(),
  tsn: z.number({ coerce: true }).optional(),
  tso: z.number({ coerce: true }).optional(),
});

type FormValues = z.infer<typeof componentSchema>;

interface AircraftComponentsProps {
  aircraft: Aircraft;
  tenantId: string;
}

export function AircraftComponents({ aircraft, tenantId }: AircraftComponentsProps) {
  const firestore = useFirestore();
  const { toast } = useToast();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingComponent, setEditingComponent] = useState<AircraftComponent | null>(null);
  const [componentToDelete, setComponentToDelete] = useState<AircraftComponent | null>(null);

  const form = useForm<FormValues>({
    resolver: zodResolver(componentSchema),
  });

  useEffect(() => {
    if (isDialogOpen) {
      if (editingComponent) {
        form.reset({
          id: editingComponent.id,
          name: editingComponent.name,
          manufacturer: editingComponent.manufacturer ?? '',
          partNumber: editingComponent.partNumber,
          serialNumber: editingComponent.serialNumber ?? '',
          installHours: editingComponent.installHours ?? undefined,
          maxHours: editingComponent.maxHours ?? undefined,
          tsn: editingComponent.tsn ?? undefined,
          tso: editingComponent.tso ?? undefined,
        });
      } else {
        form.reset({
          name: '',
          manufacturer: '',
          partNumber: '',
          serialNumber: '',
          installHours: undefined,
          maxHours: undefined,
          tsn: undefined,
          tso: undefined,
        });
      }
    }
  }, [isDialogOpen, editingComponent, form]);

  const onSubmit = async (values: FormValues) => {
    if (!firestore) return;
    const aircraftRef = doc(firestore, 'tenants', tenantId, 'aircrafts', aircraft.id);

    const componentData: Partial<AircraftComponent> = {
      name: values.name,
      manufacturer: values.manufacturer || null,
      partNumber: values.partNumber,
      serialNumber: values.serialNumber || null,
      installHours: values.installHours || null,
      maxHours: values.maxHours || null,
      tsn: values.tsn || null,
      tso: values.tso || null,
    };

    let updatedComponents: AircraftComponent[];

    if (editingComponent) {
      updatedComponents = (aircraft.components || []).map(c => 
        c.id === editingComponent.id ? { ...c, ...componentData } : c
      );
      toast({ title: 'Component Updated', description: `Component "${values.name}" has been updated.` });
    } else {
      const newComponent: AircraftComponent = {
        id: new Date().getTime().toString(), // Simple unique ID
        ...componentData
      } as AircraftComponent;
      updatedComponents = [...(aircraft.components || []), newComponent];
      toast({ title: 'Component Added', description: `Component "${values.name}" has been added.` });
    }

    await updateDocumentNonBlocking(aircraftRef, { components: updatedComponents });
    setIsDialogOpen(false);
  };

  const handleEdit = (component: AircraftComponent) => {
    setEditingComponent(component);
    setIsDialogOpen(true);
  };
  
  const handleDelete = async () => {
    if (!firestore || !componentToDelete) return;
    const aircraftRef = doc(firestore, 'tenants', tenantId, 'aircrafts', aircraft.id);
    const updatedComponents = (aircraft.components || []).filter(c => c.id !== componentToDelete.id);
    await updateDocumentNonBlocking(aircraftRef, { components: updatedComponents });
    toast({ title: 'Component Deleted' });
    setComponentToDelete(null);
  };

  return (
    <>
      <div className="flex justify-end mb-4">
        <Button onClick={() => { setEditingComponent(null); setIsDialogOpen(true); }}>
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
                <TableHead>Component</TableHead>
                <TableHead>Manufacturer</TableHead>
                <TableHead>Part No.</TableHead>
                <TableHead>Serial No.</TableHead>
                <TableHead>Install (hrs)</TableHead>
                <TableHead>Max (hrs)</TableHead>
                <TableHead>TSN</TableHead>
                <TableHead>TSO</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {(aircraft.components || []).map((component) => (
                <TableRow key={component.id}>
                  <TableCell>{component.name}</TableCell>
                  <TableCell>{component.manufacturer || 'N/A'}</TableCell>
                  <TableCell>{component.partNumber}</TableCell>
                  <TableCell>{component.serialNumber || 'N/A'}</TableCell>
                  <TableCell>{component.installHours ?? 'N/A'}</TableCell>
                  <TableCell>{component.maxHours ?? 'N/A'}</TableCell>
                  <TableCell>{component.tsn ?? 'N/A'}</TableCell>
                  <TableCell>{component.tso ?? 'N/A'}</TableCell>
                  <TableCell className="text-right">
                    <div className="flex gap-2 justify-end">
                      <Button variant="ghost" size="icon" onClick={() => handleEdit(component)}>
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="icon" className="text-destructive" onClick={() => setComponentToDelete(component)}>
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
              {(aircraft.components || []).length === 0 && (
                <TableRow>
                  <TableCell colSpan={9} className="text-center h-24">No components added yet.</TableCell>
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
                <FormField control={form.control} name="manufacturer" render={({ field }) => ( <FormItem><FormLabel>Manufacturer</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem> )} />
                <FormField control={form.control} name="partNumber" render={({ field }) => ( <FormItem><FormLabel>Part Number</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem> )} />
                <FormField control={form.control} name="serialNumber" render={({ field }) => ( <FormItem><FormLabel>Serial Number</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem> )} />
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

      <AlertDialog open={!!componentToDelete} onOpenChange={(open) => !open && setComponentToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>This will permanently delete the component &quot;{componentToDelete?.name}&quot;.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setComponentToDelete(null)}>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className='bg-destructive hover:bg-destructive/90'>Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
