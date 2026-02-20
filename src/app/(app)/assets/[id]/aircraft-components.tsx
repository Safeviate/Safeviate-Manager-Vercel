
'use client';

import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { format } from 'date-fns';
import { v4 as uuidv4 } from 'uuid';
import { doc } from 'firebase/firestore';
import { cn } from '@/lib/utils';

import { useFirestore, updateDocumentNonBlocking } from '@/firebase';
import { useToast } from '@/hooks/use-toast';

import type { Aircraft, AircraftComponent } from '@/types/aircraft';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
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
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { CalendarIcon, PlusCircle, Edit, Trash2 } from 'lucide-react';


// 1. Zod Schema for robust validation
const componentSchema = z.object({
  id: z.string(),
  name: z.string().min(1, 'Component name is required.'),
  partNumber: z.string().min(1, 'Part number is required.'),
  serialNumber: z.string().optional(),
  installDate: z.date().optional().nullable(),
  installHours: z.coerce.number().optional().nullable(),
  maxHours: z.coerce.number().optional().nullable(),
  tsn: z.coerce.number().optional().nullable(),
  tso: z.coerce.number().optional().nullable(),
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

  // 2. Clean and separate state management
  const [components, setComponents] = useState<AircraftComponent[]>([]);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isDeleteConfirmOpen, setIsDeleteConfirmOpen] = useState(false);
  const [editingComponent, setEditingComponent] = useState<AircraftComponent | null>(null);
  const [componentToDelete, setComponentToDelete] = useState<AircraftComponent | null>(null);
  const [isCalendarOpen, setIsCalendarOpen] = useState(false);

  // 3. Sync state with aircraft data reliably
  useEffect(() => {
    setComponents(aircraft.components || []);
  }, [aircraft.components]);

  const form = useForm<ComponentFormValues>({
    resolver: zodResolver(componentSchema),
  });

  // 4. Unified form submission logic
  const onSubmit = (values: ComponentFormValues) => {
    let updatedComponents;
    
    // Sanitize data: Ensure empty optional number fields become null
    const sanitizedValues: AircraftComponent = {
        ...values,
        installDate: values.installDate ? values.installDate.toISOString() : null,
        installHours: isNaN(values.installHours!) ? null : values.installHours,
        maxHours: isNaN(values.maxHours!) ? null : values.maxHours,
        tsn: isNaN(values.tsn!) ? null : values.tsn,
        tso: isNaN(values.tso!) ? null : values.tso,
        serialNumber: values.serialNumber || null,
        notes: values.notes || null,
    };

    if (editingComponent) {
      // Update existing component
      updatedComponents = components.map((c) =>
        c.id === editingComponent.id ? sanitizedValues : c
      );
    } else {
      // Add new component
      updatedComponents = [...components, sanitizedValues];
    }

    setComponents(updatedComponents);

    const aircraftRef = doc(firestore, 'tenants', tenantId, 'aircrafts', aircraft.id);
    updateDocumentNonBlocking(aircraftRef, { components: updatedComponents });

    toast({
      title: `Component ${editingComponent ? 'Updated' : 'Added'}`,
      description: `"${values.name}" has been saved.`,
    });

    setIsDialogOpen(false);
    setEditingComponent(null);
  };
  
  // 5. Handlers to open dialogs for add/edit/delete
  const handleAddNew = () => {
    form.reset({
      id: uuidv4(),
      name: '',
      partNumber: '',
      serialNumber: '',
      installDate: null,
      installHours: undefined,
      maxHours: undefined,
      tsn: undefined,
      tso: undefined,
      notes: '',
    });
    setEditingComponent(null);
    setIsDialogOpen(true);
  };

  const handleEdit = (component: AircraftComponent) => {
    form.reset({
      ...component,
      installDate: component.installDate ? new Date(component.installDate) : null,
    });
    setEditingComponent(component);
    setIsDialogOpen(true);
  };
  
  const openDeleteConfirmation = (component: AircraftComponent) => {
    setComponentToDelete(component);
    setIsDeleteConfirmOpen(true);
  };

  const handleDelete = () => {
    if (!componentToDelete) return;

    const updatedComponents = components.filter((c) => c.id !== componentToDelete.id);
    setComponents(updatedComponents);

    const aircraftRef = doc(firestore, 'tenants', tenantId, 'aircrafts', aircraft.id);
    updateDocumentNonBlocking(aircraftRef, { components: updatedComponents });

    toast({
      title: 'Component Deleted',
      description: `"${componentToDelete.name}" has been removed.`,
    });

    setIsDeleteConfirmOpen(false);
    setComponentToDelete(null);
  };

  return (
    <>
      <div className="flex justify-end mb-4">
        <Button onClick={handleAddNew}>
          <PlusCircle className="mr-2 h-4 w-4" /> Add Component
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Tracked Components</CardTitle>
          <CardDescription>A list of all tracked components installed on this aircraft.</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Component</TableHead>
                <TableHead>Part No.</TableHead>
                <TableHead>Serial No.</TableHead>
                <TableHead>TSN</TableHead>
                <TableHead>TSO</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {components.length > 0 ? (
                components.map((component) => (
                  <TableRow key={component.id}>
                    <TableCell>{component.name}</TableCell>
                    <TableCell>{component.partNumber}</TableCell>
                    <TableCell>{component.serialNumber || 'N/A'}</TableCell>
                    <TableCell>{component.tsn ?? 'N/A'}</TableCell>
                    <TableCell>{component.tso ?? 'N/A'}</TableCell>
                    <TableCell className="text-right">
                      <Button variant="ghost" size="icon" onClick={() => handleEdit(component)}>
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="icon" onClick={() => openDeleteConfirmation(component)}>
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              ) : (
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
      
      {/* Add/Edit Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>{editingComponent ? 'Edit Component' : 'Add New Component'}</DialogTitle>
          </DialogHeader>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                    <FormField control={form.control} name="name" render={({ field }) => ( <FormItem><FormLabel>Component Name</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem> )} />
                    <FormField control={form.control} name="partNumber" render={({ field }) => ( <FormItem><FormLabel>Part Number</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem> )} />
                    <FormField control={form.control} name="serialNumber" render={({ field }) => ( <FormItem><FormLabel>Serial Number</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem> )} />
                    <FormField
                        control={form.control}
                        name="installDate"
                        render={({ field }) => (
                            <FormItem className="flex flex-col">
                                <FormLabel>Install Date</FormLabel>
                                <Popover modal={false} open={isCalendarOpen} onOpenChange={setIsCalendarOpen}>
                                    <PopoverTrigger asChild>
                                        <FormControl>
                                            <Button
                                                variant="outline"
                                                className={cn('pl-3 text-left font-normal', !field.value && 'text-muted-foreground')}
                                            >
                                                {field.value ? format(field.value, 'PPP') : <span>Pick a date</span>}
                                                <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                                            </Button>
                                        </FormControl>
                                    </PopoverTrigger>
                                    <PopoverContent className="w-auto p-0" align="start">
                                        <Calendar
                                            mode="single"
                                            selected={field.value || undefined}
                                            onSelect={(date) => {
                                                field.onChange(date);
                                                setIsCalendarOpen(false); // Close on selection
                                            }}
                                            disabled={(date) => date > new Date()}
                                            initialFocus
                                        />
                                    </PopoverContent>
                                </Popover>
                                <FormMessage />
                            </FormItem>
                        )}
                    />
                    <FormField control={form.control} name="installHours" render={({ field }) => ( <FormItem><FormLabel>Install Hours</FormLabel><FormControl><Input type="number" {...field} value={field.value ?? ''} /></FormControl><FormMessage /></FormItem> )} />
                    <FormField control={form.control} name="maxHours" render={({ field }) => ( <FormItem><FormLabel>Max Hours</FormLabel><FormControl><Input type="number" {...field} value={field.value ?? ''} /></FormControl><FormMessage /></FormItem> )} />
                    <FormField control={form.control} name="tsn" render={({ field }) => ( <FormItem><FormLabel>TSN</FormLabel><FormControl><Input type="number" {...field} value={field.value ?? ''} /></FormControl><FormMessage /></FormItem> )} />
                    <FormField control={form.control} name="tso" render={({ field }) => ( <FormItem><FormLabel>TSO</FormLabel><FormControl><Input type="number" {...field} value={field.value ?? ''} /></FormControl><FormMessage /></FormItem> )} />
                </div>
                <FormField control={form.control} name="notes" render={({ field }) => ( <FormItem><FormLabel>Notes</FormLabel><FormControl><Textarea {...field} /></FormControl><FormMessage /></FormItem> )} />
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>Cancel</Button>
                <Button type="submit">Save Component</Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
      
      {/* Delete Confirmation Dialog */}
       <AlertDialog open={isDeleteConfirmOpen} onOpenChange={setIsDeleteConfirmOpen}>
            <AlertDialogContent>
                <AlertDialogHeader>
                    <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                    <AlertDialogDescription>
                        This will permanently delete the component &quot;{componentToDelete?.name}&quot;.
                    </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                    <AlertDialogCancel onClick={() => setComponentToDelete(null)}>Cancel</AlertDialogCancel>
                    <AlertDialogAction onClick={handleDelete} className="bg-destructive hover:bg-destructive/90">Delete</AlertDialogAction>
                </AlertDialogFooter>
            </AlertDialogContent>
        </AlertDialog>
    </>
  );
}
