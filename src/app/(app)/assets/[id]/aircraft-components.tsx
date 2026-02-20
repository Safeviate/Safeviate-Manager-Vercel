
'use client';

import { useState, useCallback } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
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
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from '@/components/ui/card';
import { PlusCircle, Edit, Trash2 } from 'lucide-react';
import { useFirestore, updateDocumentNonBlocking } from '@/firebase';
import { useToast } from '@/hooks/use-toast';
import { doc } from 'firebase/firestore';
import { v4 as uuidv4 } from 'uuid';
import type { Aircraft, AircraftComponent } from '@/types/aircraft';
import { usePermissions } from '@/hooks/use-permissions';

// --- Form Schema and Types ---
const formSchema = z.object({
  id: z.string().optional(),
  manufacturer: z.string().optional(),
  name: z.string().min(1, 'Component name is required.'),
  partNumber: z.string().min(1, 'Part number is required.'),
  serialNumber: z.string().optional(),
  installHours: z.preprocess(
    (val) => (val === "" ? undefined : val),
    z.coerce.number({ invalid_type_error: 'Must be a number' }).optional()
  ),
  maxHours: z.preprocess(
    (val) => (val === "" ? undefined : val),
    z.coerce.number({ invalid_type_error: 'Must be a number' }).optional()
  ),
  tsn: z.preprocess(
    (val) => (val === "" ? undefined : val),
    z.coerce.number({ invalid_type_error: 'Must be a number' }).optional()
  ),
  tso: z.preprocess(
    (val) => (val === "" ? undefined : val),
    z.coerce.number({ invalid_type_error: 'Must be a number' }).optional()
  ),
});

type FormValues = z.infer<typeof formSchema>;

interface AircraftComponentsProps {
  aircraft: Aircraft;
  tenantId: string;
  onComponentUpdate: (components: AircraftComponent[]) => void;
}

export function AircraftComponents({
  aircraft,
  tenantId,
  onComponentUpdate,
}: AircraftComponentsProps) {
  const firestore = useFirestore();
  const { toast } = useToast();
  const { hasPermission } = usePermissions();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [editingComponent, setEditingComponent] =
    useState<AircraftComponent | null>(null);
  const [componentToDelete, setComponentToDelete] =
    useState<AircraftComponent | null>(null);

  const canManage = hasPermission('assets-edit');

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
  });

  const handleOpenDialog = (component?: AircraftComponent) => {
    setEditingComponent(component || null);
    form.reset({
      id: component?.id || undefined,
      manufacturer: component?.manufacturer || '',
      name: component?.name || '',
      partNumber: component?.partNumber || '',
      serialNumber: component?.serialNumber || '',
      installHours: component?.installHours ?? '',
      maxHours: component?.maxHours ?? '',
      tsn: component?.tsn ?? '',
      tso: component?.tso ?? '',
    });
    setIsDialogOpen(true);
  };

  const handleOpenDeleteDialog = (component: AircraftComponent) => {
    setComponentToDelete(component);
    setIsDeleteDialogOpen(true);
  };

  const onSubmit = useCallback(
    async (values: FormValues) => {
      if (!firestore || !aircraft) {
        toast({
          variant: 'destructive',
          title: 'Error',
          description: 'Aircraft data is not available.',
        });
        return;
      }
  
      const currentComponents = aircraft.components || [];
      const data: AircraftComponent = {
        id: values.id || uuidv4(),
        manufacturer: values.manufacturer || null,
        name: values.name,
        partNumber: values.partNumber,
        serialNumber: values.serialNumber || null,
        installHours: values.installHours ?? null,
        maxHours: values.maxHours ?? null,
        tsn: values.tsn ?? null,
        tso: values.tso ?? null,
      };
  
      let updatedComponents;
      if (values.id) {
        // Editing existing component
        updatedComponents = currentComponents.map((c) =>
          c.id === values.id ? data : c
        );
      } else {
        // Adding new component
        updatedComponents = [...currentComponents, data];
      }
  
      const aircraftRef = doc(
        firestore,
        'tenants',
        tenantId,
        'aircrafts',
        aircraft.id
      );
      await updateDocumentNonBlocking(aircraftRef, {
        components: updatedComponents,
      });
  
      toast({
        title: values.id ? 'Component Updated' : 'Component Added',
        description: `Component "${values.name}" has been saved.`,
      });
  
      setIsDialogOpen(false);
      onComponentUpdate(updatedComponents);
    },
    [firestore, aircraft, tenantId, onComponentUpdate, toast]
  );

  const handleDeleteComponent = async () => {
    if (!firestore || !componentToDelete || !aircraft) return;

    const updatedComponents = (aircraft.components || []).filter(
      (c) => c.id !== componentToDelete.id
    );
    const aircraftRef = doc(
      firestore,
      'tenants',
      tenantId,
      'aircrafts',
      aircraft.id
    );
    await updateDocumentNonBlocking(aircraftRef, {
      components: updatedComponents,
    });

    toast({
      title: 'Component Deleted',
      description: `Component "${componentToDelete.name}" has been deleted.`,
    });

    setIsDeleteDialogOpen(false);
    setComponentToDelete(null);
    onComponentUpdate(updatedComponents);
  };

  return (
    <>
      <div className="flex justify-end mb-4">
        {canManage && (
          <Button onClick={() => handleOpenDialog()}>
            <PlusCircle className="mr-2 h-4 w-4" /> Add New Component
          </Button>
        )}
      </div>
      <Card>
        <CardHeader>
          <CardTitle>Tracked Components</CardTitle>
          <CardDescription>
            A list of all tracked components installed on this aircraft.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Manufacturer</TableHead>
                <TableHead>Name</TableHead>
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
              {aircraft.components && aircraft.components.length > 0 ? (
                aircraft.components.map((comp) => (
                  <TableRow key={comp.id}>
                    <TableCell>{comp.manufacturer}</TableCell>
                    <TableCell>{comp.name}</TableCell>
                    <TableCell>{comp.partNumber}</TableCell>
                    <TableCell>{comp.serialNumber}</TableCell>
                    <TableCell>{comp.installHours}</TableCell>
                    <TableCell>{comp.maxHours}</TableCell>
                    <TableCell>{comp.tsn}</TableCell>
                    <TableCell>{comp.tso}</TableCell>
                    <TableCell className="text-right">
                      {canManage && (
                        <div className="flex gap-2 justify-end">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleOpenDialog(comp)}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="text-destructive hover:text-destructive"
                            onClick={() => handleOpenDeleteDialog(comp)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      )}
                    </TableCell>
                  </TableRow>
                ))
              ) : (
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
            <DialogTitle>
              {editingComponent ? 'Edit Component' : 'Add New Component'}
            </DialogTitle>
          </DialogHeader>
          <Form {...form}>
            <form
              onSubmit={form.handleSubmit(onSubmit)}
              className="space-y-4"
            >
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField control={form.control} name="manufacturer" render={({ field }) => ( <FormItem><FormLabel>Manufacturer</FormLabel><FormControl><Input placeholder="e.g., Lycoming" {...field} /></FormControl><FormMessage /></FormItem> )}/>
                <FormField control={form.control} name="name" render={({ field }) => ( <FormItem><FormLabel>Component Name</FormLabel><FormControl><Input placeholder="e.g., Engine" {...field} /></FormControl><FormMessage /></FormItem> )}/>
                <FormField control={form.control} name="partNumber" render={({ field }) => ( <FormItem><FormLabel>Part Number</FormLabel><FormControl><Input placeholder="e.g., O-360-A1A" {...field} /></FormControl><FormMessage /></FormItem> )}/>
                <FormField control={form.control} name="serialNumber" render={({ field }) => ( <FormItem><FormLabel>Serial Number</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem> )}/>
                <FormField control={form.control} name="installHours" render={({ field }) => ( <FormItem><FormLabel>Install Hours</FormLabel><FormControl><Input type="number" {...field} /></FormControl><FormMessage /></FormItem> )}/>
                <FormField control={form.control} name="maxHours" render={({ field }) => ( <FormItem><FormLabel>Max Hours</FormLabel><FormControl><Input type="number" {...field} /></FormControl><FormMessage /></FormItem> )}/>
                <FormField control={form.control} name="tsn" render={({ field }) => ( <FormItem><FormLabel>Time Since New (TSN)</FormLabel><FormControl><Input type="number" {...field} /></FormControl><FormMessage /></FormItem> )}/>
                <FormField control={form.control} name="tso" render={({ field }) => ( <FormItem><FormLabel>Time Since Overhaul (TSO)</FormLabel><FormControl><Input type="number" {...field} /></FormControl><FormMessage /></FormItem> )}/>
              </div>
              <DialogFooter>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setIsDialogOpen(false)}
                >
                  Cancel
                </Button>
                <Button type="submit">
                  {editingComponent ? 'Save Changes' : 'Add Component'}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
      
      <AlertDialog
        open={isDeleteDialogOpen}
        onOpenChange={setIsDeleteDialogOpen}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete the
              component &quot;{componentToDelete?.name}&quot;.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteComponent}>
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
