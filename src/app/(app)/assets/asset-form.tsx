'use client';

import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useFirestore, addDocumentNonBlocking, updateDocumentNonBlocking } from '@/firebase';
import { useToast } from '@/hooks/use-toast';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogClose } from '@/components/ui/dialog';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import type { Aircraft } from './page';

const formSchema = z.object({
    tailNumber: z.string().min(1, 'Tail number is required.'),
    model: z.string().min(1, 'Model is required.'),
    type: z.enum(['Single-Engine', 'Multi-Engine']),
    currentHobbs: z.number({ coerce: true }).min(0).optional(),
    currentTacho: z.number({ coerce: true }).min(0).optional(),
});

type FormValues = z.infer<typeof formSchema>;

interface AssetFormProps {
    tenantId: string;
    existingAircraft?: Aircraft;
    trigger: React.ReactNode;
}

export function AssetForm({ tenantId, existingAircraft, trigger }: AssetFormProps) {
    const firestore = useFirestore();
    const { toast } = useToast();
    const [isOpen, setIsOpen] = useState(false);

    const form = useForm<FormValues>({
        resolver: zodResolver(formSchema),
        defaultValues: existingAircraft || {
            tailNumber: '',
            model: '',
            type: 'Single-Engine',
            currentHobbs: 0,
            currentTacho: 0,
        },
    });

    useEffect(() => {
        if (isOpen) {
            form.reset(existingAircraft || {
                tailNumber: '',
                model: '',
                type: 'Single-Engine',
                currentHobbs: 0,
                currentTacho: 0,
            });
        }
    }, [isOpen, existingAircraft, form]);

    const onSubmit = (values: FormValues) => {
        if (!firestore) return;

        if (existingAircraft) {
            const docRef = doc(firestore, `tenants/${tenantId}/aircrafts`, existingAircraft.id);
            updateDocumentNonBlocking(docRef, values);
            toast({ title: "Aircraft Updated", description: `${values.tailNumber} has been updated.` });
        } else {
            addDocumentNonBlocking(collection(firestore, `tenants/${tenantId}/aircrafts`), values);
            toast({ title: "Aircraft Added", description: `${values.tailNumber} has been added to the fleet.` });
        }
        setIsOpen(false);
    };

    return (
        <Dialog open={isOpen} onOpenChange={setIsOpen}>
            <DialogTrigger asChild>{trigger}</DialogTrigger>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>{existingAircraft ? 'Edit Aircraft' : 'Add New Aircraft'}</DialogTitle>
                    <DialogDescription>
                        {existingAircraft ? `Update details for ${existingAircraft.tailNumber}.` : 'Add a new aircraft to your fleet.'}
                    </DialogDescription>
                </DialogHeader>
                <Form {...form}>
                    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 pt-4">
                        <FormField control={form.control} name="tailNumber" render={({ field }) => (<FormItem><FormLabel>Tail Number</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>)} />
                        <FormField control={form.control} name="model" render={({ field }) => (<FormItem><FormLabel>Model</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>)} />
                        <FormField control={form.control} name="type" render={({ field }) => ( <FormItem><FormLabel>Type</FormLabel><Select onValueChange={field.onChange} defaultValue={field.value}><FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl><SelectContent><SelectItem value="Single-Engine">Single-Engine</SelectItem><SelectItem value="Multi-Engine">Multi-Engine</SelectItem></SelectContent></Select><FormMessage /></FormItem>)} />
                        <div className="grid grid-cols-2 gap-4">
                            <FormField control={form.control} name="currentHobbs" render={({ field }) => (<FormItem><FormLabel>Current Hobbs</FormLabel><FormControl><Input type="number" {...field} /></FormControl><FormMessage /></FormItem>)} />
                            <FormField control={form.control} name="currentTacho" render={({ field }) => (<FormItem><FormLabel>Current Tacho</FormLabel><FormControl><Input type="number" {...field} /></FormControl><FormMessage /></FormItem>)} />
                        </div>
                        <DialogFooter>
                            <DialogClose asChild><Button type="button" variant="outline">Cancel</Button></DialogClose>
                            <Button type="submit">Save Aircraft</Button>
                        </DialogFooter>
                    </form>
                </Form>
            </DialogContent>
        </Dialog>
    );
}
