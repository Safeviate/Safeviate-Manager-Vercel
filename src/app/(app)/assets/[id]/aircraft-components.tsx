
'use client';

import * as React from 'react';
import { useMemo, useState } from 'react';
import { useCollection, useFirestore, useMemoFirebase, addDocumentNonBlocking, updateDocumentNonBlocking, deleteDocumentNonBlocking } from '@/firebase';
import { collection, doc, arrayUnion, arrayRemove } from 'firebase/firestore';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { format } from 'date-fns';

import type { Aircraft, AircraftComponent } from '@/types/aircraft';
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
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { CustomCalendar } from '@/components/ui/custom-calendar';
import { PlusCircle, Edit, Trash2, CalendarIcon } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import { v4 as uuidv4 } from 'uuid';
import { usePermissions } from '@/hooks/use-permissions';

const componentFormSchema = z.object({
  id: z.string().default(() => uuidv4()),
  name: z.string().min(1, 'Component name is required.'),
  partNumber: z.string().min(1, 'Part number is required.'),
  serialNumber: z.string().optional(),
  installDate: z.string().optional(),
  installHours: z.coerce.number().optional(),
  maxHours: z.coerce.number().optional(),
  tsn: z.coerce.number().optional(),
  tso: z.coerce.number().optional(),
  notes: z.string().optional(),
});

type ComponentFormValues = z.infer<typeof componentFormSchema>;

interface ComponentFormProps {
  aircraftId: string;
  tenantId: string;
  existingComponent?: AircraftComponent;
  onFormSubmit: () => void;
}

function ComponentForm({ aircraftId, tenantId, existingComponent, onFormSubmit }: ComponentFormProps) {
  const firestore = useFirestore();
  const { toast } = useToast();
  const [isCalendarOpen, setIsCalendarOpen] = React.useState(false);

  const form = useForm<ComponentFormValues>({
    resolver: zodResolver(componentFormSchema),
    defaultValues: existingComponent || {
      id: uuidv4(),
      name: '',
      partNumber: '',
      serialNumber: '',
      installDate: '',
      installHours: 0,
      maxHours: 0,
      tsn: 0,
      tso: 0,
      notes: '',
    },
  });

  const onSubmit = async (values: ComponentFormValues) => {
    if (!firestore) return;
    const aircraftRef = doc(firestore, 'tenants', tenantId, 'aircrafts', aircraftId);
    
    try {
      if (existingComponent) {
        // To update an item in an array, we remove the old and add the new
        await updateDocumentNonBlocking(aircraftRef, {
            components: arrayRemove(existingComponent)
        });
        await updateDocumentNonBlocking(aircraftRef, {
            components: arrayUnion(values)
        });
        toast({ title: 'Component Updated' });
      } else {
        await updateDocumentNonBlocking(aircraftRef, {
          components: arrayUnion(values),
        });
        toast({ title: 'Component Added' });
      }
      onFormSubmit();
    } catch (error) {
      console.error("Error saving component: ", error);
      toast({ variant: 'destructive', title: 'Error', description: 'Could not save component.' });
    }
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <FormField control={form.control} name="name" render={({ field }) => ( <FormItem><FormLabel>Component Name</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem> )} />
          <FormField control={form.control} name="partNumber" render={({ field }) => ( <FormItem><FormLabel>Part Number</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem> )} />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <FormField control={form.control} name="serialNumber" render={({ field }) => ( <FormItem><FormLabel>Serial Number</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem> )} />
          <FormField
            control={form.control}
            name="installDate"
            render={({ field }) => (
                <FormItem className="flex flex-col">
                <FormLabel>Install Date</FormLabel>
                <Popover open={isCalendarOpen} onOpenChange={setIsCalendarOpen} modal={false}>
                    <PopoverTrigger asChild>
                    <FormControl>
                        <Button
                        variant={"outline"}
                        className={cn(
                            "w-full pl-3 text-left font-normal",
                            !field.value && "text-muted-foreground"
                        )}
                        >
                        {field.value ? (
                            format(new Date(field.value), "PPP")
                        ) : (
                            <span>Pick a date</span>
                        )}
                        <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                        </Button>
                    </FormControl>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                    <CustomCalendar
                        selectedDate={field.value ? new Date(field.value) : undefined}
                        onDateSelect={(date) => {
                            field.onChange(date?.toISOString());
                            setIsCalendarOpen(false);
                        }}
                    />
                    </PopoverContent>
                </Popover>
                <FormMessage />
                </FormItem>
            )}
            />
        </div>
         <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
             <FormField control={form.control} name="installHours" render={({ field }) => ( <FormItem><FormLabel>Install Hours</FormLabel><FormControl><Input type="number" {...field} /></FormControl><FormMessage /></FormItem> )} />
             <FormField control={form.control} name="maxHours" render={({ field }) => ( <FormItem><FormLabel>Max Hours</FormLabel><FormControl><Input type="number" {...field} /></FormControl><FormMessage /></FormItem> )} />
         </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <FormField control={form.control} name="tsn" render={({ field }) => ( <FormItem><FormLabel>TSN (Time Since New)</FormLabel><FormControl><Input type="number" {...field} /></FormControl><FormMessage /></FormItem> )} />
          <FormField control={form.control} name="tso" render={({ field }) => ( <FormItem><FormLabel>TSO (Time Since Overhaul)</FormLabel><FormControl><Input type="number" {...field} /></FormControl><FormMessage /></FormItem> )} />
        </div>
        <FormField control={form.control} name="notes" render={({ field }) => ( <FormItem><FormLabel>Notes</FormLabel><FormControl><Textarea {...field} /></FormControl><FormMessage /></FormItem> )} />
        <DialogFooter>
          <DialogClose asChild><Button type="button" variant="outline">Cancel</Button></DialogClose>
          <Button type="submit">Save Changes</Button>
        </DialogFooter>
      </form>
    </Form>
  );
}


interface AircraftComponentsProps {
    aircraft: Aircraft;
}

export function AircraftComponents({ aircraft }: AircraftComponentsProps) {
  const tenantId = 'safeviate';
  const firestore = useFirestore();
  const { toast } = useToast();
  const { hasPermission } = usePermissions();

  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingComponent, setEditingComponent] = useState<AircraftComponent | undefined>(undefined);
  const [componentToDelete, setComponentToDelete] = useState<AircraftComponent | null>(null);

  const canManage = hasPermission('assets-edit');

  const handleEdit = (component: AircraftComponent) => {
    setEditingComponent(component);
    setIsFormOpen(true);
  };
  
  const handleAddNew = () => {
    setEditingComponent(undefined);
    setIsFormOpen(true);
  };

  const handleDelete = async () => {
    if (!componentToDelete || !firestore) return;
    const aircraftRef = doc(firestore, 'tenants', tenantId, 'aircrafts', aircraft.id);
    try {
      await updateDocumentNonBlocking(aircraftRef, {
        components: arrayRemove(componentToDelete)
      });
      toast({ title: 'Component Deleted' });
    } catch (error) {
       console.error("Error deleting component: ", error);
       toast({ variant: 'destructive', title: 'Error', description: 'Could not delete component.' });
    } finally {
        setComponentToDelete(null);
    }
  };


  return (
    <>
      {canManage && (
        <div className="flex justify-end mb-4">
            <Button onClick={handleAddNew}>
                <PlusCircle className="mr-2" /> Add Component
            </Button>
        </div>
      )}
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Component Name</TableHead>
            <TableHead>Part Number</TableHead>
            <TableHead>Install Date</TableHead>
            <TableHead>Install Hours</TableHead>
            <TableHead>Max Hours</TableHead>
            <TableHead>TSN</TableHead>
            <TableHead>TSO</TableHead>
            <TableHead className="text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {aircraft.components && aircraft.components.length > 0 ? (
            aircraft.components.map((comp) => (
              <TableRow key={comp.id}>
                <TableCell>{comp.name}</TableCell>
                <TableCell>{comp.partNumber}</TableCell>
                <TableCell>{comp.installDate ? format(new Date(comp.installDate), 'PPP') : 'N/A'}</TableCell>
                <TableCell>{comp.installHours ?? 'N/A'}</TableCell>
                <TableCell>{comp.maxHours ?? 'N/A'}</TableCell>
                <TableCell>{comp.tsn ?? 'N/A'}</TableCell>
                <TableCell>{comp.tso ?? 'N/A'}</TableCell>
                <TableCell className="text-right">
                  {canManage && (
                      <div className="flex justify-end gap-2">
                          <Button variant="ghost" size="icon" onClick={() => handleEdit(comp)}>
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button variant="ghost" size="icon" className="text-destructive" onClick={() => setComponentToDelete(comp)}>
                            <Trash2 className="h-4 w-4" />
                          </Button>
                      </div>
                  )}
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
      
      <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
          <DialogContent>
              <DialogHeader>
                <DialogTitle>{editingComponent ? 'Edit Component' : 'Add New Component'}</DialogTitle>
                <DialogDescription>
                    {editingComponent ? `Editing ${editingComponent.name}` : 'Add a new trackable component to this aircraft.'}
                </DialogDescription>
              </DialogHeader>
              <ComponentForm 
                aircraftId={aircraft.id} 
                tenantId={tenantId}
                existingComponent={editingComponent}
                onFormSubmit={() => setIsFormOpen(false)}
              />
          </DialogContent>
      </Dialog>
      
       <AlertDialog open={!!componentToDelete} onOpenChange={(open) => !open && setComponentToDelete(null)}>
            <AlertDialogContent>
                <AlertDialogHeader>
                    <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                    <AlertDialogDescription>
                        This will permanently delete the component &quot;{componentToDelete?.name}&quot;.
                    </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                    <AlertDialogCancel onClick={() => setComponentToDelete(null)}>Cancel</AlertDialogCancel>
                    <AlertDialogAction onClick={handleDelete} className="bg-destructive hover:bg-destructive/90">
                        Delete
                    </AlertDialogAction>
                </AlertDialogFooter>
            </AlertDialogContent>
        </AlertDialog>
    </>
  );
}
