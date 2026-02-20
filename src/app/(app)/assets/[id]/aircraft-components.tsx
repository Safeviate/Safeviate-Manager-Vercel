
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
  DialogClose,
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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from '@/components/ui/card';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { CalendarIcon, PlusCircle, Trash2 } from 'lucide-react';
import { useFirestore, updateDocumentNonBlocking } from '@/firebase';
import { doc } from 'firebase/firestore';
import { useToast } from '@/hooks/use-toast';
import type { Aircraft, AircraftComponent } from '@/types/aircraft';
import { v4 as uuidv4 } from 'uuid';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';

interface AircraftComponentsProps {
  aircraft: Aircraft;
  aircraftId: string;
}

const componentSchema = z.object({
  id: z.string(),
  name: z.string().min(1, 'Component name is required.'),
  partNumber: z.string().min(1, 'Part number is required.'),
  serialNumber: z.string().nullable().optional(),
  installDate: z.date().nullable().optional(),
  installHours: z.number({ coerce: true }).nullable().optional(),
  maxHours: z.number({ coerce: true }).nullable().optional(),
  notes: z.string().nullable().optional(),
  tso: z.number({ coerce: true }).nullable().optional(),
  tsn: z.number({ coerce: true }).nullable().optional(),
});

type ComponentFormValues = z.infer<typeof componentSchema>;

export function AircraftComponents({ aircraft, aircraftId }: AircraftComponentsProps) {
  const firestore = useFirestore();
  const { toast } = useToast();
  const [components, setComponents] = useState<AircraftComponent[]>([]);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingComponent, setEditingComponent] = useState<AircraftComponent | null>(null);

  useEffect(() => {
    setComponents(aircraft.components || []);
  }, [aircraft.components]);

  const form = useForm<ComponentFormValues>({
    resolver: zodResolver(componentSchema),
  });

  const handleOpenDialog = (component: AircraftComponent | null = null) => {
    setEditingComponent(component);
    if (component) {
      form.reset({
        ...component,
        installDate: component.installDate ? new Date(component.installDate) : null,
      });
    } else {
      form.reset({
        id: uuidv4(),
        name: '',
        partNumber: '',
        serialNumber: '',
        installDate: null,
        installHours: 0,
        maxHours: 0,
        notes: '',
        tso: 0,
        tsn: 0,
      });
    }
    setIsDialogOpen(true);
  };

  const onSubmit = async (data: ComponentFormValues) => {
    const updatedComponents = [...components];
    const componentData: AircraftComponent = {
        ...data,
        installDate: data.installDate ? data.installDate.toISOString() : null,
        serialNumber: data.serialNumber || null,
        installHours: data.installHours || null,
        maxHours: data.maxHours || null,
        notes: data.notes || null,
        tso: data.tso || null,
        tsn: data.tsn || null,
    };

    if (editingComponent) {
      const index = updatedComponents.findIndex((c) => c.id === editingComponent.id);
      if (index !== -1) {
        updatedComponents[index] = componentData;
      }
    } else {
      updatedComponents.push(componentData);
    }
    
    setComponents(updatedComponents);

    if (!firestore) return;
    
    const aircraftRef = doc(firestore, 'tenants', tenantId, 'aircrafts', aircraftId);
    updateDocumentNonBlocking(aircraftRef, { components: updatedComponents });
    
    toast({ title: editingComponent ? 'Component Updated' : 'Component Added' });
    setIsDialogOpen(false);
  };

  return (
    <div>
      <div className="flex justify-end mb-4">
        <Button onClick={() => handleOpenDialog()}>
          <PlusCircle className="mr-2" /> Add Component
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
                <TableHead>Component</TableHead>
                <TableHead>Part No.</TableHead>
                <TableHead>Serial No.</TableHead>
                <TableHead>TSN</TableHead>
                <TableHead>TSO</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {components.map((component) => (
                <TableRow key={component.id}>
                  <TableCell>{component.name}</TableCell>
                  <TableCell>{component.partNumber}</TableCell>
                  <TableCell>{component.serialNumber || 'N/A'}</TableCell>
                  <TableCell>{component.tsn ?? 'N/A'}</TableCell>
                  <TableCell>{component.tso ?? 'N/A'}</TableCell>
                  <TableCell>
                    <Button variant="ghost" size="sm" onClick={() => handleOpenDialog(component)}>
                      Edit
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingComponent ? 'Edit' : 'Add'} Component</DialogTitle>
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
                                        <Button variant={"outline"} className={cn("pl-3 text-left font-normal", !field.value && "text-muted-foreground")}>
                                            {field.value ? format(field.value, "PPP") : <span>Pick a date</span>}
                                            <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                                        </Button>
                                    </FormControl>
                                </PopoverTrigger>
                                <PopoverContent className="w-auto p-0" align="start">
                                    <Calendar
                                        mode="single"
                                        selected={field.value || undefined}
                                        onSelect={field.onChange}
                                        disabled={(date) => date > new Date() || date < new Date("1900-01-01")}
                                        initialFocus
                                    />
                                </PopoverContent>
                            </Popover>
                            <FormMessage />
                        </FormItem>
                    )} />
                    <FormField control={form.control} name="installHours" render={({ field }) => ( <FormItem><FormLabel>Install Hours</FormLabel><FormControl><Input type="number" {...field} value={field.value ?? ''} /></FormControl><FormMessage /></FormItem> )} />
                    <FormField control={form.control} name="maxHours" render={({ field }) => ( <FormItem><FormLabel>Max Hours</FormLabel><FormControl><Input type="number" {...field} value={field.value ?? ''} /></FormControl><FormMessage /></FormItem> )} />
                    <FormField control={form.control} name="tsn" render={({ field }) => ( <FormItem><FormLabel>Time Since New (TSN)</FormLabel><FormControl><Input type="number" {...field} value={field.value ?? ''} /></FormControl><FormMessage /></FormItem> )} />
                    <FormField control={form.control} name="tso" render={({ field }) => ( <FormItem><FormLabel>Time Since Overhaul (TSO)</FormLabel><FormControl><Input type="number" {...field} value={field.value ?? ''} /></FormControl><FormMessage /></FormItem> )} />
                </div>
                <FormField control={form.control} name="notes" render={({ field }) => ( <FormItem><FormLabel>Notes</FormLabel><FormControl><Input {...field} value={field.value ?? ''} /></FormControl><FormMessage /></FormItem> )} />
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
    </div>
  );
}
