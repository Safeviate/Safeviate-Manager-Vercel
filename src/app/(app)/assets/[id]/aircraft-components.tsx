'use client';

import { useState, useMemo } from 'react';
import { collection, doc, query } from 'firebase/firestore';
import { useDoc, useCollection, useFirestore, useMemoFirebase, addDocumentNonBlocking, updateDocumentNonBlocking, deleteDocumentNonBlocking } from '@/firebase';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { MoreHorizontal, PlusCircle, Trash2 } from 'lucide-react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger, DialogClose } from '@/components/ui/dialog';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/hooks/use-toast';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import type { Aircraft, AircraftComponent } from '@/types/aircraft';
import { format } from 'date-fns';
import { Textarea } from '@/components/ui/textarea';

const componentSchema = z.object({
  name: z.string().min(1, 'Component name is required'),
  partNumber: z.string().min(1, 'Part number is required'),
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

interface ComponentFormProps {
  aircraftId: string;
  existingComponent?: AircraftComponent | null;
  onFinished: () => void;
}

function ComponentForm({ aircraftId, existingComponent, onFinished }: ComponentFormProps) {
  const { toast } = useToast();
  const firestore = useFirestore();

  const form = useForm<ComponentFormValues>({
    resolver: zodResolver(componentSchema),
    defaultValues: existingComponent || {
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

  const onSubmit = (values: ComponentFormValues) => {
    if (!firestore) return;

    const componentsCollectionRef = collection(firestore, `tenants/safeviate/aircrafts/${aircraftId}/components`);
    
    if (existingComponent) {
      const componentDocRef = doc(componentsCollectionRef, existingComponent.id);
      updateDocumentNonBlocking(componentDocRef, values);
      toast({ title: "Component Updated", description: "The component details have been saved." });
    } else {
      addDocumentNonBlocking(componentsCollectionRef, values);
      toast({ title: "Component Added", description: "The new component has been added." });
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
           <FormField control={form.control} name="tsn" render={({ field }) => <FormItem><FormLabel>Time Since New (TSN)</FormLabel><FormControl><Input type="number" step="0.1" {...field} /></FormControl><FormMessage /></FormItem>} />
          <FormField control={form.control} name="tso" render={({ field }) => <FormItem><FormLabel>Time Since Overhaul (TSO)</FormLabel><FormControl><Input type="number" step="0.1" {...field} /></FormControl><FormMessage /></FormItem>} />
          <FormField control={form.control} name="maxHours" render={({ field }) => <FormItem><FormLabel>Max Hours</FormLabel><FormControl><Input type="number" {...field} /></FormControl><FormMessage /></FormItem>} />
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


interface AircraftComponentsProps {
    aircraftId: string;
}

export function AircraftComponents({ aircraftId }: AircraftComponentsProps) {
  const firestore = useFirestore();
  const { toast } = useToast();
  
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingComponent, setEditingComponent] = useState<AircraftComponent | null>(null);

  const aircraftRef = useMemoFirebase(() => (firestore ? doc(firestore, `tenants/safeviate/aircrafts`, aircraftId) : null), [firestore, aircraftId]);
  const { data: aircraft, isLoading: isLoadingAircraft } = useDoc<Aircraft>(aircraftRef);

  const componentsQuery = useMemoFirebase(() => (
    firestore && aircraftId ? query(collection(firestore, `tenants/safeviate/aircrafts/${aircraftId}/components`)) : null
  ), [firestore, aircraftId]);

  const { data: components, isLoading: isLoadingComponents } = useCollection<AircraftComponent>(componentsQuery, { initialData: [] });

  const onFormFinished = () => {
    setIsFormOpen(false);
    setEditingComponent(null);
  }

  const handleEdit = (component: AircraftComponent) => {
    setEditingComponent(component);
    setIsFormOpen(true);
  }
  
  const handleDelete = (component: AircraftComponent) => {
    if (!firestore) return;
    const componentRef = doc(firestore, `tenants/safeviate/aircrafts/${aircraftId}/components`, component.id);
    deleteDocumentNonBlocking(componentRef);
    toast({ title: 'Component Deleted' });
  }

  const isLoading = isLoadingAircraft || isLoadingComponents;

  return (
    <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
        <Card>
          <CardHeader>
            <div className="flex justify-between items-center">
              <div className="space-y-1">
                <CardTitle>Tracked Components</CardTitle>
                <CardDescription>A list of all life-limited or tracked components on this aircraft.</CardDescription>
              </div>
              <DialogTrigger asChild>
                <Button>
                  <PlusCircle className="mr-2 h-4 w-4" />
                  Add Component
                </Button>
              </DialogTrigger>
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
                    <TableHead>Component</TableHead>
                    <TableHead>Part #</TableHead>
                    <TableHead>Serial #</TableHead>
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
                        <TableCell>{component.tsn?.toFixed(1) || 'N/A'}</TableCell>
                        <TableCell>{component.tso?.toFixed(1) || 'N/A'}</TableCell>
                        <TableCell>{component.maxHours}</TableCell>
                        <TableCell className="text-right">
                          <Button variant="ghost" size="icon" onClick={() => handleEdit(component)}>
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                          <Button variant="ghost" size="icon" onClick={() => handleDelete(component)}>
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
        </Card>
        <DialogContent>
            <DialogHeader>
                <DialogTitle>{editingComponent ? 'Edit Component' : 'Add New Component'}</DialogTitle>
            </DialogHeader>
            <ComponentForm 
                aircraftId={aircraftId}
                existingComponent={editingComponent}
                onFinished={onFormFinished}
            />
        </DialogContent>
    </Dialog>
  );
}
