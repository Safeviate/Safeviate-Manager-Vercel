'use client';

import { useState } from 'react';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogClose,
  DialogTrigger,
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
import { useForm, useFieldArray } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { MoreHorizontal, PlusCircle, Trash2, Edit } from 'lucide-react';
import { useFirestore, useCollection, useMemoFirebase, addDocumentNonBlocking, deleteDocumentNonBlocking, updateDocumentNonBlocking } from '@/firebase';
import { collection, query, doc } from 'firebase/firestore';
import type { AircraftComponent } from '@/types/aircraft';
import { useToast } from '@/hooks/use-toast';
import { CustomCalendar } from '@/components/ui/custom-calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { CalendarIcon } from 'lucide-react';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import { Textarea } from '@/components/ui/textarea';

const componentSchema = z.object({
  name: z.string().min(1, "Component name is required"),
  partNumber: z.string().min(1, "Part number is required"),
  serialNumber: z.string().optional(),
  manufacturer: z.string().optional(),
  installDate: z.date().optional(),
  installHours: z.number({ coerce: true }).optional(),
  maxHours: z.number({ coerce: true }).optional(),
  notes: z.string().optional(),
  tsn: z.number({ coerce: true }).optional(),
  tso: z.number({ coerce: true }).optional(),
});

type ComponentFormValues = z.infer<typeof componentSchema>;

interface AircraftComponentsProps {
  aircraftId: string;
  tenantId: string;
}

export function AircraftComponents({ aircraftId, tenantId }: AircraftComponentsProps) {
  const firestore = useFirestore();
  const { toast } = useToast();
  const [isOpen, setIsOpen] = useState(false);
  const [editingComponent, setEditingComponent] = useState<AircraftComponent | null>(null);

  const form = useForm<ComponentFormValues>({
    resolver: zodResolver(componentSchema),
    defaultValues: {},
  });

  const componentsQuery = useMemoFirebase(
    () => (firestore ? collection(firestore, 'tenants', tenantId, 'aircrafts', aircraftId, 'components') : null),
    [firestore, tenantId, aircraftId]
  );

  const { data: components, isLoading, error } = useCollection<AircraftComponent>(componentsQuery);
  
  const handleOpenDialog = (component: AircraftComponent | null = null) => {
    setEditingComponent(component);
    form.reset(component ? { ...component, installDate: component.installDate ? new Date(component.installDate) : undefined } : {
        name: '',
        partNumber: '',
        serialNumber: '',
        manufacturer: '',
        installHours: 0,
        maxHours: 0,
        notes: '',
        tsn: 0,
        tso: 0,
    });
    setIsOpen(true);
  }

  const onSubmit = async (values: ComponentFormValues) => {
    if (!firestore) return;

    const collectionRef = collection(firestore, 'tenants', tenantId, 'aircrafts', aircraftId, 'components');
    const dataToSave = { ...values, installDate: values.installDate?.toISOString() };

    if (editingComponent) {
      const docRef = doc(collectionRef, editingComponent.id);
      await updateDocumentNonBlocking(docRef, dataToSave);
      toast({ title: 'Component Updated' });
    } else {
      await addDocumentNonBlocking(collectionRef, dataToSave);
      toast({ title: 'Component Added' });
    }
    setIsOpen(false);
  };
  
  const handleDelete = (componentId: string) => {
      if(!firestore) return;
      const docRef = doc(firestore, 'tenants', tenantId, 'aircrafts', aircraftId, 'components', componentId);
      deleteDocumentNonBlocking(docRef);
      toast({ title: 'Component Deleted' });
  }

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <Card>
        <CardHeader>
          <div className="flex justify-between items-center">
            <div>
              <CardTitle>Components</CardTitle>
              <CardDescription>Tracked components installed on this aircraft.</CardDescription>
            </div>
            <Button onClick={() => handleOpenDialog()}>
              <PlusCircle className="mr-2 h-4 w-4" /> Add Component
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading && (
            <div className="text-center text-muted-foreground py-8">
              Loading components...
            </div>
          )}
          {!isLoading && error && (
            <div className="text-center text-destructive py-8">
              Error: {error.message}
            </div>
          )}
          {!isLoading && !error && (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Component</TableHead>
                  <TableHead>Part No.</TableHead>
                  <TableHead>Serial No.</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {components && components.length > 0 ? (
                  components.map((component) => (
                    <TableRow key={component.id}>
                      <TableCell className="font-medium">{component.name}</TableCell>
                      <TableCell>{component.partNumber}</TableCell>
                      <TableCell>{component.serialNumber}</TableCell>
                      <TableCell className="text-right">
                         <Button variant="ghost" size="icon" onClick={() => handleOpenDialog(component)}><Edit className="h-4 w-4" /></Button>
                         <Button variant="ghost" size="icon" onClick={() => handleDelete(component.id)}><Trash2 className="h-4 w-4 text-destructive" /></Button>
                      </TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={4} className="text-center h-24">
                      No components tracked for this aircraft.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
      
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>{editingComponent ? 'Edit' : 'Add'} Component</DialogTitle>
          <DialogDescription>
            {editingComponent ? 'Update the details for this component.' : 'Add a new trackable component to this aircraft.'}
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                    <FormField control={form.control} name="name" render={({ field }) => ( <FormItem><FormLabel>Name</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem> )} />
                    <FormField control={form.control} name="manufacturer" render={({ field }) => ( <FormItem><FormLabel>Manufacturer</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem> )} />
                    <FormField control={form.control} name="partNumber" render={({ field }) => ( <FormItem><FormLabel>Part Number</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem> )} />
                    <FormField control={form.control} name="serialNumber" render={({ field }) => ( <FormItem><FormLabel>Serial Number</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem> )} />
                    <FormField control={form.control} name="installDate" render={({ field }) => (<FormItem className="flex flex-col"><FormLabel>Install Date</FormLabel><Popover><PopoverTrigger asChild><FormControl><Button variant={"outline"} className={cn("w-full pl-3 text-left font-normal", !field.value && "text-muted-foreground")}>{field.value ? format(field.value, "PPP") : <span>Pick a date</span>}<CalendarIcon className="ml-auto h-4 w-4 opacity-50" /></Button></FormControl></PopoverTrigger><PopoverContent className="w-auto p-0"><CustomCalendar selectedDate={field.value} onDateSelect={field.onChange} /></PopoverContent></Popover><FormMessage /></FormItem>)}/>
                    <FormField control={form.control} name="installHours" render={({ field }) => ( <FormItem><FormLabel>Install Hours</FormLabel><FormControl><Input type="number" {...field} /></FormControl><FormMessage /></FormItem> )} />
                    <FormField control={form.control} name="maxHours" render={({ field }) => ( <FormItem><FormLabel>Max Hours</FormLabel><FormControl><Input type="number" {...field} /></FormControl><FormMessage /></FormItem> )} />
                    <FormField control={form.control} name="tsn" render={({ field }) => ( <FormItem><FormLabel>Time Since New (TSN)</FormLabel><FormControl><Input type="number" {...field} /></FormControl><FormMessage /></FormItem> )} />
                    <FormField control={form.control} name="tso" render={({ field }) => ( <FormItem className="col-span-2"><FormLabel>Time Since Overhaul (TSO)</FormLabel><FormControl><Input type="number" {...field} /></FormControl><FormMessage /></FormItem> )} />
                    <FormField control={form.control} name="notes" render={({ field }) => ( <FormItem className="col-span-2"><FormLabel>Notes</FormLabel><FormControl><Textarea {...field} /></FormControl><FormMessage /></FormItem> )} />
                </div>
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
