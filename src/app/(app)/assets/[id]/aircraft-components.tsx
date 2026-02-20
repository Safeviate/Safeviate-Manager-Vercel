
'use client';

import { useState, useMemo, useEffect } from 'react';
import { useForm, useFieldArray } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { collection, query, doc } from 'firebase/firestore';
import { useCollection, useFirestore, useMemoFirebase, addDocumentNonBlocking, deleteDocumentNonBlocking, updateDocumentNonBlocking } from '@/firebase';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogTrigger } from '@/components/ui/dialog';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { PlusCircle, Edit, Trash2 } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/hooks/use-toast';
import type { Aircraft, AircraftComponent } from '@/types/aircraft';
import { format } from 'date-fns';
import { Textarea } from '@/components/ui/textarea';

const componentSchema = z.object({
  name: z.string().min(1, "Component name is required."),
  partNumber: z.string().min(1, "Part number is required."),
  serialNumber: z.string().optional(),
  manufacturer: z.string().optional(),
  installDate: z.string().optional(),
  installHours: z.number({ coerce: true }).optional(),
  maxHours: z.number({ coerce: true }).optional(),
  notes: z.string().optional(),
  tsn: z.number({ coerce: true }).optional(),
  tso: z.number({ coerce: true }).optional(),
});

type ComponentFormValues = z.infer<typeof componentSchema>;

function ComponentForm({ aircraftId, tenantId, onFinished, existingComponent }: { aircraftId: string, tenantId: string, onFinished: () => void, existingComponent?: AircraftComponent | null }) {
  const firestore = useFirestore();
  const { toast } = useToast();
  
  const form = useForm<ComponentFormValues>({
    resolver: zodResolver(componentSchema),
    defaultValues: existingComponent ? {
        ...existingComponent,
        installDate: existingComponent.installDate ? format(new Date(existingComponent.installDate), 'yyyy-MM-dd') : '',
    } : {
      name: '',
      partNumber: '',
      serialNumber: '',
      manufacturer: '',
      installDate: '',
      installHours: 0,
      maxHours: 0,
      notes: '',
      tsn: 0,
      tso: 0,
    }
  });

  const onSubmit = async (values: ComponentFormValues) => {
    if (!firestore) return;

    if (existingComponent) {
      // Update existing component
      const componentRef = doc(firestore, `tenants/${tenantId}/aircrafts/${aircraftId}/components`, existingComponent.id);
      updateDocumentNonBlocking(componentRef, values);
      toast({ title: 'Component Updated' });
    } else {
      // Add new component
      const componentsCollection = collection(firestore, `tenants/${tenantId}/aircrafts/${aircraftId}/components`);
      addDocumentNonBlocking(componentsCollection, values);
      toast({ title: 'Component Added' });
    }
    onFinished();
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <FormField control={form.control} name="name" render={({ field }) => <FormItem><FormLabel>Component Name</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>} />
          <FormField control={form.control} name="partNumber" render={({ field }) => <FormItem><FormLabel>Part Number</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>} />
          <FormField control={form.control} name="serialNumber" render={({ field }) => <FormItem><FormLabel>Serial Number</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>} />
          <FormField control={form.control} name="manufacturer" render={({ field }) => <FormItem><FormLabel>Manufacturer</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>} />
          <FormField control={form.control} name="installDate" render={({ field }) => <FormItem><FormLabel>Install Date</FormLabel><FormControl><Input type="date" {...field} value={field.value ? format(new Date(field.value), 'yyyy-MM-dd') : ''} /></FormControl><FormMessage /></FormItem>} />
          <FormField control={form.control} name="installHours" render={({ field }) => <FormItem><FormLabel>Install Hours</FormLabel><FormControl><Input type="number" {...field} /></FormControl><FormMessage /></FormItem>} />
          <FormField control={form.control} name="maxHours" render={({ field }) => <FormItem><FormLabel>Max Hours</FormLabel><FormControl><Input type="number" {...field} /></FormControl><FormMessage /></FormItem>} />
        </div>
         <FormField control={form.control} name="notes" render={({ field }) => <FormItem><FormLabel>Notes</FormLabel><FormControl><Textarea {...field} /></FormControl><FormMessage /></FormItem>} />
        <DialogFooter>
          <Button type="button" variant="outline" onClick={onFinished}>Cancel</Button>
          <Button type="submit">Save Component</Button>
        </DialogFooter>
      </form>
    </Form>
  );
}

interface AircraftComponentsProps {
  aircraftId: string;
  tenantId: string;
}

export function AircraftComponents({ aircraftId, tenantId }: AircraftComponentsProps) {
  const firestore = useFirestore();
  const { toast } = useToast();
  const [isOpen, setIsOpen] = useState(false);
  const [editingComponent, setEditingComponent] = useState<AircraftComponent | null>(null);

  const componentsQuery = useMemoFirebase(
    () => (firestore ? query(collection(firestore, `tenants/${tenantId}/aircrafts/${aircraftId}/components`)) : null),
    [firestore, tenantId, aircraftId]
  );
  
  const { data: components, isLoading, error } = useCollection<AircraftComponent>(componentsQuery);

  const handleEdit = (component: AircraftComponent) => {
    setEditingComponent(component);
    setIsOpen(true);
  };
  
  const handleAddNew = () => {
    setEditingComponent(null);
    setIsOpen(true);
  };

  const handleDelete = (componentId: string) => {
    if (!firestore) return;
    const componentRef = doc(firestore, `tenants/${tenantId}/aircrafts/${aircraftId}/components`, componentId);
    deleteDocumentNonBlocking(componentRef);
    toast({ title: 'Component Deleted' });
  };
  
  const onFormFinished = () => {
    setIsOpen(false);
    setEditingComponent(null);
  };
  
  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-10 w-32 self-end" />
        <Skeleton className="h-40 w-full" />
      </div>
    );
  }

  if (error) {
    return <p className="text-destructive text-center">Error loading components: {error.message}</p>;
  }

  return (
    <>
      <div className="flex justify-end mb-4">
         <Button onClick={handleAddNew}>
            <PlusCircle className="mr-2 h-4 w-4" /> Add Component
        </Button>
      </div>
      <Card>
        <CardHeader>
          <CardTitle>Tracked Components</CardTitle>
          <CardDescription>A list of all time-lifed or tracked components on this aircraft.</CardDescription>
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
              {(components || []).length > 0 ? (
                components?.map((component) => (
                  <TableRow key={component.id}>
                    <TableCell className="font-medium">{component.name}</TableCell>
                    <TableCell>{component.partNumber}</TableCell>
                    <TableCell>{component.serialNumber}</TableCell>
                    <TableCell>{component.tsn || 'N/A'}</TableCell>
                    <TableCell>{component.tso || 'N/A'}</TableCell>
                    <TableCell className="text-right">
                       <Button variant="ghost" size="icon" onClick={() => handleEdit(component)}><Edit className="h-4 w-4" /></Button>
                       <Button variant="ghost" size="icon" className="text-destructive" onClick={() => handleDelete(component.id)}><Trash2 className="h-4 w-4" /></Button>
                    </TableCell>
                  </TableRow>
                ))
              ) : (
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
      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingComponent ? 'Edit Component' : 'Add New Component'}</DialogTitle>
          </DialogHeader>
          <ComponentForm 
            aircraftId={aircraftId}
            tenantId={tenantId}
            onFinished={onFormFinished}
            existingComponent={editingComponent}
          />
        </DialogContent>
      </Dialog>
    </>
  );
}
