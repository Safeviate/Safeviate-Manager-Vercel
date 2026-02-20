
'use client';

import { useState, useEffect } from 'react';
import { doc, collection } from 'firebase/firestore';
import { useFirestore, useCollection, useMemoFirebase, addDocumentNonBlocking, deleteDocumentNonBlocking } from '@/firebase';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger, DialogClose } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { PlusCircle, Trash2, Edit } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import type { Aircraft, AircraftComponent } from '@/types/aircraft';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';


interface AircraftComponentsProps {
  aircraft: Aircraft;
  tenantId: string;
}

const componentSchema = z.object({
  name: z.string().min(1, 'Component Name is required.'),
  partNumber: z.string().min(1, 'Part Number is required.'),
  serialNumber: z.string().optional(),
  installHours: z.number({ coerce: true }).optional(),
  maxHours: z.number({ coerce: true }).optional(),
  tsn: z.number({ coerce: true }).optional(),
  tso: z.number({ coerce: true }).optional(),
});

type FormValues = z.infer<typeof componentSchema>;


export function AircraftComponents({ aircraft, tenantId }: AircraftComponentsProps) {
  const firestore = useFirestore();
  const { toast } = useToast();
  const [isOpen, setIsOpen] = useState(false);
  
  const componentsQuery = useMemoFirebase(
    () => (firestore ? collection(firestore, `tenants/${tenantId}/aircrafts`, aircraft.id, 'components') : null),
    [firestore, tenantId, aircraft.id]
  );
  const { data: components, isLoading } = useCollection<AircraftComponent>(componentsQuery);

  const form = useForm<FormValues>({
    resolver: zodResolver(componentSchema),
    defaultValues: {
        name: '',
        partNumber: '',
        serialNumber: '',
        installHours: 0,
        maxHours: 0,
        tsn: 0,
        tso: 0,
    },
  });

  const onSubmit = (values: FormValues) => {
    if (!firestore || !aircraft) return;

    const componentsCollection = collection(firestore, `tenants/${tenantId}/aircrafts`, aircraft.id, 'components');
    
    // Ensure empty number fields are stored as null
    const dataToSave = {
        ...values,
        installDate: null,
        notes: null,
        installHours: values.installHours || null,
        maxHours: values.maxHours || null,
        tsn: values.tsn || null,
        tso: values.tso || null,
        serialNumber: values.serialNumber || null,
    };

    addDocumentNonBlocking(componentsCollection, dataToSave);
    
    toast({
        title: 'Component Added',
        description: `"${values.name}" has been added.`
    });

    setIsOpen(false);
    form.reset();
  };


  return (
    <>
      <div className="flex justify-end mb-4">
        <Dialog open={isOpen} onOpenChange={setIsOpen}>
            <DialogTrigger asChild>
                <Button>
                    <PlusCircle className="mr-2 h-4 w-4" /> Add New Component
                </Button>
            </DialogTrigger>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>Add New Component</DialogTitle>
                </DialogHeader>
                <Form {...form}>
                    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                        <div className="grid grid-cols-2 gap-4">
                            <FormField control={form.control} name="name" render={({ field }) => ( <FormItem><FormLabel>Component Name</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem> )} />
                            <FormField control={form.control} name="partNumber" render={({ field }) => ( <FormItem><FormLabel>Part Number</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem> )} />
                            <FormField control={form.control} name="serialNumber" render={({ field }) => ( <FormItem><FormLabel>Serial Number</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem> )} />
                            <FormField control={form.control} name="installHours" render={({ field }) => ( <FormItem><FormLabel>Install Hours</FormLabel><FormControl><Input type="number" {...field} /></FormControl><FormMessage /></FormItem> )} />
                            <FormField control={form.control} name="maxHours" render={({ field }) => ( <FormItem><FormLabel>Max Hours</FormLabel><FormControl><Input type="number" {...field} /></FormControl><FormMessage /></FormItem> )} />
                            <FormField control={form.control} name="tsn" render={({ field }) => ( <FormItem><FormLabel>TSN</FormLabel><FormControl><Input type="number" {...field} /></FormControl><FormMessage /></FormItem> )} />
                            <FormField control={form.control} name="tso" render={({ field }) => ( <FormItem><FormLabel>TSO</FormLabel><FormControl><Input type="number" {...field} /></FormControl><FormMessage /></FormItem> )} />
                        </div>
                        <DialogFooter>
                            <DialogClose asChild>
                                <Button type="button" variant="outline">Cancel</Button>
                            </DialogClose>
                            <Button type="submit">Add Component</Button>
                        </DialogFooter>
                    </form>
                </Form>
            </DialogContent>
        </Dialog>
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
                <TableHead>Install Hours</TableHead>
                <TableHead>Max Hours</TableHead>
                <TableHead>TSN</TableHead>
                <TableHead>TSO</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={8} className="text-center">Loading...</TableCell>
                </TableRow>
              ) : components && components.length > 0 ? (
                components.map((component) => (
                  <TableRow key={component.id}>
                    <TableCell>{component.name}</TableCell>
                    <TableCell>{component.partNumber}</TableCell>
                    <TableCell>{component.serialNumber || 'N/A'}</TableCell>
                    <TableCell>{component.installHours?.toFixed(1) || 'N/A'}</TableCell>
                    <TableCell>{component.maxHours?.toFixed(1) || 'N/A'}</TableCell>
                    <TableCell>{component.tsn?.toFixed(1) || 'N/A'}</TableCell>
                    <TableCell>{component.tso?.toFixed(1) || 'N/A'}</TableCell>
                    <TableCell className="text-right">
                      {/* Actions will be added later */}
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={8} className="text-center h-24">
                    No components added yet.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </>
  );
}
