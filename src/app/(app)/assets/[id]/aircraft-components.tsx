'use client';

import { useState, useMemo, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import {
  collection,
  query,
  doc,
  updateDoc,
} from 'firebase/firestore';
import { useDoc, useFirestore, useMemoFirebase, updateDocumentNonBlocking } from '@/firebase';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogClose,
} from '@/components/ui/dialog';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { MoreHorizontal, Pencil, PlusCircle, Trash2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { format, parseISO } from 'date-fns';
import { Skeleton } from '@/components/ui/skeleton';
import { Aircraft, AircraftComponent } from '@/types/aircraft';
import { v4 as uuidv4 } from 'uuid';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormMessage,
} from '@/components/ui/form';

interface AircraftComponentsProps {
  aircraftId: string;
  tenantId: string;
}

const componentSchema = z.object({
  name: z.string().min(1, 'Component name is required.'),
  partNumber: z.string().min(1, 'Part number is required.'),
  serialNumber: z.string().optional(),
  manufacturer: z.string().optional(),
  installDate: z.date().optional(),
  installHours: z.number({ coerce: true }).optional(),
  maxHours: z.number({ coerce: true }).optional(),
  tsn: z.number({ coerce: true }).optional(),
  tso: z.number({ coerce: true }).optional(),
  notes: z.string().optional(),
});

type ComponentFormValues = z.infer<typeof componentSchema>;

function ComponentForm({
  aircraft,
  tenantId,
  existingComponent,
  onFinished,
}: {
  aircraft: Aircraft;
  tenantId: string;
  existingComponent?: AircraftComponent | null;
  onFinished: () => void;
}) {
  const firestore = useFirestore();
  const { toast } = useToast();

  const form = useForm<ComponentFormValues>({
    resolver: zodResolver(componentSchema),
    defaultValues: {
      ...existingComponent,
      installDate: existingComponent?.installDate ? parseISO(existingComponent.installDate) : undefined,
    },
  });

  const handleSubmit = (values: ComponentFormValues) => {
    if (!firestore) return;
    
    const componentData: AircraftComponent = {
      ...values,
      id: existingComponent?.id || uuidv4(),
      installDate: values.installDate ? values.installDate.toISOString() : null,
    };

    const currentComponents = aircraft.components || [];
    let updatedComponents;

    if (existingComponent) {
      updatedComponents = currentComponents.map(c => c.id === existingComponent.id ? componentData : c);
    } else {
      updatedComponents = [...currentComponents, componentData];
    }
    
    const aircraftRef = doc(firestore, `tenants/${tenantId}/aircrafts`, aircraft.id);
    updateDocumentNonBlocking(aircraftRef, { components: updatedComponents });

    toast({ title: existingComponent ? 'Component Updated' : 'Component Added' });
    onFinished();
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
            <FormField control={form.control} name="name" render={({ field }) => <FormItem><Label>Name</Label><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>} />
            <FormField control={form.control} name="partNumber" render={({ field }) => <FormItem><Label>Part Number</Label><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>} />
            <FormField control={form.control} name="serialNumber" render={({ field }) => <FormItem><Label>Serial Number</Label><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>} />
            <FormField control={form.control} name="manufacturer" render={({ field }) => <FormItem><Label>Manufacturer</Label><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>} />
            <FormField control={form.control} name="tsn" render={({ field }) => <FormItem><Label>TSN (Time Since New)</Label><FormControl><Input type="number" {...field} /></FormControl><FormMessage /></FormItem>} />
            <FormField control={form.control} name="tso" render={({ field }) => <FormItem><Label>TSO (Time Since Overhaul)</Label><FormControl><Input type="number" {...field} /></FormControl><FormMessage /></FormItem>} />
            <FormField control={form.control} name="installDate" render={({ field }) => <FormItem><Label>Install Date</Label><FormControl><Input type="date" {...field} value={field.value ? format(new Date(field.value), 'yyyy-MM-dd') : ''} onChange={e => field.onChange(new Date(e.target.value))} /></FormControl><FormMessage /></FormItem>} />
            <FormField control={form.control} name="installHours" render={({ field }) => <FormItem><Label>Install Hours</Label><FormControl><Input type="number" {...field} /></FormControl><FormMessage /></FormItem>} />
            <FormField control={form.control} name="maxHours" render={({ field }) => <FormItem><Label>Max Hours</Label><FormControl><Input type="number" {...field} /></FormControl><FormMessage /></FormItem>} />
        </div>
         <FormField control={form.control} name="notes" render={({ field }) => <FormItem><Label>Notes</Label><FormControl><Textarea {...field} /></FormControl><FormMessage /></FormItem>} />
        <DialogFooter>
          <Button type="button" variant="outline" onClick={onFinished}>Cancel</Button>
          <Button type="submit">Save Component</Button>
        </DialogFooter>
      </form>
    </Form>
  );
}

export function AircraftComponents({ aircraftId, tenantId }: AircraftComponentsProps) {
  const firestore = useFirestore();
  const { toast } = useToast();
  const [isOpen, setIsOpen] = useState(false);
  const [editingComponent, setEditingComponent] = useState<AircraftComponent | null>(null);

  const aircraftRef = useMemoFirebase(
    () => doc(firestore, `tenants/${tenantId}/aircrafts`, aircraftId),
    [firestore, tenantId, aircraftId]
  );
  const { data: aircraft, isLoading, error } = useDoc<Aircraft>(aircraftRef);

  const handleOpenDialog = (component: AircraftComponent | null = null) => {
    setEditingComponent(component);
    setIsOpen(true);
  };
  
  const handleDialogFinished = () => {
    setIsOpen(false);
    setEditingComponent(null);
  };

  const handleDeleteComponent = (componentId: string) => {
    if (!firestore || !aircraft) return;
    const updatedComponents = (aircraft.components || []).filter(c => c.id !== componentId);
    const aircraftDocRef = doc(firestore, `tenants/${tenantId}/aircrafts`, aircraft.id);
    updateDocumentNonBlocking(aircraftDocRef, { components: updatedComponents });
    toast({ title: 'Component removed' });
  };
  
  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <Card>
        <CardHeader>
          <div className="flex justify-between items-center">
            <div>
              <CardTitle>Tracked Components</CardTitle>
              <CardDescription>
                A list of all time-lifed or tracked components for this aircraft.
              </CardDescription>
            </div>
             <DialogTrigger asChild>
                <Button onClick={() => handleOpenDialog()}>
                    <PlusCircle className="mr-2 h-4 w-4" /> Add Component
                </Button>
            </DialogTrigger>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading && <Skeleton className="h-48 w-full" />}
          {error && <p className="text-destructive text-center p-4">Error loading components.</p>}
          {!isLoading && !error && (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Part No.</TableHead>
                  <TableHead>Serial No.</TableHead>
                  <TableHead>TSN</TableHead>
                  <TableHead>TSO</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {aircraft?.components && aircraft.components.length > 0 ? (
                  aircraft.components.map((component) => (
                    <TableRow key={component.id}>
                      <TableCell className="font-medium">{component.name}</TableCell>
                      <TableCell>{component.partNumber}</TableCell>
                      <TableCell>{component.serialNumber || 'N/A'}</TableCell>
                      <TableCell>{component.tsn ?? 'N/A'}</TableCell>
                      <TableCell>{component.tso ?? 'N/A'}</TableCell>
                      <TableCell className="text-right">
                        <Button variant="ghost" size="icon" onClick={() => handleOpenDialog(component)}><Pencil className="h-4 w-4" /></Button>
                        <Button variant="ghost" size="icon" onClick={() => handleDeleteComponent(component.id)}><Trash2 className="h-4 w-4 text-destructive" /></Button>
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
          )}
        </CardContent>
      </Card>

      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>{editingComponent ? 'Edit' : 'Add'} Component</DialogTitle>
        </DialogHeader>
        {aircraft && <ComponentForm aircraft={aircraft} tenantId={tenantId} existingComponent={editingComponent} onFinished={handleDialogFinished} />}
      </DialogContent>
    </Dialog>
  );
}
