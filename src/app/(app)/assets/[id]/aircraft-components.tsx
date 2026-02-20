
'use client';

import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { v4 as uuidv4 } from 'uuid';
import { format, parseISO } from 'date-fns';

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
} from '@/components/ui/dialog';
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
import { PlusCircle, Edit, Trash2, CalendarIcon } from 'lucide-react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { CustomCalendar } from '@/components/ui/custom-calendar';
import { cn } from '@/lib/utils';
import type { Aircraft, AircraftComponent } from '@/types/aircraft';

// Schema for the form
const componentFormSchema = z.object({
  name: z.string().min(1, 'Component name is required.'),
  partNumber: z.string().min(1, 'Part number is required.'),
  serialNumber: z.string().optional(),
  installDate: z.date().optional(),
  installHours: z.number({ coerce: true }).optional(),
  maxHours: z.number({ coerce: true }).optional(),
  tsn: z.number({ coerce: true }).optional(), // Time Since New
  tso: z.number({ coerce: true }).optional(), // Time Since Overhaul
  notes: z.string().optional(),
});

type ComponentFormValues = z.infer<typeof componentFormSchema>;

interface AircraftComponentsProps {
  aircraft: Aircraft;
}

export function AircraftComponents({ aircraft }: AircraftComponentsProps) {
  const firestore = useFirestore();
  const { toast } = useToast();
  const [components, setComponents] = useState<AircraftComponent[]>([]);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingComponent, setEditingComponent] = useState<AircraftComponent | null>(null);

  // Sync internal state with prop
  useEffect(() => {
    if (aircraft?.components) {
      setComponents(aircraft.components);
    }
  }, [aircraft]);

  const form = useForm<ComponentFormValues>({
    resolver: zodResolver(componentFormSchema),
  });

  const handleOpenDialog = (component: AircraftComponent | null = null) => {
    setEditingComponent(component);
    if (component) {
      form.reset({
        ...component,
        installDate: component.installDate ? parseISO(component.installDate) : undefined,
      });
    } else {
      form.reset({
        name: '',
        partNumber: '',
        serialNumber: '',
        installDate: undefined,
        installHours: 0,
        maxHours: 0,
        tsn: 0,
        tso: 0,
        notes: '',
      });
    }
    setIsDialogOpen(true);
  };

  const onSubmit = (values: ComponentFormValues) => {
    if (!firestore) return;

    let updatedComponents: AircraftComponent[];
    const componentData = {
        ...values,
        installDate: values.installDate ? values.installDate.toISOString() : undefined,
    };

    if (editingComponent) {
      // Update existing component
      updatedComponents = components.map(c =>
        c.id === editingComponent.id ? { ...editingComponent, ...componentData } : c
      );
    } else {
      // Add new component
      const newComponent: AircraftComponent = {
        id: uuidv4(),
        ...componentData,
      };
      updatedComponents = [...components, newComponent];
    }
    
    // Optimistically update the UI
    setComponents(updatedComponents);

    const aircraftRef = doc(firestore, 'tenants', 'safeviate', 'aircrafts', aircraft.id);
    updateDocumentNonBlocking(aircraftRef, { components: updatedComponents });
    
    toast({ title: editingComponent ? 'Component Updated' : 'Component Added' });
    setIsDialogOpen(false);
  };
  
  const handleDeleteComponent = (componentId: string) => {
      const updatedComponents = components.filter(c => c.id !== componentId);
      setComponents(updatedComponents);

      const aircraftRef = doc(firestore, 'tenants', 'safeviate', 'aircrafts', aircraft.id);
      updateDocumentNonBlocking(aircraftRef, { components: updatedComponents });
      
      toast({ title: "Component Deleted" });
  };


  return (
    <div>
      <div className="flex justify-end mb-4">
        <Button onClick={() => handleOpenDialog()}>
          <PlusCircle className="mr-2 h-4 w-4" />
          Add Component
        </Button>
      </div>

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Component</TableHead>
              <TableHead>Part No.</TableHead>
              <TableHead>Install Date</TableHead>
              <TableHead>TSN</TableHead>
              <TableHead>TSO</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {components.length > 0 ? (
              components.map(component => (
                <TableRow key={component.id}>
                  <TableCell className="font-medium">{component.name}</TableCell>
                  <TableCell>{component.partNumber}</TableCell>
                  <TableCell>
                    {component.installDate ? format(parseISO(component.installDate), 'PPP') : 'N/A'}
                  </TableCell>
                  <TableCell>{component.tsn ?? 'N/A'}</TableCell>
                  <TableCell>{component.tso ?? 'N/A'}</TableCell>
                  <TableCell className="text-right">
                    <Button variant="ghost" size="icon" onClick={() => handleOpenDialog(component)}>
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="icon" onClick={() => handleDeleteComponent(component.id)}>
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={6} className="h-24 text-center">
                  No components added yet.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
      
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogContent className="sm:max-w-3xl">
              <DialogHeader>
                <DialogTitle>{editingComponent ? 'Edit Component' : 'Add New Component'}</DialogTitle>
                <DialogDescription>
                    {editingComponent ? `Editing ${editingComponent.name}` : 'Enter the details for the new component.'}
                </DialogDescription>
              </DialogHeader>
              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6 pt-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <FormField control={form.control} name="name" render={({ field }) => ( <FormItem><FormLabel>Component Name</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem> )}/>
                        <FormField control={form.control} name="partNumber" render={({ field }) => ( <FormItem><FormLabel>Part Number</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem> )}/>
                        <FormField control={form.control} name="serialNumber" render={({ field }) => ( <FormItem><FormLabel>Serial Number</FormLabel><FormControl><Input {...field} value={field.value || ''} /></FormControl><FormMessage /></FormItem> )}/>
                        <FormField control={form.control} name="installDate" render={({ field }) => ( <FormItem className="flex flex-col"><FormLabel>Install Date</FormLabel><Popover><PopoverTrigger asChild><FormControl><Button variant={"outline"} className={cn("pl-3 text-left font-normal", !field.value && "text-muted-foreground")}>{field.value ? format(field.value, "PPP") : <span>Pick a date</span>}<CalendarIcon className="ml-auto h-4 w-4 opacity-50" /></Button></FormControl></PopoverTrigger><PopoverContent className="w-auto p-0"><CustomCalendar selectedDate={field.value} onDateSelect={field.onChange} /></PopoverContent></Popover><FormMessage /></FormItem>)}/>
                        <FormField control={form.control} name="installHours" render={({ field }) => ( <FormItem><FormLabel>Install Hours (Hobbs)</FormLabel><FormControl><Input type="number" {...field} value={field.value || ''} /></FormControl><FormMessage /></FormItem> )}/>
                        <FormField control={form.control} name="maxHours" render={({ field }) => ( <FormItem><FormLabel>Max Hours (TBO)</FormLabel><FormControl><Input type="number" {...field} value={field.value || ''} /></FormControl><FormMessage /></FormItem> )}/>
                        <FormField control={form.control} name="tsn" render={({ field }) => ( <FormItem><FormLabel>Time Since New (TSN)</FormLabel><FormControl><Input type="number" {...field} value={field.value || ''} /></FormControl><FormMessage /></FormItem> )}/>
                        <FormField control={form.control} name="tso" render={({ field }) => ( <FormItem><FormLabel>Time Since Overhaul (TSO)</FormLabel><FormControl><Input type="number" {...field} value={field.value || ''} /></FormControl><FormMessage /></FormItem> )}/>
                        <FormField control={form.control} name="notes" render={({ field }) => ( <FormItem className="md:col-span-2"><FormLabel>Notes</FormLabel><FormControl><Textarea {...field} value={field.value || ''} /></FormControl><FormMessage /></FormItem> )}/>
                    </div>
                    <DialogFooter>
                        <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>Cancel</Button>
                        <Button type="submit">Save Component</Button>
                    </DialogFooter>
                </form>
              </Form>
          </DialogContent>
      </Dialog>
    </div>
  );
}
