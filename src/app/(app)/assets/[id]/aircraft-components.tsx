
'use client';

import { useState, useEffect } from 'react';
import { useForm, useFieldArray } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { v4 as uuidv4 } from 'uuid';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogClose } from '@/components/ui/dialog';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Popover, PopoverTrigger, PopoverContent } from '@/components/ui/popover';
import { CustomCalendar } from '@/components/ui/custom-calendar';
import { CalendarIcon, PlusCircle, Trash2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import type { Aircraft, AircraftComponent } from '../page';
import { useToast } from '@/hooks/use-toast';

const componentSchema = z.object({
  id: z.string(),
  name: z.string().min(1, 'Component name is required'),
  partNumber: z.string().min(1, 'Part number is required'),
  serialNumber: z.string().optional(),
  installDate: z.date().optional(),
  installHours: z.number({ coerce: true }).optional(),
  maxHours: z.number({ coerce: true }).optional(),
  tsn: z.number({ coerce: true }).optional(),
  tso: z.number({ coerce: true }).optional(),
  notes: z.string().optional(),
});

type FormValues = z.infer<typeof componentSchema>;

interface AircraftComponentsProps {
  aircraft: Aircraft;
  tenantId: string;
  onUpdate: (components: AircraftComponent[]) => void;
}

export function AircraftComponents({ aircraft, tenantId, onUpdate }: AircraftComponentsProps) {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingComponent, setEditingComponent] = useState<AircraftComponent | null>(null);
  const { toast } = useToast();

  const form = useForm<FormValues>({
    resolver: zodResolver(componentSchema),
  });

  useEffect(() => {
    if (isDialogOpen) {
      if (editingComponent) {
        form.reset({
          ...editingComponent,
          installDate: editingComponent.installDate ? new Date(editingComponent.installDate) : undefined,
        });
      } else {
        form.reset({
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
        });
      }
    }
  }, [isDialogOpen, editingComponent, form]);

  if (!aircraft) {
    return (
        <Card>
            <CardHeader>
                <CardTitle>Components</CardTitle>
                <CardDescription>Manage the individual components of this aircraft.</CardDescription>
            </CardHeader>
            <CardContent>
                <div className="text-center p-8">
                    <p className="text-muted-foreground">Loading component data...</p>
                </div>
            </CardContent>
        </Card>
    );
  }

  const handleOpenDialog = (component?: AircraftComponent) => {
    setEditingComponent(component || null);
    setIsDialogOpen(true);
  };

  const onSubmit = (data: FormValues) => {
    const currentComponents = aircraft.components || [];
    let updatedComponents;

    const dataToSave = {
        ...data,
        installDate: data.installDate ? data.installDate.toISOString() : '',
    };

    if (editingComponent) {
      updatedComponents = currentComponents.map(c => c.id === editingComponent.id ? dataToSave : c);
    } else {
      updatedComponents = [...currentComponents, dataToSave];
    }

    onUpdate(updatedComponents);
    setIsDialogOpen(false);
    toast({
        title: editingComponent ? 'Component Updated' : 'Component Added',
        description: `The component "${data.name}" has been saved.`
    });
  };
  
  const handleDelete = (componentId: string) => {
      const updatedComponents = (aircraft.components || []).filter(c => c.id !== componentId);
      onUpdate(updatedComponents);
      toast({
          title: 'Component Deleted',
      });
  }

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex justify-between items-center">
            <div className='flex-1'>
                <CardTitle>Components</CardTitle>
                <CardDescription>Manage the individual components of this aircraft.</CardDescription>
            </div>
             <Button onClick={() => handleOpenDialog()}>
                <PlusCircle className="mr-2 h-4 w-4" /> Add Component
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Component</TableHead>
                <TableHead>Part #</TableHead>
                <TableHead>Serial #</TableHead>
                <TableHead>Max Hours</TableHead>
                <TableHead>TSN</TableHead>
                <TableHead>TSO</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {(aircraft.components || []).length > 0 ? (
                aircraft.components?.map(component => (
                  <TableRow key={component.id}>
                    <TableCell>{component.name}</TableCell>
                    <TableCell>{component.partNumber}</TableCell>
                    <TableCell>{component.serialNumber}</TableCell>
                    <TableCell>{component.maxHours || 'N/A'}</TableCell>
                    <TableCell>{component.tsn || 'N/A'}</TableCell>
                    <TableCell>{component.tso || 'N/A'}</TableCell>
                    <TableCell className="text-right">
                      <Button variant="ghost" size="sm" onClick={() => handleOpenDialog(component)}>Edit</Button>
                      <Button variant="ghost" size="sm" className="text-destructive" onClick={() => handleDelete(component.id)}>Delete</Button>
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={7} className="h-24 text-center">
                    No components added yet.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>{editingComponent ? 'Edit' : 'Add'} Component</DialogTitle>
          </DialogHeader>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 pt-4">
               <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                 <FormField control={form.control} name="name" render={({ field }) => ( <FormItem><FormLabel>Component Name</FormLabel><FormControl><Input placeholder="e.g., Propeller" {...field} /></FormControl><FormMessage /></FormItem> )} />
                 <FormField control={form.control} name="partNumber" render={({ field }) => ( <FormItem><FormLabel>Part Number</FormLabel><FormControl><Input placeholder="e.g., P-12345" {...field} /></FormControl><FormMessage /></FormItem> )} />
                 <FormField control={form.control} name="serialNumber" render={({ field }) => ( <FormItem><FormLabel>Serial Number</FormLabel><FormControl><Input placeholder="e.g., SN-9876" {...field} /></FormControl><FormMessage /></FormItem> )} />
                 <FormField control={form.control} name="installDate" render={({ field }) => ( <FormItem className="flex flex-col"><FormLabel>Install Date</FormLabel><Popover><PopoverTrigger asChild><FormControl><Button variant="outline" className={cn("w-full pl-3 text-left font-normal", !field.value && "text-muted-foreground")}><CalendarIcon className="mr-2 h-4 w-4" />{field.value ? format(field.value, "PPP") : <span>Pick a date</span>}</Button></FormControl></PopoverTrigger><PopoverContent className="w-auto p-0" onInteractOutside={(e) => e.preventDefault()}><CustomCalendar selectedDate={field.value} onDateSelect={(date) => { field.onChange(date); }} /></PopoverContent></Popover><FormMessage /></FormItem> )} />
                 <FormField control={form.control} name="installHours" render={({ field }) => ( <FormItem><FormLabel>Install Hours</FormLabel><FormControl><Input type="number" {...field} /></FormControl><FormMessage /></FormItem> )} />
                 <FormField control={form.control} name="maxHours" render={({ field }) => ( <FormItem><FormLabel>Max Hours</FormLabel><FormControl><Input type="number" {...field} /></FormControl><FormMessage /></FormItem> )} />
                 <FormField control={form.control} name="tsn" render={({ field }) => ( <FormItem><FormLabel>Time Since New (TSN)</FormLabel><FormControl><Input type="number" {...field} /></FormControl><FormMessage /></FormItem> )} />
                 <FormField control={form.control} name="tso" render={({ field }) => ( <FormItem><FormLabel>Time Since Overhaul (TSO)</FormLabel><FormControl><Input type="number" {...field} /></FormControl><FormMessage /></FormItem> )} />
                 <FormField control={form.control} name="notes" render={({ field }) => ( <FormItem className="col-span-2"><FormLabel>Notes</FormLabel><FormControl><Textarea {...field} /></FormControl><FormMessage /></FormItem> )} />
               </div>
              <DialogFooter>
                <DialogClose asChild><Button type="button" variant="outline">Cancel</Button></DialogClose>
                <Button type="submit">Save Component</Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </>
  );
}
