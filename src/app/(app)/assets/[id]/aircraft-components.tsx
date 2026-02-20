'use client';

import { useState, useEffect } from 'react';
import { doc, updateDoc } from 'firebase/firestore';
import { useFirestore, updateDocumentNonBlocking } from '@/firebase';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger, DialogClose } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { PlusCircle, Edit, Trash2, CalendarIcon } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useForm, useFieldArray } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { CustomCalendar } from '@/components/ui/custom-calendar';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import type { Aircraft, AircraftComponent } from '@/types/aircraft';
import { Textarea } from '@/components/ui/textarea';

const componentSchema = z.object({
  name: z.string().min(1, 'Component name is required'),
  partNumber: z.string().min(1, 'Part number is required'),
  serialNumber: z.string().optional(),
  installDate: z.date().optional(),
  installHours: z.coerce.number().optional(),
  maxHours: z.coerce.number().optional(),
  tsn: z.coerce.number().optional(),
  tso: z.coerce.number().optional(),
  notes: z.string().optional(),
});

type FormValues = z.infer<typeof componentSchema>;

interface AircraftComponentsProps {
  aircraft: Aircraft;
  tenantId: string;
  aircraftId: string;
}

export function AircraftComponents({ aircraft, tenantId, aircraftId }: AircraftComponentsProps) {
  const firestore = useFirestore();
  const { toast } = useToast();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingComponent, setEditingComponent] = useState<AircraftComponent | null>(null);
  const [components, setComponents] = useState<AircraftComponent[]>([]);

  // Sync internal state with prop
  useEffect(() => {
    if (aircraft?.components) {
      setComponents(aircraft.components);
    }
  }, [aircraft]);

  const form = useForm<FormValues>({
    resolver: zodResolver(componentSchema),
  });

  const handleOpenDialog = (component: AircraftComponent | null = null) => {
    setEditingComponent(component);
    if (component) {
      form.reset({
        ...component,
        installDate: component.installDate ? new Date(component.installDate) : undefined,
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

  const onSubmit = (values: FormValues) => {
    if (!firestore) return;

    let updatedComponents: AircraftComponent[];

    if (editingComponent) {
      updatedComponents = components.map(c =>
        c.id === editingComponent.id ? { ...c, ...values, installDate: values.installDate?.toISOString() } : c
      );
    } else {
      const newComponent: AircraftComponent = {
        id: crypto.randomUUID(), // Simple UUID for client-side
        ...values,
        installDate: values.installDate?.toISOString(),
      };
      updatedComponents = [...components, newComponent];
    }
    
    setComponents(updatedComponents);

    const aircraftRef = doc(firestore, 'tenants', tenantId, 'aircrafts', aircraftId);
    updateDocumentNonBlocking(aircraftRef, { components: updatedComponents });
    
    toast({ title: editingComponent ? 'Component Updated' : 'Component Added' });
    setIsDialogOpen(false);
  };

  const handleDeleteComponent = (componentId: string) => {
    if (!firestore) return;
    
    const updatedComponents = components.filter(c => c.id !== componentId);
    setComponents(updatedComponents);
    
    const aircraftRef = doc(firestore, 'tenants', tenantId, 'aircrafts', aircraftId);
    updateDocumentNonBlocking(aircraftRef, { components: updatedComponents });

    toast({ title: 'Component Deleted' });
  };
  
  if (!aircraft) {
    return <p>Loading component data...</p>
  }

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
              <TableHead>Name</TableHead>
              <TableHead>P/N</TableHead>
              <TableHead>S/N</TableHead>
              <TableHead>Install Date</TableHead>
              <TableHead>TSN</TableHead>
              <TableHead>TSO</TableHead>
              <TableHead>Max Hours</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {components.length > 0 ? (
              components.map(component => (
                <TableRow key={component.id}>
                  <TableCell>{component.name}</TableCell>
                  <TableCell>{component.partNumber}</TableCell>
                  <TableCell>{component.serialNumber || 'N/A'}</TableCell>
                  <TableCell>
                    {component.installDate ? format(new Date(component.installDate), 'PPP') : 'N/A'}
                  </TableCell>
                  <TableCell>{component.tsn ?? 'N/A'}</TableCell>
                  <TableCell>{component.tso ?? 'N/A'}</TableCell>
                  <TableCell>{component.maxHours || 'N/A'}</TableCell>
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
                <TableCell colSpan={8} className="h-24 text-center">
                  No components added yet.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle>{editingComponent ? 'Edit' : 'Add'} Component</DialogTitle>
            <DialogDescription>
              {editingComponent ? 'Update the details for this component.' : 'Add a new component to this aircraft.'}
            </DialogDescription>
          </DialogHeader>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 pt-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField control={form.control} name="name" render={({ field }) => ( <FormItem><FormLabel>Component Name</FormLabel><FormControl><Input placeholder="e.g., Propeller" {...field} /></FormControl><FormMessage /></FormItem> )} />
                <FormField control={form.control} name="partNumber" render={({ field }) => ( <FormItem><FormLabel>Part Number</FormLabel><FormControl><Input placeholder="P/N" {...field} /></FormControl><FormMessage /></FormItem> )}/>
                <FormField control={form.control} name="serialNumber" render={({ field }) => ( <FormItem><FormLabel>Serial Number</FormLabel><FormControl><Input placeholder="S/N" {...field} /></FormControl><FormMessage /></FormItem> )}/>
                <FormField control={form.control} name="installDate" render={({ field }) => ( <FormItem className="flex flex-col"><FormLabel>Install Date</FormLabel><Popover><PopoverTrigger asChild><FormControl><Button variant="outline" className={cn('pl-3 text-left font-normal', !field.value && 'text-muted-foreground')}>{field.value ? format(field.value, 'PPP') : <span>Pick a date</span>}<CalendarIcon className="ml-auto h-4 w-4 opacity-50" /></Button></FormControl></PopoverTrigger><PopoverContent className="w-auto p-0" onInteractOutside={(e) => e.preventDefault()}><CustomCalendar selectedDate={field.value} onDateSelect={field.onChange} /></PopoverContent></Popover><FormMessage /></FormItem>)}/>
                <FormField control={form.control} name="installHours" render={({ field }) => ( <FormItem><FormLabel>Install Hours (Tacho)</FormLabel><FormControl><Input type="number" {...field} /></FormControl><FormMessage /></FormItem> )}/>
                <FormField control={form.control} name="maxHours" render={({ field }) => ( <FormItem><FormLabel>Max Hours</FormLabel><FormControl><Input type="number" {...field} /></FormControl><FormMessage /></FormItem> )}/>
                <FormField control={form.control} name="tsn" render={({ field }) => ( <FormItem><FormLabel>Time Since New (TSN)</FormLabel><FormControl><Input type="number" {...field} /></FormControl><FormMessage /></FormItem> )}/>
                <FormField control={form.control} name="tso" render={({ field }) => ( <FormItem><FormLabel>Time Since Overhaul (TSO)</FormLabel><FormControl><Input type="number" {...field} /></FormControl><FormMessage /></FormItem> )}/>
                <FormField control={form.control} name="notes" render={({ field }) => ( <FormItem className="md:col-span-2"><FormLabel>Notes</FormLabel><FormControl><Textarea placeholder="Any relevant notes..." {...field} /></FormControl><FormMessage /></FormItem> )}/>
              </div>
              <DialogFooter>
                <DialogClose asChild><Button type="button" variant="outline">Cancel</Button></DialogClose>
                <Button type="submit">Save Component</Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
