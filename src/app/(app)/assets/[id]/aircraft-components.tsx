
'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useCollection, useFirestore, useMemoFirebase, addDocumentNonBlocking, deleteDocumentNonBlocking, updateDocumentNonBlocking, useDoc } from '@/firebase';
import { collection, query, doc } from 'firebase/firestore';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { MoreHorizontal, PlusCircle, Trash2 } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import type { Aircraft, AircraftComponent } from '@/types/aircraft';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import { format } from 'date-fns';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';

const componentFormSchema = z.object({
  name: z.string().min(1, "Name is required."),
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

type ComponentFormValues = z.infer<typeof componentFormSchema>;

interface ComponentFormProps {
  aircraftId: string;
  existingComponent?: AircraftComponent | null;
  onFinished: () => void;
}

function ComponentForm({ aircraftId, existingComponent, onFinished }: ComponentFormProps) {
  const { toast } = useToast();
  const firestore = useFirestore();

  const form = useForm<ComponentFormValues>({
    resolver: zodResolver(componentFormSchema),
    defaultValues: {
      name: existingComponent?.name || '',
      partNumber: existingComponent?.partNumber || '',
      serialNumber: existingComponent?.serialNumber || '',
      manufacturer: existingComponent?.manufacturer || '',
      installDate: existingComponent?.installDate || '',
      installHours: existingComponent?.installHours || 0,
      maxHours: existingComponent?.maxHours || 0,
      notes: existingComponent?.notes || '',
      tsn: existingComponent?.tsn || 0,
      tso: existingComponent?.tso || 0,
    }
  });

  const onSubmit = async (values: ComponentFormValues) => {
    if (!firestore) return;

    const componentsRef = collection(firestore, `tenants/safeviate/aircrafts/${aircraftId}/components`);
    const dataToSave = {
        ...values,
        installHours: Number(values.installHours) || 0,
        maxHours: Number(values.maxHours) || 0,
        tsn: Number(values.tsn) || 0,
        tso: Number(values.tso) || 0,
    };

    if (existingComponent) {
        const componentRef = doc(componentsRef, existingComponent.id);
        updateDocumentNonBlocking(componentRef, dataToSave);
        toast({ title: 'Component Updated' });
    } else {
        addDocumentNonBlocking(componentsRef, dataToSave);
        toast({ title: 'Component Added' });
    }

    onFinished();
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <FormField control={form.control} name="name" render={({ field }) => <FormItem><FormLabel>Name</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>} />
          <FormField control={form.control} name="partNumber" render={({ field }) => <FormItem><FormLabel>Part Number</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>} />
          <FormField control={form.control} name="serialNumber" render={({ field }) => <FormItem><FormLabel>Serial Number</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>} />
          <FormField control={form.control} name="manufacturer" render={({ field }) => <FormItem><FormLabel>Manufacturer</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>} />
          <FormField control={form.control} name="installDate" render={({ field }) => <FormItem><FormLabel>Install Date</FormLabel><FormControl><Input type="date" {...field} value={field.value ? format(new Date(field.value), 'yyyy-MM-dd') : ''} /></FormControl><FormMessage /></FormItem>} />
          <FormField control={form.control} name="installHours" render={({ field }) => <FormItem><FormLabel>Install Hours</FormLabel><FormControl><Input type="number" {...field} /></FormControl><FormMessage /></FormItem>} />
          <FormField control={form.control} name="tsn" render={({ field }) => <FormItem><FormLabel>TSN</FormLabel><FormControl><Input type="number" {...field} /></FormControl><FormMessage /></FormItem>} />
          <FormField control={form.control} name="tso" render={({ field }) => <FormItem><FormLabel>TSO</FormLabel><FormControl><Input type="number" {...field} /></FormControl><FormMessage /></FormItem>} />
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
}

export function AircraftComponents({ aircraftId }: AircraftComponentsProps) {
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingComponent, setEditingComponent] = useState<AircraftComponent | null>(null);
  const firestore = useFirestore();
  const { toast } = useToast();

  const aircraftRef = useMemoFirebase(() => (firestore ? doc(firestore, `tenants/safeviate/aircrafts`, aircraftId) : null), [firestore, aircraftId]);
  const { data: aircraft, isLoading: isLoadingAircraft } = useDoc<Aircraft>(aircraftRef);

  const componentsQuery = useMemoFirebase(() => (
    firestore && aircraftId ? query(collection(firestore, `tenants/safeviate/aircrafts/${aircraftId}/components`)) : null
  ), [firestore, aircraftId]);

  const { data: components, isLoading, error } = useCollection<AircraftComponent>(componentsQuery);

  const handleEdit = (component: AircraftComponent) => {
    setEditingComponent(component);
    setIsFormOpen(true);
  };

  const handleAddNew = () => {
    setEditingComponent(null);
    setIsFormOpen(true);
  };

  const handleDelete = (componentId: string) => {
    if (!firestore || !aircraftId) return;
    const componentRef = doc(firestore, `tenants/safeviate/aircrafts/${aircraftId}/components`, componentId);
    deleteDocumentNonBlocking(componentRef);
    toast({ title: 'Component Deleted' });
  };

  if (isLoading || isLoadingAircraft) {
    return <Skeleton className="h-64 w-full" />;
  }

  if (error) {
    return <p className="text-destructive">Error loading components: {error.message}</p>;
  }
  
  if (!aircraft) {
    return <p className="text-muted-foreground">Aircraft details not found.</p>;
  }

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex justify-between items-center">
            <div>
              <CardTitle>Tracked Components</CardTitle>
              <CardDescription>A list of all time-lifed components for {aircraft?.tailNumber}.</CardDescription>
            </div>
            <Button onClick={handleAddNew}><PlusCircle className="mr-2 h-4 w-4" /> Add Component</Button>
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Part No.</TableHead>
                <TableHead>Serial No.</TableHead>
                <TableHead>TSN</TableHead>
                <TableHead>TSO</TableHead>
                <TableHead>Max Hours</TableHead>
                <TableHead>Hrs Remain</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {components && components.length > 0 ? (
                components.map((component) => {
                  const maxHours = component.maxHours || 0;
                  const tso = component.tso || 0;
                  const hoursRemaining = maxHours > 0 ? maxHours - tso : Infinity;
                  return (
                    <TableRow key={component.id}>
                      <TableCell>{component.name}</TableCell>
                      <TableCell>{component.partNumber}</TableCell>
                      <TableCell>{component.serialNumber}</TableCell>
                      <TableCell>{component.tsn?.toFixed(1)}</TableCell>
                      <TableCell>{component.tso?.toFixed(1)}</TableCell>
                      <TableCell>{maxHours > 0 ? maxHours.toFixed(1) : 'On Condition'}</TableCell>
                      <TableCell>{isFinite(hoursRemaining) ? hoursRemaining.toFixed(1) : 'N/A'}</TableCell>
                      <TableCell className="text-right">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" className="h-8 w-8 p-0"><MoreHorizontal className="h-4 w-4" /></Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => handleEdit(component)}>Edit</DropdownMenuItem>
                            <DropdownMenuItem onClick={() => handleDelete(component.id)} className="text-destructive">Delete</DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  );
                })
              ) : (
                <TableRow>
                  <TableCell colSpan={8} className="h-24 text-center">No components found.</TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>{editingComponent ? 'Edit Component' : 'Add New Component'}</DialogTitle>
            <DialogDescription>
              Fill in the details for the aircraft component.
            </DialogDescription>
          </DialogHeader>
          <ComponentForm
            aircraftId={aircraftId}
            existingComponent={editingComponent}
            onFinished={() => setIsFormOpen(false)}
          />
        </DialogContent>
      </Dialog>
    </>
  );
}

    