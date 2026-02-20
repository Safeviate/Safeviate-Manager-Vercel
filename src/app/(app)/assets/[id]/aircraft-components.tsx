'use client';

import { useState, useEffect } from 'react';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogClose,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { PlusCircle, Edit, Trash2, CalendarIcon } from 'lucide-react';
import { useFirestore, updateDocumentNonBlocking } from '@/firebase';
import { doc } from 'firebase/firestore';
import { useToast } from '@/hooks/use-toast';
import { v4 as uuidv4 } from 'uuid';
import type { Aircraft, AircraftComponent } from '@/types/aircraft';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { CustomCalendar } from '@/components/ui/custom-calendar';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import { useForm, Controller } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { Form, FormControl, FormField, FormItem, FormMessage } from '@/components/ui/form';

const componentSchema = z.object({
  id: z.string(),
  name: z.string().min(1, 'Component name is required.'),
  partNumber: z.string().min(1, 'Part number is required.'),
  serialNumber: z.string().optional(),
  installDate: z.date().optional(),
  installHours: z.number({ coerce: true }).optional(),
  maxHours: z.number({ coerce: true }).optional(),
  notes: z.string().optional(),
  tsn: z.number({ coerce: true }).optional(),
  tso: z.number({ coerce: true }).optional(),
});

type ComponentFormValues = z.infer<typeof componentSchema>;


interface AircraftComponentsProps {
  aircraft: Aircraft;
  aircraftId: string;
}

export function AircraftComponents({ aircraft, aircraftId }: AircraftComponentsProps) {
  const firestore = useFirestore();
  const { toast } = useToast();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingComponent, setEditingComponent] = useState<AircraftComponent | null>(null);
  
  const [components, setComponents] = useState<AircraftComponent[]>([]); 

  const form = useForm<ComponentFormValues>();

  useEffect(() => {
    if (aircraft && aircraft.components) {
        setComponents(aircraft.components);
    } else {
        setComponents([]);
    }
  }, [aircraft]);

  useEffect(() => {
    if (isDialogOpen) {
      form.reset(
        editingComponent
          ? {
              ...editingComponent,
              installDate: editingComponent.installDate ? new Date(editingComponent.installDate) : undefined,
            }
          : {
              id: uuidv4(),
              name: '',
              partNumber: '',
              serialNumber: '',
              installDate: undefined,
              installHours: 0,
              maxHours: 0,
              notes: '',
              tsn: 0,
              tso: 0,
            }
      );
    }
  }, [isDialogOpen, editingComponent, form]);
  
  const onSubmit = (data: ComponentFormValues) => {
    if (!firestore) return;

    // Sanitize data: convert empty strings to null and ensure numbers are numbers
    const sanitizedData: AircraftComponent = {
        ...data,
        installDate: data.installDate ? data.installDate.toISOString() : null,
        serialNumber: data.serialNumber || null,
        installHours: data.installHours || null,
        maxHours: data.maxHours || null,
        notes: data.notes || null,
        tsn: data.tsn || null,
        tso: data.tso || null,
    };

    let updatedComponents: AircraftComponent[];
    const existingIndex = components.findIndex((c) => c.id === sanitizedData.id);

    if (existingIndex > -1) {
        // Update existing component
        updatedComponents = [...components];
        updatedComponents[existingIndex] = sanitizedData;
    } else {
        // Add new component
        updatedComponents = [...components, sanitizedData];
    }
    
    const aircraftRef = doc(firestore, 'tenants', tenantId, 'aircrafts', aircraftId);
    updateDocumentNonBlocking(aircraftRef, { components: updatedComponents });
    
    toast({ title: editingComponent ? 'Component Updated' : 'Component Added' });
    
    setComponents(updatedComponents);
    setIsDialogOpen(false);
    setEditingComponent(null);
  };
  
  const handleDelete = (componentId: string) => {
      const updatedComponents = components.filter(c => c.id !== componentId);
      const aircraftRef = doc(firestore, 'tenants', tenantId, 'aircrafts', aircraftId);
      updateDocumentNonBlocking(aircraftRef, { components: updatedComponents });
      setComponents(updatedComponents);
      toast({ title: 'Component Deleted' });
  }

  const handleOpenDialog = (component: AircraftComponent | null = null) => {
    setEditingComponent(component);
    setIsDialogOpen(true);
  };
  

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex justify-between items-center">
            <div>
              <CardTitle>Tracked Components</CardTitle>
              <CardDescription>
                Manage time-lifed and critical components for this aircraft.
              </CardDescription>
            </div>
            <Button onClick={() => handleOpenDialog()}>
              <PlusCircle /> Add Component
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Part Number</TableHead>
                <TableHead>Serial Number</TableHead>
                <TableHead>TSN</TableHead>
                <TableHead>TSO</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {components.map((component) => (
                <TableRow key={component.id}>
                  <TableCell>{component.name}</TableCell>
                  <TableCell>{component.partNumber}</TableCell>
                  <TableCell>{component.serialNumber || 'N/A'}</TableCell>
                  <TableCell>{component.tsn ?? 'N/A'}</TableCell>
                  <TableCell>{component.tso ?? 'N/A'}</TableCell>
                  <TableCell className="text-right">
                     <Button variant="ghost" size="icon" onClick={() => handleOpenDialog(component)}>
                        <Edit className="h-4 w-4" />
                     </Button>
                     <Button variant="ghost" size="icon" onClick={() => handleDelete(component.id)}>
                        <Trash2 className="h-4 w-4 text-destructive" />
                     </Button>
                  </TableCell>
                </TableRow>
              ))}
               {components.length === 0 && (
                <TableRow>
                    <TableCell colSpan={6} className="text-center h-24">
                        No components added yet.
                    </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>
              {editingComponent ? 'Edit Component' : 'Add New Component'}
            </DialogTitle>
          </DialogHeader>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                    <FormField control={form.control} name="name" render={({ field }) => ( <FormItem><FormLabel>Component Name</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem> )} />
                    <FormField control={form.control} name="partNumber" render={({ field }) => ( <FormItem><FormLabel>Part Number</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem> )} />
                    <FormField control={form.control} name="serialNumber" render={({ field }) => ( <FormItem><FormLabel>Serial Number</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem> )} />
                    <FormField control={form.control} name="installDate" render={({ field }) => (
                         <FormItem className="flex flex-col pt-2">
                             <FormLabel>Install Date</FormLabel>
                             <Popover modal={false}>
                                 <PopoverTrigger asChild>
                                     <FormControl>
                                         <Button variant="outline" className={cn('pl-3 text-left font-normal', !field.value && 'text-muted-foreground')}>
                                             {field.value ? format(field.value, 'PPP') : <span>Pick a date</span>}
                                             <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                                         </Button>
                                     </FormControl>
                                 </PopoverTrigger>
                                 <PopoverContent className="w-auto p-0" align="start">
                                     <CustomCalendar selectedDate={field.value} onDateSelect={field.onChange} />
                                 </PopoverContent>
                             </Popover>
                             <FormMessage />
                         </FormItem>
                    )} />
                    <FormField control={form.control} name="installHours" render={({ field }) => ( <FormItem><FormLabel>Install Hours (Hobbs)</FormLabel><FormControl><Input type="number" {...field} /></FormControl><FormMessage /></FormItem> )} />
                    <FormField control={form.control} name="maxHours" render={({ field }) => ( <FormItem><FormLabel>Max Hours (TBO)</FormLabel><FormControl><Input type="number" {...field} /></FormControl><FormMessage /></FormItem> )} />
                    <FormField control={form.control} name="tsn" render={({ field }) => ( <FormItem><FormLabel>Time Since New (TSN)</FormLabel><FormControl><Input type="number" {...field} /></FormControl><FormMessage /></FormItem> )} />
                    <FormField control={form.control} name="tso" render={({ field }) => ( <FormItem><FormLabel>Time Since Overhaul (TSO)</FormLabel><FormControl><Input type="number" {...field} /></FormControl><FormMessage /></FormItem> )} />
                    <FormField control={form.control} name="notes" render={({ field }) => ( <FormItem className='col-span-2'><FormLabel>Notes</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem> )} />
                </div>
                <DialogFooter>
                    <DialogClose asChild><Button type="button" variant="outline">Cancel</Button></DialogClose>
                    <Button type="submit">{editingComponent ? 'Save Changes' : 'Add Component'}</Button>
                </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </>
  );
}
