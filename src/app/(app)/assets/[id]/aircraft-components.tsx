
'use client';

import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { v4 as uuidv4 } from 'uuid';
import { format } from 'date-fns';

import { useFirestore, updateDocumentNonBlocking } from '@/firebase';
import { doc } from 'firebase/firestore';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { CustomCalendar } from '@/components/ui/custom-calendar';
import { PlusCircle, Edit, Trash2, CalendarIcon } from 'lucide-react';


// 1. Zod Schema for validation
const componentFormSchema = z.object({
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

type ComponentFormValues = z.infer<typeof componentFormSchema>;

interface AircraftComponentsProps {
  aircraft: Aircraft;
  tenantId: string;
}

export function AircraftComponents({ aircraft, tenantId }: AircraftComponentsProps) {
  const firestore = useFirestore();
  const { toast } = useToast();
  
  // State for the list of components
  const [components, setComponents] = useState<AircraftComponent[]>([]);
  
  // State for dialogs
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [componentToDelete, setComponentToDelete] = useState<AircraftComponent | null>(null);
  const [editingComponent, setEditingComponent] = useState<AircraftComponent | null>(null);

  // Sync state with prop
  useEffect(() => {
    setComponents(aircraft.components || []);
  }, [aircraft.components]);
  
  // React Hook Form
  const form = useForm<ComponentFormValues>({
    resolver: zodResolver(componentFormSchema),
  });

  // Open dialog for adding
  const handleAddComponent = () => {
    form.reset({
      name: '',
      partNumber: '',
      serialNumber: '',
      installDate: undefined,
      installHours: undefined,
      maxHours: undefined,
      notes: '',
      tsn: undefined,
      tso: undefined,
    });
    setEditingComponent(null);
    setIsFormOpen(true);
  };
  
  // Open dialog for editing
  const handleEditComponent = (component: AircraftComponent) => {
    form.reset({
      ...component,
      installDate: component.installDate ? new Date(component.installDate) : undefined,
    });
    setEditingComponent(component);
    setIsFormOpen(true);
  };

  // Handle form submission (Add or Edit)
  const onSubmit = (values: ComponentFormValues) => {
    let updatedComponents;
    const newComponentData: AircraftComponent = {
      ...values,
      id: editingComponent ? editingComponent.id : uuidv4(),
      installDate: values.installDate ? values.installDate.toISOString() : null,
      serialNumber: values.serialNumber || null,
      installHours: values.installHours || null,
      maxHours: values.maxHours || null,
      notes: values.notes || null,
      tsn: values.tsn || null,
      tso: values.tso || null,
    };
    
    if (editingComponent) {
      updatedComponents = components.map(c => c.id === editingComponent.id ? newComponentData : c);
      toast({ title: 'Component Updated' });
    } else {
      updatedComponents = [...components, newComponentData];
      toast({ title: 'Component Added' });
    }

    setComponents(updatedComponents);
    saveComponentsToFirestore(updatedComponents);
    setIsFormOpen(false);
  };

  // Handle deletion
  const handleDeleteComponent = () => {
    if (!componentToDelete) return;
    const updatedComponents = components.filter(c => c.id !== componentToDelete.id);
    setComponents(updatedComponents);
    saveComponentsToFirestore(updatedComponents);
    setComponentToDelete(null);
    toast({ title: 'Component Deleted' });
  };
  
  // Save the entire components array to Firestore
  const saveComponentsToFirestore = (updatedComponents: AircraftComponent[]) => {
    if (!firestore) return;
    const aircraftRef = doc(firestore, `tenants/${tenantId}/aircrafts`, aircraft.id);
    updateDocumentNonBlocking(aircraftRef, { components: updatedComponents });
  }

  return (
    <>
      <div className="flex justify-end mb-4">
        <Button onClick={handleAddComponent}>
          <PlusCircle /> Add Component
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
              {components.map((component) => (
                <TableRow key={component.id}>
                  <TableCell>{component.name}</TableCell>
                  <TableCell>{component.partNumber}</TableCell>
                  <TableCell>{component.serialNumber || 'N/A'}</TableCell>
                  <TableCell>{component.tsn ?? 'N/A'}</TableCell>
                  <TableCell>{component.tso ?? 'N/A'}</TableCell>
                  <TableCell className="text-right">
                    <Button variant="ghost" size="icon" onClick={() => handleEditComponent(component)}>
                      <Edit />
                    </Button>
                    <Button variant="ghost" size="icon" className="text-destructive" onClick={() => setComponentToDelete(component)}>
                      <Trash2 />
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
      
      {/* Add/Edit Dialog */}
      <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
        <DialogContent>
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
                          <Popover modal={false}>
                            <PopoverTrigger asChild>
                              <FormControl>
                                <Button
                                  variant={"outline"}
                                  className={cn("pl-3 text-left font-normal", !field.value && "text-muted-foreground")}
                                >
                                  {field.value ? format(field.value, "PPP") : <span>Pick a date</span>}
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
                      )}
                    />
                    <FormField control={form.control} name="installHours" render={({ field }) => ( <FormItem><FormLabel>Install Hours</FormLabel><FormControl><Input type="number" {...field} /></FormControl><FormMessage /></FormItem> )} />
                    <FormField control={form.control} name="maxHours" render={({ field }) => ( <FormItem><FormLabel>Max Hours</FormLabel><FormControl><Input type="number" {...field} /></FormControl><FormMessage /></FormItem> )} />
                    <FormField control={form.control} name="tsn" render={({ field }) => ( <FormItem><FormLabel>TSN</FormLabel><FormControl><Input type="number" {...field} /></FormControl><FormMessage /></FormItem> )} />
                    <FormField control={form.control} name="tso" render={({ field }) => ( <FormItem><FormLabel>TSO</FormLabel><FormControl><Input type="number" {...field} /></FormControl><FormMessage /></FormItem> )} />
                    <FormField control={form.control} name="notes" render={({ field }) => ( <FormItem className="col-span-2"><FormLabel>Notes</FormLabel><FormControl><Textarea {...field} /></FormControl><FormMessage /></FormItem> )} />
                </div>
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setIsFormOpen(false)}>Cancel</Button>
                <Button type="submit">Save Component</Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={!!componentToDelete} onOpenChange={() => setComponentToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete the component &quot;{componentToDelete?.name}&quot;.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setComponentToDelete(null)}>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteComponent}>Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
