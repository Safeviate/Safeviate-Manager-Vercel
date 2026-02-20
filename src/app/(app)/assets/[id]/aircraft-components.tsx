
'use client';

import { useState, useMemo, useEffect, useCallback } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { v4 as uuidv4 } from 'uuid';
import { Button } from '@/components/ui/button';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogClose,
} from '@/components/ui/dialog';
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { PlusCircle, MoreHorizontal, Pencil, Trash2, CalendarIcon } from 'lucide-react';
import { useFirestore, updateDocumentNonBlocking } from '@/firebase';
import { doc } from 'firebase/firestore';
import { useToast } from '@/hooks/use-toast';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { CustomCalendar } from '@/components/ui/custom-calendar';
import type { Aircraft, AircraftComponent } from '@/types/aircraft';


const componentSchema = z.object({
    id: z.string(),
    name: z.string().min(1, 'Component name is required.'),
    partNumber: z.string().min(1, 'Part number is required.'),
    serialNumber: z.string().optional(),
    installDate: z.date().optional().nullable(),
    installHours: z.number({ coerce: true }).optional(),
    maxHours: z.number({ coerce: true }).optional(),
    tsn: z.number({ coerce: true }).optional(),
    tso: z.number({ coerce: true }).optional(),
    notes: z.string().optional(),
});

type ComponentFormValues = z.infer<typeof componentSchema>;

interface AircraftComponentsProps {
  aircraft: Aircraft;
  tenantId: string;
}

export function AircraftComponents({ aircraft, tenantId }: AircraftComponentsProps) {
  const firestore = useFirestore();
  const { toast } = useToast();

  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingComponent, setEditingComponent] = useState<AircraftComponent | null>(null);
  const [isDeleteConfirmOpen, setIsDeleteConfirmOpen] = useState(false);
  const [componentToDelete, setComponentToDelete] = useState<AircraftComponent | null>(null);
  const [isCalendarOpen, setIsCalendarOpen] = useState(false);

  const form = useForm<ComponentFormValues>({
    resolver: zodResolver(componentSchema),
    defaultValues: {
      id: '',
      name: '',
      partNumber: '',
      serialNumber: '',
      installDate: null,
      installHours: undefined,
      maxHours: undefined,
      tsn: undefined,
      tso: undefined,
      notes: '',
    },
  });

  const handleOpenForm = (component?: AircraftComponent) => {
    if (component) {
      setEditingComponent(component);
      form.reset({
        ...component,
        installDate: component.installDate ? new Date(component.installDate) : null,
        installHours: component.installHours ?? undefined,
        maxHours: component.maxHours ?? undefined,
        tsn: component.tsn ?? undefined,
        tso: component.tso ?? undefined,
      });
    } else {
      setEditingComponent(null);
      form.reset({
        id: uuidv4(),
        name: '',
        partNumber: '',
        serialNumber: '',
        installDate: new Date(),
        installHours: aircraft.frameHours,
        maxHours: undefined,
        tsn: undefined,
        tso: undefined,
        notes: '',
      });
    }
    setIsFormOpen(true);
  };
  
  const onSubmit = (values: ComponentFormValues) => {
    if (!firestore) return;

    const components = aircraft.components || [];
    let updatedComponents: AircraftComponent[];

    // Convert any undefined numeric fields to null for Firestore compatibility
    const componentData: AircraftComponent = {
        ...values,
        installDate: values.installDate ? values.installDate.toISOString() : undefined,
        installHours: values.installHours ?? null,
        maxHours: values.maxHours ?? null,
        tsn: values.tsn ?? null,
        tso: values.tso ?? null,
        notes: values.notes ?? undefined,
    };
    
    if (editingComponent) {
      updatedComponents = components.map(c => c.id === editingComponent.id ? componentData : c);
    } else {
      updatedComponents = [...components, componentData];
    }
    
    const aircraftRef = doc(firestore, `tenants/${tenantId}/aircrafts`, aircraft.id);
    updateDocumentNonBlocking(aircraftRef, { components: updatedComponents });
    
    toast({
      title: editingComponent ? 'Component Updated' : 'Component Added',
      description: `The component "${values.name}" has been saved.`,
    });
    
    setIsFormOpen(false);
  };
  
  const handleDelete = () => {
    if (!firestore || !componentToDelete) return;
    
    const updatedComponents = (aircraft.components || []).filter(c => c.id !== componentToDelete.id);
    const aircraftRef = doc(firestore, `tenants/${tenantId}/aircrafts`, aircraft.id);
    updateDocumentNonBlocking(aircraftRef, { components: updatedComponents });

    toast({
      title: 'Component Deleted',
      description: `The component "${componentToDelete.name}" has been deleted.`,
    });
    
    setIsDeleteConfirmOpen(false);
    setComponentToDelete(null);
  };

  const openDeleteConfirm = (component: AircraftComponent) => {
    setComponentToDelete(component);
    setIsDeleteConfirmOpen(true);
  };

  return (
    <>
      <div className="flex justify-end mb-4">
        <Button onClick={() => handleOpenForm()}>
          <PlusCircle className="mr-2 h-4 w-4" /> Add Component
        </Button>
      </div>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Name</TableHead>
            <TableHead>Part No.</TableHead>
            <TableHead>Serial No.</TableHead>
            <TableHead>Install Date</TableHead>
            <TableHead>Install Hours</TableHead>
            <TableHead>Max Hours</TableHead>
            <TableHead>TSN</TableHead>
            <TableHead>TSO</TableHead>
            <TableHead className="text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {(aircraft.components && aircraft.components.length > 0) ? (
            aircraft.components.map((component) => (
              <TableRow key={component.id}>
                <TableCell>{component.name}</TableCell>
                <TableCell>{component.partNumber}</TableCell>
                <TableCell>{component.serialNumber || 'N/A'}</TableCell>
                <TableCell>{component.installDate ? format(new Date(component.installDate), 'PPP') : 'N/A'}</TableCell>
                <TableCell>{component.installHours ?? 'N/A'}</TableCell>
                <TableCell>{component.maxHours ?? 'N/A'}</TableCell>
                <TableCell>{component.tsn ?? 'N/A'}</TableCell>
                <TableCell>{component.tso ?? 'N/A'}</TableCell>
                <TableCell className="text-right">
                  <Button variant="ghost" size="icon" onClick={() => handleOpenForm(component)}><Pencil className="h-4 w-4" /></Button>
                  <Button variant="ghost" size="icon" onClick={() => openDeleteConfirm(component)}><Trash2 className="h-4 w-4 text-destructive" /></Button>
                </TableCell>
              </TableRow>
            ))
          ) : (
            <TableRow>
              <TableCell colSpan={9} className="h-24 text-center">
                No components added yet.
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
      
      <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
        <DialogContent className="sm:max-w-3xl">
          <DialogHeader>
            <DialogTitle>{editingComponent ? 'Edit Component' : 'Add New Component'}</DialogTitle>
            <DialogDescription>
              {editingComponent ? `Editing details for ${editingComponent.name}.` : 'Add a new trackable component to this aircraft.'}
            </DialogDescription>
          </DialogHeader>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
               <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <FormField control={form.control} name="name" render={({ field }) => ( <FormItem><FormLabel>Component Name</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem> )}/>
                  <FormField control={form.control} name="partNumber" render={({ field }) => ( <FormItem><FormLabel>Part Number</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem> )}/>
                  <FormField control={form.control} name="serialNumber" render={({ field }) => ( <FormItem><FormLabel>Serial Number</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem> )}/>
                  
                  <FormField
                    control={form.control}
                    name="installDate"
                    render={({ field }) => (
                      <FormItem className="flex flex-col">
                        <FormLabel>Install Date</FormLabel>
                        <Popover open={isCalendarOpen} onOpenChange={setIsCalendarOpen} modal={false}>
                          <PopoverTrigger asChild>
                            <FormControl>
                              <Button variant="outline" className={cn('pl-3 text-left font-normal', !field.value && 'text-muted-foreground' )}>
                                {field.value ? format(field.value, 'PPP') : <span>Pick a date</span>}
                                <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                              </Button>
                            </FormControl>
                          </PopoverTrigger>
                          <PopoverContent className="w-auto p-0" align="start">
                            <CustomCalendar
                              selectedDate={field.value ?? undefined}
                              onDateSelect={(date) => {
                                  field.onChange(date);
                                  setIsCalendarOpen(false);
                              }}
                            />
                          </PopoverContent>
                        </Popover>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField control={form.control} name="installHours" render={({ field }) => ( <FormItem><FormLabel>Install Hours</FormLabel><FormControl><Input type="number" {...field} value={field.value ?? ''} /></FormControl><FormMessage /></FormItem> )}/>
                  <FormField control={form.control} name="maxHours" render={({ field }) => ( <FormItem><FormLabel>Max Hours</FormLabel><FormControl><Input type="number" {...field} value={field.value ?? ''} /></FormControl><FormMessage /></FormItem> )}/>
                  <FormField control={form.control} name="tsn" render={({ field }) => ( <FormItem><FormLabel>TSN (Time Since New)</FormLabel><FormControl><Input type="number" {...field} value={field.value ?? ''} /></FormControl><FormMessage /></FormItem> )}/>
                  <FormField control={form.control} name="tso" render={({ field }) => ( <FormItem><FormLabel>TSO (Time Since Overhaul)</FormLabel><FormControl><Input type="number" {...field} value={field.value ?? ''} /></FormControl><FormMessage /></FormItem> )}/>

                  <FormField control={form.control} name="notes" render={({ field }) => ( <FormItem className="md:col-span-2"><FormLabel>Notes</FormLabel><FormControl><Textarea {...field} /></FormControl><FormMessage /></FormItem> )}/>
              </div>
              <DialogFooter>
                <DialogClose asChild><Button type="button" variant="outline">Cancel</Button></DialogClose>
                <Button type="submit">Save Changes</Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
      
      <AlertDialog open={isDeleteConfirmOpen} onOpenChange={setIsDeleteConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete the component &quot;{componentToDelete?.name}&quot;.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive hover:bg-destructive/90">Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

    