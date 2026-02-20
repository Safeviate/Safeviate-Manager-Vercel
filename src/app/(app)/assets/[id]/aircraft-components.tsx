
'use client';

import { useState, useEffect, useCallback } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { v4 as uuidv4 } from 'uuid';

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
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogClose,
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
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { PlusCircle, MoreHorizontal, Edit, Trash2 } from 'lucide-react';
import { useFirestore, updateDocumentNonBlocking } from '@/firebase';
import { useToast } from '@/hooks/use-toast';
import { doc } from 'firebase/firestore';
import type { Aircraft, AircraftComponent } from '@/types/aircraft';

// Zod schema for validation
const formSchema = z.object({
  id: z.string().optional(),
  name: z.string().min(1, 'Component name is required.'),
  manufacturer: z.string().optional(),
  partNumber: z.string().min(1, 'Part number is required.'),
  serialNumber: z.string().optional(),
  installHours: z.preprocess(
    (val) => (String(val).trim() === '' ? undefined : Number(val)),
    z.number({ invalid_type_error: 'Must be a number' }).optional()
  ),
  maxHours: z.preprocess(
    (val) => (String(val).trim() === '' ? undefined : Number(val)),
    z.number({ invalid_type_error: 'Must be a number' }).optional()
  ),
  tsn: z.preprocess(
    (val) => (String(val).trim() === '' ? undefined : Number(val)),
    z.number({ invalid_type_error: 'Must be a number' }).optional()
  ),
  tso: z.preprocess(
    (val) => (String(val).trim() === '' ? undefined : Number(val)),
    z.number({ invalid_type_error: 'Must be a number' }).optional()
  ),
});

type FormValues = z.infer<typeof formSchema>;

interface AircraftComponentsProps {
  aircraft: Aircraft;
  tenantId: string;
}

export function AircraftComponents({ aircraft, tenantId }: AircraftComponentsProps) {
  const firestore = useFirestore();
  const { toast } = useToast();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingComponent, setEditingComponent] = useState<AircraftComponent | null>(null);
  const [componentToDelete, setComponentToDelete] = useState<AircraftComponent | null>(null);

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      id: '',
      name: '',
      manufacturer: '',
      partNumber: '',
      serialNumber: '',
      installHours: undefined,
      maxHours: undefined,
      tsn: undefined,
      tso: undefined,
    },
  });

  useEffect(() => {
    if (isDialogOpen) {
      if (editingComponent) {
        form.reset({
          id: editingComponent.id,
          name: editingComponent.name,
          manufacturer: editingComponent.manufacturer || '',
          partNumber: editingComponent.partNumber,
          serialNumber: editingComponent.serialNumber || '',
          installHours: editingComponent.installHours || undefined,
          maxHours: editingComponent.maxHours || undefined,
          tsn: editingComponent.tsn || undefined,
          tso: editingComponent.tso || undefined,
        });
      } else {
        form.reset({
          id: '',
          name: '',
          manufacturer: '',
          partNumber: '',
          serialNumber: '',
          installHours: undefined,
          maxHours: undefined,
          tsn: undefined,
          tso: undefined,
        });
      }
    }
  }, [isDialogOpen, editingComponent, form]);

  const handleOpenDialog = (component: AircraftComponent | null = null) => {
    setEditingComponent(component);
    setIsDialogOpen(true);
  };

  const onSubmit = useCallback(async (values: FormValues) => {
    if (!aircraft) {
        toast({
            variant: "destructive",
            title: "Error",
            description: "Aircraft data is not available. Please try again.",
        });
        return;
    }
    if (!firestore) return;

    const aircraftRef = doc(firestore, 'tenants', tenantId, 'aircrafts', aircraft.id);
    
    // Ensure numeric fields that are empty strings become null instead of 0
    const sanitizedValues = {
        ...values,
        installHours: values.installHours ?? null,
        maxHours: values.maxHours ?? null,
        tsn: values.tsn ?? null,
        tso: values.tso ?? null,
    };

    const currentComponents = aircraft.components || [];
    let updatedComponents: AircraftComponent[];

    if (values.id) {
      // Editing existing component
      updatedComponents = currentComponents.map(c => 
        c.id === values.id ? { ...c, ...sanitizedValues } : c
      );
    } else {
      // Adding new component
      updatedComponents = [...currentComponents, { ...sanitizedValues, id: uuidv4() }];
    }

    await updateDocumentNonBlocking(aircraftRef, { components: updatedComponents });

    toast({
      title: values.id ? "Component Updated" : "Component Added",
      description: `The component "${values.name}" has been saved.`,
    });

    setIsDialogOpen(false);
  }, [firestore, tenantId, toast, aircraft]); // Correct dependency array


  const handleDeleteComponent = async () => {
    if (!componentToDelete || !firestore) return;

    const aircraftRef = doc(firestore, 'tenants', tenantId, 'aircrafts', aircraft.id);
    const updatedComponents = (aircraft.components || []).filter(c => c.id !== componentToDelete.id);
    
    await updateDocumentNonBlocking(aircraftRef, { components: updatedComponents });

    toast({
      title: 'Component Deleted',
      description: `The component "${componentToDelete.name}" has been removed.`,
    });

    setComponentToDelete(null);
  };
  
  return (
    <>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle>Tracked Components</CardTitle>
            <CardDescription>A list of all trackable components installed on this aircraft.</CardDescription>
          </div>
          <Button onClick={() => handleOpenDialog()}>
            <PlusCircle className="mr-2" /> Add New Component
          </Button>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Manufacturer</TableHead>
                <TableHead>Part No.</TableHead>
                <TableHead>Serial No.</TableHead>
                <TableHead>Install (hrs)</TableHead>
                <TableHead>Max (hrs)</TableHead>
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
                    <TableCell>{component.manufacturer || 'N/A'}</TableCell>
                    <TableCell>{component.partNumber}</TableCell>
                    <TableCell>{component.serialNumber || 'N/A'}</TableCell>
                    <TableCell>{component.installHours ?? 'N/A'}</TableCell>
                    <TableCell>{component.maxHours ?? 'N/A'}</TableCell>
                    <TableCell>{component.tsn ?? 'N/A'}</TableCell>
                    <TableCell>{component.tso ?? 'N/A'}</TableCell>
                    <TableCell className="text-right">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" className="h-8 w-8 p-0"><MoreHorizontal /></Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => handleOpenDialog(component)}><Edit className="mr-2" />Edit</DropdownMenuItem>
                          <DropdownMenuItem onClick={() => setComponentToDelete(component)} className="text-destructive"><Trash2 className="mr-2" />Delete</DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
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
        </CardContent>
      </Card>
      
      {/* Add/Edit Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingComponent ? 'Edit' : 'Add New'} Component</DialogTitle>
          </DialogHeader>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField control={form.control} name="name" render={({ field }) => ( <FormItem><FormLabel>Component Name</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem> )} />
                <FormField control={form.control} name="manufacturer" render={({ field }) => ( <FormItem><FormLabel>Manufacturer</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem> )} />
                <FormField control={form.control} name="partNumber" render={({ field }) => ( <FormItem><FormLabel>Part Number</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem> )} />
                <FormField control={form.control} name="serialNumber" render={({ field }) => ( <FormItem><FormLabel>Serial Number</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem> )} />
                <FormField control={form.control} name="installHours" render={({ field }) => ( <FormItem><FormLabel>Install Hours</FormLabel><FormControl><Input type="number" {...field} /></FormControl><FormMessage /></FormItem> )} />
                <FormField control={form.control} name="maxHours" render={({ field }) => ( <FormItem><FormLabel>Max Hours</FormLabel><FormControl><Input type="number" {...field} /></FormControl><FormMessage /></FormItem> )} />
                <FormField control={form.control} name="tsn" render={({ field }) => ( <FormItem><FormLabel>TSN</FormLabel><FormControl><Input type="number" {...field} /></FormControl><FormMessage /></FormItem> )} />
                <FormField control={form.control} name="tso" render={({ field }) => ( <FormItem><FormLabel>TSO</FormLabel><FormControl><Input type="number" {...field} /></FormControl><FormMessage /></FormItem> )} />
              </div>
              <DialogFooter>
                <DialogClose asChild><Button type="button" variant="outline">Cancel</Button></DialogClose>
                <Button type="submit">{editingComponent ? 'Save Changes' : 'Add Component'}</Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={!!componentToDelete} onOpenChange={(open) => !open && setComponentToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>This will permanently delete the component &quot;{componentToDelete?.name}&quot;.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteComponent} className="bg-destructive hover:bg-destructive/90">Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
