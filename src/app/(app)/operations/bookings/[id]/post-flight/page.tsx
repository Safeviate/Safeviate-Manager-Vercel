
'use client';

import { useMemo, use } from 'react';
import { doc } from 'firebase/firestore';
import { useDoc, useFirestore, useMemoFirebase } from '@/firebase';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import { updateBooking } from '../../booking-functions';
import { useRouter } from 'next/navigation';
import type { Booking } from '@/types/booking';
import type { Aircraft } from '@/app/(app)/assets/page';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';

interface PostFlightPageProps {
    params: { id: string };
}

const postFlightSchema = z.object({
  actualHobbs: z.number({ coerce: true }).min(0, "Hobbs must be positive"),
  actualTacho: z.number({ coerce: true }).min(0, "Tacho must be positive"),
  oil: z.number({ coerce: true }).min(0, "Oil must be positive"),
  fuel: z.number({ coerce: true }).min(0, "Fuel must be positive"),
});

export default function PostFlightPage({ params }: PostFlightPageProps) {
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

    const form = useForm<z.infer<typeof postFlightSchema>>({
        resolver: zodResolver(postFlightSchema),
        defaultValues: {
            actualHobbs: 0,
            actualTacho: 0,
            oil: 0,
            fuel: 0,
        }
    });

    const onSubmit = async (values: z.infer<typeof postFlightSchema>) => {
        if (!booking || !firestore) return;

        try {
            await updateBooking(
                firestore,
                tenantId,
                booking.id,
                { postFlight: values, status: 'Completed' },
                booking.aircraftId,
                false,
                true
            );
            toast({
                title: 'Post-Flight Submitted',
                description: 'The post-flight checklist has been saved.',
            });
            router.push('/operations/bookings');
        } catch (error: any) {
            toast({
                variant: 'destructive',
                title: 'Submission Failed',
                description: error.message,
            });
        }
    };

    if (!booking || !aircraft) {
        return <div>Loading...</div>;
    }

    return (
        <Card>
            <CardHeader>
                <CardTitle>Post-Flight Checklist</CardTitle>
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
                        <div className="flex justify-end gap-2">
                           <Button type="button" variant="outline" onClick={() => router.back()}>Cancel</Button>
                           <Button type="submit">Save Post-Flight</Button>
                        </div>
                    </form>
                </Form>
            </CardContent>
        </Card>
    );
}
