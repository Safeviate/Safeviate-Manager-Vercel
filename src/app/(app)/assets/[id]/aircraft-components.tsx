
'use client';

import { useState, useEffect, useCallback } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { v4 as uuidv4 } from 'uuid';
import { doc } from 'firebase/firestore';
import { useFirestore, updateDocumentNonBlocking } from '@/firebase';
import { useToast } from '@/hooks/use-toast';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogClose, DialogTrigger } from '@/components/ui/dialog';
import { Form, FormControl, FormField, FormItem, FormMessage, FormLabel } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { PlusCircle, Trash2, Edit } from 'lucide-react';
import { format } from 'date-fns';
import type { Aircraft, AircraftComponent } from '@/types/aircraft';
import { Textarea } from '@/components/ui/textarea';

const formSchema = z.object({
  name: z.string().min(1, "Component name is required."),
  manufacturer: z.string().optional(),
  partNumber: z.string().min(1, "Part number is required."),
  serialNumber: z.string().optional(),
  installDate: z.string().optional(),
  installHours: z.number({ coerce: true }).optional(),
  maxHours: z.number({ coerce: true }).optional(),
  notes: z.string().optional(),
  tsn: z.number({ coerce: true }).optional(),
  tso: z.number({ coerce: true }).optional(),
});

type FormValues = z.infer<typeof formSchema>;

interface ComponentFormDialogProps {
  onSave: (component: AircraftComponent) => void;
  existingComponent?: AircraftComponent | null;
  trigger: React.ReactNode;
}

function ComponentFormDialog({ onSave, existingComponent, trigger }: ComponentFormDialogProps) {
  const [isOpen, setIsOpen] = useState(false);

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: '', manufacturer: '', partNumber: '', serialNumber: '',
      installDate: '', installHours: 0, maxHours: 0, notes: '', tsn: 0, tso: 0,
    },
  });

  const { reset } = form;

  // Reset form when dialog opens with new data or for a new entry
  useEffect(() => {
    if (isOpen) {
      const defaults = existingComponent || {
        name: '', manufacturer: '', partNumber: '', serialNumber: '',
        installDate: '', installHours: 0, maxHours: 0, notes: '', tsn: 0, tso: 0,
      };
      reset(defaults);
    }
  }, [isOpen, existingComponent, reset]);

  const onSubmit = (values: FormValues) => {
    onSave({ ...existingComponent, ...values, id: existingComponent?.id || uuidv4() });
    setIsOpen(false);
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{existingComponent ? 'Edit' : 'Add'} Component</DialogTitle>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
             <FormField control={form.control} name="name" render={({ field }) => ( <FormItem><FormLabel>Component Name</FormLabel><FormControl><Input placeholder="e.g., Propeller" {...field} /></FormControl><FormMessage /></FormItem> )}/>
             <FormField control={form.control} name="manufacturer" render={({ field }) => ( <FormItem><FormLabel>Manufacturer</FormLabel><FormControl><Input placeholder="e.g., Hartzell" {...field} value={field.value || ''} /></FormControl><FormMessage /></FormItem> )}/>
             <FormField control={form.control} name="partNumber" render={({ field }) => ( <FormItem><FormLabel>Part Number</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem> )}/>
             <FormField control={form.control} name="serialNumber" render={({ field }) => ( <FormItem><FormLabel>Serial Number</FormLabel><FormControl><Input {...field} value={field.value || ''} /></FormControl><FormMessage /></FormItem> )}/>
             <FormField
                control={form.control}
                name="installDate"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Install Date</FormLabel>
                    <FormControl>
                      <Input
                        type="date"
                        value={field.value ? format(new Date(field.value), 'yyyy-MM-dd') : ''}
                        onChange={(e) => field.onChange(e.target.value ? new Date(e.target.value).toISOString() : null)}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
             />
             <FormField control={form.control} name="installHours" render={({ field }) => ( <FormItem><FormLabel>Install Hours (Tacho)</FormLabel><FormControl><Input type="number" {...field} /></FormControl><FormMessage /></FormItem> )}/>
             <FormField control={form.control} name="maxHours" render={({ field }) => ( <FormItem><FormLabel>Max Hours (TBO)</FormLabel><FormControl><Input type="number" {...field} /></FormControl><FormMessage /></FormItem> )}/>
             <FormField control={form.control} name="notes" render={({ field }) => ( <FormItem><FormLabel>Notes</FormLabel><FormControl><Textarea {...field} value={field.value || ''} /></FormControl><FormMessage /></FormItem> )}/>
            <DialogFooter>
              <DialogClose asChild><Button type="button" variant="outline">Cancel</Button></DialogClose>
              <Button type="submit">Save Component</Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}


export function AircraftComponents({ aircraft }: { aircraft: Aircraft }) {
  const firestore = useFirestore();
  const { toast } = useToast();
  const tenantId = 'safeviate';
  const [editingComponent, setEditingComponent] = useState<AircraftComponent | null>(null);

  const handleSaveComponent = useCallback((componentData: AircraftComponent) => {
    if (!firestore || !aircraft) {
        toast({ variant: 'destructive', title: 'Error', description: 'Aircraft data is missing, cannot save component.' });
        return;
    }

    const updatedComponents = [...(aircraft.components || [])];
    const existingIndex = updatedComponents.findIndex(c => c.id === componentData.id);

    if (existingIndex > -1) {
        updatedComponents[existingIndex] = componentData;
    } else {
        updatedComponents.push(componentData);
    }
    
    const aircraftRef = doc(firestore, 'tenants', tenantId, 'aircrafts', aircraft.id);
    updateDocumentNonBlocking(aircraftRef, { components: updatedComponents });

    toast({
        title: 'Component Saved',
        description: `The component "${componentData.name}" has been saved.`,
    });
  }, [firestore, tenantId, toast, aircraft]);

  const handleDelete = (componentId: string) => {
    if (!firestore || !aircraft) return;
    const updatedComponents = (aircraft.components || []).filter(c => c.id !== componentId);
    const aircraftRef = doc(firestore, 'tenants', tenantId, 'aircrafts', aircraft.id);
    updateDocumentNonBlocking(aircraftRef, { components: updatedComponents });
    toast({ title: 'Component Deleted' });
  };
  
  if (!aircraft) {
    return <Card><CardContent><p>Loading component data...</p></CardContent></Card>
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <div>
            <CardTitle>Tracked Components</CardTitle>
            <CardDescription>A list of all time-lifed or tracked components on this aircraft.</CardDescription>
        </div>
        <ComponentFormDialog
          onSave={handleSaveComponent}
          trigger={<Button><PlusCircle className="mr-2 h-4 w-4" /> Add Component</Button>}
        />
      </CardHeader>
      <CardContent>
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
            {(aircraft.components && aircraft.components.length > 0) ? (
              aircraft.components.map((component) => (
                <TableRow key={component.id}>
                  <TableCell className="font-medium">{component.name}</TableCell>
                  <TableCell>{component.partNumber}</TableCell>
                  <TableCell>{component.serialNumber}</TableCell>
                  <TableCell>{component.installDate ? format(new Date(component.installDate), 'PPP') : 'N/A'}</TableCell>
                  <TableCell>{component.installHours}</TableCell>
                  <TableCell>{component.maxHours}</TableCell>
                  <TableCell className="text-right">
                    <ComponentFormDialog
                        onSave={handleSaveComponent}
                        existingComponent={component}
                        trigger={<Button variant="ghost" size="icon"><Edit className="h-4 w-4" /></Button>}
                    />
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
      </CardContent>
    </Card>
  );
}
