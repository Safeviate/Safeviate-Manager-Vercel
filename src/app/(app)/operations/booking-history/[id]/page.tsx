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
import { useIsMobile } from '@/hooks/use-mobile';

interface BookingDetailPageProps {
    params: Promise<{ id: string }>;
}

export default function BookingHistoryDetailPage({ params }: BookingDetailPageProps) {
    const resolvedParams = use(params);
    const firestore = useFirestore();
    const tenantId = 'safeviate';
    const isMobile = useIsMobile();

    const bookingRef = useMemoFirebase(
        () => firestore ? doc(firestore, `tenants/${tenantId}/bookings`, resolvedParams.id) : null,
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
                <Button asChild variant="outline">
                    <Link href="/operations/booking-history">
                        <ArrowLeft className="mr-2 h-4 w-4" />
                        Back to Booking History
                    </Link>
                </Button>
            </div>
        )
    }

    return (
        <div className="mx-auto flex h-full w-full max-w-[1200px] min-h-0 flex-col gap-4 sm:gap-6">
            <div className="shrink-0">
            <Button asChild variant="outline">
                <Link href="/operations/booking-history">
                    <ArrowLeft className="mr-2 h-4 w-4" />
                    Back to Booking History
                </Link>
            </Button>
            </div>
            <div className={isMobile ? "min-h-0 flex-1 overflow-hidden" : ""}>
            <ViewBookingDetails
                booking={booking}
            />
            </div>
        </div>
    );
}
