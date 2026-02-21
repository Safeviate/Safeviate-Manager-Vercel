
'use client';

import * as React from 'react';
import { useState, useEffect } from 'react';
import { useFieldArray, useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { doc, collection, query, where } from 'firebase/firestore';
import { useCollection, useFirestore, useMemoFirebase, addDocumentNonBlocking, updateDocumentNonBlocking, deleteDocumentNonBlocking } from '@/firebase';
import type { Aircraft, AircraftComponent } from '../../page';

import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { PlusCircle, Edit, Trash2 } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { format } from 'date-fns';
import { Textarea } from '@/components/ui/textarea';


const formSchema = z.object({
  name: z.string().min(1, "Component name is required"),
  partNumber: z.string().min(1, "Part number is required"),
  serialNumber: z.string().optional(),
  manufacturer: z.string().optional(),
  installDate: z.string().optional(),
  installHours: z.coerce.number().optional(),
  maxHours: z.coerce.number().optional(),
  notes: z.string().optional(),
  tsn: z.coerce.number().optional(),
  tso: z.coerce.number().optional(),
});

interface ComponentFormProps {
  aircraft: Aircraft;
  existingComponent?: AircraftComponent | null;
  onFinished: () => void;
}

function ComponentForm({ aircraft, existingComponent, onFinished }: ComponentFormProps) {
  const firestore = useFirestore();
  
  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: existingComponent?.name || '',
      partNumber: existingComponent?.partNumber || '',
      serialNumber: existingComponent?.serialNumber || '',
      manufacturer: existingComponent?.manufacturer || '',
      installDate: existingComponent?.installDate || '',
      installHours: existingComponent?.installHours ?? 0,
      maxHours: existingComponent?.maxHours ?? 0,
      notes: existingComponent?.notes || '',
      tsn: existingComponent?.tsn ?? 0,
      tso: existingComponent?.tso ?? 0,
    },
  });

  const onSubmit = (values: z.infer<typeof formSchema>) => {
    if (!firestore) return;
    const componentsCollection = collection(firestore, `tenants/safeviate/aircrafts/${aircraft.id}/components`);

    if (existingComponent) {
        const componentRef = doc(componentsCollection, existingComponent.id);
        updateDocumentNonBlocking(componentRef, values);
    } else {
        addDocumentNonBlocking(componentsCollection, values);
    }
    onFinished();
  };
  
  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        <DialogHeader>
          <DialogTitle>{existingComponent ? 'Edit' : 'Add'} Component</DialogTitle>
          <DialogDescription>
            {existingComponent ? 'Update the details for this component.' : 'Add a new component to this aircraft.'}
          </DialogDescription>
        </DialogHeader>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <FormField control={form.control} name="name" render={({ field }) => <FormItem><FormLabel>Component Name</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>} />
          <FormField control={form.control} name="partNumber" render={({ field }) => <FormItem><FormLabel>Part Number</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>} />
          <FormField control={form.control} name="serialNumber" render={({ field }) => <FormItem><FormLabel>Serial Number</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>} />
          <FormField control={form.control} name="manufacturer" render={({ field }) => <FormItem><FormLabel>Manufacturer</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>} />
          <FormField control={form.control} name="installDate" render={({ field }) => <FormItem><FormLabel>Install Date</FormLabel><FormControl><Input type="date" {...field} value={field.value ? format(new Date(field.value), 'yyyy-MM-dd') : ''} /></FormControl><FormMessage /></FormItem>} />
          <FormField control={form.control} name="installHours" render={({ field }) => <FormItem><FormLabel>Install Hours</FormLabel><FormControl><Input type="number" {...field} value={field.value ?? ''} /></FormControl><FormMessage /></FormItem>} />
          <FormField control={form.control} name="tsn" render={({ field }) => <FormItem className="md:col-span-2"><FormLabel>TSN (Time Since New)</FormLabel><FormControl><Input type="number" {...field} value={field.value ?? ''} /></FormControl><FormMessage /></FormItem>} />
          <FormField control={form.control} name="tso" render={({ field }) => <FormItem><FormLabel>TSO (Time Since Overhaul)</FormLabel><FormControl><Input type="number" {...field} value={field.value ?? ''} /></FormControl><FormMessage /></FormItem>} />
          <FormField control={form.control} name="maxHours" render={({ field }) => <FormItem><FormLabel>Max Hours</FormLabel><FormControl><Input type="number" {...field} value={field.value ?? ''} /></FormControl><FormMessage /></FormItem>} />
        </div>
         <FormField control={form.control} name="notes" render={({ field }) => <FormItem><FormLabel>Notes</FormLabel><FormControl><Textarea {...field} /></FormControl><FormMessage /></FormItem>} />
        <DialogFooter>
          <Button type="button" variant="outline" onClick={onFinished}>Cancel</Button>
          <Button type="submit">Save Component</Button>
        </DialogFooter>
      </form>
    </Form>
  )
}

interface AircraftComponentsProps {
    aircraftId: string;
}

export function AircraftComponents({ aircraftId }: AircraftComponentsProps) {
  const firestore = useFirestore();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingComponent, setEditingComponent] = React.useState<AircraftComponent | null>(null);

  const aircraftRef = useMemoFirebase(() => (firestore ? doc(firestore, `tenants/safeviate/aircrafts`, aircraftId) : null), [firestore, aircraftId]);
  const { data: aircraft, isLoading: isLoadingAircraft } = useDoc<Aircraft>(aircraftRef);

  const componentsQuery = useMemoFirebase(() => (
    firestore && aircraftId ? query(collection(firestore, `tenants/safeviate/aircrafts/${aircraftId}/components`)) : null
  ), [firestore, aircraftId]);

  const { data: components, isLoading: isLoadingComponents } = useCollection<AircraftComponent>(componentsQuery);

  const handleEdit = (component: AircraftComponent) => {
    setEditingComponent(component);
    setIsDialogOpen(true);
  }

  const handleAdd = () => {
    setEditingComponent(null);
    setIsDialogOpen(true);
  }

  const handleDelete = (componentId: string) => {
    if (!firestore || !aircraft) return;
    const componentRef = doc(firestore, `tenants/safeviate/aircrafts/${aircraft.id}/components`, componentId);
    deleteDocumentNonBlocking(componentRef);
  };
  
  const handleDialogClose = () => {
      setIsDialogOpen(false);
      setEditingComponent(null);
  }

  if (isLoadingAircraft || isLoadingComponents) {
    return (
        <Card>
            <CardHeader>
                <Skeleton className="h-8 w-1/3" />
                <Skeleton className="h-4 w-1/2" />
            </CardHeader>
            <CardContent>
                <Skeleton className="h-32 w-full" />
            </CardContent>
        </Card>
    )
  }
  
  if (!aircraft) {
      return <p>Aircraft not found.</p>
  }
  
  return (
    <Dialog open={isDialogOpen} onOpenChange={handleDialogClose}>
      <Card>
        <CardHeader>
          <div className="flex justify-between items-center">
            <div>
              <CardTitle>Tracked Components</CardTitle>
              <CardDescription>A list of all life-limited or tracked components on this aircraft.</CardDescription>
            </div>
            <DialogTrigger asChild>
                <Button onClick={handleAdd}><PlusCircle className="mr-2 h-4 w-4" /> Add Component</Button>
            </DialogTrigger>
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Component</TableHead>
                <TableHead>Part No.</TableHead>
                <TableHead>Serial No.</TableHead>
                <TableHead>Install Hours</TableHead>
                <TableHead>TSN</TableHead>
                <TableHead>TSO</TableHead>
                <TableHead>Max Hours</TableHead>
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
                    <TableCell>{component.installHours}</TableCell>
                    <TableCell>{component.tsn}</TableCell>
                    <TableCell>{component.tso}</TableCell>
                    <TableCell>{component.maxHours}</TableCell>
                    <TableCell className="text-right">
                      <Button variant="ghost" size="icon" onClick={() => handleEdit(component)}><Edit className="h-4 w-4" /></Button>
                      <Button variant="ghost" size="icon" className="text-destructive" onClick={() => handleDelete(component.id)}><Trash2 className="h-4 w-4" /></Button>
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={8} className="h-24 text-center">
                    No components tracked for this aircraft.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
      <DialogContent>
         <ComponentForm
            aircraft={aircraft}
            existingComponent={editingComponent}
            onFinished={handleDialogClose}
        />
      </DialogContent>
    </Dialog>
  );
}
