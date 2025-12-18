
'use client';

import { useMemo, use } from 'react';
import { doc } from 'firebase/firestore';
import { useDoc, useFirestore, useMemoFirebase } from '@/firebase';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { useToast } from '@/hooks/use-toast';
import { updateBooking } from '../../booking-functions';
import { useRouter } from 'next/navigation';
import type { Booking } from '@/types/booking';
import type { Aircraft } from '@/app/(app)/assets/page';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';

interface PreFlightPageProps {
    params: { id: string };
}

const preFlightSchema = z.object({
  actualHobbs: z.number({ coerce: true }).min(0, "Hobbs must be positive"),
  actualTacho: z.number({ coerce: true }).min(0, "Tacho must be positive"),
  oil: z.number({ coerce: true }).min(0, "Oil must be positive"),
  fuel: z.number({ coerce: true }).min(0, "Fuel must be positive"),
  documentsChecked: z.array(z.string()).refine(value => value.length > 0, {
    message: "At least one document must be checked.",
  }),
});

export default function PreFlightPage({ params }: PreFlightPageProps) {
    const resolvedParams = use(params);
    const firestore = useFirestore();
    const router = useRouter();
    const { toast } = useToast();
    const tenantId = 'safeviate';
    const bookingId = resolvedParams.id;

    const bookingRef = useMemoFirebase(
        () => (firestore ? doc(firestore, 'tenants', tenantId, 'bookings', bookingId) : null),
        [firestore, tenantId, bookingId]
    );
    const { data: booking } = useDoc<Booking>(bookingRef);

    const aircraftRef = useMemoFirebase(
        () => (firestore && booking ? doc(firestore, 'tenants', tenantId, 'aircrafts', booking.aircraftId) : null),
        [firestore, tenantId, booking]
    );
    const { data: aircraft } = useDoc<Aircraft>(aircraftRef);
    
    const form = useForm<z.infer<typeof preFlightSchema>>({
        resolver: zodResolver(preFlightSchema),
        defaultValues: {
            actualHobbs: 0,
            actualTacho: 0,
            oil: 0,
            fuel: 0,
            documentsChecked: [],
        }
    });

    const onSubmit = async (values: z.infer<typeof preFlightSchema>) => {
        if (!booking || !firestore) return;

        try {
            await updateBooking(
                firestore,
                tenantId,
                booking.id,
                { preFlight: values },
                booking.aircraftId,
                true,
                false
            );
            toast({
                title: 'Pre-Flight Submitted',
                description: 'The pre-flight checklist has been saved.',
            });
            router.back();
        } catch (error: any) {
            toast({
                variant: 'destructive',
                title: 'Submission Failed',
                description: error.message,
            });
        }
    };
    
    const documents = [
        { id: 'poh', label: 'P.O.H' },
        { id: 'cors', label: 'C of RS' },
        { id: 'cofa', label: 'C of A' },
        { id: 'noise', label: 'Noise Cert' },
        { id: 'techlog', label: 'Tech Log' },
    ];

    if (!booking || !aircraft) {
        return <div>Loading...</div>;
    }

    return (
        <Card>
            <CardHeader>
                <CardTitle>Pre-Flight Checklist</CardTitle>
                <CardDescription>
                    For Booking #{booking.bookingNumber} - Aircraft {aircraft.tailNumber}
                </CardDescription>
            </CardHeader>
            <CardContent>
                <Form {...form}>
                    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <FormField
                                control={form.control}
                                name="actualHobbs"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Actual Hobbs</FormLabel>
                                        <FormControl>
                                            <Input type="number" {...field} />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                            <FormField
                                control={form.control}
                                name="actualTacho"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Actual Tacho</FormLabel>
                                        <FormControl>
                                            <Input type="number" {...field} />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                            <FormField
                                control={form.control}
                                name="oil"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Oil (lts)</FormLabel>
                                        <FormControl>
                                            <Input type="number" {...field} />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                             <FormField
                                control={form.control}
                                name="fuel"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Fuel (lts)</FormLabel>
                                        <FormControl>
                                            <Input type="number" {...field} />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                        </div>
                        
                        <FormField
                            control={form.control}
                            name="documentsChecked"
                            render={() => (
                                <FormItem>
                                    <div className="mb-4">
                                        <FormLabel className="text-base">Documents Checked</FormLabel>
                                    </div>
                                    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
                                    {documents.map((item) => (
                                        <FormField
                                            key={item.id}
                                            control={form.control}
                                            name="documentsChecked"
                                            render={({ field }) => {
                                                return (
                                                <FormItem
                                                    key={item.id}
                                                    className="flex flex-row items-center space-x-3 space-y-0 rounded-md border p-4"
                                                >
                                                    <FormControl>
                                                    <Checkbox
                                                        checked={field.value?.includes(item.id)}
                                                        onCheckedChange={(checked) => {
                                                        return checked
                                                            ? field.onChange([...field.value, item.id])
                                                            : field.onChange(
                                                                field.value?.filter(
                                                                (value) => value !== item.id
                                                                )
                                                            )
                                                        }}
                                                    />
                                                    </FormControl>
                                                    <FormLabel className="font-normal">
                                                        {item.label}
                                                    </FormLabel>
                                                </FormItem>
                                                )
                                            }}
                                        />
                                    ))}
                                    </div>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                        <div className="flex justify-end gap-2">
                           <Button type="button" variant="outline" onClick={() => router.back()}>Cancel</Button>
                           <Button type="submit">Save Pre-Flight</Button>
                        </div>
                    </form>
                </Form>
            </CardContent>
        </Card>
    );
}
