
'use client';

import { useState, useMemo, useEffect, ReactNode } from 'react';
import { useForm, useFieldArray } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { v4 as uuidv4 } from 'uuid';
import { format } from 'date-fns';

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
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
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { PlusCircle, Edit, Trash2, CalendarIcon } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/hooks/use-toast';
import { useFirestore, updateDocumentNonBlocking } from '@/firebase';
import { doc } from 'firebase/firestore';
import type { Aircraft, AircraftComponent } from '@/types/aircraft';

// --- Form Schema and Types ---
const formSchema = z.object({
  id: z.string().optional(),
  name: z.string().min(1, "Name is required."),
  manufacturer: z.string().optional(),
  partNumber: z.string().min(1, "Part Number is required."),
  serialNumber: z.string().optional(),
  installDate: z.string().optional(),
  installHours: z.union([z.number(), z.string()]).optional(),
  maxHours: z.union([z.number(), z.string()]).optional(),
  notes: z.string().optional(),
  tsn: z.union([z.number(), z.string()]).optional(),
  tso: z.union([z.number(), z.string()]).optional(),
});

type ComponentFormValues = z.infer<typeof formSchema>;

// --- Helper Dialog Component for the Form ---
interface ComponentFormDialogProps {
  isOpen: boolean;
  setIsOpen: (open: boolean) => void;
  trigger?: ReactNode;
  handleSaveComponent: (componentId: string | undefined, data: Partial<AircraftComponent>) => void;
  existingComponent?: AircraftComponent | null;
}

function ComponentFormDialog({
  isOpen,
  setIsOpen,
  trigger,
  handleSaveComponent,
  existingComponent,
}: ComponentFormDialogProps) {
  const form = useForm<ComponentFormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: existingComponent
      ? {
          id: existingComponent.id,
          name: existingComponent.name,
          manufacturer: existingComponent.manufacturer ?? '',
          partNumber: existingComponent.partNumber,
          serialNumber: existingComponent.serialNumber ?? '',
          installDate: existingComponent.installDate
            ? format(new Date(existingComponent.installDate), 'yyyy-MM-dd')
            : '',
          installHours: existingComponent.installHours ?? '',
          maxHours: existingComponent.maxHours ?? '',
          notes: existingComponent.notes ?? '',
          tsn: existingComponent.tsn ?? '',
          tso: existingComponent.tso ?? '',
        }
      : {
          id: '',
          name: '',
          manufacturer: '',
          partNumber: '',
          serialNumber: '',
          installDate: '',
          installHours: '',
          maxHours: '',
          notes: '',
          tsn: '',
          tso: '',
        },
  });

  useEffect(() => {
    if (isOpen) {
      form.reset(
        existingComponent
          ? {
              id: existingComponent.id,
              name: existingComponent.name,
              manufacturer: existingComponent.manufacturer ?? '',
              partNumber: existingComponent.partNumber,
              serialNumber: existingComponent.serialNumber ?? '',
              installDate: existingComponent.installDate
                ? format(new Date(existingComponent.installDate), 'yyyy-MM-dd')
                : '',
              installHours: existingComponent.installHours ?? '',
              maxHours: existingComponent.maxHours ?? '',
              notes: existingComponent.notes ?? '',
              tsn: existingComponent.tsn ?? '',
              tso: existingComponent.tso ?? '',
            }
          : {
              id: '',
              name: '',
              manufacturer: '',
              partNumber: '',
              serialNumber: '',
              installDate: '',
              installHours: '',
              maxHours: '',
              notes: '',
              tsn: '',
              tso: '',
            }
      );
    }
  }, [isOpen, existingComponent, form]);

  const onSubmit = (values: ComponentFormValues) => {
    const dataForFirestore: Partial<AircraftComponent> = {
      name: values.name,
      partNumber: values.partNumber,
      manufacturer: values.manufacturer || null,
      serialNumber: values.serialNumber || null,
      installDate: values.installDate || null,
      notes: values.notes || null,
      installHours: values.installHours ? Number(values.installHours) : null,
      maxHours: values.maxHours ? Number(values.maxHours) : null,
      tsn: values.tsn ? Number(values.tsn) : null,
      tso: values.tso ? Number(values.tso) : null,
    };
    
    handleSaveComponent(values.id, dataForFirestore);
    setIsOpen(false);
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      {trigger && <DialogTrigger asChild>{trigger}</DialogTrigger>}
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{existingComponent ? 'Edit' : 'Add'} Component</DialogTitle>
          <DialogDescription>
            {existingComponent ? `Editing component: ${existingComponent.name}` : 'Add a new component to this aircraft.'}
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
             <FormField control={form.control} name="name" render={({ field }) => ( <FormItem><FormLabel>Component Name</FormLabel><FormControl><Input placeholder="e.g., Propeller" {...field} /></FormControl><FormMessage /></FormItem> )}/>
             <FormField control={form.control} name="manufacturer" render={({ field }) => ( <FormItem><FormLabel>Manufacturer</FormLabel><FormControl><Input placeholder="e.g., Hartzell" {...field} /></FormControl><FormMessage /></FormItem> )}/>
             <FormField control={form.control} name="partNumber" render={({ field }) => ( <FormItem><FormLabel>Part Number</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem> )}/>
             <FormField control={form.control} name="serialNumber" render={({ field }) => ( <FormItem><FormLabel>Serial Number</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem> )}/>
             <div className="grid grid-cols-2 gap-4">
                <FormField control={form.control} name="installDate" render={({ field }) => (<FormItem><FormLabel>Install Date</FormLabel><FormControl><Input type="date" {...field} /></FormControl><FormMessage /></FormItem>)}/>
                <FormField control={form.control} name="installHours" render={({ field }) => (<FormItem><FormLabel>Install Hours</FormLabel><FormControl><Input type="number" {...field} /></FormControl><FormMessage /></FormItem>)} />
             </div>
             <FormField control={form.control} name="maxHours" render={({ field }) => (<FormItem><FormLabel>Max Hours (TBO)</FormLabel><FormControl><Input type="number" {...field} /></FormControl><FormMessage /></FormItem>)} />
              <div className="grid grid-cols-2 gap-4">
                <FormField control={form.control} name="tsn" render={({ field }) => (<FormItem><FormLabel>Time Since New (TSN)</FormLabel><FormControl><Input type="number" {...field} /></FormControl><FormMessage /></FormItem>)} />
                <FormField control={form.control} name="tso" render={({ field }) => (<FormItem><FormLabel>Time Since Overhaul (TSO)</FormLabel><FormControl><Input type="number" {...field} /></FormControl><FormMessage /></FormItem>)} />
              </div>
             <FormField control={form.control} name="notes" render={({ field }) => ( <FormItem><FormLabel>Notes</FormLabel><FormControl><Textarea placeholder="Any relevant notes..." {...field} /></FormControl><FormMessage /></FormItem> )}/>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setIsOpen(false)}>
                Cancel
              </Button>
              <Button type="submit">Save Component</Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}

// --- Main Component ---
interface AircraftComponentsProps {
  aircraft: Aircraft;
}

export function AircraftComponents({ aircraft }: AircraftComponentsProps) {
  const firestore = useFirestore();
  const { toast } = useToast();
  const tenantId = 'safeviate';
  const [formState, setFormState] = useState<{
    isOpen: boolean;
    component: AircraftComponent | null;
  }>({ isOpen: false, component: null });

  const handleSaveComponent = (componentId: string | undefined, data: Partial<AircraftComponent>) => {
    if (!firestore || !aircraft) {
        toast({ variant: "destructive", title: "Error", description: "Aircraft data not available." });
        return;
    };

    let updatedComponents: AircraftComponent[];
    if (componentId) {
      // Editing existing component
      updatedComponents = (aircraft.components || []).map(c =>
        c.id === componentId ? ({ ...c, ...data } as AircraftComponent) : c
      );
    } else {
      // Adding new component
      const newComponent: AircraftComponent = {
        name: data.name!,
        partNumber: data.partNumber!,
        id: uuidv4(),
        ...data,
      };
      updatedComponents = [...(aircraft.components || []), newComponent];
    }
    
    const aircraftRef = doc(firestore, 'tenants', tenantId, 'aircrafts', aircraft.id);
    updateDocumentNonBlocking(aircraftRef, { components: updatedComponents });

    toast({
        title: componentId ? 'Component Updated' : 'Component Added',
        description: `The component "${data.name}" has been saved.`,
    });
  };

  const handleDelete = (componentId: string) => {
    if (!firestore || !aircraft) return;

    const updatedComponents = (aircraft.components || []).filter(c => c.id !== componentId);
    const aircraftRef = doc(firestore, 'tenants', tenantId, 'aircrafts', aircraft.id);
    updateDocumentNonBlocking(aircraftRef, { components: updatedComponents });

    toast({
      variant: 'destructive',
      title: 'Component Deleted',
    });
  };

  const handleEditClick = (component: AircraftComponent) => {
    setFormState({ isOpen: true, component });
  };

  const handleAddClick = () => {
    setFormState({ isOpen: true, component: null });
  };

  const components = aircraft?.components || [];

  return (
    <Card>
      <CardHeader>
        <div className="flex justify-between items-center">
          <div>
            <CardTitle>Tracked Components</CardTitle>
            <CardDescription>
              A list of all time-lifed or tracked components for this aircraft.
            </CardDescription>
          </div>
          <ComponentFormDialog
            isOpen={formState.isOpen}
            setIsOpen={(isOpen) => setFormState({ ...formState, isOpen })}
            handleSaveComponent={handleSaveComponent}
            existingComponent={formState.component}
            trigger={
              <Button onClick={handleAddClick}>
                <PlusCircle className="mr-2" /> Add Component
              </Button>
            }
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
              <TableHead>Install Date</TableHead>
              <TableHead>Install Hours</TableHead>
              <TableHead>Max Hours</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {components.map((component) => (
              <TableRow key={component.id}>
                <TableCell className="font-medium">{component.name}</TableCell>
                <TableCell>{component.partNumber}</TableCell>
                <TableCell>{component.serialNumber || 'N/A'}</TableCell>
                <TableCell>
                  {component.installDate ? format(new Date(component.installDate), 'PPP') : 'N/A'}
                </TableCell>
                <TableCell>{component.installHours || 'N/A'}</TableCell>
                <TableCell>{component.maxHours || 'N/A'}</TableCell>
                <TableCell className="text-right">
                  <Button variant="ghost" size="icon" onClick={() => handleEditClick(component)}>
                    <Edit className="h-4 w-4" />
                  </Button>
                  <Button variant="ghost" size="icon" onClick={() => handleDelete(component.id)}>
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                </TableCell>
              </TableRow>
            ))}
            {components.length === 0 && (
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
  );
}
