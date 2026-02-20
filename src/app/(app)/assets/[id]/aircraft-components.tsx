
'use client';

import { useState, useMemo, useCallback } from 'react';
import { doc } from 'firebase/firestore';
import { v4 as uuidv4 } from 'uuid';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useFirestore } from '@/firebase';
import { useToast } from '@/hooks/use-toast';
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
} from '@/components/ui/dialog';
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
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { PlusCircle, Edit, Trash2 } from 'lucide-react';
import { updateDocumentNonBlocking } from '@/firebase/non-blocking-updates';
import type { Aircraft, AircraftComponent } from '@/types/aircraft';


// Define Zod schema for validation
const formSchema = z.object({
  id: z.string().optional(),
  manufacturer: z.string().optional(),
  name: z.string().optional(),
  partNumber: z.string().optional(),
  serialNumber: z.string().optional(),
  installHours: z
    .preprocess(
      (val) => (val === '' || val === null ? undefined : Number(val)),
      z.number({ invalid_type_error: 'Must be a number' }).optional()
    )
    .optional(),
  maxHours: z
    .preprocess(
      (val) => (val === '' || val === null ? undefined : Number(val)),
      z.number({ invalid_type_error: 'Must be a number' }).optional()
    )
    .optional(),
  tsn: z
    .preprocess(
      (val) => (val === '' || val === null ? undefined : Number(val)),
      z.number({ invalid_type_error: 'Must be a number' }).optional()
    )
    .optional(),
  tso: z
    .preprocess(
      (val) => (val === '' || val === null ? undefined : Number(val)),
      z.number({ invalid_type_error: 'Must be a number' }).optional()
    )
    .optional(),
});


type FormValues = z.infer<typeof formSchema>;

interface ComponentFormProps {
  aircraft: Aircraft;
  tenantId: string;
  component?: AircraftComponent | null;
  onCancel: () => void;
}

function ComponentForm({ aircraft, tenantId, component, onCancel }: ComponentFormProps) {
  const firestore = useFirestore();
  const { toast } = useToast();

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      id: component?.id || undefined,
      manufacturer: component?.manufacturer || '',
      name: component?.name || '',
      partNumber: component?.partNumber || '',
      serialNumber: component?.serialNumber || '',
      installHours: component?.installHours ?? '',
      maxHours: component?.maxHours ?? '',
      tsn: component?.tsn ?? '',
      tso: component?.tso ?? '',
    },
  });

  const onSubmit = useCallback(
    (values: FormValues) => {
      if (!firestore || !aircraft?.id) {
        toast({
          variant: 'destructive',
          title: 'Error',
          description: 'Aircraft data is not available. Cannot save component.',
        });
        return;
      }

      const aircraftRef = doc(
        firestore,
        'tenants',
        tenantId,
        'aircrafts',
        aircraft.id
      );
      
      const data: Partial<AircraftComponent> = {
        id: values.id,
        manufacturer: values.manufacturer,
        name: values.name,
        partNumber: values.partNumber,
        serialNumber: values.serialNumber,
        installHours: values.installHours,
        maxHours: values.maxHours,
        tsn: values.tsn,
        tso: values.tso,
      };

      let updatedComponents: AircraftComponent[];
      if (values.id) {
        // Update existing
        updatedComponents = (aircraft.components || []).map((c) =>
          c.id === values.id ? { ...c, ...data } : c
        );
      } else {
        // Add new
        const newComponent: AircraftComponent = {
          ...data,
          id: uuidv4(),
          name: data.name || '',
          partNumber: data.partNumber || '',
        };
        updatedComponents = [...(aircraft.components || []), newComponent];
      }

      updateDocumentNonBlocking(aircraftRef, { components: updatedComponents });

      toast({
        title: values.id ? 'Component Updated' : 'Component Added',
        description: `The component has been saved to ${aircraft.tailNumber}.`,
      });
      if (onCancel) onCancel();
    },
    [aircraft, firestore, tenantId, onCancel, toast]
  );

  return (
    <Dialog open onOpenChange={onCancel}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{component ? 'Edit Component' : 'Add New Component'}</DialogTitle>
          <DialogDescription>
            Fill in the details for the aircraft component.
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Component Name</FormLabel>
                    <FormControl>
                      <Input placeholder="e.g., Propeller" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="partNumber"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Part Number</FormLabel>
                    <FormControl>
                      <Input placeholder="e.g., 76EM8S5-0-62" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
               <FormField
                control={form.control}
                name="manufacturer"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Manufacturer</FormLabel>
                    <FormControl>
                      <Input placeholder="e.g., Lycoming" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="serialNumber"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Serial Number</FormLabel>
                    <FormControl>
                      <Input placeholder="e.g., 12345-XYZ" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="installHours"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Install Hours</FormLabel>
                    <FormControl>
                      <Input type="number" placeholder="Tacho at install" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="maxHours"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Max Hours</FormLabel>
                    <FormControl>
                      <Input type="number" placeholder="TBO / Overhaul interval" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="tsn"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Time Since New (TSN)</FormLabel>
                    <FormControl>
                      <Input type="number" placeholder="Hours" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="tso"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Time Since Overhaul (TSO)</FormLabel>
                    <FormControl>
                      <Input type="number" placeholder="Hours" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={onCancel}>
                Cancel
              </Button>
              <Button type="submit">{component ? 'Save Changes' : 'Add Component'}</Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}

export function AircraftComponents({ aircraft, tenantId }: { aircraft: Aircraft; tenantId: string; }) {
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [selectedComponent, setSelectedComponent] = useState<AircraftComponent | null>(null);
  const [componentToDelete, setComponentToDelete] = useState<AircraftComponent | null>(null);

  const { toast } = useToast();
  const firestore = useFirestore();

  const handleEdit = (component: AircraftComponent) => {
    setSelectedComponent(component);
    setIsFormOpen(true);
  };

  const handleAddNew = () => {
    setSelectedComponent(null);
    setIsFormOpen(true);
  };

  const handleDeleteConfirm = () => {
    if (!componentToDelete || !firestore) return;

    const updatedComponents = (aircraft.components || []).filter(c => c.id !== componentToDelete.id);
    const aircraftRef = doc(firestore, 'tenants', tenantId, 'aircrafts', aircraft.id);

    updateDocumentNonBlocking(aircraftRef, { components: updatedComponents });

    toast({
        title: 'Component Deleted',
        description: `Component "${componentToDelete.name}" has been deleted.`
    });

    setComponentToDelete(null);
  };
  
  const calculateRemainingHours = (component: AircraftComponent, currentTacho: number | undefined) => {
      if (!component.maxHours || !component.installHours || currentTacho === undefined) {
          return null;
      }
      const hoursUsed = currentTacho - component.installHours;
      const remaining = component.maxHours - hoursUsed;
      return remaining;
  }

  return (
    <>
      <div className="flex justify-end mb-4">
        <Button onClick={handleAddNew}>
          <PlusCircle className="mr-2" />
          Add New Component
        </Button>
      </div>
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Component</TableHead>
              <TableHead>Manufacturer</TableHead>
              <TableHead>Part No.</TableHead>
              <TableHead>Serial No.</TableHead>
              <TableHead>Time Since New</TableHead>
              <TableHead>Time Since Overhaul</TableHead>
              <TableHead>Remaining Hours</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {aircraft.components && aircraft.components.length > 0 ? (
              aircraft.components.map((component) => {
                const remainingHours = calculateRemainingHours(component, aircraft.currentTacho);
                return (
                  <TableRow key={component.id}>
                    <TableCell className="font-medium">{component.name}</TableCell>
                    <TableCell>{component.manufacturer || 'N/A'}</TableCell>
                    <TableCell>{component.partNumber}</TableCell>
                    <TableCell>{component.serialNumber || 'N/A'}</TableCell>
                    <TableCell>{component.tsn?.toFixed(1) || 'N/A'} hrs</TableCell>
                    <TableCell>{component.tso?.toFixed(1) || 'N/A'} hrs</TableCell>
                    <TableCell>{remainingHours !== null ? `${remainingHours.toFixed(1)} hrs` : 'N/A'}</TableCell>
                    <TableCell className="text-right">
                      <Button variant="ghost" size="icon" onClick={() => handleEdit(component)}><Edit className="h-4 w-4" /></Button>
                      <Button variant="ghost" size="icon" onClick={() => setComponentToDelete(component)}><Trash2 className="h-4 w-4 text-destructive" /></Button>
                    </TableCell>
                  </TableRow>
                )
              })
            ) : (
              <TableRow>
                <TableCell colSpan={8} className="h-24 text-center">
                  No components tracked for this aircraft.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      {isFormOpen && (
        <ComponentForm
          aircraft={aircraft}
          tenantId={tenantId}
          component={selectedComponent}
          onCancel={() => setIsFormOpen(false)}
        />
      )}

      <AlertDialog open={!!componentToDelete} onOpenChange={(open) => !open && setComponentToDelete(null)}>
        <AlertDialogContent>
            <AlertDialogHeader>
                <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                <AlertDialogDescription>
                    This action cannot be undone. This will permanently delete the component
                    <span className="font-semibold"> {componentToDelete?.name}</span>.
                </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction onClick={handleDeleteConfirm}>Continue</AlertDialogAction>
            </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

    