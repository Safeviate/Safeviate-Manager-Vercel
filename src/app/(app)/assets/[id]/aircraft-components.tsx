
'use client';

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { PlusCircle, Trash2, Edit } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogClose, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useForm, useFieldArray } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useFirestore, updateDocumentNonBlocking } from '@/firebase';
import { doc } from 'firebase/firestore';
import { useToast } from '@/hooks/use-toast';
import type { Aircraft, AircraftComponent } from '@/types/aircraft';
import { v4 as uuidv4 } from 'uuid';

const componentSchema = z.object({
    id: z.string(),
    name: z.string().min(1, "Component name is required"),
    partNumber: z.string().min(1, "Part number is required"),
    serialNumber: z.string().optional(),
    manufacturer: z.string().optional(),
    installDate: z.date().optional(),
    installHours: z.number({ coerce: true }).optional(),
    maxHours: z.number({ coerce: true }).optional(),
});

type ComponentFormValues = z.infer<typeof componentSchema>;

interface AircraftComponentsProps {
  aircraft: Aircraft;
}

export function AircraftComponents({ aircraft }: AircraftComponentsProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [editingComponent, setEditingComponent] = useState<AircraftComponent | null>(null);
  const { toast } = useToast();
  const firestore = useFirestore();
  const tenantId = 'safeviate';

  const form = useForm<ComponentFormValues>();

  const onSubmit = (values: ComponentFormValues) => {
    let updatedComponents = [...(aircraft.components || [])];
    if (editingComponent) {
      const index = updatedComponents.findIndex(c => c.id === editingComponent.id);
      updatedComponents[index] = {
          ...values,
          installDate: values.installDate?.toISOString(),
      };
    } else {
      updatedComponents.push({
          ...values,
          id: uuidv4(),
          installDate: values.installDate?.toISOString(),
      });
    }

    if (firestore) {
        const aircraftRef = doc(firestore, `tenants/${tenantId}/aircrafts`, aircraft.id);
        updateDocumentNonBlocking(aircraftRef, { components: updatedComponents });
        toast({ title: "Components Updated", description: "The aircraft's component list has been updated."});
    }
    
    setIsOpen(false);
    setEditingComponent(null);
    form.reset();
  };
  
  const handleEdit = (component: AircraftComponent) => {
    setEditingComponent(component);
    form.reset({
        ...component,
        installDate: component.installDate ? new Date(component.installDate) : undefined,
    });
    setIsOpen(true);
  };
  
  const handleNew = () => {
    setEditingComponent(null);
    form.reset({
        id: '', name: '', partNumber: '', serialNumber: '', manufacturer: '',
    });
    setIsOpen(true);
  }

  const handleDelete = (componentId: string) => {
    const updatedComponents = (aircraft.components || []).filter(c => c.id !== componentId);
    if (firestore) {
        const aircraftRef = doc(firestore, `tenants/${tenantId}/aircrafts`, aircraft.id);
        updateDocumentNonBlocking(aircraftRef, { components: updatedComponents });
        toast({ title: "Component Removed", description: "The component has been removed from the aircraft."});
    }
  };


  return (
    <Card>
      <CardHeader>
        <div className="flex justify-between items-center">
          <div>
            <CardTitle>Tracked Components</CardTitle>
            <CardDescription>A list of all time-lifed or tracked components on this aircraft.</CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="flex justify-end mb-4">
            <Dialog open={isOpen} onOpenChange={setIsOpen}>
                <DialogTrigger asChild>
                    <Button onClick={handleNew}>
                        <PlusCircle className="mr-2 h-4 w-4" /> Add Component
                    </Button>
                </DialogTrigger>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>{editingComponent ? 'Edit Component' : 'Add New Component'}</DialogTitle>
                    </DialogHeader>
                    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                        <div className="space-y-2">
                            <Label htmlFor="name">Component Name</Label>
                            <Input id="name" {...form.register('name')} />
                            {form.formState.errors.name && <p className="text-sm text-destructive">{form.formState.errors.name.message}</p>}
                        </div>
                         <div className="space-y-2">
                            <Label htmlFor="partNumber">Part Number</Label>
                            <Input id="partNumber" {...form.register('partNumber')} />
                            {form.formState.errors.partNumber && <p className="text-sm text-destructive">{form.formState.errors.partNumber.message}</p>}
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="serialNumber">Serial Number</Label>
                            <Input id="serialNumber" {...form.register('serialNumber')} />
                        </div>
                         <div className="space-y-2">
                            <Label htmlFor="manufacturer">Manufacturer</Label>
                            <Input id="manufacturer" {...form.register('manufacturer')} />
                        </div>
                        <DialogFooter>
                            <DialogClose asChild><Button type="button" variant="outline">Cancel</Button></DialogClose>
                            <Button type="submit">Save Component</Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>
        </div>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Part No.</TableHead>
              <TableHead>Serial No.</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {(aircraft.components || []).length > 0 ? (
              aircraft.components?.map((component) => (
                <TableRow key={component.id}>
                  <TableCell className="font-medium">{component.name}</TableCell>
                  <TableCell>{component.partNumber}</TableCell>
                  <TableCell>{component.serialNumber}</TableCell>
                  <TableCell className="text-right">
                    <Button variant="ghost" size="icon" className="mr-2" onClick={() => handleEdit(component)}>
                        <Edit className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="icon" className="text-destructive" onClick={() => handleDelete(component.id)}>
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={4} className="h-24 text-center">
                  No components added yet.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
