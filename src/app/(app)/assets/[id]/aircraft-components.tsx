
'use client';

import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { v4 as uuidv4 } from 'uuid';
import { doc } from 'firebase/firestore';
import { format } from 'date-fns';

import { useFirestore, updateDocumentNonBlocking } from '@/firebase';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import type { Aircraft, AircraftComponent } from '../../assets/page';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { CustomCalendar } from '@/components/ui/custom-calendar';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { PlusCircle, Edit, Trash2, CalendarIcon } from 'lucide-react';


const componentSchema = z.object({
  id: z.string(),
  name: z.string().min(1, 'Component name is required.'),
  partNumber: z.string().min(1, 'Part number is required.'),
  serialNumber: z.string().optional(),
  installDate: z.date().optional(),
  installHours: z.number({ coerce: true }).min(0).optional(),
  maxHours: z.number({ coerce: true }).min(0).optional(),
  tsn: z.number({ coerce: true }).min(0).optional(),
  tso: z.number({ coerce: true }).min(0).optional(),
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
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingComponent, setEditingComponent] = useState<AircraftComponent | null>(null);

  const form = useForm<ComponentFormValues>({
    resolver: zodResolver(componentSchema),
  });

  useEffect(() => {
    if (isDialogOpen) {
      form.reset(
        editingComponent
          ? {
              ...editingComponent,
              installDate: editingComponent.installDate ? new Date(editingComponent.installDate) : undefined,
            }
          : {
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
            }
      );
    }
  }, [isDialogOpen, editingComponent, form]);

  const handleOpenDialog = (component: AircraftComponent | null) => {
    setEditingComponent(component);
    setIsDialogOpen(true);
  };

  const handleSave = (values: ComponentFormValues) => {
    if (!firestore) return;

    const componentData = {
      ...values,
      installDate: values.installDate ? values.installDate.toISOString() : '',
    };

    let updatedComponents: AircraftComponent[];
    if (editingComponent) {
      updatedComponents = (aircraft.components || []).map(c =>
        c.id === editingComponent.id ? componentData : c
      );
    } else {
      updatedComponents = [...(aircraft.components || []), componentData];
    }
    
    const aircraftRef = doc(firestore, 'tenants', tenantId, 'aircrafts', aircraft.id);
    updateDocumentNonBlocking(aircraftRef, { components: updatedComponents });

    toast({
      title: editingComponent ? 'Component Updated' : 'Component Added',
      description: `The component "${values.name}" has been saved.`,
    });
    
    setIsDialogOpen(false);
    setEditingComponent(null);
  };

  const handleDelete = (componentId: string) => {
    if (!firestore) return;
    const updatedComponents = (aircraft.components || []).filter(c => c.id !== componentId);
    const aircraftRef = doc(firestore, 'tenants', tenantId, 'aircrafts', aircraft.id);
    updateDocumentNonBlocking(aircraftRef, { components: updatedComponents });
    toast({ title: 'Component Deleted' });
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <div>
          <CardTitle>Installed Components</CardTitle>
        </div>
        <Button onClick={() => handleOpenDialog(null)}>
          <PlusCircle className="mr-2 h-4 w-4" /> Add Component
        </Button>
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
              <TableHead>Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {(aircraft.components || []).length > 0 ? (
              aircraft.components?.map(component => (
                <TableRow key={component.id}>
                  <TableCell>{component.name}</TableCell>
                  <TableCell>{component.partNumber}</TableCell>
                  <TableCell>{component.serialNumber}</TableCell>
                  <TableCell>{component.installDate ? format(new Date(component.installDate), 'PPP') : 'N/A'}</TableCell>
                  <TableCell>{component.installHours}</TableCell>
                  <TableCell>{component.maxHours}</TableCell>
                  <TableCell>{component.tsn}</TableCell>
                  <TableCell>{component.tso}</TableCell>
                  <TableCell>
                    <div className="flex gap-2">
                        <Button variant="ghost" size="icon" onClick={() => handleOpenDialog(component)}><Edit className="h-4 w-4" /></Button>
                        <Button variant="ghost" size="icon" className="text-destructive hover:text-destructive" onClick={() => handleDelete(component.id)}><Trash2 className="h-4 w-4" /></Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={9} className="h-24 text-center">
                  No components added yet.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>

        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogContent className="sm:max-w-xl">
            <DialogHeader>
              <DialogTitle>{editingComponent ? 'Edit' : 'Add'} Component</DialogTitle>
              <DialogDescription>
                {editingComponent ? 'Update the details for this component.' : 'Add a new trackable component to the aircraft.'}
              </DialogDescription>
            </DialogHeader>
            <Form {...form}>
                <form onSubmit={form.handleSubmit(handleSave)} className="space-y-4">
                  <FormField control={form.control} name="name" render={({ field }) => ( <FormItem><FormLabel>Name</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem> )}/>
                  <div className="grid grid-cols-2 gap-4">
                    <FormField control={form.control} name="partNumber" render={({ field }) => ( <FormItem><FormLabel>Part No.</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem> )} />
                    <FormField control={form.control} name="serialNumber" render={({ field }) => ( <FormItem><FormLabel>Serial No.</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem> )} />
                  </div>
                  <FormField
                    control={form.control}
                    name="installDate"
                    render={({ field }) => (
                      <FormItem className="flex flex-col">
                        <FormLabel>Install Date</FormLabel>
                        <Popover>
                            <PopoverTrigger asChild>
                                <FormControl>
                                    <Button variant={"outline"} className={cn("pl-3 text-left font-normal", !field.value && "text-muted-foreground")}>
                                        {field.value ? format(field.value, "PPP") : <span>Pick a date</span>}
                                        <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                                    </Button>
                                </FormControl>
                            </PopoverTrigger>
                            <PopoverContent className="w-auto p-0" align="start" onInteractOutside={(e) => e.preventDefault()}>
                                <CustomCalendar
                                    selectedDate={field.value}
                                    onDateSelect={(date) => {
                                        field.onChange(date);
                                        const trigger = document.querySelector('[data-radix-popper-content-wrapper]')?.parentElement?.querySelector('[data-state="open"]');
                                        if (trigger) (trigger as HTMLElement).click();
                                    }}
                                />
                            </PopoverContent>
                        </Popover>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <div className="grid grid-cols-2 gap-4">
                    <FormField control={form.control} name="installHours" render={({ field }) => ( <FormItem><FormLabel>Install Hours</FormLabel><FormControl><Input type="number" {...field} /></FormControl><FormMessage /></FormItem> )} />
                    <FormField control={form.control} name="maxHours" render={({ field }) => ( <FormItem><FormLabel>Max Hours</FormLabel><FormControl><Input type="number" {...field} /></FormControl><FormMessage /></FormItem> )} />
                    <FormField control={form.control} name="tsn" render={({ field }) => ( <FormItem><FormLabel>TSN (Time Since New)</FormLabel><FormControl><Input type="number" {...field} /></FormControl><FormMessage /></FormItem> )}/>
                    <FormField control={form.control} name="tso" render={({ field }) => ( <FormItem><FormLabel>TSO (Time Since Overhaul)</FormLabel><FormControl><Input type="number" {...field} /></FormControl><FormMessage /></FormItem> )}/>
                  </div>
                  <FormField control={form.control} name="notes" render={({ field }) => ( <FormItem><FormLabel>Notes</FormLabel><FormControl><Textarea {...field} /></FormControl><FormMessage /></FormItem> )} />
                  <DialogFooter>
                    <DialogClose asChild><Button type="button" variant="outline">Cancel</Button></DialogClose>
                    <Button type="submit">Save Changes</Button>
                  </DialogFooter>
                </form>
            </Form>
          </DialogContent>
        </Dialog>
      </CardContent>
    </Card>
  );
}
