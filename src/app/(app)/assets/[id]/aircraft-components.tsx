
'use client';

import { useState, useEffect } from 'react';
import { useForm, useFieldArray, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { v4 as uuidv4 } from 'uuid';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import { useFirestore, updateDocumentNonBlocking } from '@/firebase';
import { doc } from 'firebase/firestore';

import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { PlusCircle, Edit, Trash2, CalendarIcon } from 'lucide-react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { CustomCalendar } from '@/components/ui/custom-calendar';

import type { Aircraft, AircraftComponent } from '@/types/aircraft';


const componentSchema = z.object({
  id: z.string(),
  name: z.string().min(1, 'Component name is required.'),
  partNumber: z.string().min(1, 'Part number is required.'),
  serialNumber: z.string().optional(),
  installDate: z.date().optional(),
  installHours: z.number({ coerce: true }).optional(),
  maxHours: z.number({ coerce: true }).optional(),
  notes: z.string().optional(),
  tso: z.number({ coerce: true }).optional(),
  tsn: z.number({ coerce: true }).optional(),
});

type ComponentFormValues = z.infer<typeof componentSchema>;

interface AircraftComponentsProps {
  aircraft: Aircraft;
  aircraftId: string;
}

export function AircraftComponents({ aircraft, aircraftId }: AircraftComponentsProps) {
  const firestore = useFirestore();
  const { toast } = useToast();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingComponent, setEditingComponent] = useState<AircraftComponent | null>(null);
  const [components, setComponents] = useState<AircraftComponent[]>([]);
  const [isCalendarOpen, setIsCalendarOpen] = useState(false);

  useEffect(() => {
    if (aircraft) {
        setComponents(aircraft.components || []);
    }
  }, [aircraft]);
  
  const form = useForm<ComponentFormValues>();

  const handleOpenDialog = (component: AircraftComponent | null = null) => {
    setEditingComponent(component);
    form.reset(component ? { ...component, installDate: component.installDate ? new Date(component.installDate) : undefined } : {
        id: uuidv4(),
        name: '',
        partNumber: '',
        serialNumber: '',
        installDate: undefined,
        installHours: 0,
        maxHours: 0,
        notes: '',
        tsn: 0,
        tso: 0,
    });
    setIsDialogOpen(true);
  };
  
  const onSubmit = (values: ComponentFormValues) => {
    if (!firestore) return;

    const updatedComponents = editingComponent
      ? components.map(c => c.id === editingComponent.id ? { ...values, installDate: values.installDate?.toISOString() } : c)
      : [...components, { ...values, installDate: values.installDate?.toISOString() }];
    
    setComponents(updatedComponents);
    
    const aircraftRef = doc(firestore, 'tenants', aircraft.id.split('/')[1], 'aircrafts', aircraftId);
    updateDocumentNonBlocking(aircraftRef, { components: updatedComponents });
    
    toast({ title: editingComponent ? 'Component Updated' : 'Component Added' });
    setIsDialogOpen(false);
  };
  
  const handleDelete = (componentId: string) => {
    const updatedComponents = components.filter(c => c.id !== componentId);
    setComponents(updatedComponents);

    const aircraftRef = doc(firestore, 'tenants', aircraft.id.split('/')[1], 'aircrafts', aircraftId);
    updateDocumentNonBlocking(aircraftRef, { components: updatedComponents });
    
    toast({ title: "Component Deleted" });
  };
  
  if (!aircraft) {
    return <p>Loading component data...</p>
  }

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex justify-between items-center">
            <div>
                <CardTitle>Tracked Components</CardTitle>
                <CardDescription>A list of all life-limited or tracked components for this aircraft.</CardDescription>
            </div>
             <Button onClick={() => handleOpenDialog()}>
                <PlusCircle className="mr-2" /> Add Component
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Component</TableHead>
                <TableHead>Install Date</TableHead>
                <TableHead>Install Hours</TableHead>
                <TableHead>Max Hours</TableHead>
                <TableHead>TSN</TableHead>
                <TableHead>TSO</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {(components || []).length > 0 ? (
                components.map(component => (
                  <TableRow key={component.id}>
                    <TableCell>{component.name}</TableCell>
                    <TableCell>{component.installDate ? format(new Date(component.installDate), 'PPP') : 'N/A'}</TableCell>
                    <TableCell>{component.installHours}</TableCell>
                    <TableCell>{component.maxHours}</TableCell>
                    <TableCell>{component.tsn}</TableCell>
                    <TableCell>{component.tso}</TableCell>
                    <TableCell className="text-right">
                      <Button variant="ghost" size="icon" onClick={() => handleOpenDialog(component)}><Edit className="h-4 w-4" /></Button>
                      <Button variant="ghost" size="icon" onClick={() => handleDelete(component.id)}><Trash2 className="h-4 w-4 text-destructive" /></Button>
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={7} className="text-center h-24">No components added yet.</TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
      
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogContent>
              <DialogHeader>
                  <DialogTitle>{editingComponent ? 'Edit' : 'Add New'} Component</DialogTitle>
                  <DialogDescription>Enter the details for the aircraft component below.</DialogDescription>
              </DialogHeader>
              <Form {...form}>
                  <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                      <div className="grid grid-cols-2 gap-4">
                          <FormField control={form.control} name="name" render={({ field }) => ( <FormItem><FormLabel>Component Name</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem> )} />
                          <FormField control={form.control} name="partNumber" render={({ field }) => ( <FormItem><FormLabel>Part Number</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem> )}/>
                          <FormField control={form.control} name="serialNumber" render={({ field }) => ( <FormItem><FormLabel>Serial Number</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem> )}/>
                          <FormField control={form.control} name="installDate" render={({ field }) => (
                            <FormItem className="flex flex-col pt-2">
                                <FormLabel>Install Date</FormLabel>
                                <Popover open={isCalendarOpen} onOpenChange={setIsCalendarOpen}>
                                    <PopoverTrigger asChild>
                                        <FormControl>
                                            <Button variant="outline" className={cn("pl-3 text-left font-normal", !field.value && "text-muted-foreground")}>
                                                {field.value ? format(new Date(field.value), 'PPP') : <span>Pick a date</span>}
                                                <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                                            </Button>
                                        </FormControl>
                                    </PopoverTrigger>
                                    <PopoverContent className="w-auto p-0" align="start">
                                        <CustomCalendar
                                            selectedDate={field.value ? new Date(field.value) : undefined}
                                            onDateSelect={(date) => {
                                                if (date) {
                                                    field.onChange(date);
                                                    setIsCalendarOpen(false);
                                                }
                                            }}
                                        />
                                    </PopoverContent>
                                </Popover>
                                <FormMessage />
                            </FormItem>
                          )}/>
                          <FormField control={form.control} name="installHours" render={({ field }) => ( <FormItem><FormLabel>Install Hours (Hobbs)</FormLabel><FormControl><Input type="number" {...field} /></FormControl><FormMessage /></FormItem> )} />
                          <FormField control={form.control} name="maxHours" render={({ field }) => ( <FormItem><FormLabel>Max Hours</FormLabel><FormControl><Input type="number" {...field} /></FormControl><FormMessage /></FormItem> )}/>
                          <FormField control={form.control} name="tsn" render={({ field }) => ( <FormItem><FormLabel>Time Since New (TSN)</FormLabel><FormControl><Input type="number" {...field} /></FormControl><FormMessage /></FormItem> )} />
                          <FormField control={form.control} name="tso" render={({ field }) => ( <FormItem><FormLabel>Time Since Overhaul (TSO)</FormLabel><FormControl><Input type="number" {...field} /></FormControl><FormMessage /></FormItem> )}/>
                          <FormField control={form.control} name="notes" render={({ field }) => ( <FormItem className="col-span-2"><FormLabel>Notes</FormLabel><FormControl><Textarea {...field} /></FormControl><FormMessage /></FormItem> )}/>
                      </div>
                      <DialogFooter>
                          <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>Cancel</Button>
                          <Button type="submit">Save Component</Button>
                      </DialogFooter>
                  </form>
              </Form>
          </DialogContent>
      </Dialog>
    </>
  );
}
