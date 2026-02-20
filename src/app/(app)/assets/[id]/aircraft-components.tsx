
'use client';

import { useState, useEffect, useCallback } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogClose,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { useFirestore, updateDocumentNonBlocking } from '@/firebase';
import { doc } from 'firebase/firestore';
import { useToast } from '@/hooks/use-toast';
import { PlusCircle, Edit, Trash2 } from 'lucide-react';
import type { Aircraft, AircraftComponent } from '@/types/aircraft';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Form, FormControl, FormField, FormItem, FormMessage } from '@/components/ui/form';
import { CustomCalendar } from '@/components/ui/custom-calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { CalendarIcon } from 'lucide-react';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import { Textarea } from '@/components/ui/textarea';
import { Skeleton } from '@/components/ui/skeleton';

const componentSchema = z.object({
  id: z.string(),
  name: z.string().min(1, { message: "Component name is required." }),
  manufacturer: z.string().optional(),
  partNumber: z.string().min(1, { message: "Part number is required." }),
  serialNumber: z.string().optional(),
  installDate: z.date().optional().nullable(),
  installHours: z.number({ coerce: true }).optional().nullable(),
  maxHours: z.number({ coerce: true }).optional().nullable(),
  tsn: z.number({ coerce: true }).optional().nullable(),
  tso: z.number({ coerce: true }).optional().nullable(),
  notes: z.string().optional(),
});

type ComponentFormValues = z.infer<typeof componentSchema>;

interface ComponentFormDialogProps {
  aircraftId: string;
  tenantId: string;
  trigger: React.ReactNode;
  existingComponent?: AircraftComponent | null;
  components: AircraftComponent[];
  onFormSubmit: () => void;
}

function ComponentFormDialog({
  aircraftId,
  tenantId,
  trigger,
  existingComponent,
  components,
  onFormSubmit
}: ComponentFormDialogProps) {
  const [isOpen, setIsOpen] = useState(false);
  const firestore = useFirestore();
  const { toast } = useToast();

  const form = useForm<ComponentFormValues>({
    resolver: zodResolver(componentSchema),
  });

  useEffect(() => {
    if (isOpen) {
      const defaultValues = {
        id: existingComponent?.id || `comp_${Date.now()}`,
        name: existingComponent?.name || '',
        manufacturer: existingComponent?.manufacturer || '',
        partNumber: existingComponent?.partNumber || '',
        serialNumber: existingComponent?.serialNumber || '',
        installDate: existingComponent?.installDate ? new Date(existingComponent.installDate) : null,
        installHours: existingComponent?.installHours || null,
        maxHours: existingComponent?.maxHours || null,
        tsn: existingComponent?.tsn || null,
        tso: existingComponent?.tso || null,
        notes: existingComponent?.notes || '',
      };
      form.reset(defaultValues);
    }
  }, [isOpen, existingComponent, form]);

  const onSubmit = async (data: ComponentFormValues) => {
    if (!firestore) return;

    const aircraftRef = doc(firestore, 'tenants', tenantId, 'aircrafts', aircraftId);
    let updatedComponents: AircraftComponent[];

    if (existingComponent) {
      // Editing existing
      updatedComponents = components.map(c =>
        c.id === existingComponent.id ? { ...c, ...data } : c
      );
    } else {
      // Adding new
      updatedComponents = [...components, data as AircraftComponent];
    }
    
    await updateDocumentNonBlocking(aircraftRef, { components: updatedComponents });

    toast({
        title: 'Component Saved',
        description: `The component "${data.name}" has been saved.`,
    });
    
    setIsOpen(false);
    onFormSubmit();
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
             <FormField control={form.control} name="name" render={({ field }) => ( <FormItem><FormLabel>Component Name</FormLabel><FormControl><Input placeholder="e.g., Propeller" {...field} /></FormControl><FormMessage /></FormItem> )}/>
             <FormField control={form.control} name="manufacturer" render={({ field }) => ( <FormItem><FormLabel>Manufacturer</FormLabel><FormControl><Input placeholder="e.g., Hartzell" {...field} /></FormControl><FormMessage /></FormItem> )}/>
             <FormField control={form.control} name="partNumber" render={({ field }) => ( <FormItem><FormLabel>Part Number</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem> )}/>
             <FormField control={form.control} name="serialNumber" render={({ field }) => ( <FormItem><FormLabel>Serial Number</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem> )}/>
             <FormField control={form.control} name="installDate" render={({ field }) => ( <FormItem className="flex flex-col"><FormLabel>Install Date</FormLabel><Popover><PopoverTrigger asChild><FormControl><Button variant="outline" className={cn('pl-3 text-left font-normal', !field.value && 'text-muted-foreground')}>{field.value ? format(field.value, 'PPP') : <span>Pick a date</span>}<CalendarIcon className="ml-auto h-4 w-4 opacity-50" /></Button></FormControl></PopoverTrigger><PopoverContent><CustomCalendar selectedDate={field.value ?? undefined} onDateSelect={field.onChange} /></PopoverContent></Popover><FormMessage /></FormItem> )}/>
             <FormField control={form.control} name="installHours" render={({ field }) => ( <FormItem><FormLabel>Install Hours (Hobbs)</FormLabel><FormControl><Input type="number" {...field} value={field.value ?? ''} /></FormControl><FormMessage /></FormItem> )}/>
             <FormField control={form.control} name="maxHours" render={({ field }) => ( <FormItem><FormLabel>Max Hours (TBO)</FormLabel><FormControl><Input type="number" {...field} value={field.value ?? ''} /></FormControl><FormMessage /></FormItem> )}/>
             <FormField control={form.control} name="tsn" render={({ field }) => ( <FormItem><FormLabel>Time Since New (TSN)</FormLabel><FormControl><Input type="number" {...field} value={field.value ?? ''} /></FormControl><FormMessage /></FormItem> )}/>
             <FormField control={form.control} name="tso" render={({ field }) => ( <FormItem><FormLabel>Time Since Overhaul (TSO)</FormLabel><FormControl><Input type="number" {...field} value={field.value ?? ''} /></FormControl><FormMessage /></FormItem> )}/>
             <FormField control={form.control} name="notes" render={({ field }) => ( <FormItem><FormLabel>Notes</FormLabel><FormControl><Textarea {...field} /></FormControl><FormMessage /></FormItem> )}/>
            <DialogFooter>
              <DialogClose asChild><Button type="button" variant="outline">Cancel</Button></DialogClose>
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
}

export function AircraftComponents({ aircraft }: AircraftComponentsProps) {
    const firestore = useFirestore();
    const { toast } = useToast();
    const [isDeleteOpen, setIsDeleteOpen] = useState(false);
    const [componentToDelete, setComponentToDelete] = useState<AircraftComponent | null>(null);

    const onFormSubmit = useCallback(() => {
        // This is a dummy function to trigger a re-render if needed, but not currently used.
    }, []);

    const handleDelete = async () => {
        if (!firestore || !aircraft || !componentToDelete) return;

        const aircraftRef = doc(firestore, 'tenants', 'safeviate', 'aircrafts', aircraft.id);
        const updatedComponents = (aircraft.components || []).filter(c => c.id !== componentToDelete.id);

        await updateDocumentNonBlocking(aircraftRef, { components: updatedComponents });

        toast({
            title: 'Component Deleted',
            description: `The component "${componentToDelete.name}" has been deleted.`,
        });

        setIsDeleteOpen(false);
        setComponentToDelete(null);
    };

    if (!aircraft) {
        return (
            <div className="space-y-4">
                <Skeleton className="h-8 w-1/4" />
                <Skeleton className="h-40 w-full" />
            </div>
        );
    }
  
  return (
    <>
      <div className="flex justify-end mb-4">
        <ComponentFormDialog
          aircraftId={aircraft.id}
          tenantId="safeviate"
          components={aircraft.components || []}
          onFormSubmit={onFormSubmit}
          trigger={<Button><PlusCircle className="mr-2 h-4 w-4" /> Add Component</Button>}
        />
      </div>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Component</TableHead>
            <TableHead>P/N</TableHead>
            <TableHead>S/N</TableHead>
            <TableHead>TSN</TableHead>
            <TableHead>TSO</TableHead>
            <TableHead className="text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {aircraft.components && aircraft.components.length > 0 ? (
            aircraft.components.map((component) => (
              <TableRow key={component.id}>
                <TableCell className="font-medium">{component.name}</TableCell>
                <TableCell>{component.partNumber}</TableCell>
                <TableCell>{component.serialNumber}</TableCell>
                <TableCell>{component.tsn}</TableCell>
                <TableCell>{component.tso}</TableCell>
                <TableCell className="text-right">
                  <ComponentFormDialog
                    aircraftId={aircraft.id}
                    tenantId="safeviate"
                    existingComponent={component}
                    components={aircraft.components || []}
                    onFormSubmit={onFormSubmit}
                    trigger={<Button variant="ghost" size="icon"><Edit className="h-4 w-4" /></Button>}
                  />
                  <Button variant="ghost" size="icon" onClick={() => { setComponentToDelete(component); setIsDeleteOpen(true); }}>
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                </TableCell>
              </TableRow>
            ))
          ) : (
            <TableRow>
              <TableCell colSpan={6} className="text-center">
                No components added yet.
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
      
      <AlertDialog open={isDeleteOpen} onOpenChange={setIsDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete the component &quot;{componentToDelete?.name}&quot;. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete}>Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
