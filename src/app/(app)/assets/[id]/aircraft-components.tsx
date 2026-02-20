
'use client';

import { useState, useMemo } from 'react';
import { useForm, useFieldArray } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { MoreHorizontal, PlusCircle, Trash2, Edit } from 'lucide-react';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogClose, DialogTrigger } from '@/components/ui/dialog';
import { Form, FormControl, FormField, FormItem, FormMessage, FormLabel } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { CustomCalendar } from '@/components/ui/custom-calendar';
import { CalendarIcon } from 'lucide-react';
import { format } from 'date-fns';
import { useToast } from '@/hooks/use-toast';
import { useFirestore, updateDocumentNonBlocking } from '@/firebase';
import { doc } from 'firebase/firestore';
import type { Aircraft, AircraftComponent } from '@/types/aircraft';
import { v4 as uuidv4 } from 'uuid';
import { Skeleton } from '@/components/ui/skeleton';

const componentSchema = z.object({
  id: z.string().optional(),
  name: z.string().min(1, "Component name is required"),
  manufacturer: z.string().optional(),
  partNumber: z.string().min(1, "Part number is required"),
  serialNumber: z.string().optional(),
  installDate: z.date().optional().nullable(),
  installHours: z.number({ coerce: true }).optional().nullable(),
  maxHours: z.number({ coerce: true }).optional().nullable(),
  notes: z.string().optional(),
});

type ComponentFormValues = z.infer<typeof componentSchema>;

interface ComponentFormDialogProps {
    aircraft: Aircraft;
    existingComponent?: AircraftComponent | null;
    trigger: React.ReactNode;
    onSave: (componentData: AircraftComponent) => void;
}

function ComponentFormDialog({ aircraft, existingComponent, trigger, onSave }: ComponentFormDialogProps) {
    const [isOpen, setIsOpen] = useState(false);
    
    const form = useForm<ComponentFormValues>({
        resolver: zodResolver(componentSchema),
        defaultValues: existingComponent
          ? {
              ...existingComponent,
              installDate: existingComponent.installDate ? new Date(existingComponent.installDate) : null,
              installHours: existingComponent.installHours ?? null,
              maxHours: existingComponent.maxHours ?? null,
              notes: existingComponent.notes ?? '',
            }
          : {
              name: '',
              manufacturer: '',
              partNumber: '',
              serialNumber: '',
              installDate: null,
              installHours: null,
              maxHours: null,
              notes: '',
            },
      });

    const onSubmit = (data: ComponentFormValues) => {
        const componentData: AircraftComponent = {
            ...data,
            id: existingComponent?.id || uuidv4(),
            installDate: data.installDate ? data.installDate.toISOString() : null,
        };
        onSave(componentData);
        setIsOpen(false);
        form.reset();
    };
    
    return (
        <Dialog open={isOpen} onOpenChange={setIsOpen}>
            <DialogTrigger asChild>{trigger}</DialogTrigger>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>{existingComponent ? 'Edit' : 'Add'} Component</DialogTitle>
                </DialogHeader>
                <Form {...form}>
                    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                        <FormField control={form.control} name="name" render={({ field }) => ( <FormItem><FormLabel>Component Name</FormLabel><FormControl><Input placeholder="e.g., Propeller" {...field} value={field.value || ''} /></FormControl><FormMessage /></FormItem> )}/>
                        <FormField control={form.control} name="manufacturer" render={({ field }) => ( <FormItem><FormLabel>Manufacturer</FormLabel><FormControl><Input placeholder="e.g., Hartzell" {...field} value={field.value || ''} /></FormControl><FormMessage /></FormItem> )}/>
                        <FormField control={form.control} name="partNumber" render={({ field }) => ( <FormItem><FormLabel>Part Number</FormLabel><FormControl><Input {...field} value={field.value || ''} /></FormControl><FormMessage /></FormItem> )}/>
                        <FormField control={form.control} name="serialNumber" render={({ field }) => ( <FormItem><FormLabel>Serial Number</FormLabel><FormControl><Input {...field} value={field.value || ''} /></FormControl><FormMessage /></FormItem> )}/>
                        <FormField control={form.control} name="installDate" render={({ field }) => ( <FormItem className="flex flex-col"><FormLabel>Install Date</FormLabel><Popover><PopoverTrigger asChild><FormControl><Button variant={"outline"} className="pl-3 text-left font-normal">{field.value ? format(field.value, "PPP") : <span>Pick a date</span>}<CalendarIcon className="ml-auto h-4 w-4 opacity-50" /></Button></FormControl></PopoverTrigger><PopoverContent className="w-auto p-0"><CustomCalendar selectedDate={field.value || undefined} onDateSelect={field.onChange} /></PopoverContent></Popover><FormMessage /></FormItem> )}/>
                        <FormField control={form.control} name="installHours" render={({ field }) => ( <FormItem><FormLabel>Install Hours (Tacho)</FormLabel><FormControl><Input type="number" {...field} value={field.value || ''} /></FormControl><FormMessage /></FormItem> )}/>
                        <FormField control={form.control} name="maxHours" render={({ field }) => ( <FormItem><FormLabel>Max Hours (TBO/TBO)</FormLabel><FormControl><Input type="number" {...field} value={field.value || ''} /></FormControl><FormMessage /></FormItem> )}/>
                        <FormField control={form.control} name="notes" render={({ field }) => ( <FormItem><FormLabel>Notes</FormLabel><FormControl><Textarea {...field} value={field.value || ''} /></FormControl><FormMessage /></FormItem> )}/>
                        <DialogFooter>
                            <DialogClose asChild>
                                <Button type="button" variant="outline">Cancel</Button>
                            </DialogClose>
                            <Button type="submit">Save Component</Button>
                        </DialogFooter>
                    </form>
                </Form>
            </DialogContent>
        </Dialog>
    );
}


interface AircraftComponentsProps {
    aircraft: Aircraft | null;
    tenantId: string;
}

export function AircraftComponents({ aircraft, tenantId }: AircraftComponentsProps) {
  const firestore = useFirestore();
  const { toast } = useToast();

  const handleSaveComponent = (componentData: AircraftComponent) => {
    if (!firestore || !aircraft) return;

    const components = aircraft.components || [];
    const existingIndex = components.findIndex(c => c.id === componentData.id);

    let updatedComponents;
    if (existingIndex > -1) {
        updatedComponents = [...components];
        updatedComponents[existingIndex] = componentData;
    } else {
        updatedComponents = [...components, componentData];
    }
    
    const aircraftRef = doc(firestore, 'tenants', tenantId, 'aircrafts', aircraft.id);
    updateDocumentNonBlocking(aircraftRef, { components: updatedComponents });

    toast({
        title: "Component Saved",
        description: `The component "${componentData.name}" has been saved.`,
    });
  };

  const handleDeleteComponent = (componentId: string) => {
    if (!firestore || !aircraft) return;
    
    const updatedComponents = (aircraft.components || []).filter(c => c.id !== componentId);
    
    const aircraftRef = doc(firestore, 'tenants', tenantId, 'aircrafts', aircraft.id);
    updateDocumentNonBlocking(aircraftRef, { components: updatedComponents });
    
    toast({
        title: "Component Deleted",
        description: "The component has been removed.",
    });
  };
  
  if (!aircraft) {
    return (
        <Card>
            <CardHeader><Skeleton className="h-8 w-1/2" /></CardHeader>
            <CardContent><Skeleton className="h-40 w-full" /></CardContent>
        </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex justify-between items-center">
            <div>
                <CardTitle>Tracked Components</CardTitle>
                <CardDescription>A list of all life-limited or tracked components on this aircraft.</CardDescription>
            </div>
            <ComponentFormDialog
                aircraft={aircraft}
                onSave={handleSaveComponent}
                trigger={<Button><PlusCircle className="mr-2 h-4 w-4" /> Add Component</Button>}
            />
        </div>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Component</TableHead>
              <TableHead>Part No.</TableHead>
              <TableHead>Serial No.</TableHead>
              <TableHead>Hours Remaining</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {aircraft.components && aircraft.components.length > 0 ? (
              aircraft.components.map((component) => {
                const hoursRemaining = component.maxHours && aircraft.currentTacho
                    ? component.maxHours - (aircraft.currentTacho - (component.installHours || 0))
                    : null;

                return (
                  <TableRow key={component.id}>
                    <TableCell className="font-medium">{component.name}</TableCell>
                    <TableCell>{component.partNumber}</TableCell>
                    <TableCell>{component.serialNumber}</TableCell>
                    <TableCell>{hoursRemaining !== null ? `${hoursRemaining.toFixed(1)} hrs` : 'N/A'}</TableCell>
                    <TableCell className="text-right">
                        <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="icon" className="h-8 w-8">
                                    <MoreHorizontal className="h-4 w-4" />
                                </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                                <ComponentFormDialog
                                    aircraft={aircraft}
                                    existingComponent={component}
                                    onSave={handleSaveComponent}
                                    trigger={
                                        <DropdownMenuItem onSelect={(e) => e.preventDefault()}>
                                            <Edit className="mr-2 h-4 w-4" /> Edit
                                        </DropdownMenuItem>
                                    }
                                />
                                <DropdownMenuItem onClick={() => handleDeleteComponent(component.id)} className="text-destructive focus:text-destructive">
                                    <Trash2 className="mr-2 h-4 w-4" /> Delete
                                </DropdownMenuItem>
                            </DropdownMenuContent>
                        </DropdownMenu>
                    </TableCell>
                  </TableRow>
                )
              })
            ) : (
              <TableRow>
                <TableCell colSpan={5} className="text-center h-24">
                  No components tracked for this aircraft.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
