'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { PlusCircle, Edit, Trash2 } from 'lucide-react';
import { useFirestore, updateDocumentNonBlocking } from '@/firebase';
import { doc } from 'firebase/firestore';
import { useToast } from '@/hooks/use-toast';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogClose } from '@/components/ui/dialog';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { v4 as uuidv4 } from 'uuid';
import type { Aircraft, AircraftComponent } from '../page';
import { Skeleton } from '@/components/ui/skeleton';

const componentFormSchema = z.object({
    name: z.string().min(1, 'Component name is required.'),
    partNumber: z.string().min(1, 'Part number is required.'),
    manufacturer: z.string().optional(),
    serialNumber: z.string().optional(),
    notes: z.string().optional(),
});

type ComponentFormValues = z.infer<typeof componentFormSchema>;

interface ComponentFormDialogProps {
    aircraftId: string;
    existingComponents: AircraftComponent[];
    existingComponent?: AircraftComponent | null;
    onFormSubmit: () => void;
    trigger: React.ReactNode;
}

function ComponentFormDialog({ aircraftId, existingComponents, existingComponent, onFormSubmit, trigger }: ComponentFormDialogProps) {
    const firestore = useFirestore();
    const { toast } = useToast();
    const [isOpen, setIsOpen] = useState(false);
    const tenantId = 'safeviate';

    const form = useForm<ComponentFormValues>({
        resolver: zodResolver(componentFormSchema),
        defaultValues: existingComponent || {
            name: '',
            partNumber: '',
            manufacturer: '',
            serialNumber: '',
            notes: '',
        },
    });

    const onSubmit = (data: ComponentFormValues) => {
        if (!firestore) return;

        const aircraftRef = doc(firestore, `tenants/${tenantId}/aircrafts`, aircraftId);
        let updatedComponents: AircraftComponent[];

        if (existingComponent) {
            // Editing existing
            updatedComponents = (existingComponents || []).map(c =>
                c.id === existingComponent.id ? { ...c, ...data } : c
            );
        } else {
            // Adding new
            const newComponent = { ...data, id: uuidv4() };
            updatedComponents = [...(existingComponents || []), newComponent];
        }

        updateDocumentNonBlocking(aircraftRef, { components: updatedComponents });
        toast({
            title: existingComponent ? 'Component Updated' : 'Component Added',
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
                    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 pt-4">
                        <FormField control={form.control} name="name" render={({ field }) => (<FormItem><FormLabel>Component Name</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>)} />
                        <FormField control={form.control} name="partNumber" render={({ field }) => (<FormItem><FormLabel>Part Number</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>)} />
                        <FormField control={form.control} name="manufacturer" render={({ field }) => (<FormItem><FormLabel>Manufacturer</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>)} />
                        <FormField control={form.control} name="serialNumber" render={({ field }) => (<FormItem><FormLabel>Serial Number</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>)} />
                        <FormField control={form.control} name="notes" render={({ field }) => (<FormItem><FormLabel>Notes</FormLabel><FormControl><Textarea {...field} /></FormControl><FormMessage /></FormItem>)} />
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
    const tenantId = 'safeviate';

    // This state is just to trigger a re-render of this component when a form is submitted
    const [version, setVersion] = useState(0);
    const forceRerender = () => setVersion(v => v + 1);

    if (!aircraft) {
        return (
            <Card>
                <CardHeader>
                    <Skeleton className="h-8 w-1/2" />
                    <Skeleton className="h-4 w-3/4" />
                </CardHeader>
                <CardContent>
                    <Skeleton className="h-40 w-full" />
                </CardContent>
            </Card>
        )
    }

    const handleDelete = (componentId: string) => {
        if (!firestore) return;
        
        const updatedComponents = (aircraft.components || []).filter(c => c.id !== componentId);
        const aircraftRef = doc(firestore, `tenants/${tenantId}/aircrafts`, aircraft.id);
        updateDocumentNonBlocking(aircraftRef, { components: updatedComponents });
        
        toast({ title: 'Component Deleted' });
    };

    return (
        <Card>
            <CardHeader>
                <div className="flex justify-between items-center">
                    <div>
                        <CardTitle>Tracked Components</CardTitle>
                        <CardDescription>A list of all tracked components on this aircraft.</CardDescription>
                    </div>
                    <ComponentFormDialog
                        aircraftId={aircraft.id}
                        existingComponents={aircraft.components || []}
                        onFormSubmit={forceRerender}
                        trigger={
                            <Button>
                                <PlusCircle className="mr-2 h-4 w-4" /> Add Component
                            </Button>
                        }
                    />
                </div>
            </CardHeader>
            <CardContent>
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>Name</TableHead>
                            <TableHead>Part No.</TableHead>
                            <TableHead>Serial No.</TableHead>
                            <TableHead className="text-right">Actions</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {aircraft.components && aircraft.components.length > 0 ? (
                            aircraft.components.map((component) => (
                                <TableRow key={component.id}>
                                    <TableCell className="font-medium">{component.name}</TableCell>
                                    <TableCell>{component.partNumber}</TableCell>
                                    <TableCell>{component.serialNumber || 'N/A'}</TableCell>
                                    <TableCell className="text-right">
                                        <ComponentFormDialog
                                            aircraftId={aircraft.id}
                                            existingComponents={aircraft.components || []}
                                            existingComponent={component}
                                            onFormSubmit={forceRerender}
                                            trigger={
                                                <Button variant="ghost" size="icon" className="h-8 w-8"><Edit className="h-4 w-4" /></Button>
                                            }
                                        />
                                        <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => handleDelete(component.id)}>
                                            <Trash2 className="h-4 w-4" />
                                        </Button>
                                    </TableCell>
                                </TableRow>
                            ))
                        ) : (
                            <TableRow>
                                <TableCell colSpan={4} className="h-24 text-center">No components added yet.</TableCell>
                            </TableRow>
                        )}
                    </TableBody>
                </Table>
            </CardContent>
        </Card>
    );
}
