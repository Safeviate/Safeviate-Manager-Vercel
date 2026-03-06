'use client';

import { use } from 'react';
import { doc } from 'firebase/firestore';
import { useDoc, useFirestore, useMemoFirebase } from '@/firebase';
import type { Booking } from '@/types/booking';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { ViewBookingDetails } from './view-booking-details';

interface BookingDetailPageProps {
    params: Promise<{ id: string }>;
}

export default function BookingHistoryDetailPage({ params }: BookingDetailPageProps) {
    const resolvedParams = use(params);
    const firestore = useFirestore();
    const tenantId = 'safeviate';

    const bookingRef = useMemoFirebase(
        () => firestore ? doc(firestore, `tenants/${tenantId}/bookings`, resolvedParams.id) : null,
        [firestore, tenantId, resolvedParams.id]
    );

    const { data: booking, isLoading, error } = useDoc<Booking>(bookingRef);

    if (isLoading) {
        return (
            <div className="space-y-6">
                <Skeleton className="h-10 w-48" />
                <Skeleton className="h-64 w-full" />
            </div>
        )
    }

    if (error || !booking) {
        return (
            <div className="text-center py-10">
                <p className="text-destructive mb-4">
                    {error ? `Error: ${error.message}` : "Booking not found."}
                </p>
                <Button asChild variant="outline">
                    <Link href="/bookings/history">
                        <ArrowLeft className="mr-2 h-4 w-4" />
                        Back to Booking History
                    </Link>
                </Button>
            </div>
        )
    }

    return (
        <div className="space-y-6">
            <Button asChild variant="outline">
                <Link href="/bookings/history">
                    <ArrowLeft className="mr-2 h-4 w-4" />
                    Back to Booking History
                </Link>
            </Button>
            <ViewBookingDetails
                booking={booking}
            />
        </div>
    );
}
