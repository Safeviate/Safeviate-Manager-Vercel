
'use client';

import { useState, useEffect, useCallback } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
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
import { useFirestore, updateDocumentNonBlocking } from '@/firebase';
import { doc } from 'firebase/firestore';
import { useToast } from '@/hooks/use-toast';
import type { Aircraft, AircraftComponent } from '@/types/aircraft';
import { PlusCircle, Trash2, Edit } from 'lucide-react';
import { v4 as uuidv4 } from 'uuid';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';

const formSchema = z.object({
  id: z.string(),
  name: z.string().min(1, 'Component name is required.'),
  manufacturer: z.string().optional(),
  partNumber: z.string().min(1, 'Part number is required.'),
  serialNumber: z.string().optional(),
  installHours: z.preprocess(
    (val) => (val === '' || val === null ? undefined : Number(val)),
    z.number().optional()
  ),
  maxHours: z.preprocess(
    (val) => (val === '' || val === null ? undefined : Number(val)),
    z.number().optional()
  ),
  tsn: z.preprocess(
    (val) => (val === '' || val === null ? undefined : Number(val)),
    z.number().optional()
  ),
  tso: z.preprocess(
    (val) => (val === '' || val === null ? undefined : Number(val)),
    z.number().optional()
  ),
});

type FormValues = z.infer<typeof formSchema>;

interface AircraftComponentsProps {
  aircraft: Aircraft;
  tenantId: string;
}

export function AircraftComponents({ aircraft, tenantId }: AircraftComponentsProps) {
  const [components, setComponents] = useState<AircraftComponent[]>(aircraft.components || []);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingComponent, setEditingComponent] = useState<AircraftComponent | null>(null);
  const firestore = useFirestore();
  const { toast } = useToast();

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      id: '',
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

  useEffect(() => {
    // When the dialog opens, reset the form
    // If we're editing, populate with the component's data
    // Otherwise, reset to blank for a new component
    if (isDialogOpen) {
      if (editingComponent) {
        form.reset({
          id: editingComponent.id,
          name: editingComponent.name,
          manufacturer: editingComponent.manufacturer || '',
          partNumber: editingComponent.partNumber,
          serialNumber: editingComponent.serialNumber || '',
          installHours: editingComponent.installHours || undefined,
          maxHours: editingComponent.maxHours || undefined,
          tsn: editingComponent.tsn || undefined,
          tso: editingComponent.tso || undefined,
        });
      } else {
        form.reset({
          id: uuidv4(),
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
  
  useEffect(() => {
    setComponents(aircraft.components || []);
  }, [aircraft.components]);

  const handleAddNew = () => {
    setEditingComponent(null);
    setIsDialogOpen(true);
  };

  const handleEdit = (component: AircraftComponent) => {
    setEditingComponent(component);
    setIsDialogOpen(true);
  };
  
  const handleDelete = (componentId: string) => {
    if (!firestore) return;
    const aircraftRef = doc(firestore, 'tenants', tenantId, 'aircrafts', aircraft.id);
    const updatedComponents = components.filter(c => c.id !== componentId);
    setComponents(updatedComponents);
    updateDocumentNonBlocking(aircraftRef, { components: updatedComponents });
    toast({ title: "Component Deleted" });
  };

  const onSubmit = useCallback(async (values: FormValues) => {
    if (!firestore || !aircraft) {
        toast({
            variant: "destructive",
            title: "Error",
            description: "Aircraft data is not available. Cannot save component.",
        });
        return;
    }
    const aircraftRef = doc(firestore, 'tenants', tenantId, 'aircrafts', aircraft.id);
    
    // Ensure numeric fields are numbers or null
    const data: AircraftComponent = {
        id: values.id,
        name: values.name,
        manufacturer: values.manufacturer || null,
        partNumber: values.partNumber,
        serialNumber: values.serialNumber || null,
        installHours: values.installHours ?? null,
        maxHours: values.maxHours ?? null,
        tsn: values.tsn ?? null,
        tso: values.tso ?? null,
    };

    let newComponents: AircraftComponent[];

    if (editingComponent) {
      newComponents = components.map(c => c.id === editingComponent.id ? data : c);
    } else {
      newComponents = [...components, data];
    }

    setComponents(newComponents);
    updateDocumentNonBlocking(aircraftRef, { components: newComponents });

    toast({
        title: editingComponent ? "Component Updated" : "Component Added",
        description: `Component "${values.name}" has been saved.`,
    });
    setIsDialogOpen(false);
    setEditingComponent(null);
  }, [firestore, tenantId, aircraft, components, editingComponent, setComponents, setIsDialogOpen, setEditingComponent, toast]);


  return (
    <>
      <div className="flex justify-end mb-4">
        <Button onClick={handleAddNew}>
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
                <TableHead>Name</TableHead>
                <TableHead>Manufacturer</TableHead>
                <TableHead>Part No.</TableHead>
                <TableHead>Serial No.</TableHead>
                <TableHead className="text-right">Max Hours</TableHead>
                <TableHead className="text-right">Install Hours</TableHead>
                <TableHead className="text-right">TSN</TableHead>
                <TableHead className="text-right">TSO</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {components.length > 0 ? (
                components.map((component) => (
                  <TableRow key={component.id}>
                    <TableCell className="font-medium">{component.name}</TableCell>
                    <TableCell>{component.manufacturer || 'N/A'}</TableCell>
                    <TableCell>{component.partNumber}</TableCell>
                    <TableCell>{component.serialNumber || 'N/A'}</TableCell>
                    <TableCell className="text-right">{component.maxHours ?? 'N/A'}</TableCell>
                    <TableCell className="text-right">{component.installHours ?? 'N/A'}</TableCell>
                    <TableCell className="text-right">{component.tsn ?? 'N/A'}</TableCell>
                    <TableCell className="text-right">{component.tso ?? 'N/A'}</TableCell>
                    <TableCell className="text-right">
                       <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => handleEdit(component)}>
                          <Edit className="h-4 w-4" />
                       </Button>
                       <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => handleDelete(component.id)}>
                          <Trash2 className="h-4 w-4" />
                       </Button>
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={9} className="h-24 text-center">
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
                <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit">{editingComponent ? 'Save Changes' : 'Add Component'}</Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </>
  );
}
