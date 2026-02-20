
'use client';

import { useState, useEffect } from 'react';
import { useForm, useFieldArray } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
    DialogClose
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
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { PlusCircle, Edit, Trash2, CalendarIcon } from 'lucide-react';
import { v4 as uuidv4 } from 'uuid';
import { useFirestore, updateDocumentNonBlocking } from '@/firebase';
import { doc } from 'firebase/firestore';
import { useToast } from '@/hooks/use-toast';
import type { Aircraft, AircraftComponent } from '@/types/aircraft';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { CustomCalendar } from '@/components/ui/custom-calendar';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import { usePermissions } from '@/hooks/use-permissions';

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

function ComponentForm({ aircraft, onFormSubmit, existingComponent }: { aircraft: Aircraft; onFormSubmit: (components: AircraftComponent[]) => void; existingComponent?: AircraftComponent | null }) {
  const { toast } = useToast();
  const [isCalendarOpen, setIsCalendarOpen] = useState(false);

  const form = useForm<ComponentFormValues>({
    resolver: zodResolver(componentSchema),
    defaultValues: existingComponent ? {
        ...existingComponent,
        installDate: existingComponent.installDate ? new Date(existingComponent.installDate) : undefined,
    } : {
      id: uuidv4(),
      name: '',
      partNumber: '',
      serialNumber: '',
      installDate: undefined,
      installHours: 0,
      maxHours: 0,
      tsn: 0,
      tso: 0,
      notes: '',
    },
  });

  const onSubmit = (values: ComponentFormValues) => {
    const componentData: AircraftComponent = {
        ...values,
        installDate: values.installDate ? values.installDate.toISOString() : undefined,
    };

    let updatedComponents: AircraftComponent[];

    if (existingComponent) {
      updatedComponents = (aircraft.components || []).map(c => c.id === existingComponent.id ? componentData : c);
      toast({ title: 'Component Updated' });
    } else {
      updatedComponents = [...(aircraft.components || []), componentData];
      toast({ title: 'Component Added' });
    }
    
    onFormSubmit(updatedComponents);
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        <DialogHeader>
          <DialogTitle>{existingComponent ? 'Edit Component' : 'Add New Component'}</DialogTitle>
          <DialogDescription>
            {existingComponent ? `Editing ${existingComponent.name}` : `Add a new component to ${aircraft.tailNumber}`}
          </DialogDescription>
        </DialogHeader>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <FormField control={form.control} name="name" render={({ field }) => ( <FormItem><FormLabel>Component Name</FormLabel><FormControl><Input placeholder="e.g., Propeller" {...field} /></FormControl><FormMessage /></FormItem> )} />
            <FormField control={form.control} name="partNumber" render={({ field }) => ( <FormItem><FormLabel>Part Number</FormLabel><FormControl><Input placeholder="e.g., PROP-345" {...field} /></FormControl><FormMessage /></FormItem> )} />
            <FormField control={form.control} name="serialNumber" render={({ field }) => ( <FormItem><FormLabel>Serial Number</FormLabel><FormControl><Input placeholder="e.g., 444" {...field} /></FormControl><FormMessage /></FormItem> )} />
            <FormField control={form.control} name="installDate" render={({ field }) => (
                <FormItem className="flex flex-col">
                    <FormLabel>Install Date</FormLabel>
                    <Popover open={isCalendarOpen} onOpenChange={setIsCalendarOpen} modal={false}>
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
                            <CustomCalendar
                                selectedDate={field.value}
                                onDateSelect={(date) => {
                                    field.onChange(date);
                                    setIsCalendarOpen(false);
                                }}
                            />
                        </PopoverContent>
                    </Popover>
                    <FormMessage />
                </FormItem>
            )} />
            <FormField control={form.control} name="installHours" render={({ field }) => ( <FormItem><FormLabel>Install Hours</FormLabel><FormControl><Input type="number" placeholder="e.g., 234" {...field} /></FormControl><FormMessage /></FormItem> )} />
            <FormField control={form.control} name="maxHours" render={({ field }) => ( <FormItem><FormLabel>Max Hours</FormLabel><FormControl><Input type="number" placeholder="e.g., 2000" {...field} /></FormControl><FormMessage /></FormItem> )} />
            <FormField control={form.control} name="tsn" render={({ field }) => ( <FormItem><FormLabel>TSN (Time Since New)</FormLabel><FormControl><Input type="number" {...field} /></FormControl><FormMessage /></FormItem> )} />
            <FormField control={form.control} name="tso" render={({ field }) => ( <FormItem><FormLabel>TSO (Time Since Overhaul)</FormLabel><FormControl><Input type="number" {...field} /></FormControl><FormMessage /></FormItem> )} />
            <div className="md:col-span-2">
                <FormField control={form.control} name="notes" render={({ field }) => ( <FormItem><FormLabel>Notes</FormLabel><FormControl><Textarea placeholder="Any relevant notes..." {...field} /></FormControl><FormMessage /></FormItem> )} />
            </div>
        </div>
        <DialogFooter>
          <DialogClose asChild>
            <Button type="button" variant="outline">Cancel</Button>
          </DialogClose>
          <Button type="submit">{existingComponent ? 'Save Changes' : 'Save Component'}</Button>
        </DialogFooter>
      </form>
    </Form>
  );
}


export function AircraftComponents({ aircraft, tenantId }: { aircraft: Aircraft; tenantId: string }) {
  const firestore = useFirestore();
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isDeleteAlertOpen, setIsDeleteAlertOpen] = useState(false);
  const [selectedComponent, setSelectedComponent] = useState<AircraftComponent | null>(null);
  const { hasPermission } = usePermissions();

  const canManageAssets = hasPermission('assets-edit');

  const handleFormSubmit = (updatedComponents: AircraftComponent[]) => {
    if (!firestore) return;
    const aircraftRef = doc(firestore, 'tenants', tenantId, 'aircrafts', aircraft.id);
    updateDocumentNonBlocking(aircraftRef, { components: updatedComponents });
    setIsFormOpen(false);
    setSelectedComponent(null);
  };

  const handleEdit = (component: AircraftComponent) => {
    setSelectedComponent(component);
    setIsFormOpen(true);
  };

  const handleDelete = (component: AircraftComponent) => {
    setSelectedComponent(component);
    setIsDeleteAlertOpen(true);
  };

  const confirmDelete = () => {
    if (!firestore || !selectedComponent) return;
    const updatedComponents = (aircraft.components || []).filter(c => c.id !== selectedComponent.id);
    const aircraftRef = doc(firestore, 'tenants', tenantId, 'aircrafts', aircraft.id);
    updateDocumentNonBlocking(aircraftRef, { components: updatedComponents });
    setIsDeleteAlertOpen(false);
    setSelectedComponent(null);
  }

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex justify-between items-center">
            <div>
              <CardTitle>Components</CardTitle>
              <CardDescription>Trackable components installed on this aircraft.</CardDescription>
            </div>
            {canManageAssets && (
                <Button onClick={() => { setSelectedComponent(null); setIsFormOpen(true); }}><PlusCircle className="mr-2" /> Add Component</Button>
            )}
          </div>
        </CardHeader>
        <CardContent>
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
              {(aircraft.components || []).length > 0 ? (
                aircraft.components?.map(comp => (
                  <TableRow key={comp.id}>
                    <TableCell className="font-medium">{comp.name}</TableCell>
                    <TableCell>{comp.partNumber}</TableCell>
                    <TableCell>{comp.serialNumber}</TableCell>
                    <TableCell>{comp.installDate ? format(new Date(comp.installDate), 'PPP') : 'N/A'}</TableCell>
                    <TableCell>{comp.installHours}</TableCell>
                    <TableCell>{comp.maxHours}</TableCell>
                    <TableCell>{comp.tsn}</TableCell>
                    <TableCell>{comp.tso}</TableCell>
                    <TableCell className="text-right">
                      {canManageAssets && (
                          <div className="flex gap-2 justify-end">
                              <Button variant="ghost" size="icon" onClick={() => handleEdit(comp)}><Edit className="h-4 w-4" /></Button>
                              <Button variant="ghost" size="icon" className="text-destructive hover:text-destructive" onClick={() => handleDelete(comp)}><Trash2 className="h-4 w-4" /></Button>
                          </div>
                      )}
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={9} className="text-center h-24">No components added yet.</TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
      
      <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
        <DialogContent>
          <ComponentForm aircraft={aircraft} onFormSubmit={handleFormSubmit} existingComponent={selectedComponent} />
        </DialogContent>
      </Dialog>
      
      <AlertDialog open={isDeleteAlertOpen} onOpenChange={setIsDeleteAlertOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>This will permanently delete the component &quot;{selectedComponent?.name}&quot;.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDelete}>Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
