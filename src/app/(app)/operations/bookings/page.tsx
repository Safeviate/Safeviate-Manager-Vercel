'use client';

import { useMemo } from 'react';
import { collection, query } from 'firebase/firestore';
import { useCollection, useFirestore, useMemoFirebase } from '@/firebase';
import type { Aircraft } from '@/types/aircraft';
import type { Booking } from '@/types/booking';
import { SwimlaneSchedule } from './swimlane-schedule';
import { Skeleton } from '@/components/ui/skeleton';

export default function BookingsPage() {
    const firestore = useFirestore();
    const tenantId = 'safeviate';

    const aircraftsQuery = useMemoFirebase(
        () => firestore ? query(collection(firestore, `tenants/${tenantId}/aircrafts`)) : null,
        [firestore, tenantId]
    );
    const bookingsQuery = useMemoFirebase(
        () => firestore ? query(collection(firestore, `tenants/${tenantId}/bookings`)) : null,
        [firestore, tenantId]
    );

    const { data: aircrafts, isLoading: isLoadingAircrafts } = useCollection<Aircraft>(aircraftsQuery);
    const { data: bookings, isLoading: isLoadingBookings } = useCollection<Booking>(bookingsQuery);

    const isLoading = isLoadingAircrafts || isLoadingBookings;

    return (
        <div className="flex flex-col gap-6 h-full">
            <div>
                <h1 className="text-3xl font-bold tracking-tight">Booking Schedule</h1>
                <p className="text-muted-foreground">
                    A swimlane view of all aircraft bookings.
                </p>
            </div>
            {isLoading ? (
                <Skeleton className="h-[600px] w-full" />
            ) : (
                <SwimlaneSchedule aircrafts={aircrafts || []} bookings={bookings || []} />
            )}
        </div>
    )
}
