
'use client';

import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
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
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from '@/components/ui/input';
import { PlusCircle, Trash2, CalendarIcon } from 'lucide-react';
import { useFirestore, updateDocumentNonBlocking } from '@/firebase';
import { useToast } from '@/hooks/use-toast';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { CustomCalendar } from '@/components/ui/custom-calendar';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import type { Aircraft, AircraftComponent } from '@/types/aircraft';
import { v4 as uuidv4 } from 'uuid';

const componentSchema = z.object({
  id: z.string(),
  name: z.string().min(1, 'Component name is required.'),
  partNumber: z.string().min(1, 'Part number is required.'),
  serialNumber: z.string().nullable().optional(),
  installDate: z.date().nullable().optional(),
  installHours: z.number({ coerce: true }).nullable().optional(),
  maxHours: z.number({ coerce: true }).nullable().optional(),
  notes: z.string().nullable().optional(),
});

type FormValues = z.infer<typeof componentSchema>;

interface AircraftComponentsProps {
  aircraft: Aircraft;
  aircraftId: string;
}

export function AircraftComponents({ aircraft, aircraftId }: AircraftComponentsProps) {
  const [components, setComponents] = useState<AircraftComponent[]>([]);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingComponent, setEditingComponent] = useState<AircraftComponent | null>(null);
  const firestore = useFirestore();
  const { toast } = useToast();
  
  const form = useForm<FormValues>({
    resolver: zodResolver(componentSchema),
  });

  useEffect(() => {
    if (aircraft?.components) {
      setComponents(aircraft.components);
    }
  }, [aircraft]);

  const handleOpenDialog = (component: AircraftComponent | null = null) => {
    setEditingComponent(component);
    form.reset(component ? {
        ...component,
        installDate: component.installDate ? new Date(component.installDate) : null,
    } : {
        id: uuidv4(),
        name: '',
        partNumber: '',
        serialNumber: null,
        installDate: null,
        installHours: null,
        maxHours: null,
        notes: null,
    });
    setIsDialogOpen(true);
  };
  
  const onSubmit = (data: FormValues) => {
    const updatedComponents = [...components];
    
    // Sanitize data: convert empty strings for optional fields to null
    const sanitizedData = {
      ...data,
      serialNumber: data.serialNumber || null,
      installDate: data.installDate ? data.installDate.toISOString() : null,
      installHours: data.installHours ?? null,
      maxHours: data.maxHours ?? null,
      notes: data.notes || null,
    };

    if (editingComponent) {
        const index = components.findIndex((c) => c.id === editingComponent.id);
        if (index > -1) {
            updatedComponents[index] = sanitizedData;
        }
    } else {
        updatedComponents.push(sanitizedData);
    }
    
    if (!firestore) return;
    
    const aircraftRef = doc(firestore, 'tenants', 'safeviate', 'aircrafts', aircraftId);
    updateDocumentNonBlocking(aircraftRef, { components: updatedComponents });
    
    toast({ title: editingComponent ? 'Component Updated' : 'Component Added' });
    setComponents(updatedComponents);
    setIsDialogOpen(false);
    setEditingComponent(null);
  };

  const handleDelete = (componentId: string) => {
      const updatedComponents = components.filter(c => c.id !== componentId);
      if (!firestore) return;
      const aircraftRef = doc(firestore, 'tenants', 'safeviate', 'aircrafts', aircraftId);
      updateDocumentNonBlocking(aircraftRef, { components: updatedComponents });
      toast({ title: 'Component Deleted' });
      setComponents(updatedComponents);
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Button onClick={() => handleOpenDialog()}>
          <PlusCircle className="mr-2" />
          Add Component
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
                        <TableHead>Name</TableHead>
                        <TableHead>Part No.</TableHead>
                        <TableHead>Serial No.</TableHead>
                        <TableHead>Install Date</TableHead>
                        <TableHead>Max Hours</TableHead>
                        <TableHead className='text-right'>Actions</TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                  {components.map((component) => (
                    <TableRow key={component.id}>
                      <TableCell>{component.name}</TableCell>
                      <TableCell>{component.partNumber}</TableCell>
                      <TableCell>{component.serialNumber || 'N/A'}</TableCell>
                      <TableCell>{component.installDate ? format(new Date(component.installDate), 'PPP') : 'N/A'}</TableCell>
                      <TableCell>{component.maxHours || 'N/A'}</TableCell>
                      <TableCell className="text-right">
                          <Button variant="ghost" size="sm" onClick={() => handleOpenDialog(component)}>Edit</Button>
                          <Button variant="ghost" size="sm" className="text-destructive" onClick={() => handleDelete(component.id)}>Delete</Button>
                      </TableCell>
                    </TableRow>
                  ))}
                  {components.length === 0 && (
                      <TableRow>
                          <TableCell colSpan={6} className="text-center h-24">No components added yet.</TableCell>
                      </TableRow>
                  )}
                </TableBody>
            </Table>
        </CardContent>
      </Card>

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingComponent ? 'Edit Component' : 'Add New Component'}</DialogTitle>
            <DialogDescription>Fill in the details for the aircraft component.</DialogDescription>
          </DialogHeader>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                    <FormField control={form.control} name="name" render={({ field }) => ( <FormItem><FormLabel>Component Name</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem> )} />
                    <FormField control={form.control} name="partNumber" render={({ field }) => ( <FormItem><FormLabel>Part Number</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem> )} />
                    <FormField control={form.control} name="serialNumber" render={({ field }) => ( <FormItem><FormLabel>Serial Number</FormLabel><FormControl><Input {...field} value={field.value ?? ''} /></FormControl><FormMessage /></FormItem> )} />
                    <FormField control={form.control} name="installDate" render={({ field }) => (
                        <FormItem className="flex flex-col">
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
                                <PopoverContent className="w-auto p-0">
                                    <CustomCalendar selectedDate={field.value || undefined} onDateSelect={field.onChange} />
                                </PopoverContent>
                            </Popover>
                            <FormMessage />
                        </FormItem>
                    )} />
                    <FormField control={form.control} name="installHours" render={({ field }) => ( <FormItem><FormLabel>Install Hours (Tacho)</FormLabel><FormControl><Input type="number" {...field} value={field.value ?? ''} /></FormControl><FormMessage /></FormItem> )} />
                    <FormField control={form.control} name="maxHours" render={({ field }) => ( <FormItem><FormLabel>Max Hours (Lifespan)</FormLabel><FormControl><Input type="number" {...field} value={field.value ?? ''} /></FormControl><FormMessage /></FormItem> )} />
                </div>
                <FormField control={form.control} name="notes" render={({ field }) => ( <FormItem><FormLabel>Notes</FormLabel><FormControl><Input {...field} value={field.value ?? ''} /></FormControl><FormMessage /></FormItem> )} />

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

