
'use client';

import { useState, useMemo, useEffect } from 'react';
import { doc, collection, query, where, serverTimestamp } from 'firebase/firestore';
import { useCollection, useFirestore, useMemoFirebase, addDocumentNonBlocking, updateDocumentNonBlocking, deleteDocumentNonBlocking } from '@/firebase';
import type { Aircraft, AircraftComponent } from '@/types/aircraft';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogTrigger, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { PlusCircle, Pencil, Trash2 } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { format } from 'date-fns';
import { useToast } from '@/hooks/use-toast';
import { Skeleton } from '@/components/ui/skeleton';

const componentSchema = z.object({
  name: z.string().min(1, 'Component name is required.'),
  partNumber: z.string().min(1, 'Part number is required.'),
  manufacturer: z.string().optional(),
  serialNumber: z.string().optional(),
  installDate: z.date().optional(),
  installHours: z.number({ coerce: true }).optional(),
  maxHours: z.number({ coerce: true }).optional(),
  notes: z.string().optional(),
  tsn: z.number({ coerce: true }).optional(),
  tso: z.number({ coerce: true }).optional(),
});

type ComponentFormValues = z.infer<typeof componentSchema>;

function ComponentForm({
  aircraftId,
  tenantId,
  existingComponent,
  onFinished,
}: {
  aircraftId: string;
  tenantId: string;
  existingComponent?: AircraftComponent | null;
  onFinished: () => void;
}) {
  const firestore = useFirestore();
  const { toast } = useToast();

  const form = useForm<ComponentFormValues>({
    resolver: zodResolver(componentSchema),
    defaultValues: existingComponent
      ? {
          ...existingComponent,
          installDate: existingComponent.installDate ? new Date(existingComponent.installDate) : undefined,
        }
      : {
          name: '',
          partNumber: '',
          manufacturer: '',
          serialNumber: '',
          installHours: 0,
          maxHours: 0,
          notes: '',
          tsn: 0,
          tso: 0,
        },
  });

  const onSubmit = (values: ComponentFormValues) => {
    if (!firestore) return;
    
    const dataToSave = {
        ...values,
        installDate: values.installDate ? values.installDate.toISOString() : null,
    };

    if (existingComponent) {
      const componentRef = doc(firestore, `tenants/${tenantId}/aircrafts/${aircraftId}/components`, existingComponent.id);
      updateDocumentNonBlocking(componentRef, dataToSave);
      toast({ title: 'Component Updated' });
    } else {
      const componentsCol = collection(firestore, `tenants/${tenantId}/aircrafts/${aircraftId}/components`);
      addDocumentNonBlocking(componentsCol, dataToSave);
      toast({ title: 'Component Added' });
    }
    onFinished();
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        <FormField control={form.control} name="name" render={({ field }) => <FormItem><FormLabel>Name</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>} />
        <div className="grid grid-cols-2 gap-4">
          <FormField control={form.control} name="partNumber" render={({ field }) => <FormItem><FormLabel>Part Number</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>} />
          <FormField control={form.control} name="serialNumber" render={({ field }) => <FormItem><FormLabel>Serial Number</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>} />
          <FormField control={form.control} name="manufacturer" render={({ field }) => <FormItem><FormLabel>Manufacturer</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormMessage>} />
          <FormField control={form.control} name="installDate" render={({ field }) => <FormItem><FormLabel>Install Date</FormLabel><FormControl><Input type="date" {...field} value={field.value ? format(new Date(field.value), 'yyyy-MM-dd') : ''} /></FormControl><FormMessage /></FormItem>} />
          <FormField control={form.control} name="installHours" render={({ field }) => <FormItem><FormLabel>Install Hours</FormLabel><FormControl><Input type="number" {...field} /></FormControl><FormMessage /></FormItem>} />
          <FormField control={form.control} name="maxHours" render={({ field }) => <FormItem><FormLabel>Max Hours</FormLabel><FormControl><Input type="number" {...field} /></FormControl><FormMessage /></FormItem>} />
          <FormField control={form.control} name="tsn" render={({ field }) => <FormItem><FormLabel>Time Since New (TSN)</FormLabel><FormControl><Input type="number" {...field} /></FormControl><FormMessage /></FormItem>} />
          <FormField control={form.control} name="tso" render={({ field }) => <FormItem><FormLabel>Time Since Overhaul (TSO)</FormLabel><FormControl><Input type="number" {...field} /></FormControl><FormMessage /></FormItem>} />
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

export function AircraftComponents({ aircraftId, tenantId }: { aircraftId: string; tenantId: string }) {
  const firestore = useFirestore();
  const [isOpen, setIsOpen] = useState(false);
  const [editingComponent, setEditingComponent] = useState<AircraftComponent | null>(null);

  const componentsQuery = useMemoFirebase(
    () => (firestore && aircraftId
      ? query(collection(firestore, `tenants/${tenantId}/aircrafts/${aircraftId}/components`))
      : null),
    [firestore, tenantId, aircraftId]
  );
  const { data: components, isLoading } = useCollection<AircraftComponent>(componentsQuery);

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
  };

  const formFinished = () => {
    setIsOpen(false);
    setEditingComponent(null);
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex justify-between items-center">
          <div>
            <CardTitle>Tracked Components</CardTitle>
            <CardDescription>Manage time-lifed and critical components for this aircraft.</CardDescription>
          </div>
          <Button onClick={handleAddNew}>
            <PlusCircle className="mr-2 h-4 w-4" /> Add Component
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {isLoading ? (
            <div className="space-y-2">
                <Skeleton className="h-10 w-full" />
                <Skeleton className="h-10 w-full" />
            </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Part No.</TableHead>
                <TableHead>Serial No.</TableHead>
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
                    <TableCell>{component.tsn?.toFixed(1) ?? 'N/A'}</TableCell>
                    <TableCell>{component.tso?.toFixed(1) ?? 'N/A'}</TableCell>
                    <TableCell>{component.maxHours?.toFixed(1) ?? 'N/A'}</TableCell>
                    <TableCell className="text-right">
                      <Button variant="ghost" size="icon" onClick={() => handleEdit(component)}>
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="icon" onClick={() => handleDelete(component.id)}>
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={7} className="h-24 text-center">
                    No components tracked for this aircraft.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        )}
      </CardContent>
      <Dialog open={isOpen} onOpenChange={setIsOpen}>
          <DialogContent className="sm:max-w-2xl">
              <DialogHeader>
                  <DialogTitle>{editingComponent ? 'Edit' : 'Add'} Component</DialogTitle>
              </DialogHeader>
              <ComponentForm 
                  aircraftId={aircraftId}
                  tenantId={tenantId}
                  existingComponent={editingComponent}
                  onFinished={formFinished}
              />
          </DialogContent>
      </Dialog>
    </Card>
  );
}

