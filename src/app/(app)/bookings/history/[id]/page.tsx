'use client';

import { use } from 'react';
import { doc } from 'firebase/firestore';
import { useDoc, useFirestore, useMemoFirebase } from '@/firebase';
import type { Booking } from '@/types/booking';
import { Skeleton } from '@/components/ui/skeleton';
import { ViewBookingDetails } from './view-booking-details';
import { BackNavButton } from '@/components/back-nav-button';
import { useUserProfile } from '@/hooks/use-user-profile';

interface BookingDetailPageProps {
    params: Promise<{ id: string }>;
}

export default function BookingHistoryDetailPage({ params }: BookingDetailPageProps) {
    const resolvedParams = use(params);
    const firestore = useFirestore();
    const { tenantId } = useUserProfile();

    const bookingRef = useMemoFirebase(
        () => firestore && tenantId ? doc(firestore, `tenants/${tenantId}/bookings`, resolvedParams.id) : null,
        [firestore, tenantId, resolvedParams.id]
    );

    const { data: booking, isLoading, error } = useDoc<Booking>(bookingRef);

    if (isLoading) {
        return (
            <div className="mx-auto flex h-full w-full max-w-[1200px] min-h-0 flex-col gap-6">
                <Skeleton className="h-10 w-48" />
                <Skeleton className="min-h-0 flex-1 w-full" />
            </div>
        )
    }

    if (error || !booking) {
        return (
            <div className="max-w-[1200px] mx-auto w-full text-center py-10">
                <p className="text-destructive mb-4">
                    {error ? `Error: ${error.message}` : "Booking not found."}
                </p>
                <BackNavButton href="/bookings/history" text="Back to History" className="border-slate-300 bg-background text-foreground hover:bg-muted" />
            </div>
        )
    }

    return (
        <div className="flex flex-col h-full min-h-0 w-full max-w-[1200px] mx-auto p-4 md:p-6 lg:p-8">
            <ViewBookingDetails
                booking={booking}
            />
        </div>
    );
}
