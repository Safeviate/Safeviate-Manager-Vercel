
'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { v4 as uuidv4 } from 'uuid';
import { doc } from 'firebase/firestore';
import { useFirestore, updateDocumentNonBlocking } from '@/firebase';
import { useToast } from '@/hooks/use-toast';
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
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { PlusCircle, Pencil, Trash2 } from 'lucide-react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import type { Aircraft, AircraftComponent } from '@/types/aircraft';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { CustomCalendar } from '@/components/ui/custom-calendar';
import { CalendarIcon } from 'lucide-react';
import { format } from 'date-fns';

interface ComponentsFormProps {
  aircraft: Aircraft;
}

const componentSchema = z.object({
  id: z.string(),
  name: z.string().min(1, 'Component name is required.'),
  partNumber: z.string().min(1, 'Part number is required.'),
  serialNumber: z.string().optional(),
  installDate: z.date().optional(),
  installHours: z.number({ coerce: true }).optional(),
  maxHours: z.number({ coerce: true }).optional(),
  tso: z.number({ coerce: true }).optional(),
  tsn: z.number({ coerce: true }).optional(),
  notes: z.string().optional(),
});

type ComponentFormValues = z.infer<typeof componentSchema>;

export function ComponentsForm({ aircraft }: ComponentsFormProps) {
  const firestore = useFirestore();
  const { toast } = useToast();
  const [isOpen, setIsOpen] = useState(false);
  const [editingComponent, setEditingComponent] = useState<AircraftComponent | null>(null);

  const form = useForm<ComponentFormValues>({
    resolver: zodResolver(componentSchema),
  });

  const handleOpenDialog = (component: AircraftComponent | null) => {
    setEditingComponent(component);
    form.reset(
      component
        ? { ...component, installDate: component.installDate ? new Date(component.installDate) : undefined }
        : {
            id: uuidv4(),
            name: '',
            partNumber: '',
            serialNumber: '',
            installDate: undefined,
            installHours: 0,
            maxHours: 0,
            tso: 0,
            tsn: 0,
            notes: '',
          }
    );
    setIsOpen(true);
  };

  const onSubmit = (values: ComponentFormValues) => {
    const components = aircraft.components || [];
    const formattedValues = {
        ...values,
        installDate: values.installDate ? values.installDate.toISOString() : undefined,
    };

    let updatedComponents: AircraftComponent[];

    if (editingComponent) {
      updatedComponents = components.map((c) => (c.id === editingComponent.id ? formattedValues : c));
    } else {
      updatedComponents = [...components, formattedValues];
    }
    
    if (!firestore) return;
    const aircraftRef = doc(firestore, `tenants/safeviate/aircrafts`, aircraft.id);
    updateDocumentNonBlocking(aircraftRef, { components: updatedComponents });

    toast({
      title: editingComponent ? 'Component Updated' : 'Component Added',
    });

    setIsOpen(false);
    setEditingComponent(null);
  };
  
  const handleDeleteComponent = (componentId: string) => {
      const updatedComponents = (aircraft.components || []).filter(c => c.id !== componentId);
      if (!firestore) return;
      const aircraftRef = doc(firestore, `tenants/safeviate/aircrafts`, aircraft.id);
      updateDocumentNonBlocking(aircraftRef, { components: updatedComponents });
      toast({ title: 'Component Deleted' });
  }

  return (
    <div>
      <div className="flex justify-end mb-4">
        <Button onClick={() => handleOpenDialog(null)}>
          <PlusCircle className="mr-2 h-4 w-4" />
          Add Component
        </Button>
      </div>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Name</TableHead>
            <TableHead>P/N</TableHead>
            <TableHead>S/N</TableHead>
            <TableHead>TSN</TableHead>
            <TableHead>TSO</TableHead>
            <TableHead>Max Hours</TableHead>
            <TableHead className="text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {(aircraft.components || []).map((component) => (
            <TableRow key={component.id}>
              <TableCell>{component.name}</TableCell>
              <TableCell>{component.partNumber}</TableCell>
              <TableCell>{component.serialNumber}</TableCell>
              <TableCell>{component.tsn ?? 'N/A'}</TableCell>
              <TableCell>{component.tso ?? 'N/A'}</TableCell>
              <TableCell>{component.maxHours ?? 'N/A'}</TableCell>
              <TableCell className="text-right">
                <Button variant="ghost" size="icon" onClick={() => handleOpenDialog(component)}>
                    <Pencil className="h-4 w-4" />
                </Button>
                 <Button variant="ghost" size="icon" onClick={() => handleDeleteComponent(component.id)}>
                    <Trash2 className="h-4 w-4 text-destructive" />
                </Button>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
      
      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingComponent ? 'Edit' : 'Add'} Component</DialogTitle>
            <DialogDescription>
              {editingComponent ? `Editing ${editingComponent.name}` : 'Add a new trackable component to the aircraft.'}
            </DialogDescription>
          </DialogHeader>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormField control={form.control} name="name" render={({ field }) => (<FormItem><FormLabel>Component Name</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>)} />
              <FormField control={form.control} name="partNumber" render={({ field }) => (<FormItem><FormLabel>Part Number</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>)} />
              <FormField control={form.control} name="serialNumber" render={({ field }) => (<FormItem><FormLabel>Serial Number</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>)} />
              <div className="grid grid-cols-2 gap-4">
                <FormField control={form.control} name="installDate" render={({ field }) => ( <FormItem className="flex flex-col"><FormLabel>Install Date</FormLabel><Popover><PopoverTrigger asChild><FormControl><Button variant="outline" className={!field.value && "text-muted-foreground"}><CalendarIcon className="mr-2 h-4 w-4" />{field.value ? format(new Date(field.value), "PPP") : <span>Pick a date</span>}</Button></FormControl></PopoverTrigger><PopoverContent><CustomCalendar selectedDate={field.value} onDateSelect={field.onChange} /></PopoverContent></Popover><FormMessage /></FormItem>)} />
                <FormField control={form.control} name="installHours" render={({ field }) => (<FormItem><FormLabel>Install Hours</FormLabel><FormControl><Input type="number" {...field} /></FormControl><FormMessage /></FormItem>)} />
                <FormField control={form.control} name="maxHours" render={({ field }) => (<FormItem><FormLabel>Max Hours</FormLabel><FormControl><Input type="number" {...field} /></FormControl><FormMessage /></FormItem>)} />
                <FormField control={form.control} name="tsn" render={({ field }) => (<FormItem><FormLabel>TSN (Time Since New)</FormLabel><FormControl><Input type="number" {...field} /></FormControl><FormMessage /></FormItem>)} />
                <FormField control={form.control} name="tso" render={({ field }) => (<FormItem><FormLabel>TSO (Time Since Overhaul)</FormLabel><FormControl><Input type="number" {...field} /></FormControl><FormMessage /></FormItem>)} />
              </div>
              <FormField control={form.control} name="notes" render={({ field }) => (<FormItem><FormLabel>Notes</FormLabel><FormControl><Textarea {...field} /></FormControl><FormMessage /></FormItem>)} />
              <DialogFooter>
                <DialogClose asChild>
                  <Button type="button" variant="outline">Cancel</Button>
                </DialogClose>
                <Button type="submit">Save</Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
