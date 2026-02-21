
'use client';

import { useState, useMemo, useEffect } from 'react';
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
  DialogTrigger,
} from '@/components/ui/dialog';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { MoreHorizontal, Pencil, PlusCircle, Trash2 } from 'lucide-react';
import { useCollection, useFirestore, useMemoFirebase, addDocumentNonBlocking, deleteDocumentNonBlocking, updateDocumentNonBlocking, useDoc } from '@/firebase';
import { doc, collection, query } from 'firebase/firestore';
import { useToast } from '@/hooks/use-toast';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
  } from "@/components/ui/dropdown-menu"
import type { Aircraft, AircraftComponent } from '@/types/aircraft';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { format } from 'date-fns';
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
  const firestore = useFirestore();
  const { toast } = useToast();
  const tenantId = 'safeviate';

  const form = useForm<ComponentFormValues>({
    resolver: zodResolver(componentFormSchema),
    defaultValues: existingComponent || {
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
    },
  });

  const onSubmit = async (values: ComponentFormValues) => {
    if (!firestore) return;
    const componentsCollection = collection(firestore, `tenants/${tenantId}/aircrafts/${aircraftId}/components`);
    
    if (existingComponent) {
        const componentRef = doc(componentsCollection, existingComponent.id);
        await updateDocumentNonBlocking(componentRef, values);
        toast({ title: "Component Updated", description: "The component has been updated." });
    } else {
        await addDocumentNonBlocking(componentsCollection, values);
        toast({ title: "Component Added", description: "The new component has been added to the aircraft." });
    }
    onFinished();
  }

  return (
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
          <FormField control={form.control} name="name" render={({ field }) => <FormItem><FormLabel>Component Name</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>} />
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <FormField control={form.control} name="partNumber" render={({ field }) => <FormItem><FormLabel>Part Number</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>} />
            <FormField control={form.control} name="serialNumber" render={({ field }) => <FormItem><FormLabel>Serial Number</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>} />
            <FormField control={form.control} name="manufacturer" render={({ field }) => <FormItem><FormLabel>Manufacturer</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>} />
            <FormField control={form.control} name="installDate" render={({ field }) => <FormItem><FormLabel>Install Date</FormLabel><FormControl><Input type="date" {...field} value={field.value ? format(new Date(field.value), 'yyyy-MM-dd') : ''} /></FormControl><FormMessage /></FormItem>} />
            <FormField control={form.control} name="installHours" render={({ field }) => <FormItem><FormLabel>Install Hours</FormLabel><FormControl><Input type="number" {...field} /></FormControl><FormMessage /></FormItem>} />
            <FormField control={form.control} name="tsn" render={({ field }) => <FormItem><FormLabel>Time Since New (TSN)</FormLabel><FormControl><Input type="number" {...field} /></FormControl><FormMessage /></FormItem>} />
            <FormField control={form.control} name="tso" render={({ field }) => <FormItem><FormLabel>Time Since Overhaul (TSO)</FormLabel><FormControl><Input type="number" {...field} /></FormControl><FormMessage /></FormItem>} />
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
  const tenantId = 'safeviate';

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
    if (!firestore) return;
    const componentRef = doc(firestore, `tenants/${tenantId}/aircrafts/${aircraftId}/components`, componentId);
    deleteDocumentNonBlocking(componentRef);
    toast({ title: 'Component Deleted' });
  };
  
  const isLoading = isLoadingComponents || isLoadingAircraft;

  return (
    <Card>
      <CardHeader>
        <div className="flex justify-between items-center">
            <div>
                <CardTitle>Tracked Components</CardTitle>
                <CardDescription>A list of all life-limited and time-controlled components for this aircraft.</CardDescription>
            </div>
            <Button onClick={handleAddNew}><PlusCircle className="mr-2" />Add Component</Button>
        </div>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <Skeleton className="h-48 w-full" />
        ) : error ? (
          <p className="text-destructive text-center">Error: {error.message}</p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Component</TableHead>
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
                components.map((component) => (
                  <TableRow key={component.id}>
                    <TableCell className="font-medium">{component.name}</TableCell>
                    <TableCell>{component.partNumber}</TableCell>
                    <TableCell>{component.serialNumber}</TableCell>
                    <TableCell>{component.tsn?.toFixed(1) || 'N/A'}</TableCell>
                    <TableCell>{component.tso?.toFixed(1) || 'N/A'}</TableCell>
                    <TableCell>{component.maxHours || 'N/A'}</TableCell>
                    <TableCell>
                      {component.maxHours && component.tsn
                        ? (component.maxHours - component.tsn).toFixed(1)
                        : 'N/A'}
                    </TableCell>
                    <TableCell className="text-right">
                       <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                                <Button variant="ghost" className="h-8 w-8 p-0">
                                    <span className="sr-only">Open menu</span>
                                    <MoreHorizontal className="h-4 w-4" />
                                </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                                <DropdownMenuItem onSelect={() => handleEdit(component)}>
                                    <Pencil className="mr-2 h-4 w-4" /> Edit
                                </DropdownMenuItem>
                                <DropdownMenuItem onSelect={() => handleDelete(component.id)} className="text-destructive focus:text-destructive">
                                    <Trash2 className="mr-2 h-4 w-4" /> Delete
                                </DropdownMenuItem>
                            </DropdownMenuContent>
                        </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                 <TableRow>
                    <TableCell colSpan={8} className="text-center h-24">
                        No components added yet.
                    </TableCell>
                 </TableRow>
              )}
            </TableBody>
          </Table>
        )}
      </CardContent>

      <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
          <DialogContent>
              <DialogHeader>
                  <DialogTitle>{editingComponent ? 'Edit Component' : 'Add New Component'}</DialogTitle>
                  <DialogDescription>
                      {editingComponent ? `Editing ${editingComponent.name}` : `Adding a new component to ${aircraft?.tailNumber}`}
                  </DialogDescription>
              </DialogHeader>
              <ComponentForm 
                aircraftId={aircraftId}
                existingComponent={editingComponent}
                onFinished={() => setIsFormOpen(false)}
              />
          </DialogContent>
      </Dialog>
    </Card>
  );
}
