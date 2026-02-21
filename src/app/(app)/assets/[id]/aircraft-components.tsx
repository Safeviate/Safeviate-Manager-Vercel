
'use client';

import { useState, useMemo } from 'react';
import { collection, query, doc, deleteDoc, setDoc } from 'firebase/firestore';
import { useFirestore, useCollection, useMemoFirebase, addDocumentNonBlocking, updateDocumentNonBlocking, deleteDocumentNonBlocking } from '@/firebase';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { PlusCircle, Trash2, Pencil } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { format, parseISO } from 'date-fns';
import { Textarea } from '@/components/ui/textarea';
import type { Aircraft, AircraftComponent } from '@/types/aircraft';

// --- Zod Schema for the Form ---
const componentSchema = z.object({
  name: z.string().min(1, "Component name is required."),
  partNumber: z.string().min(1, "Part number is required."),
  serialNumber: z.string().optional(),
  manufacturer: z.string().optional(),
  installDate: z.string().optional(),
  installHours: z.number({ coerce: true }).optional(),
  maxHours: z.number({ coerce: true }).optional(),
  tsn: z.number({ coerce: true }).optional(),
  tso: z.number({ coerce: true }).optional(),
  notes: z.string().optional(),
});
type ComponentFormValues = z.infer<typeof componentSchema>;


// --- Form Dialog Component ---
function ComponentForm({ aircraftId, existingComponent, onFinished }: { aircraftId: string, existingComponent?: AircraftComponent | null, onFinished: () => void }) {
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
      tsn: 0,
      tso: 0,
      notes: '',
    },
  });
  
  const onSubmit = async (values: ComponentFormValues) => {
    if (!firestore) return;
    
    const componentData: Partial<AircraftComponent> = {
        ...values,
        installDate: values.installDate ? new Date(values.installDate).toISOString() : null,
    };

    const componentsCollection = collection(firestore, `tenants/safeviate/aircrafts/${aircraftId}/components`);
    
    if (existingComponent) {
      const componentRef = doc(componentsCollection, existingComponent.id);
      updateDocumentNonBlocking(componentRef, componentData);
      toast({ title: "Component Updated" });
    } else {
      addDocumentNonBlocking(componentsCollection, componentData);
      toast({ title: "Component Added" });
    }
    onFinished();
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <FormField control={form.control} name="name" render={({ field }) => <FormItem><Label>Component Name</Label><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>} />
          <FormField control={form.control} name="partNumber" render={({ field }) => <FormItem><Label>Part Number</Label><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>} />
          <FormField control={form.control} name="serialNumber" render={({ field }) => <FormItem><Label>Serial Number</Label><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>} />
          <FormField control={form.control} name="manufacturer" render={({ field }) => <FormItem><Label>Manufacturer</Label><FormControl><Input {...field} /></FormControl></FormItem>} />
          <FormField control={form.control} name="installDate" render={({ field }) => <FormItem><Label>Install Date</Label><FormControl><Input type="date" {...field} value={field.value ? format(new Date(field.value), 'yyyy-MM-dd') : ''} /></FormControl><FormMessage /></FormItem>} />
          <FormField control={form.control} name="installHours" render={({ field }) => <FormItem><Label>Install Hours</Label><FormControl><Input type="number" {...field} /></FormControl><FormMessage /></FormItem>} />
          <FormField control={form.control} name="tsn" render={({ field }) => <FormItem><Label>TSN</Label><FormControl><Input type="number" {...field} /></FormControl><FormMessage /></FormItem>} />
          <FormField control={form.control} name="tso" render={({ field }) => <FormItem><Label>TSO</Label><FormControl><Input type="number" {...field} /></FormControl><FormMessage /></FormItem>} />
          <FormField control={form.control} name="maxHours" render={({ field }) => <FormItem><Label>Max Hours</Label><FormControl><Input type="number" {...field} /></FormControl><FormMessage /></FormItem>} />
        </div>
         <FormField control={form.control} name="notes" render={({ field }) => <FormItem><Label>Notes</Label><FormControl><Textarea {...field} /></FormControl><FormMessage /></FormItem>} />
        <DialogFooter>
          <Button type="button" variant="outline" onClick={onFinished}>Cancel</Button>
          <Button type="submit">Save Component</Button>
        </DialogFooter>
      </form>
    </Form>
  )
}

// --- Components Table Component ---
function ComponentsTable({ components, onEdit, onDelete }: { components: AircraftComponent[], onEdit: (component: AircraftComponent) => void, onDelete: (id: string) => void }) {
    return (
        <Table>
            <TableHeader>
                <TableRow>
                    <TableHead>Component</TableHead>
                    <TableHead>Part #</TableHead>
                    <TableHead>Serial #</TableHead>
                    <TableHead>TSN</TableHead>
                    <TableHead>TSO</TableHead>
                    <TableHead>Max Hours</TableHead>
                    <TableHead>Max Hours Remain</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                </TableRow>
            </TableHeader>
            <TableBody>
                {components.map((component) => {
                    const hoursRemaining =
                      (component.maxHours != null && component.tso != null)
                        ? (component.maxHours - component.tso).toFixed(1)
                        : 'N/A';
                    return (
                        <TableRow key={component.id}>
                            <TableCell>{component.name}</TableCell>
                            <TableCell>{component.partNumber}</TableCell>
                            <TableCell>{component.serialNumber ?? 'N/A'}</TableCell>
                            <TableCell>{component.tsn?.toFixed(1) ?? 'N/A'}</TableCell>
                            <TableCell>{component.tso?.toFixed(1) ?? 'N/A'}</TableCell>
                            <TableCell>{component.maxHours ?? 'N/A'}</TableCell>
                            <TableCell>{hoursRemaining}</TableCell>
                            <TableCell className="text-right">
                                <Button variant="ghost" size="icon" onClick={() => onEdit(component)}><Pencil className="h-4 w-4" /></Button>
                                <Button variant="ghost" size="icon" onClick={() => onDelete(component.id)}><Trash2 className="h-4 w-4 text-destructive" /></Button>
                            </TableCell>
                        </TableRow>
                    )
                })}
            </TableBody>
        </Table>
    )
}

// --- Main Aircraft Components Manager ---
export function AircraftComponents({ aircraftId }: { aircraftId: string }) {
  const firestore = useFirestore();
  const { toast } = useToast();
  
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingComponent, setEditingComponent] = useState<AircraftComponent | null>(null);

  const aircraftRef = useMemoFirebase(() => (firestore ? doc(firestore, `tenants/safeviate/aircrafts`, aircraftId) : null), [firestore, aircraftId]);
  const { data: aircraft, isLoading: isLoadingAircraft } = useDoc<Aircraft>(aircraftRef);

  const componentsQuery = useMemoFirebase(() => (
    firestore && aircraftId ? query(collection(firestore, `tenants/safeviate/aircrafts/${aircraftId}/components`)) : null
  ), [firestore, aircraftId]);

  const { data: components, isLoading: isLoadingComponents, error } = useCollection<AircraftComponent>(componentsQuery);
  
  const handleEdit = (component: AircraftComponent) => {
    setEditingComponent(component);
    setIsFormOpen(true);
  };

  const handleAddNew = () => {
    setEditingComponent(null);
    setIsFormOpen(true);
  };
  
  const handleDelete = (componentId: string) => {
    if (!firestore || !aircraft) return;
    const componentRef = doc(firestore, `tenants/safeviate/aircrafts/${aircraft.id}/components`, componentId);
    deleteDocumentNonBlocking(componentRef);
    toast({ title: "Component Deleted" });
  };
  
  const isLoading = isLoadingAircraft || isLoadingComponents;

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex justify-between items-center">
            <div>
                <CardTitle>Tracked Components</CardTitle>
                <CardDescription>Major components installed on the aircraft.</CardDescription>
            </div>
            <Button onClick={handleAddNew}><PlusCircle className="mr-2 h-4 w-4" /> Add Component</Button>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <p>Loading components...</p>
          ) : error ? (
            <p className="text-destructive">Error: {error.message}</p>
          ) : components && components.length > 0 ? (
            <ComponentsTable components={components} onEdit={handleEdit} onDelete={handleDelete} />
          ) : (
            <div className="text-center py-10 border-2 border-dashed rounded-lg">
              <p className="text-muted-foreground">No components tracked for this aircraft.</p>
            </div>
          )}
        </CardContent>
      </Card>
      
      <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
        <DialogContent>
            <DialogHeader>
                <DialogTitle>{editingComponent ? 'Edit Component' : 'Add New Component'}</DialogTitle>
            </DialogHeader>
            {aircraftId && <ComponentForm aircraftId={aircraftId} existingComponent={editingComponent} onFinished={() => setIsFormOpen(false)} />}
        </DialogContent>
      </Dialog>
    </>
  );
}
