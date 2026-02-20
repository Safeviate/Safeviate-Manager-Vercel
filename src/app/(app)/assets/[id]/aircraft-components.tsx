'use client';

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Pencil, PlusCircle, Trash2 } from 'lucide-react';
import type { Aircraft, AircraftComponent } from '@/types/aircraft';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogClose
} from '@/components/ui/dialog';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { useFirestore, updateDocumentNonBlocking } from '@/firebase';
import { doc } from 'firebase/firestore';
import { useToast } from '@/hooks/use-toast';
import { v4 as uuidv4 } from 'uuid';
import { format } from 'date-fns';
import { Skeleton } from '@/components/ui/skeleton';
import { DialogFooter } from '@/components/ui/dialog';

const componentSchema = z.object({
  name: z.string().min(1, 'Component name is required.'),
  partNumber: z.string().min(1, 'Part number is required.'),
  serialNumber: z.string().optional(),
  installDate: z.date().optional(),
  installHours: z.number({ coerce: true }).optional(),
  maxHours: z.number({ coerce: true }).optional(),
});
type ComponentFormValues = z.infer<typeof componentSchema>;

interface ComponentFormProps {
  aircraftId: string;
  tenantId: string;
  existingComponents: AircraftComponent[];
  onSave: () => void;
  component?: AircraftComponent | null;
}

function ComponentForm({ aircraftId, tenantId, existingComponents, onSave, component }: ComponentFormProps) {
    const firestore = useFirestore();
    const { toast } = useToast();

    const form = useForm<ComponentFormValues>({
        resolver: zodResolver(componentSchema),
        defaultValues: {
            name: component?.name || '',
            partNumber: component?.partNumber || '',
            serialNumber: component?.serialNumber || '',
            installDate: component?.installDate ? new Date(component.installDate) : undefined,
            installHours: component?.installHours || undefined,
            maxHours: component?.maxHours || undefined,
        }
    });

    const onSubmit = (values: ComponentFormValues) => {
        if (!firestore) return;
        
        let updatedComponents: AircraftComponent[];
        
        if (component) { // Editing existing
            updatedComponents = existingComponents.map(c => 
                c.id === component.id ? { ...c, ...values, installDate: values.installDate?.toISOString() } : c
            );
        } else { // Adding new
            const newComponent: AircraftComponent = {
                id: uuidv4(),
                ...values,
                installDate: values.installDate?.toISOString(),
            };
            updatedComponents = [...existingComponents, newComponent];
        }

        const aircraftRef = doc(firestore, 'tenants', tenantId, 'aircrafts', aircraftId);
        updateDocumentNonBlocking(aircraftRef, { components: updatedComponents });

        toast({ title: component ? 'Component Updated' : 'Component Added' });
        onSave();
    };

    return (
        <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <FormField control={form.control} name="name" render={({ field }) => ( <FormItem><FormLabel>Component Name</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem> )}/>
                    <FormField control={form.control} name="partNumber" render={({ field }) => ( <FormItem><FormLabel>Part No.</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem> )}/>
                    <FormField control={form.control} name="serialNumber" render={({ field }) => ( <FormItem><FormLabel>Serial No.</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem> )}/>
                    <FormField control={form.control} name="installDate" render={({ field }) => ( <FormItem><FormLabel>Install Date</FormLabel><FormControl><Input type="date" {...field} value={field.value ? format(new Date(field.value), 'yyyy-MM-dd') : ''} onChange={e => field.onChange(new Date(e.target.value))} /></FormControl><FormMessage /></FormItem> )}/>
                    <FormField control={form.control} name="installHours" render={({ field }) => ( <FormItem><FormLabel>Install Hours</FormLabel><FormControl><Input type="number" {...field} /></FormControl><FormMessage /></FormItem> )}/>
                    <FormField control={form.control} name="maxHours" render={({ field }) => ( <FormItem><FormLabel>Max Hours</FormLabel><FormControl><Input type="number" {...field} /></FormControl><FormMessage /></FormItem> )}/>
                </div>
                 <DialogFooter>
                    <DialogClose asChild><Button type="button" variant="outline">Cancel</Button></DialogClose>
                    <Button type="submit">Save</Button>
                </DialogFooter>
            </form>
        </Form>
    );
}

interface AircraftComponentsProps {
  aircraft: Aircraft;
  tenantId: string;
}

export function AircraftComponents({ aircraft, tenantId }: AircraftComponentsProps) {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingComponent, setEditingComponent] = useState<AircraftComponent | null>(null);
  const firestore = useFirestore();
  const { toast } = useToast();

  if (!aircraft) {
    return (
        <Card>
            <CardHeader>
                <CardTitle>Tracked Components</CardTitle>
                <CardDescription>A list of all time-lifed or tracked components for this aircraft.</CardDescription>
            </CardHeader>
            <CardContent>
                <Skeleton className="h-48 w-full" />
            </CardContent>
        </Card>
    )
  }
  
  const handleOpenDialog = (component: AircraftComponent | null = null) => {
    setEditingComponent(component);
    setIsDialogOpen(true);
  }

  const handleDelete = (componentId: string) => {
    if (!firestore) return;
    const updatedComponents = (aircraft.components || []).filter(c => c.id !== componentId);
    const aircraftRef = doc(firestore, 'tenants', tenantId, 'aircrafts', aircraft.id);
    updateDocumentNonBlocking(aircraftRef, { components: updatedComponents });
    toast({ title: "Component Deleted" });
  }

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex justify-between items-center">
            <div>
              <CardTitle>Tracked Components</CardTitle>
              <CardDescription>A list of all time-lifed or tracked components for this aircraft.</CardDescription>
            </div>
            <Button onClick={() => handleOpenDialog()}>
              <PlusCircle className="mr-2 h-4 w-4" /> Add Component
            </Button>
          </div>
        </CardHeader>
        <CardContent>
            {(aircraft.components || []).length > 0 ? (
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>Component</TableHead>
                            <TableHead>Part No.</TableHead>
                            <TableHead>Serial No.</TableHead>
                            <TableHead>Install Date</TableHead>
                            <TableHead>Install Hours</TableHead>
                            <TableHead>Max Hours</TableHead>
                            <TableHead className="text-right">Actions</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {aircraft.components?.map(comp => (
                            <TableRow key={comp.id}>
                                <TableCell className="font-medium">{comp.name}</TableCell>
                                <TableCell>{comp.partNumber}</TableCell>
                                <TableCell>{comp.serialNumber}</TableCell>
                                <TableCell>{comp.installDate ? format(new Date(comp.installDate), 'PPP') : 'N/A'}</TableCell>
                                <TableCell>{comp.installHours}</TableCell>
                                <TableCell>{comp.maxHours}</TableCell>
                                <TableCell className="text-right">
                                    <Button variant="ghost" size="icon" onClick={() => handleOpenDialog(comp)}><Pencil className="h-4 w-4" /></Button>
                                    <Button variant="ghost" size="icon" onClick={() => handleDelete(comp.id)}><Trash2 className="h-4 w-4 text-destructive" /></Button>
                                </TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
            ) : (
                <div className="text-center py-10 text-muted-foreground">No components tracked for this aircraft.</div>
            )}
        </CardContent>
      </Card>
      
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent>
            <DialogHeader>
                <DialogTitle>{editingComponent ? 'Edit' : 'Add'} Component</DialogTitle>
            </DialogHeader>
            <ComponentForm 
                aircraftId={aircraft.id} 
                tenantId={tenantId}
                existingComponents={aircraft.components || []}
                component={editingComponent}
                onSave={() => setIsDialogOpen(false)}
            />
        </DialogContent>
      </Dialog>
    </>
  );
}
