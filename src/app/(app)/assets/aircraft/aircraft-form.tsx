'use client';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { useFirestore, addDocumentNonBlocking } from '@/firebase';
import { collection } from 'firebase/firestore';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger, DialogClose } from '@/components/ui/dialog';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { PlusCircle } from 'lucide-react';
import type { Aircraft } from '@/types/aircraft';

const formSchema = z.object({
  make: z.string().min(1, { message: 'Aircraft make is required.' }),
  model: z.string().min(1, { message: 'Aircraft model is required.' }),
  tailNumber: z.string().min(1, { message: 'Aircraft registration is required.' }),
  type: z.enum(['Single-Engine', 'Multi-Engine']),
  currentHobbs: z.number({ coerce: true }).min(0, 'Hobbs hours must be a positive number.'),
});

type AircraftFormValues = z.infer<typeof formSchema>;

export function AircraftForm() {
    const firestore = useFirestore();
    const { toast } = useToast();
    const [isOpen, setIsOpen] = useState(false);
    const tenantId = 'safeviate';

    const form = useForm<AircraftFormValues>({
        resolver: zodResolver(formSchema),
        defaultValues: {
            make: '',
            model: '',
            tailNumber: '',
            type: 'Single-Engine',
            currentHobbs: 0,
        },
    });

    const onSubmit = (values: AircraftFormValues) => {
        if (!firestore) return;
        const aircraftsCollection = collection(firestore, `tenants/${tenantId}/aircrafts`);
        addDocumentNonBlocking(aircraftsCollection, values);

        toast({
            title: 'Aircraft Created',
            description: `${values.make} ${values.model} (${values.tailNumber}) has been added to the fleet.`,
        });

        form.reset();
        setIsOpen(false);
    }
    
    return (
        <Dialog open={isOpen} onOpenChange={setIsOpen}>
            <DialogTrigger asChild>
                <Button>
                    <PlusCircle className="mr-2 h-4 w-4" />
                    Create Aircraft
                </Button>
            </DialogTrigger>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>Add New Aircraft</DialogTitle>
                    <DialogDescription>Fill out the form below to add a new aircraft to the fleet.</DialogDescription>
                </DialogHeader>
                <Form {...form}>
                    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                        <div className="grid grid-cols-2 gap-4">
                            <FormField control={form.control} name="make" render={({ field }) => ( <FormItem><FormLabel>Aircraft Make</FormLabel><FormControl><Input placeholder="e.g., Cessna" {...field} /></FormControl><FormMessage /></FormItem> )}/>
                            <FormField control={form.control} name="model" render={({ field }) => ( <FormItem><FormLabel>Aircraft Model</FormLabel><FormControl><Input placeholder="e.g., 172 Skyhawk" {...field} /></FormControl><FormMessage /></FormItem> )}/>
                            <FormField control={form.control} name="tailNumber" render={({ field }) => ( <FormItem><FormLabel>Aircraft Registration</FormLabel><FormControl><Input placeholder="e.g., ZS-ABC" {...field} /></FormControl><FormMessage /></FormItem> )}/>
                            <FormField control={form.control} name="type" render={({ field }) => ( <FormItem><FormLabel>Aircraft Type</FormLabel><Select onValueChange={field.onChange} defaultValue={field.value}><FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl><SelectContent><SelectItem value="Single-Engine">Single-Engine</SelectItem><SelectItem value="Multi-Engine">Multi-Engine</SelectItem></SelectContent></Select><FormMessage /></FormItem> )}/>
                            <FormField control={form.control} name="currentHobbs" render={({ field }) => ( <FormItem className="col-span-2"><FormLabel>Current Hobbs Hours</FormLabel><FormControl><Input type="number" {...field} /></FormControl><FormMessage /></FormItem> )}/>
                        </div>
                        <DialogFooter>
                            <DialogClose asChild><Button type="button" variant="outline">Cancel</Button></DialogClose>
                            <Button type="submit">Save Aircraft</Button>
                        </DialogFooter>
                    </form>
                </Form>
            </DialogContent>
        </Dialog>
    )
}
