
'use client';

import { useState, useCallback, useEffect } from 'react';
import { useForm, useFieldArray } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { doc, updateDoc } from 'firebase/firestore';
import { useFirestore, updateDocumentNonBlocking } from '@/firebase';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { MoreHorizontal, Pencil, PlusCircle, Trash2 } from 'lucide-react';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import type { AircraftComponent } from '@/types/aircraft';
import { v4 as uuidv4 } from 'uuid';

const formSchema = z.object({
  id: z.string().optional(),
  name: z.string().optional(),
  partNumber: z.string().optional(),
  serialNumber: z.string().optional(),
  manufacturer: z.string().optional(),
  installHours: z.preprocess((val) => (val === '' || val === null ? undefined : Number(val)), z.number().optional()),
  maxHours: z.preprocess((val) => (val === '' || val === null ? undefined : Number(val)), z.number().optional()),
  tsn: z.preprocess((val) => (val === '' || val === null ? undefined : Number(val)), z.number().optional()),
  tso: z.preprocess((val) => (val === '' || val === null ? undefined : Number(val)), z.number().optional()),
});

type FormValues = z.infer<typeof formSchema>;

interface AircraftComponentsProps {
  aircraftId: string;
  components: AircraftComponent[];
  tenantId: string;
  onUpdate: (updatedComponents: AircraftComponent[]) => void;
}

export function AircraftComponents({ aircraftId, components, tenantId, onUpdate }: AircraftComponentsProps) {
  const firestore = useFirestore();
  const { toast } = useToast();
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingComponent, setEditingComponent] = useState<AircraftComponent | null>(null);

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
        id: '',
        name: '',
        partNumber: '',
        serialNumber: '',
        manufacturer: '',
        installHours: undefined,
        maxHours: undefined,
        tsn: undefined,
        tso: undefined,
    }
  });

  const handleOpenForm = (component: AircraftComponent | null) => {
    if (component) {
        form.reset({
            ...component,
            installHours: component.installHours ?? undefined,
            maxHours: component.maxHours ?? undefined,
            tsn: component.tsn ?? undefined,
            tso: component.tso ?? undefined,
        });
        setEditingComponent(component);
    } else {
        form.reset({
            id: uuidv4(),
            name: '',
            partNumber: '',
            serialNumber: '',
            manufacturer: '',
            installHours: undefined,
            maxHours: undefined,
            tsn: undefined,
            tso: undefined,
        });
        setEditingComponent(null);
    }
    setIsFormOpen(true);
  };
  
  const onSubmit = useCallback(async (values: FormValues) => {
      if (!firestore || !tenantId || !aircraftId) {
          toast({
              variant: "destructive",
              title: "Error",
              description: "Cannot save component: missing critical information.",
          });
          return;
      }
      
      const currentComponents = components || [];
      let updatedComponents: AircraftComponent[];

      const data: AircraftComponent = {
          id: values.id || uuidv4(),
          name: values.name || '',
          partNumber: values.partNumber || '',
          serialNumber: values.serialNumber || null,
          manufacturer: values.manufacturer || null,
          installHours: values.installHours ?? null,
          maxHours: values.maxHours ?? null,
          tsn: values.tsn ?? null,
          tso: values.tso ?? null,
      };

      if (editingComponent) {
          updatedComponents = currentComponents.map(c => c.id === editingComponent.id ? data : c);
      } else {
          updatedComponents = [...currentComponents, data];
      }
      
      const aircraftRef = doc(firestore, 'tenants', tenantId, 'aircrafts', aircraftId);
      
      updateDocumentNonBlocking(aircraftRef, { components: updatedComponents });
      
      onUpdate(updatedComponents);
      
      toast({
          title: editingComponent ? 'Component Updated' : 'Component Added',
          description: `The component "${data.name}" has been saved.`,
      });

      setIsFormOpen(false);
      setEditingComponent(null);
  }, [firestore, tenantId, aircraftId, components, onUpdate, toast, editingComponent]);
  
  const handleDelete = (componentId: string) => {
    const updatedComponents = (components || []).filter(c => c.id !== componentId);
    onUpdate(updatedComponents);
    toast({
        title: 'Component Removed',
        description: 'The component has been removed and will be permanently deleted on save.',
    });
  };

  return (
    <>
      <Card className="mt-4">
        <CardHeader>
          <div className="flex justify-between items-center">
            <div>
              <CardTitle>Tracked Components</CardTitle>
              <CardDescription>A list of all tracked components for this aircraft.</CardDescription>
            </div>
            <Button onClick={() => handleOpenForm(null)}>
              <PlusCircle className="mr-2 h-4 w-4" />
              Add New Component
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Manufacturer</TableHead>
                <TableHead>Part No.</TableHead>
                <TableHead>Serial No.</TableHead>
                <TableHead>Install Hrs</TableHead>
                <TableHead>Max Hrs</TableHead>
                <TableHead>TSN</TableHead>
                <TableHead>TSO</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {(components || []).map((component) => (
                <TableRow key={component.id}>
                  <TableCell>{component.name}</TableCell>
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
                        <Button variant="ghost" className="h-8 w-8 p-0">
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => handleOpenForm(component)}>
                          <Pencil className="mr-2 h-4 w-4" /> Edit
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => handleDelete(component.id)} className="text-destructive focus:text-destructive">
                          <Trash2 className="mr-2 h-4 w-4" /> Delete
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))}
              {(components || []).length === 0 && (
                <TableRow>
                    <TableCell colSpan={9} className="text-center h-24">No components added yet.</TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingComponent ? 'Edit' : 'Add'} Component</DialogTitle>
            <DialogDescription>Fill in the details for the aircraft component.</DialogDescription>
          </DialogHeader>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 pt-4">
              <FormField control={form.control} name="name" render={({ field }) => (<FormItem><FormLabel>Component Name</FormLabel><FormControl><Input placeholder="e.g., Propeller" {...field} value={field.value || ''} /></FormControl><FormMessage /></FormItem>)} />
              <FormField control={form.control} name="manufacturer" render={({ field }) => (<FormItem><FormLabel>Manufacturer</FormLabel><FormControl><Input placeholder="e.g., Hartzell" {...field} value={field.value || ''} /></FormControl><FormMessage /></FormItem>)} />
              <FormField control={form.control} name="partNumber" render={({ field }) => (<FormItem><FormLabel>Part Number</FormLabel><FormControl><Input placeholder="e.g., HC-C2YR-1BF/F7666A" {...field} value={field.value || ''} /></FormControl><FormMessage /></FormItem>)} />
              <FormField control={form.control} name="serialNumber" render={({ field }) => (<FormItem><FormLabel>Serial Number</FormLabel><FormControl><Input {...field} value={field.value || ''} /></FormControl><FormMessage /></FormItem>)} />
              <div className="grid grid-cols-2 gap-4">
                <FormField control={form.control} name="installHours" render={({ field }) => (<FormItem><FormLabel>Install Hours</FormLabel><FormControl><Input type="number" {...field} value={field.value || ''} /></FormControl><FormMessage /></FormItem>)} />
                <FormField control={form.control} name="maxHours" render={({ field }) => (<FormItem><FormLabel>Max Hours</FormLabel><FormControl><Input type="number" {...field} value={field.value || ''} /></FormControl><FormMessage /></FormItem>)} />
                <FormField control={form.control} name="tsn" render={({ field }) => (<FormItem><FormLabel>TSN</FormLabel><FormControl><Input type="number" {...field} value={field.value || ''} /></FormControl><FormMessage /></FormItem>)} />
                <FormField control={form.control} name="tso" render={({ field }) => (<FormItem><FormLabel>TSO</FormLabel><FormControl><Input type="number" {...field} value={field.value || ''} /></FormControl><FormMessage /></FormItem>)} />
              </div>
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setIsFormOpen(false)}>Cancel</Button>
                <Button type="submit">Save Component</Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </>
  );
}
